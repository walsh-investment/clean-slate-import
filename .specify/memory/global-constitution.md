## Global Principles
*(managed by canonical source — do not edit directly)*

### I. Specifications as the Lingua Franca

The specification is the primary artifact. Code is its expression
in a particular language and framework. Maintaining software means
evolving specifications, not patching code in isolation.

- Every feature MUST begin as a specification before any
  implementation.
- `specs/intent/vision.md` MUST define the strategic intent and
  desired operating model that all feature specifications align
  to; specs may refine implementation detail but MUST NOT
  contradict vision-level direction without an explicit vision
  update.
- Specifications MUST be the authoritative source for what the
  system does and why.
- Changes to system behavior MUST originate as specification
  amendments; code follows.

### II. Executable Specifications

Specifications MUST be precise, complete, and unambiguous enough
to generate working systems. This eliminates the gap between
intent and implementation.

- Each specification MUST include testable acceptance scenarios
  with Given/When/Then structure.
- Requirements MUST use RFC 2119 language (MUST, SHOULD, MAY)
  to remove ambiguity.
- Vague terms (e.g., "should handle errors gracefully") MUST be
  replaced with measurable criteria.

### III. Continuous Refinement

Consistency validation happens continuously, not as a one-time
gate. AI agents analyze specifications for ambiguity,
contradictions, and gaps as an ongoing process.

- The `/speckit.analyze` command MUST be run once after
  `/speckit.tasks` completes and before `/speckit.implement`
  begins to detect drift, duplication, and coverage gaps.
- Running `/speckit.analyze` at additional checkpoints (for
  example after `/speckit.specify` or `/speckit.plan`) is
  RECOMMENDED but optional.
- Constitution compliance MUST be checked during
  `/speckit.plan` and re-verified after design artifacts are
  finalized in `/speckit.tasks` (before implementation starts).
- Specifications MUST be living documents: updated when new
  information surfaces, not frozen at creation.

### IV. Research-Driven Context

Research agents gather critical context throughout the
specification process, investigating technical options,
performance implications, and organizational constraints.

- Every implementation plan MUST include a research phase
  (Phase 0) that investigates alternatives before committing
  to an approach.
- Prompts and templates MUST reference real file paths—not
  vague instructions like "follow established patterns."
- Required context files MUST exist before a command proceeds.
  If missing, the command MUST fail and require the user to
  create or fix the path.

### V. Bidirectional Feedback

Production reality informs specification evolution. Metrics,
incidents, and operational learnings become inputs for
specification refinement.

- Post-implementation findings (e.g., performance bottlenecks,
  user behavior) MUST be fed back into the specification as
  clarifications or amendments.
- Specifications that diverge from production reality MUST be
  flagged for reconciliation.
- The specification lifecycle does not end at implementation—it
  continues as long as the feature exists.

### VI. No Test Theater

Verification MUST be appropriate to the artifact. No placeholder
tests, no mocks-for-the-sake-of-coverage, no testing artifacts
that exist only to satisfy a metric.

- Tests are OPTIONAL unless explicitly required by the feature
  specification.
- When tests are required, they MUST validate real behavior
  against acceptance scenarios—not implementation details.
- Meta-workflow features (prompts, templates, scripts) use manual
  verification: run the command, inspect that context loads and
  outputs improve.

### VII. Don't Repeat Yourself (DRY)

Context, commands, and corrections MUST NOT require manual
re-insertion by User. If an agent repeatedly makes the same mistake
because it lacks contextual awareness of repo structure or
existing code, the workflow is violating DRY—forcing the user
to re-explain what the system already knows.

- Repo structure, key paths, and conventions MUST be delivered
  automatically via agent instructions and prompt files. The
  user MUST NOT need to manually paste this context.
- When an agent error recurs across sessions, the fix MUST be
  encoded into a persistent artifact (agent instruction,
  prompt, template, or constitution amendment)—not repeated
  verbally each time.
- Specifications, plans, and tasks MUST NOT duplicate
  information that lives in a single authoritative source.
  Reference the source; do not copy its content.
- If a command requires context that already exists in the
  repo, it MUST read that context automatically rather than
  requiring the user to supply it.
