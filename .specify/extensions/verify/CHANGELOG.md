# Changelog

All notable changes to the Verify extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-08

### Added

- Initial release of the Verify extension
- Post-implementation spec compliance verification command (`/speckit.verify`)
- Seven-category evaluation: task completion, file existence, requirement coverage, scenario & test coverage, spec intent alignment, constitution alignment, design & structure consistency
- Structured findings report with id, category, severity, location, summary, recommendation, and taskable flag
- Severity summary table (critical/high/medium/low/info counts)
- Task augmentation: appends deduplicated follow-up tasks under `## Generated Follow-Up Tasks (Verify)` in `tasks.md`
- Fingerprint-based cross-run deduplication — normalized tuple `{category}|{location}|{intent}` prevents duplicate tasks across multiple verify passes
- Augmentation summary table (candidates, appended, duplicate_skipped, not_taskable)
- Error and edge-case handling: missing artifacts, malformed tasks.md, no actionable findings
- `after_implement` hook for automatic per-story verification prompting
- Integration with `/speckit.implement` agent: per-story verify loop with 3-iteration convergence limit and user escalation
- Final comprehensive verify pass after all implementation tasks complete
- Wrapper integration with upstream [`spec-kit-verify`](https://github.com/ismaelJimenez/spec-kit-verify) by @ismaelJimenez
