---
description: Context | Build a compact CTX task context pack
---

Build a compact CTX context pack for this task:

$ARGUMENTS

!`'C:\Users\Rusyaidi\.cargo\bin\ctx.exe' --repo-root 'C:\Users\Rusyaidi\Documents\TawePro' pack "$ARGUMENTS" --json`

Render exactly this compact markdown:
- `## 📦 CTX Pack`
- `**Context**`
- `**Stats**`

Print `compact_context` first under `**Context**`.
Then print one compact stats line under `**Stats**` with `packed_tokens`, `reduction_pct`, and `pack_path`.
Keep any follow-up explanation to at most one short sentence.
