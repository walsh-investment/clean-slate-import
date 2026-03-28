# Spec-Kit Verify Extension

Post-implementation spec compliance verification that evaluates implemented code against feature specification artifacts, produces a structured findings report, and appends deduplicated follow-up tasks to `tasks.md`.

## Installation

```bash
specify extension add verify
```

Or install from repository directly:

```bash
specify extension add --from https://github.com/ismaelJimenez/spec-kit-verify/archive/refs/tags/v1.0.0.zip
```

## Usage

After completing implementation with `/speckit.implement`, run the verify command:

```bash
/speckit.verify
```

## What It Does

The verify command runs a wrapper implementation of [`spec-kit-verify`](https://github.com/ismaelJimenez/spec-kit-verify):

1. **Loads feature artifacts** — `spec.md`, `plan.md`, `tasks.md`, plus optional `data-model.md`, `contracts/`, `research.md`, `quickstart.md`.
2. **Evaluates against seven verification categories**:
   - Task Completion — all tasks marked `[x]` with no unjustified skips
   - File Existence — all files referenced in plan.md actually exist on disk
   - Requirement Coverage — each FR-NNN traces to at least one implemented artifact
   - Scenario & Test Coverage — each acceptance scenario is addressable by at least one task
   - Spec Intent Alignment — implemented behavior matches user stories and measurable outcomes
   - Constitution Alignment — all decisions comply with constitution principles
   - Design & Structure Consistency — files match plan.md structure and naming conventions
3. **Produces a structured findings table** with id, category, severity, location, summary, recommendation, and taskable flag.
4. **Appends deduplicated follow-up tasks** under `## Generated Follow-Up Tasks (Verify)` in `tasks.md` for any taskable findings — fingerprint-based deduplication prevents duplicate tasks across runs.
5. **Outputs an augmentation summary** with candidates, appended, duplicate_skipped, and not_taskable counts.

## Automatic Integration

When the `after_implement` hook is enabled, Copilot automatically prompts to run verify after each `/speckit.implement` User Story phase completes. The implement agent runs a convergence loop (up to 3 iterations) before proceeding to the next phase.

## Configuration

The verify hook is configured in `.specify/extensions.yml`:

```yaml
installed:
  - verify

hooks:
  after_implement:
    - extension: verify
      command: speckit.verify
      enabled: true
      optional: true
      prompt: "Run verify to check implementation against spec?"
      description: "Post-implementation spec compliance verification"
```

Set `enabled: false` to disable the automatic hook prompt. The manual `/speckit.verify` command always works regardless of this setting.

## Upstream

This extension is a Speckit-custom wrapper around [`spec-kit-verify`](https://github.com/ismaelJimenez/spec-kit-verify) by [@ismaelJimenez](https://github.com/ismaelJimenez). The upstream extension handles read-only artifact analysis; the wrapper adds task augmentation, deduplication, and implement-agent integration.
