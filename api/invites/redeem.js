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
  SupabaseRequestError,
  upsertUserProfile
} from "../_lib/supabase.js";
import { findInviteCodeByCode, isInviteValid, markInviteCodeUsed } from "../_lib/invite-code-utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const hasCode = Boolean(body.code && String(body.code).trim());
    const verification = verifyTelegramInitData(body.initData || "");
    if (!verification.ok && !hasCode) {
      return sendJson(res, 401, { error: verification.reason });
    }

    let invite;
    if (hasSupabaseServerConfig()) {
      const row = await findInviteCodeByCode(body.code);
      const supabaseResult = isInviteValid(row);
      if (!supabaseResult.ok) {
        return sendJson(res, 403, { error: supabaseResult.reason });
      }
      invite = { ok: true, role: supabaseResult.role, bureau: supabaseResult.bureau, reusable: supabaseResult.reusable, id: supabaseResult.id };
    } else {
      invite = resolveAccessCode({
        code: body.code,
        selectedRole: body.selectedRole,
        selectedBureau: body.selectedBureau
      });
    }
    if (!invite.ok) return sendJson(res, 403, { error: invite.reason });

    let user = userFromTelegram({
      telegramUser: verification.user,
      role: invite.role,
      bureau: invite.bureau,
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

      user = await upsertUserProfile({
        telegramId,
        name: user.name,
        role: invite.role,
        bureau: invite.bureau
      });
      persistence = "supabase";

      if (invite.id) {
        await markInviteCodeUsed({ id: invite.id, userId: user.id });
      }

      await createAuditLog({
        actor: user,
        action: "redeem_access_code",
        tableName: "users",
        recordId: user.id,
        details: `Telegram user ${telegramId} unlocked ${invite.role}${invite.bureau ? ` / ${invite.bureau}` : ""}.`
      });
    }

    return sendJson(res, 200, {
      status: "redeemed",
      persistence,
      reusable: invite.reusable,
      user,
      supabaseJwt: signSupabaseJwt(user),
      expiresIn: 3600
    });
  } catch (error) {
    if (error instanceof SupabaseRequestError) {
      console.error("Supabase invite persistence failed", error.status, error.payload);
      return sendJson(res, 502, { error: "Supabase persistence failed." });
    }
    console.error("Invite redemption failed", error);
    return sendJson(res, 400, { error: "Invalid invite redemption request." });
  }
}
