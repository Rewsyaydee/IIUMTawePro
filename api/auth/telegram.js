import {
  isProductionRuntime,
  readJson,
  resolveAccessCode,
  sendJson,
  signSupabaseJwt,
  userFromTelegram,
  verifyTelegramInitData
} from "../_lib/auth-utils.js";
import {
  createAuditLog,
  getUserRecordByTelegramId,
  hasSupabaseServerConfig,
  mapSupabaseUser,
  SupabaseRequestError,
  upsertUserProfile
} from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const hasInviteCode = Boolean(body.inviteCode && String(body.inviteCode).trim());
    const verification = verifyTelegramInitData(body.initData || "");
    if (!verification.ok && !hasInviteCode) {
      return sendJson(res, 401, { error: verification.reason });
    }

    let role = "student";
    let bureau;
    let accessWasRedeemed = false;
    if (body.inviteCode) {
      let invite;
      if (hasSupabaseServerConfig()) {
        const { findInviteCodeByCode, isInviteValid } = await import("../_lib/invite-code-utils.js");
        const row = await findInviteCodeByCode(body.inviteCode);
        const supabaseResult = isInviteValid(row);
        if (supabaseResult.ok) {
          invite = supabaseResult;
        }
      }
      if (!invite) {
        invite = resolveAccessCode({
          code: body.inviteCode,
          selectedRole: body.selectedRole,
          selectedBureau: body.selectedBureau
        });
      }
      if (!invite.ok) return sendJson(res, 403, { error: invite.reason });
      role = invite.role;
      bureau = invite.bureau;
      accessWasRedeemed = true;
    }

    let user = userFromTelegram({
      telegramUser: verification.user,
      role,
      bureau,
      displayName: body.displayName
    });
    let persistence = "stub";

    if (isProductionRuntime() && !hasSupabaseServerConfig()) {
      return sendJson(res, 503, { error: "Supabase server configuration is missing." });
    }

    if (hasSupabaseServerConfig() && verification.user?.id) {
      const telegramId = String(verification.user.id);
      const existingRow = await getUserRecordByTelegramId(telegramId);
      if (existingRow?.status === "revoked") {
        return sendJson(res, 403, { error: "This account has been revoked." });
      }

      const existingUser = mapSupabaseUser(existingRow);
      const targetRole = accessWasRedeemed ? role : existingUser?.role || "student";
      const targetBureau = accessWasRedeemed ? bureau : existingUser?.bureau;
      user = await upsertUserProfile({
        telegramId,
        name: user.name,
        role: targetRole,
        bureau: targetBureau
      });
      persistence = "supabase";

      if (accessWasRedeemed) {
        await createAuditLog({
          actor: user,
          action: "redeem_access_code",
          tableName: "users",
          recordId: user.id,
          details: `Telegram user ${telegramId} unlocked ${targetRole}${targetBureau ? ` / ${targetBureau}` : ""}.`
        });
      }
    }

    return sendJson(res, 200, {
      mode: "auth-bridge",
      persistence,
      verified: verification.reason === "Verified.",
      verification: verification.reason,
      user,
      supabaseJwt: signSupabaseJwt(user),
      expiresIn: 3600
    });
  } catch (error) {
    if (error instanceof SupabaseRequestError) {
      console.error("Supabase auth persistence failed", error.status, error.payload);
      return sendJson(res, 502, { error: "Supabase persistence failed." });
    }
    console.error("Telegram auth failed", error);
    return sendJson(res, 400, { error: "Invalid authentication request." });
  }
}
