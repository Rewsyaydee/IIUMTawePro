import authHandler from "../api/auth/telegram.js";
import redeemHandler from "../api/invites/redeem.js";
import healthHandler from "../api/health.js";
import webhookHandler from "../api/telegram/webhook.js";

function makeReq(method, body) {
  return {
    method,
    body,
    async *[Symbol.asyncIterator]() {
      if (body) yield Buffer.from(JSON.stringify(body));
    }
  };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(value) {
      this.body = value;
    }
  };
}

async function call(handler, method, body) {
  const req = makeReq(method, body);
  const res = makeRes();
  await handler(req, res);
  return {
    status: res.statusCode,
    payload: JSON.parse(res.body)
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const originalEnv = { ...process.env };
process.env.VITE_APP_MODE = "development";
process.env.COMMITTEE_ACCESS_CODES = "";
process.env.HEAD_ACCESS_CODES = "";
process.env.MAINBOARD_ACCESS_CODES = "";
delete process.env.TELEGRAM_BOT_TOKEN;

const guest = await call(authHandler, "POST", {});
assert(guest.status === 200, "Guest auth should succeed in local stub mode.");
assert(guest.payload.user.role === "student", "Guest auth should return student role.");

const committee = await call(redeemHandler, "POST", {
  code: "OiAkuNakTaweNi",
  displayName: "Smoke Committee",
  selectedRole: "head",
  selectedBureau: "Welfare"
});
assert(committee.status === 200, "Committee code should redeem in local stub mode.");
assert(committee.payload.user.role === "head", "Committee code should respect selected head role.");
assert(committee.payload.user.bureau === "Welfare", "Committee code should respect selected bureau.");

process.env.VERCEL_ENV = "production";
process.env.COMMITTEE_ACCESS_CODES = "";
const blocked = await call(redeemHandler, "POST", {
  code: "OiAkuNakTaweNi",
  selectedRole: "committee",
  selectedBureau: "Catering"
});
assert(blocked.status === 401, "Production should reject missing Telegram initData before code checks.");

process.env = { ...originalEnv, COMMITTEE_ACCESS_CODES: "OiAkuNakTaweNi" };
const health = await call(healthHandler, "GET");
assert(health.status === 200, "Health endpoint should respond.");
assert(Array.isArray(health.payload.missing), "Health endpoint should include missing list.");

const webhook = await call(webhookHandler, "GET");
assert(webhook.status === 200, "Telegram webhook health should respond.");
assert(webhook.payload.endpoint === "telegram-webhook", "Telegram webhook should identify itself.");

console.log("Auth smoke checks passed.");
