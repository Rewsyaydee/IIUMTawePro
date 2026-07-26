// Upsert 102 test users into Supabase for stress testing attendance writes
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(join(__dirname, "..", "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([^#][^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) throw new Error("Missing Supabase config");

const USERS = [];
for (let i = 1; i <= 100; i++) {
  USERS.push({
    telegram_id: `stress-${100000000 + i}`,
    name: `S${String(i).padStart(5,"0")}`,
    role: "student",
    status: "active",
    matric_number: `${2000000 + i}`,
  });
}
USERS.push({ telegram_id: "stress-mb-999", name: "MBStress", role: "mainboard", status: "active", matric_number: null, bureau: null });
USERS.push({ telegram_id: "stress-cm-888", name: "CMStress", role: "committee", bureau: "PrepTech", status: "active", matric_number: null });

const BATCH = 25;

for (let i = 0; i < USERS.length; i += BATCH) {
  const batch = USERS.slice(i, i + BATCH);
  const res = await fetch(`${URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(batch),
  });

  if (res.ok) {
    console.log(`  Batch ${i + 1}-${Math.min(i + BATCH, USERS.length)} OK`);
  } else {
    const t = await res.text().catch(() => "");
    console.log(`  Batch ${i + 1}-${Math.min(i + BATCH, USERS.length)}: ${res.status} ${t.slice(0, 200)}`);
  }
  await new Promise(r => setTimeout(r, 200));
}
console.log(`Done. ${USERS.length} users upserted.`);
