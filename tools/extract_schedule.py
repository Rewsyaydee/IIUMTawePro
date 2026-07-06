from __future__ import annotations

import json
import pathlib
import re
import sys

MONTHS = {"February": "02"}
BUREAUS = {
    "registration": "Registration",
    "medical": "Welfare",
    "counselling": "Welfare",
    "sejahtera": "Welfare",
    "video": "Multimedia",
    "prayer": "Discipline",
    "mahallah": "Discipline",
    "usrah": "Discipline",
    "bai": "Discipline",
    "bus": "Special Task",
    "departure": "Special Task",
}


def strip_markdown(value: str) -> str:
    value = re.sub(r"\*\*|\*", "", value)
    value = re.sub(r"\([^)]*\)", "", value)
    return value.strip()


def extract(path: pathlib.Path) -> list[dict[str, str]]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    date_re = re.compile(r"^### (?:(Day \d+): )?([A-Za-z]+), (\d{1,2}) (February) 2026")
    item_re = re.compile(r"^\* \*\*(.*?)\*\*(?: \| (.*))?$")
    time_re = re.compile(r"(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})")
    current: dict[str, str] | None = None
    rows: list[dict[str, str]] = []

    for index, line in enumerate(lines):
        date_match = date_re.match(line)
        if date_match:
            current = {
                "day": date_match.group(2),
                "date": f"2026-{MONTHS[date_match.group(4)]}-{int(date_match.group(3)):02d}",
                "header": line[4:],
            }
            continue

        if not current:
            continue

        item_match = item_re.match(line)
        if not item_match:
            continue

        label = item_match.group(1)
        rest = item_match.group(2) or ""
        details: list[str] = []
        cursor = index + 1
        while cursor < len(lines) and lines[cursor].startswith("  *"):
            details.append(lines[cursor].strip())
            cursor += 1

        location = "TBC"
        audience = "All"
        explicit_time = ""
        for detail in details:
            if detail.startswith("* **Location:**"):
                location = re.sub(r"^\* \*\*Location:\*\*\s*", "", detail)
            elif detail.startswith("* **Target Audience:**"):
                audience = "Students"
            elif detail.startswith("* **Time:**"):
                explicit_time = re.sub(r"^\* \*\*Time:\*\*\s*", "", detail)
            elif detail.startswith("* **Departure Time:**"):
                explicit_time = re.sub(r"^\* \*\*Departure Time:\*\*\s*", "", detail).replace(" AM", "")

        time_match = time_re.search(label) or time_re.search(explicit_time)
        if time_match:
            start, end = time_match.group(1), time_match.group(2)
            title = rest if time_re.search(label) else label
        elif re.search(r"\d{1,2}:\d{2}", explicit_time):
            start = re.search(r"\d{1,2}:\d{2}", explicit_time).group(0)
            end = "10:30"
            title = label
        elif label.lower().startswith("evening"):
            start, end, title = "20:00", "22:00", rest or label
        elif "Tarawikh" in label:
            start, end, title = "22:00", "23:00", rest or label
        elif "Remaining Time" in label:
            start, end, title = "17:00", "22:00", label
        else:
            start, end, title = "09:00", "22:00", label

        title = strip_markdown(title) or label
        text_blob = f"{title} {location}".lower()
        responsible_bureau = "Program Coordinator"
        for needle, bureau in BUREAUS.items():
            if needle in text_blob:
                responsible_bureau = bureau
                break

        tag = "Programme"
        if "test" in text_blob:
            tag = "Placement Test"
        elif "registration" in text_blob:
            tag = "Registration"
        elif "prayer" in text_blob:
            tag = "Prayer"
        elif "briefing" in text_blob:
            tag = "Briefing"
        elif "bus" in text_blob:
            tag = "Departure"

        rows.append(
            {
                "date": current["date"],
                "day": current["day"],
                "week": "preparation" if current["date"] < "2026-02-23" else "event_week",
                "scheduledStartTime": start,
                "scheduledEndTime": end,
                "title": title,
                "venue": location,
                "tag": tag,
                "audience": audience,
                "responsibleBureau": responsible_bureau,
                "description": current["header"],
            }
        )

    return rows


if __name__ == "__main__":
    source = pathlib.Path(sys.argv[1])
    print(json.dumps(extract(source), indent=2))
