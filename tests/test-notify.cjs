// Quick test: node tests/test-notify.cjs
// Simulates the notification cron at specific times

const BASE = process.env.API_URL || "https://iium-tawe-pro.vercel.app";

async function testNotify(hour, minute, date) {
  let url = `${BASE}/api/cron/notifications`;
  if (date) url += `?date=${encodeURIComponent(date)}`;
  console.log(`\n🔔 Testing notifications at ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} KL time${date ? ` (date override: ${date})` : ""}...\n`);

  const resp = await fetch(url);
  const data = await resp.json();

  console.log(`Status: ${resp.status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));

  if (data.sent > 0) {
    console.log(`\n✅ WOULD SEND ${data.sent} notifications!`);
    if (data.details) {
      data.details.forEach((d) => console.log(`  - ${d.tier}: ${d.sent}/${d.queued} messages`));
    }
  } else if (data.sessions > 0) {
    console.log(`\n⚠️  ${data.sessions} sessions found but no trigger matched at this time.`);
  } else {
    console.log(`\n❌ No sessions found or no trigger matched.`);
  }
}

const args = process.argv.slice(2);
const hour = parseInt(args[0]) || new Date().getHours();
const minute = parseInt(args[1]) || new Date().getMinutes();
const date = args[2] || null;

testNotify(hour, minute, date).catch((err) => {
  console.error("Test failed:", err.message);
  process.exit(1);
});
