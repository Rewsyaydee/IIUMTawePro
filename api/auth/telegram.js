import {
  readJson,
  resolveAccessCode,
  sendJson,
  signSupabaseJwt,
  userFromTelegram,
  verifyTelegramInitData
} from "../_lib/auth-utils.js";

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

    let role = "student";
    let bureau;
    if (body.inviteCode) {
      const invite = resolveAccessCode({
        code: body.inviteCode,
        selectedRole: body.selectedRole,
        selectedBureau: body.selectedBureau
      });
      if (!invite.ok) return sendJson(res, 403, { error: invite.reason });
      role = invite.role;
      bureau = invite.bureau;
    }

    const user = userFromTelegram({
      telegramUser: verification.user,
      role,
      bureau,
      displayName: body.displayName
    });

    return sendJson(res, 200, {
      mode: "auth-bridge",
      verified: verification.reason === "Verified.",
      verification: verification.reason,
      user,
      supabaseJwt: signSupabaseJwt(user),
      expiresIn: 3600
    });
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid authentication request." });
  }
}
