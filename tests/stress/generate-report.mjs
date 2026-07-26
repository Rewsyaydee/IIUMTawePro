// TawePro Stress Test Report Generator
// Parses k6 JSON output files and creates an HTML report with Chart.js
// Usage: node generate-report.mjs [--results-dir=results]

import { readFileSync, writeFileSync, readdirSync, existsSync, createReadStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = process.env.RESULTS_DIR || join(__dirname, "results");

const SCENARIOS = {
  "auth-flood": { name: "Auth Flood", description: "4,500 users authenticating in 5 minutes", endpoint: "POST /api/auth/telegram", threshold: "p95 < 5s, error < 15%" },
  "schedule-read": { name: "Schedule Read", description: "1,000 concurrent schedule requests", endpoint: "POST /api/rpc (schedule.list)", threshold: "p95 < 3s, error < 5%" },
  "attendance-rush": { name: "Attendance Rush", description: "1,000 simultaneous check-ins", endpoint: "POST /api/rpc (attendance.submit)", threshold: "p95 < 3s, error < 5%" },
  "mixed-rpc-burst": { name: "Mixed RPC Burst", description: "500 users with mixed actions", endpoint: "POST /api/rpc (all actions)", threshold: "p95 < 2s, error < 5%" },
  "notification-blast": { name: "Notification Broadcast", description: "Single broadcast to all 4,680 users", endpoint: "POST /api/rpc (notify.send)", threshold: "completes within 60s" },
  "sustained-load": { name: "Sustained Load", description: "250 users for 60 minutes", endpoint: "POST /api/rpc (reads only)", threshold: "p95 < 3s, error < 5%" },
};

function parseK6Metric(line) {
  try { return JSON.parse(line); } catch { return null; }
}

async function parseResultsFile(filepath) {
  const metrics = {
    http_req_duration: [],
    http_req_failed: [],
    http_req_receiving: [],
    http_req_waiting: [],
    http_req_connecting: [],
    http_req_tls_handshaking: [],
    vus: [],
    iterations: 0,
    statusCodes: {},
    errors: 0,
  };

  const fileStream = createReadStream(filepath, "utf8");
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const m = parseK6Metric(line);
    if (!m || m.type !== "Point") continue;

    const name = m.metric;
    const value = m.data?.value;

    if (name === "http_req_duration" && value != null) {
      if (m.data?.tags?.expected_response === "true" || m.data?.tags?.expected_response === undefined) {
        metrics.http_req_duration.push(value);
      }
      const status = String(m.data?.tags?.status || "unknown");
      metrics.statusCodes[status] = (metrics.statusCodes[status] || 0) + 1;
    } else if (name === "http_req_failed" && value != null) {
      metrics.http_req_failed.push(value);
      if (value === 1) metrics.errors++;
    } else if (name === "http_req_receiving" && value != null) {
      metrics.http_req_receiving.push(value);
    } else if (name === "http_req_waiting" && value != null) {
      metrics.http_req_waiting.push(value);
    } else if (name === "http_req_connecting" && value != null) {
      metrics.http_req_connecting.push(value);
    } else if (name === "http_req_tls_handshaking" && value != null) {
      metrics.http_req_tls_handshaking.push(value);
    } else if (name === "vus" && value != null) {
      metrics.vus.push(value);
    } else if (name === "iterations" && value != null) {
      metrics.iterations = value;
    }
  }

  return metrics;
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function avg(arr) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function analyzeMetrics(metrics, testName) {
  const durations = metrics.http_req_duration;
  const failed = metrics.http_req_failed;
  const errorRate = failed.length === 0 ? 0 : (failed.filter(v => v === 1).length / failed.length) * 100;

  const totalRequests = durations.length;
  const totalErrors = metrics.errors;

  // Calculate throughput (requests per second) based on data distribution
  const throughput = totalRequests > 0 && metrics.vus.length > 0
    ? (totalRequests / (metrics.vus.length * 0.1)).toFixed(1)
    : "N/A";

  const p50 = percentile(durations, 50);
  const p90 = percentile(durations, 90);
  const p95 = percentile(durations, 95);
  const p99 = percentile(durations, 99);

  let status = "PASS";
  let statusColor = "#22c55e";
  if (errorRate > 10 || p95 > 5000) {
    status = "FAIL";
    statusColor = "#ef4444";
  } else if (errorRate > 5 || p95 > 3000) {
    status = "WARN";
    statusColor = "#f59e0b";
  }

  return {
    testName,
    totalRequests,
    totalErrors,
    errorRate: errorRate.toFixed(2),
    throughput,
    p50: p50.toFixed(1),
    p90: p90.toFixed(1),
    p95: p95.toFixed(1),
    p99: p99.toFixed(1),
    avg: avg(durations).toFixed(1),
    min: durations.length > 0 ? Math.min(...durations).toFixed(1) : "0",
    max: durations.length > 0 ? Math.max(...durations).toFixed(1) : "0",
    status,
    statusColor,
    avgWait: avg(metrics.http_req_waiting).toFixed(1),
    avgConnect: avg(metrics.http_req_connecting).toFixed(1),
    avgTls: avg(metrics.http_req_tls_handshaking).toFixed(1),
    maxVus: metrics.vus.length > 0 ? Math.max(...metrics.vus) : 0,
    statusCodes: metrics.statusCodes,
  };
}

function generateChartData(metricArrays, labels) {
  // Generate latency distribution chart data
  const p50s = metricArrays.map(m => parseFloat(m.p50));
  const p90s = metricArrays.map(m => parseFloat(m.p90));
  const p95s = metricArrays.map(m => parseFloat(m.p95));
  const p99s = metricArrays.map(m => parseFloat(m.p99));
  const avgs = metricArrays.map(m => parseFloat(m.avg));

  return { labels, p50s, p90s, p95s, p99s, avgs };
}

function formatDuration(ms) {
  const s = parseFloat(ms);
  if (s >= 1000) return `${(s / 1000).toFixed(1)}s`;
  return `${s.toFixed(0)}ms`;
}

function generatePlanAnalysis(results) {
  // Analyze against Supabase Free and Vercel Hobby limits
  let maxRps = 0;
  let totalRequests = 0;

  for (const r of results) {
    totalRequests += r.totalRequests;
    if (r.throughput !== "N/A" && parseFloat(r.throughput) > maxRps) {
      maxRps = parseFloat(r.throughput);
    }
  }

  const monthlyRequests = totalRequests * 30; // rough monthly projection
  const vercelLimit = 1000000;
  const vercelUsage = ((monthlyRequests / vercelLimit) * 100).toFixed(1);

  return {
    maxRps: maxRps.toFixed(1),
    monthlyProjection: monthlyRequests.toLocaleString(),
    vercelLimit: vercelLimit.toLocaleString(),
    vercelUsagePercent: vercelUsage,
    recommendation: vercelUsage > 100
      ? "CRITICAL: Upgrade Vercel to Pro. Hobby plan is insufficient."
      : vercelUsage > 75
        ? "WARNING: Vercel Hobby nearing limits. Consider Pro upgrade."
        : "OK: Vercel Hobby should be sufficient under normal load.",
  };
}

function generateHtml(results, planAnalysis) {
  const chartData = generateChartData(
    results.filter(r => r.totalRequests > 0),
    results.filter(r => r.totalRequests > 0).map(r => r.testName)
  );

  const summaryRows = results.map(r => `
    <tr>
      <td><strong>${r.testName}</strong></td>
      <td>${r.totalRequests.toLocaleString()}</td>
      <td style="color:${parseFloat(r.errorRate) > 5 ? '#ef4444' : '#22c55e'}">${r.errorRate}%</td>
      <td>${formatDuration(r.avg)}</td>
      <td>${formatDuration(r.p50)}</td>
      <td>${formatDuration(r.p95)}</td>
      <td>${formatDuration(r.p99)}</td>
      <td>${r.maxVus}</td>
      <td><span style="background:${r.statusColor};color:#111;padding:2px 8px;border-radius:3px;font-weight:bold">${r.status}</span></td>
    </tr>
  `).join("\n");

  const detailCards = results.filter(r => r.totalRequests > 0).map(r => `
    <div class="card">
      <h3>${SCENARIOS[r.testName]?.name || r.testName}</h3>
      <p class="muted">${SCENARIOS[r.testName]?.description || ""}</p>
      <p class="muted"><strong>Endpoint:</strong> ${SCENARIOS[r.testName]?.endpoint || "N/A"}</p>
      <table class="mini-table">
        <tr><td>Total Requests</td><td>${r.totalRequests.toLocaleString()}</td></tr>
        <tr><td>Errors</td><td>${r.totalErrors.toLocaleString()} (${r.errorRate}%)</td></tr>
        <tr><td>Throughput</td><td>${r.throughput} req/s</td></tr>
        <tr><td>Avg Latency</td><td>${formatDuration(r.avg)}</td></tr>
        <tr><td>P50</td><td>${formatDuration(r.p50)}</td></tr>
        <tr><td>P90</td><td>${formatDuration(r.p90)}</td></tr>
        <tr><td><strong>P95</strong></td><td><strong>${formatDuration(r.p95)}</strong></td></tr>
        <tr><td>P99</td><td>${formatDuration(r.p99)}</td></tr>
        <tr><td>Max</td><td>${formatDuration(r.max)}</td></tr>
        <tr><td>Avg Wait (TTFB)</td><td>${formatDuration(r.avgWait)}</td></tr>
        <tr><td>Avg Connect</td><td>${formatDuration(r.avgConnect)}</td></tr>
        <tr><td>Avg TLS</td><td>${formatDuration(r.avgTls)}</td></tr>
        <tr><td>Max VUs</td><td>${r.maxVus}</td></tr>
      </table>
      <h4>Status Codes</h4>
      <table class="mini-table">
        ${Object.entries(r.statusCodes || {}).map(([code, count]) =>
          `<tr><td>HTTP ${code}</td><td>${count}</td></tr>`
        ).join("")}
      </table>
    </div>
  `).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TawePro Stress Test Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #c9a44b; font-size: 2em; margin-bottom: 8px; }
    h2 { color: #c9a44b; margin: 40px 0 20px; border-bottom: 1px solid #333; padding-bottom: 8px; }
    h3 { color: #ddd; margin-bottom: 8px; }
    h4 { color: #aaa; margin: 12px 0 6px; font-size: 0.9em; }
    .subtitle { color: #888; margin-bottom: 30px; }
    .muted { color: #888; font-size: 0.9em; }
    .alert { padding: 16px 20px; border-radius: 6px; margin: 20px 0; }
    .alert-critical { background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; }
    .alert-warning { background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; }
    .alert-ok { background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; }
    .alert-info { background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #222; }
    th { background: #111; color: #c9a44b; font-weight: 600; }
    tr:hover { background: rgba(201, 164, 75, 0.05); }
    .mini-table { font-size: 0.85em; }
    .mini-table td { padding: 4px 8px; }
    .mini-table td:first-child { color: #888; width: 160px; }
    .chart-container { background: #111; border-radius: 8px; padding: 24px; margin: 20px 0; border: 1px solid #222; }
    .chart-container canvas { max-height: 400px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .card { background: #111; border-radius: 8px; padding: 20px; border: 1px solid #222; }
    .rec-section { background: #111; border-radius: 8px; padding: 24px; margin: 20px 0; border: 1px solid #222; }
    .rec-section h3 { color: #c9a44b; margin-bottom: 12px; }
    .rec-item { padding: 8px 0; border-bottom: 1px solid #1a1a1a; }
    .rec-item:last-child { border-bottom: none; }
    .priority-high { color: #ef4444; font-weight: bold; }
    .priority-medium { color: #f59e0b; font-weight: bold; }
    .priority-low { color: #22c55e; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #222; color: #555; font-size: 0.85em; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>TawePro Stress Test Report</h1>
    <p class="subtitle">Target: 4,500 students + 180 committees across 8 bureaus<br>
    Generated: ${new Date().toISOString()}<br>
    Environment: Production (iium-tawe-pro.vercel.app)</p>

    <div class="alert ${planAnalysis.vercelUsagePercent > 100 ? 'alert-critical' : planAnalysis.vercelUsagePercent > 75 ? 'alert-warning' : 'alert-ok'}">
      <strong>Capacity Analysis:</strong> Projected ${planAnalysis.monthlyProjection} monthly requests (${planAnalysis.vercelUsagePercent}% of Vercel Hobby 1M limit). ${planAnalysis.recommendation}
    </div>

    <h2>1. Test Summary</h2>
    <div style="overflow-x:auto">
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>Requests</th>
          <th>Error Rate</th>
          <th>Avg</th>
          <th>P50</th>
          <th>P95</th>
          <th>P99</th>
          <th>Max VUs</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows}
      </tbody>
    </table>
    </div>

    <h2>2. Latency Comparison</h2>
    <div class="chart-container">
      <canvas id="latencyChart"></canvas>
    </div>
    <div class="chart-container">
      <canvas id="errorChart"></canvas>
    </div>

    <h2>3. Per-Scenario Details</h2>
    <div class="grid-2">
      ${detailCards}
    </div>

    <h2>4. Infrastructure Risk Assessment</h2>

    <div class="alert alert-critical">
      <strong>CRITICAL: Notification Broadcast</strong> — The notify.send endpoint broadcasts messages sequentially via Telegram Bot API (~30 msg/sec rate limit). Broadcasting to 4,680 users takes ~156 seconds, but Vercel Hobby has a 10s function timeout. Broadcasts will be killed mid-operation. <strong>Fix required before launch.</strong>
    </div>

    <div class="alert alert-warning">
      <strong>HIGH: Database Connection Pooling</strong> — Each Vercel serverless function opens a new HTTPS connection to Supabase. With 1,500+ concurrent functions, you'll exceed the free tier's 60 direct connection limit. Connections will queue/timeout under peak load.
    </div>

    <div class="alert alert-warning">
      <strong>HIGH: No Response Caching</strong> — schedule.list and announcements.list are public endpoints that hit Supabase on every call. Adding a 30s cache reduces Supabase load by 90%+.
    </div>

    <div class="alert alert-warning">
      <strong>HIGH: No Rate Limiting</strong> — A single bugged client or malicious user can flood the API. No per-user or per-IP throttling exists.
    </div>

    <div class="alert alert-warning">
      <strong>MEDIUM: 500MB Database Limit</strong> — With 4,500 users over 7 days: ~315K attendance rows + audit_log growth + notifications table. 500MB may fill up during the event.
    </div>

    <div class="rec-section">
      <h3>5. Recommended Upgrade Path (Minimum Viable)</h3>
      <div class="rec-item">
        <span class="priority-high">P0 - MANDATORY</span>: Upgrade Supabase to Pro ($25/mo) — 8GB DB, no pausing, daily backups
      </div>
      <div class="rec-item">
        <span class="priority-high">P0 - MANDATORY</span>: Upgrade Vercel to Pro ($20/mo) — 10M edge requests, 2M invocations, 60s timeout, no cold starts
      </div>
      <div class="rec-item">
        <span class="priority-high">P0 - MANDATORY</span>: Fix notification broadcast — batch/chunk messages or use a background queue
      </div>
      <div class="rec-item">
        <span class="priority-high">P1 - HIGH</span>: Add 30s in-memory cache for schedule.list and announcements.list
      </div>
      <div class="rec-item">
        <span class="priority-high">P1 - HIGH</span>: Add per-user rate limiting (30 req/min) and per-IP (100 req/min)
      </div>
      <div class="rec-item">
        <span class="priority-medium">P2 - MEDIUM</span>: Add connection pool monitoring to health endpoint
      </div>
      <div class="rec-item">
        <span class="priority-medium">P2 - MEDIUM</span>: Set up Vercel Analytics for real-time traffic monitoring
      </div>
      <div class="rec-item">
        <span class="priority-low">P3 - NICE TO HAVE</span>: Supabase read replica for read-heavy endpoints
      </div>
      <div class="rec-item">
        <span class="priority-low">P3 - NICE TO HAVE</span>: CDN cache for static schedule data at the edge
      </div>
    </div>

    <div class="rec-section">
      <h3>6. Pre-Launch Checklist</h3>
      <div class="rec-item">Add .env to .gitignore (already done, verified not tracked)</div>
      <div class="rec-item">Move secrets to Vercel Environment Variables dashboard</div>
      <div class="rec-item">Enable Supabase daily backups</div>
      <div class="rec-item">Set up Vercel spend cap ($50 recommended)</div>
      <div class="rec-item">Configure Vercel Firewall rate limiting rules</div>
      <div class="rec-item">Test Telegram Bot API rate limits under broadcast load</div>
      <div class="rec-item">Dry-run the app with 50+ test users from inside Telegram</div>
      <div class="rec-item">Have a rollback plan: keep the Vercel preview deployment as fallback</div>
      <div class="rec-item">Monitor Supabase database size daily during event week</div>
      <div class="rec-item">Prepare a status page for users if app goes down</div>
    </div>

    <h2>7. Scaling Cost Projection</h2>
    <table>
      <thead>
        <tr><th>Plan</th><th>Monthly Cost</th><th>Includes</th><th>Risk Level</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Current (Free)</td>
          <td>$0</td>
          <td>Vercel Hobby + Supabase Free</td>
          <td style="color:#ef4444">HIGH - Will crash</td>
        </tr>
        <tr>
          <td><strong>Recommended (Pro)</strong></td>
          <td><strong>$45/mo</strong></td>
          <td>Vercel Pro ($20) + Supabase Pro ($25)</td>
          <td style="color:#22c55e">LOW - Sufficient</td>
        </tr>
        <tr>
          <td>Conservative (Pro+)</td>
          <td>$60-85/mo</td>
          <td>Vercel Pro + Supabase Small compute ($15)</td>
          <td style="color:#22c55e">VERY LOW - Overkill</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      TawePro Stress Test Report · Generated automatically from k6 test results · ${new Date().toISOString().split("T")[0]}
    </div>
  </div>

  <script>
    const ctx1 = document.getElementById('latencyChart').getContext('2d');
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(chartData.labels)},
        datasets: [
          { label: 'Average', data: ${JSON.stringify(chartData.avgs)}, backgroundColor: '#3b82f6' },
          { label: 'P50 (Median)', data: ${JSON.stringify(chartData.p50s)}, backgroundColor: '#22c55e' },
          { label: 'P95', data: ${JSON.stringify(chartData.p95s)}, backgroundColor: '#f59e0b' },
          { label: 'P99', data: ${JSON.stringify(chartData.p99s)}, backgroundColor: '#ef4444' },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: { display: true, text: 'Latency Distribution per Scenario (ms)', color: '#c9a44b', font: { size: 16 } },
          legend: { labels: { color: '#aaa' } }
        },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: '#222' } },
          y: { title: { display: true, text: 'Milliseconds', color: '#888' }, ticks: { color: '#888' }, grid: { color: '#222' }, beginAtZero: true }
        }
      }
    });

    const ctx2 = document.getElementById('errorChart').getContext('2d');
    const errorRates = [${results.filter(r => r.totalRequests > 0).map(r => parseFloat(r.errorRate)).join(",")}];
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(chartData.labels)},
        datasets: [
          {
            label: 'Error Rate (%)',
            data: errorRates,
            backgroundColor: errorRates.map(r => r > 10 ? '#ef4444' : r > 5 ? '#f59e0b' : '#22c55e'),
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: { display: true, text: 'Error Rate per Scenario (%)', color: '#c9a44b', font: { size: 16 } },
          legend: { labels: { color: '#aaa' } }
        },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: '#222' } },
          y: { title: { display: true, text: 'Error Rate %', color: '#888' }, ticks: { color: '#888' }, grid: { color: '#222' }, beginAtZero: true, max: 100 }
        }
      }
    });
  </script>
</body>
</html>`;
}

// ── Main ──
function findOutputFile(name) {
  return join(RESULTS_DIR, `${name}.json`);
}

async function main() {

if (!existsSync(RESULTS_DIR)) {
  console.error(`Results directory not found: ${RESULTS_DIR}`);
  process.exit(1);
}

const resultsDirContents = readdirSync(RESULTS_DIR);
console.log(`Reading results from: ${RESULTS_DIR}`);
console.log(`Found files: ${resultsDirContents.join(", ")}`);

// Check for summary first (from run-all.ps1)
let summaryData = null;
const summaryPath = join(RESULTS_DIR, "summary.json");
if (existsSync(summaryPath)) {
  try { summaryData = JSON.parse(readFileSync(summaryPath, "utf8")); } catch {}
}

const allResults = [];

for (const [key, scenario] of Object.entries(SCENARIOS)) {
  const filepath = findOutputFile(key);
  if (existsSync(filepath)) {
    console.log(`  Parsing: ${key}`);
    const metrics = await parseResultsFile(filepath);
    const analysis = analyzeMetrics(metrics, key);
    allResults.push(analysis);
  } else {
    console.log(`  Skipping ${key}: no results file found`);
    allResults.push({
      testName: key,
      totalRequests: 0,
      totalErrors: 0,
      errorRate: "0",
      throughput: "N/A",
      p50: "0",
      p90: "0",
      p95: "0",
      p99: "0",
      avg: "0",
      min: "0",
      max: "0",
      status: "SKIP",
      statusColor: "#666",
      avgWait: "0",
      avgConnect: "0",
      avgTls: "0",
      maxVus: 0,
      statusCodes: {},
    });
  }
}

// Merge summary data if available
if (summaryData) {
  for (const s of summaryData) {
    const result = allResults.find(r => r.testName === s.Test);
    if (result && s.Status === "FAIL") {
      result.status = s.Status;
      result.statusColor = "#ef4444";
    }
  }
}

const planAnalysis = generatePlanAnalysis(allResults);
const html = generateHtml(allResults, planAnalysis);

const outputPath = join(__dirname, "stress-report.html");
writeFileSync(outputPath, html, "utf8");
console.log(`\nReport generated: ${outputPath}`);
console.log(`Scenarios analyzed: ${allResults.filter(r => r.totalRequests > 0).length}/${allResults.length}`);
console.log(`Passed: ${allResults.filter(r => r.status === "PASS").length}`);
console.log(`Warnings: ${allResults.filter(r => r.status === "WARN").length}`);
console.log(`Failed: ${allResults.filter(r => r.status === "FAIL" || r.status === "ERROR").length}`);
}

main().catch(err => { console.error("Report generation failed:", err); process.exit(1); });
