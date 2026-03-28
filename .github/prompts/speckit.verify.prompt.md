---
description: Run post-implementation verification against spec artifacts and generate follow-up tasks
---

<!-- REPO CONTEXT START -->
<!-- Add repo-specific context paths here. Content inside these markers is preserved during speckit updates. -->
<!-- REPO CONTEXT END -->

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

2. Load the verify command from `.specify/extensions/verify/commands/verify.md`.

3. Execute the full verification workflow as defined in that command file.
