---
description: Debug | Generate a CTX hook or pre-prompt payload
---

Generate a CTX hook payload for this task.

Arguments:
- `$ARGUMENTS`: the task query

!`'C:\Users\Rusyaidi\.cargo\bin\ctx.exe' --repo-root 'C:\Users\Rusyaidi\Documents\TawePro' hook "$ARGUMENTS" --json`

Print `hook_prompt` first.
Then print a single compact metadata line with `packed_tokens`, `reduction_pct`, and `pack_path`.
Keep any usage note to one short sentence.
