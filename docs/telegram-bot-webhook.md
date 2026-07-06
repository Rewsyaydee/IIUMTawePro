# Telegram Bot Webhook

The Mini App runs on Vercel, but the Telegram bot reply for `/start` should be handled by a Vercel API route:

```text
POST /api/telegram/webhook
```

## What It Sends

When a user sends `/start`, the bot replies with:

- TawePro welcome message
- Telegram ID
- Telegram username when available
- First name
- Access level
- Inline button to open the Mini App dashboard
- Inline button for wellbeing support
- Inline button for the official PDF schedule screen

## Required Vercel Variables

```env
TELEGRAM_BOT_TOKEN=server-only
TELEGRAM_WEB_APP_URL=https://iium-tawe-pro.vercel.app
```

Optional:

```env
TELEGRAM_WEBHOOK_SECRET=random-long-secret
WELLBEING_SUPPORT_URL=https://iium-tawe-pro.vercel.app/wellbeing
COMMITTEE_TELEGRAM_IDS=123456789,987654321
COMMITTEE_BUREAU_BY_TELEGRAM_ID=123456789:Special Task,987654321:Welfare
DEFAULT_COMMITTEE_BUREAU=Special Task
```

Without `COMMITTEE_TELEGRAM_IDS`, the bot treats users as students until the real Supabase user lookup is wired.

## Set The Webhook

Use the Telegram Bot API after deployment:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://iium-tawe-pro.vercel.app/api/telegram/webhook"
```

If you use `TELEGRAM_WEBHOOK_SECRET`, include it:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://iium-tawe-pro.vercel.app/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Keep the bot token out of GitHub and browser code.

## Debug No Reply

Check whether Telegram is actually pointing to Vercel:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

Confirm:

- `url` is `https://iium-tawe-pro.vercel.app/api/telegram/webhook`
- `last_error_message` is empty
- Vercel has been redeployed after adding `TELEGRAM_BOT_TOKEN`
- Opening `https://iium-tawe-pro.vercel.app/api/telegram/webhook` returns `{"ok":true,"endpoint":"telegram-webhook"}`
