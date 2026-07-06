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

Purpose: create a daily punch card proof and upload the selfie to private Supabase Storage. The frontend sends a browser `data:image/...;base64,...` value; the server stores it in `attendance-selfies` and writes the storage path to `attendance_proofs`.

Authorization: `Authorization: Bearer <supabaseJwt>` returned by `/api/auth/telegram` or `/api/invites/redeem`.

Request:

```json
{
  "selfieDataUrl": "data:image/jpeg;base64,..."
}
```

Response:

```json
{
  "status": "submitted",
  "proof": {
    "id": "uuid",
    "date": "2026-02-23",
    "userId": "uuid",
    "telegramId": "1001002",
    "committeeName": "Hakim Catering",
    "bureau": "Catering",
    "selfieDataUrl": "https://...signed-url...",
    "submittedAt": "2026-02-23T09:10:00.000Z",
    "status": "pending_review"
  }
}
```

Security:

- Only `committee` and `head` roles can submit.
- Enforce one active proof per user per Malaysia date.
- Let rejected proofs be resubmitted for the same date.
- Create an `audit_log` row for each submission.

## GET /api/attendance/proofs

Purpose: return attendance records visible to the signed-in app user.

Authorization: `Authorization: Bearer <supabaseJwt>`.

Visibility:

- Committee/head users receive their own records.
- Special Task receives all records for review.
- Mainboard receives records already sent to mainboard.

## POST /api/attendance/proofs/:id/review

Purpose: let Special Task approve or reject a punch card proof.

Authorization: `Authorization: Bearer <supabaseJwt>`.

Request:

```json
{
  "status": "sent_to_mainboard"
}
```

Response:

```json
{
  "status": "reviewed",
  "proof": {
    "id": "uuid",
    "status": "sent_to_mainboard",
    "reviewedBy": "uuid",
    "reviewedAt": "2026-02-23T09:10:00.000Z"
  }
}
```

Security:

- Only Special Task can call this endpoint.
- Status must be `sent_to_mainboard` or `rejected`.
- Create an `audit_log` row for each review.

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
