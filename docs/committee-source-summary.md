# Committee Source Summary

Source workbook: `LIDV COMMITTEE TAWE SEM 2 25_26.xlsx`

Detected structure:

- Sheet count: 1
- Committee rows: 65
- Columns: full name, matric number, email, phone number, kulliyyah, mahallah, room number

Privacy decision:

- Personal phone numbers and email addresses are not copied into the frontend bundle.
- The public app should not expose the committee spreadsheet.
- Production should import committee records server-side, then capture Telegram IDs when each committee member opens the Mini App and redeems an access code.

Current app behavior:

- Students enter as guest users and see the public schedule/resources view.
- Committee/head users redeem a manually shared code.
- The reusable committee code should be kept in server-only environment variables for production.

Still needed:

- Final bureau assignment for each committee member.
- Final role assignment: committee or head of bureau.
- Whether one shared code is enough, or whether each bureau/head should receive a separate code.
