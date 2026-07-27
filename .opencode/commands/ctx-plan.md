---
description: Planning | Build a graph-backed low-token implementation plan
---

OpenCode-only CTX implementation plan for this task:

$ARGUMENTS

Retrieval:
!`'C:\Users\Rusyaidi\.cargo\bin\ctx.exe' --repo-root 'C:\Users\Rusyaidi\Documents\TawePro' retrieve "$ARGUMENTS" --limit 8 --json`

Relevant memory:
!`'C:\Users\Rusyaidi\.cargo\bin\ctx.exe' --repo-root 'C:\Users\Rusyaidi\Documents\TawePro' memory search "$ARGUMENTS" --json`

Graph:
!`'C:\Users\Rusyaidi\.cargo\bin\ctx.exe' --repo-root 'C:\Users\Rusyaidi\Documents\TawePro' graph query "$ARGUMENTS"`

Context pack:
!`'C:\Users\Rusyaidi\.cargo\bin\ctx.exe' --repo-root 'C:\Users\Rusyaidi\Documents\TawePro' pack "$ARGUMENTS" --json`

Render exactly this markdown skeleton:
- `## 🧭 CTX Plan`
- `**Task**`
- `**Intent**`
- `**Relevant Context**`
- `**Token Efficiency**`
- `**Plan**`
- `**Suggested Tests**`
- `**Suggested First Action**`

Under each heading, keep the content concise:
- `**Task**`: one-sentence restatement
- `**Intent**`: classify the work, for example feature, bugfix, refactor, test, docs, or investigation
- `**Relevant Context**`: files, symbols, memory directives, and relationships from the CTX outputs only
- `**Token Efficiency**`: use `original_estimated_tokens`, `packed_tokens`, `reduction_pct`, and `pack_path`
- `**Plan**`: 4-7 ordered implementation steps
- `**Suggested Tests**`: focused verification commands or test files inferred from CTX outputs
- `**Suggested First Action**`: the first file or command OpenCode should use next

Rules:
- do not inspect files manually while planning
- do not implement code
- do not invent files that are not supported by CTX output
- keep the result compact and immediately actionable
