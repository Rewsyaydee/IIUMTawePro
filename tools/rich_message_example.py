#!/usr/bin/env python3
"""
TawePro — Telegram Bot API 10.3 Rich Messages reference implementation (Python).

Standard library only (urllib). Mirrors api/_lib/rich-messages.js in the
Node.js codebase. Builds an InputRichMessage and sends it via sendRichMessage,
falling back to a legacy plain-text message if the Bot API rejects it.

Usage:
    python tools/rich_message_example.py --token <BOT_TOKEN> --chat-id 605353966
"""

import argparse
import json
import urllib.request

API_BASE = "https://api.telegram.org/bot{token}/{method}"


def build_session_rich_message(session_name, location, time_remaining, web_app_url):
    """Build an InputRichMessage for the 'Session Starting Soon!' alert."""
    return {
        "blocks": [
            {"type": "heading", "text": "⏰ Session Starting Soon!", "size": 2},
            {"type": "paragraph", "text": [{"type": "bold", "text": session_name}]},
            {"type": "paragraph", "text": f"📍 {location}"},
            {"type": "paragraph", "text": f"🕐 {time_remaining}"},
            {
                "type": "buttons",
                "align": "center",
                "buttons": [
                    {
                        "text": "Open TawePro & Check In",
                        "style": "primary",
                        "web_app": {"url": web_app_url},
                    }
                ],
            },
        ]
    }


def send_rich_message(token, chat_id, rich_message):
    """POST /sendRichMessage. Returns the parsed JSON response."""
    body = json.dumps({"chat_id": chat_id, "rich_message": rich_message}).encode("utf-8")
    req = urllib.request.Request(
        API_BASE.format(token=token, method="sendRichMessage"),
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def send_message(token, chat_id, text):
    """Legacy fallback: POST /sendMessage with HTML parse mode."""
    body = json.dumps(
        {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        API_BASE.format(token=token, method="sendMessage"),
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def send_rich_with_fallback(token, chat_id, rich_message, fallback_text):
    """Try the native Rich Message; fall back to legacy text on any failure."""
    try:
        payload = send_rich_message(token, chat_id, rich_message)
        if payload.get("ok"):
            return {"used": "rich", "message_id": payload.get("result", {}).get("message_id")}
        print(f"[rich] sendRichMessage rejected: {payload.get('description')}")
    except Exception as exc:  # noqa: BLE001
        print(f"[rich] sendRichMessage failed: {exc}")

    try:
        payload = send_message(token, chat_id, fallback_text)
        return {"used": "fallback", "message_id": payload.get("result", {}).get("message_id")}
    except Exception as exc:  # noqa: BLE001
        print(f"[rich] legacy fallback failed: {exc}")
        return {"used": "none"}


FALLBACK_TEXT = (
    "⏰ <b>Session Starting Soon!</b>\n\n"
    "<b>Ihsan Madani Session</b>\n"
    "📍 Respective Kulliyyah\n"
    "🕐 Starting in 14 min\n\n"
    "👉 Open TawePro to check in: t.me/iiumtaweprobot"
)


def main():
    parser = argparse.ArgumentParser(description="Send a Telegram Rich Message (Bot API 10.3).")
    parser.add_argument("--token", required=True, help="Telegram bot token")
    parser.add_argument("--chat-id", required=True, help="Target chat id (private chat)")
    parser.add_argument("--web-app-url", default="https://iium-tawe-pro.vercel.app/attendance")
    args = parser.parse_args()

    rich = build_session_rich_message(
        session_name="Ihsan Madani Session",
        location="Respective Kulliyyah",
        time_remaining="Starting in 14 min",
        web_app_url=args.web_app_url,
    )
    print(json.dumps(rich, indent=2, ensure_ascii=False))

    outcome = send_rich_with_fallback(args.token, args.chat_id, rich, FALLBACK_TEXT)
    print(f"Result: {outcome}")
    if outcome["used"] == "none":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
