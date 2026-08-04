# TawePro UX & Production Audit

Audit date: 4 August 2026 · App version 0.1.0

Priorities: **P0** = fix before/at event day · **P1** = next sprint · **P2** = nice to have.

---

## A. Fixed in the 4 Aug 2026 pass (see git log)

| # | Item | What changed |
|---|---|---|
| 1 | Bot "View Schedule" 404 | `vercel.json` SPA rewrite added (`/((?!api/).*)` → `/index.html`); Wellbeing buttons converted from `url:` to `web_app:` in `api/telegram/webhook.js` |
| 2 | Notifications not server-driven | `api/cron/notifications.js`: real KL-clock via `Intl`, DB-backed dedup (`notification_sends`), ±15 min windows, heartbeat row, `?force=1` for tests; runbook in `docs/notifications-runbook.md` |
| 3 | Attendance 400 "Event ID and location are required" | `attendance.submit` now accepts `0` coords; `CheckInForm` seeds venue coords when `SKIP_GPS`; leaderboard resolves synthetic `block-` ids via `blockMap` |
| 4 | Schedule timeline empty | Date nav derived from data (Aug 1–9), prep week shows, page + carousel fetch `schedule.list` in API mode (`useApiSchedule`) |
| 5 | Welfare "Responded" 500 | Error logging now includes Supabase payload; status flow relabelled Pending/Responding/Resolved; resolved reports moved to history section; per-card busy states |
| 6 | Wellbeing alerts | `wellbeing.submit` fire-and-forget Telegram alert to all Welfare bureau users |
| 7 | Wellbeing prefill | Student name from profile; phone persisted (`users.phone` + local fallback) |
| 8 | News broadcast | `announcements.create` broadcasts to all users unless "Also notify via Telegram" is unchecked (default ON) |
| 9 | Bureau members | `telegram_username` captured in bot; `bureau.members` RPC; `/members` page; task form multi-select assignees → `assigned_to_ids` |
| 10 | Support hub | New `/support` page (Stars via `api/donate` + `openInvoice`, DuitNow QR slot, docs, links, developer, app info, permissions, credits) |
| 11 | Loading states | Tasks/Wellbeing/Mainboard/BureauOps mutations now disable + indicate busy |
| 12 | Streak copy | "Complete all 7 days to claim your Ta'aruf Kit." · reward `TAARUF KIT`; `+200 SP` removed |
| 13 | Mainboard mock user | "Add Mock User" form removed |
| 14 | Story images | Server-side `api/og.jsx` (`@vercel/og`) with 5 templates + preview in Stories; canvas kept as fallback |
| 15 | CheckInReminder dead code | `Math.round(isWithinRadius)` → real `calculateDistance` |

## B. New schema (run in Supabase SQL editor)

1. `supabase/notification-sends.sql` — `notification_sends` dedup/heartbeat table.
2. `supabase/schema.sql` additions (idempotent) — `users.phone`, `users.telegram_username`, `poa_tasks.assigned_to_ids uuid[]`.

## C. Remaining findings

### C1. Reliability / production (P0)

1. **Broadcast timeouts.** `broadcastToTargets` (25/batch, 1s between batches, 8 concurrency) is AWAITED by `notify.send`, `notify.emergency`, `ops.alert`, and now `announcements.create`. On Vercel Hobby the 10s function timeout will cut off large audiences (~>100 users) and the UI may report failure although messages went out.
   → **Fix:** don't await; return `{ queued }` immediately and run the loop in the background (`await` removed; `.catch` logged). Announcements already fire-and-forget; do the same for notices/emergency/ops alerts, or move sends into a `notification_sends`-style queue row processed by the cron.
2. **Mainboard attendance metrics are always 0 in API mode.** `Mainboard.tsx` `metrics` reads `attendanceProofs` from the mock context even when `apiMode` (lines ~186–187). Wire to `listAllAttendance()` or `attendance.mainboard.list` and compute pending/verified from remote data.
3. **Leaderboard fetch is heavy & uncached.** `leaderboard.fetch` pulls up to 5000 attendance rows + 200 schedule + 5000 users on every call. Add the 30s cache (like `schedule.list`) and a `limit` param.
4. **Invite codes are mock-only in the admin UI.** The dashboard's "Generate invite code" writes to local state; real invites come from `COMMITTEE_ACCESS_CODES`/`HEAD_ACCESS_CODES`/`MAINBOARD_ACCESS_CODES` env vars via `api/invites/redeem`. Either wire invite generation to a `invite_codes` DB table + RPC or relabel the section to avoid implying persistence.

### C2. UX inconsistencies (P1)

5. **Carousel "Check in?" on non-block events** navigates to `/attendance` with no state → the page shows the generic "Ready to Check In?" empty state. Disable the button when `item.block`/`blockGroup` is absent, or route to the schedule page.
6. **Check-in "Short Note" is ignored in API mode** — it is only passed as `note` in mock mode. Send it as `excuse` in `attendance.submit` so notes survive.
7. **Stories/Streak/StudentAttendanceView/CheckInReminder still read the bundled mock schedule** in API mode. The seed mirrors the bundle today, but mainboard edits won't appear there. Migrate to `useApiSchedule(apiMode)` for consistency.
8. **Streak semantics:** progress counts 8 required *events* while the copy now says "7 days". Either group check-ins by day for the hero counter or adjust copy to match event-count mechanics (content decision).
9. **Committee punch card windows are fixed 8:00–8:30 / 17:00–17:30** using the virtual clock; during preparation week the virtual clock shifts days and can mislead. Consider gating the punch card to event week only.
10. **Empty-state text in Tasks** says "Tasks for X will appear here" — fine, but the assignee picker has no hint when the current user isn't in a bureau (mainboard). Acceptable; consider defaulting to all bureaus for mainboard.
11. **`notifications` table (public) is unused** — the mainboard "Mock sends" list in API mode shows local mock records, not real sends. Optionally insert a row per broadcast (`send_status` column exists) and surface it.

### C3. Performance / edge cases (P2)

12. `schedule.list` public cache 30s — good; consider 60s during event week.
13. Live-notification dedup key uses `scheduled_start_time` — two sessions sharing a start time produce one message. Fine in practice.
14. `upsertUser` overwrites `telegram_username` on every message; harmless, but add it to `mapSupabaseUser`/`getUserById` select if future pages need it (Members page uses its own query — OK).
15. Story uploads write every card to `story-cards` bucket permanently; consider a retention sweep (e.g. delete > 7 days old) via cron.

### C4. Opportunities (P2)

16. **Bot `/schedule` command** — replies with today's sessions (nice parity with "View Schedule"). Currently the bot has `/start`, `/unlock`, `/notifications`, `/help` only.
17. **Announcement deep-link** — include a `web_app` keyboard button on announcement broadcasts that opens `/announcements`.
18. **`bureau.members` in bot** — optional `/members` bot command listing the bureau roster.
19. **Welfare: phone number on report cards** — show `report.phone` to Welfare (privacy-scoped, welfare-only) so responders can call back without opening the app.

## D. Skills discovery (item 13)

`npx skills find "telegram bot mini app"` surfaced general TWA architect skills
(`sickn33/antigravity-awesome-skills@telegram-mini-app`, `@telegram-bot-builder`, etc.).
Reviewed `telegram-mini-app` — it is a role/architecture prompt, not repo-specific code.
No install needed: this project already follows the ecosystem patterns it recommends
(`web_app` buttons, `openInvoice` for Stars, `HapticFeedback`, `SecureStorage`,
Edge-rendered `@vercel/og`). Re-run the scan when starting a new feature area.

## E. Verification checklist after deploy

- [ ] `https://iium-tawe-pro.vercel.app/official-schedule` loads (SPA rewrite live).
- [ ] Bot `/start` → "View Schedule" and "Wellbeing Support" open in the Mini App.
- [ ] `select * from notification_sends order by sent_at desc limit 5;` shows `ping` rows growing (external pinger set up).
- [ ] `node tests/test-notify.cjs 8 30 2026-08-03` → debug shows morning trigger with users.
- [ ] Student check-in from home carousel succeeds (GPS bypass active).
- [ ] Schedule page date nav shows Aug 1–9 with items per day.
- [ ] Welfare submit → Welfare committee receives instant Telegram alert.
- [ ] `/members` shows bureau roster; task form shows member checkboxes.
- [ ] `/support` shows Stars amounts + DuitNow QR (after QR asset is added).
