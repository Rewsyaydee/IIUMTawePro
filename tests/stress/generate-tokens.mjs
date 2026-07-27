// Generate signed HS256 JWTs for stress testing. DB upsert skipped (STRESS_TEST_MODE handles it).
// Usage: node generate-tokens.mjs

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(join(__dirname, "..", "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([^#][^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const JWT_SECRET = env.SUPABASE_JWT_SECRET;
if (!JWT_SECRET) { console.error("Missing SUPABASE_JWT_SECRET"); process.exit(1); }

function stableUuid(seed) {
  const h = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function signJwt(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: "authenticated", exp: now + 86400, iat: now, sub: user.id,
    app_user_id: user.id, app_role: user.role, bureau: user.bureau || "",
    telegram_id: user.telegramId, name: user.name
  };
  const h = Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url");
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const s = crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}

const STUDENTS = 4500;
console.log(`Generating ${STUDENTS} JWTs...`);
const students = [];
for (let i = 1; i <= STUDENTS; i++) {
  const user = {
    id: stableUuid(`stress-student-${i}`),
    telegramId: `stress-${100000000 + i}`,
    name: `S${String(i).padStart(5,"0")}`,
    role: "student",
    bureau: "",
  };
  students.push({ userId: user.id, telegramId: user.telegramId, name: user.name, jwt: signJwt(user) });
  if (i % 1000 === 0) process.stdout.write(`  ${i}/${STUDENTS}...`);
}

const mb = { id: stableUuid("stress-mainboard"), telegramId: "stress-mb-999", name: "MBStress", role: "mainboard", bureau: "" };
const cm = { id: stableUuid("stress-committee"), telegramId: "stress-cm-888", name: "CMStress", role: "committee", bureau: "PrepTech" };

writeFileSync(join(__dirname, "students.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  total: students.length,
  students,
  mainboard: { userId: mb.id, jwt: signJwt(mb) },
  committee: { userId: cm.id, jwt: signJwt(cm) },
}, null, 2), "utf8");

console.log(`\nDone. ${students.length} student JWTs + mainboard + committee in students.json`);
