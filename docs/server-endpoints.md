# Server Endpoint Contracts

These endpoint contracts assume Vercel serverless functions or an equivalent Node API. The browser app must never call Telegram Bot API directly.

## Shared Rules

- Validate Telegram `initData` before returning an app session.
- Require a server-issued app session for every write endpoint.
- Use Supabase service role only on the server.
- Add one `audit_log` row for every admin, review, broadcast, and access-control action.
- Return safe error messages to the client and detailed errors only to server logs.

## POST /api/auth/telegram

Purpose: validate Telegram Mini App launch data and return the app profile plus Supabase JWT.

Default behavior: unknown Telegram users enter as guest students with public view access. Committee/head access is granted only after redeeming a valid manually shared code.

Request:

```json
{
  "initData": "query_id=...",
  "inviteCode": "CAT-COM-ABC123"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "telegramId": "1001002",
    "name": "Hakim Catering",
    "role": "committee",
    "bureau": "Catering"
  },
  "supabaseJwt": "signed-jwt",
  "expiresIn": 3600
}
```

Security:

- Verify Telegram signature with `TELEGRAM_BOT_TOKEN`.
- If user is new, create or return a guest student profile unless a valid committee/head invite code is provided.
- Put `app_user_id`, `app_role`, `bureau`, and `telegram_id` into the Supabase JWT claims.

## POST /api/invites/redeem

Purpose: redeem a mainboard-created invite code.

Request:

```json
{
  "initData": "query_id=...",
  "code": "WEL-HEAD-2402",
  "displayName": "Nisa Welfare"
}
```

Response:

```json
{
  "status": "redeemed",
  "role": "head",
  "bureau": "Welfare"
}
```

Security:

- Reject expired or used codes.
- Mark `used_by` and `used_at` in the same database transaction that creates or updates the user.

## POST /api/attendance/proofs

Purpose: create a daily punch card proof after a selfie upload.

Request:

```json
{
  "date": "2026-02-23",
  "selfiePath": "attendance-selfies/u-123/2026-02-23.jpg"
}
```

Response:

```json
{
  "id": "uuid",
  "status": "pending_review"
}
```

Security:

- Only `committee` and `head` roles can submit.
- Enforce one proof per user per date.
- Create a notification for Special Task.

## POST /api/attendance/proofs/:id/review

Purpose: let Special Task approve or reject a punch card proof.

Request:

```json
{
  "status": "sent_to_mainboard",
  "reason": "Selfie matches committee identity"
}
```

Response:

```json
{
  "id": "uuid",
  "status": "sent_to_mainboard",
  "reviewedAt": "2026-02-23T09:10:00.000Z"
}
```

Security:

- Only Special Task can call this endpoint.
- Notify mainboard only when status becomes `sent_to_mainboard`.

## POST /api/notifications/send

Purpose: send official notices through Telegram Bot API.

Request:

```json
{
  "title": "Official update",
  "body": "Lunch distribution moves to Dining Zone B.",
  "targetRole": "committee",
  "targetBureau": "Catering",
  "createBanner": true
}
```

Response:

```json
{
  "queued": 28,
  "sent": 27,
  "failed": 1,
  "notificationId": "uuid"
}
```

Security:

- Mainboard only.
- Store send status and Telegram message IDs.
- Avoid sending to revoked users.

## POST /api/broadcasts/emergency

Purpose: send emergency broadcast and create an emergency banner.

Request:

```json
{
  "title": "Emergency update",
  "body": "Move calmly to the Grand Auditorium.",
  "targetRole": "all",
  "targetBureau": "all"
}
```

Response:

```json
{
  "bannerId": "uuid",
  "notificationId": "uuid",
  "sent": 420,
  "failed": 0
}
```

Security:

- Mainboard only.
- Require a confirm step in the client before calling.
- Audit with actor, target, and delivery summary.

## POST /api/schedule

Purpose: create a programme item.

Request: mirrors `schedule_items` fields except `id`, `created_at`, and `updated_at`.

Response:

```json
{
  "id": "uuid"
}
```

Security:

- Mainboard only.

## PATCH /api/schedule/:id

Purpose: update readiness or live state.

Request:

```json
{
  "isLive": true,
  "readinessStatus": "ready"
}
```

Response:

```json
{
  "id": "uuid",
  "isLive": true,
  "readinessStatus": "ready"
}
```

Security:

- Mainboard only.
- When publishing a live item, optionally create an in-app banner.

## POST /api/bureau-operations/:id/alert

Purpose: send a bureau-specific operational alert.

Request:

```json
{
  "message": "Battery rotation needs support before Opening Ceremony."
}
```

Response:

```json
{
  "notificationId": "uuid",
  "sent": 12
}
```

Security:

- Mainboard, bureau head, or same-bureau committee only.
- Target only the operation bureau.
