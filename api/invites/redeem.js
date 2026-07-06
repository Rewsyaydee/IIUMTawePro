import { readJson, resolveAccessCode, sendJson, userFromTelegram, verifyTelegramInitData } from "../_lib/auth-utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const verification = verifyTelegramInitData(body.initData || "");
    if (!verification.ok) {
      return sendJson(res, 401, { error: verification.reason });
    }

    const invite = resolveAccessCode({
      code: body.code,
      selectedRole: body.selectedRole,
      selectedBureau: body.selectedBureau
    });
    if (!invite.ok) return sendJson(res, 403, { error: invite.reason });

    const user = userFromTelegram({
      telegramUser: verification.user,
      role: invite.role,
      bureau: invite.bureau,
      displayName: body.displayName
    });

    return sendJson(res, 200, {
      status: "redeemed",
      reusable: invite.reusable,
      user
    });
  } catch {
    return sendJson(res, 400, { error: "Invalid invite redemption request." });
  }
}
