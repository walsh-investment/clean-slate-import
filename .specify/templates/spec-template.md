# Feature Specification: [FEATURE NAME]

<!-- 
  This spec follows the structure defined in .specify/templates/spec-template.md.
  See specs/README.md for project layout and conventions.
  See specs/intent/vision.md for product vision.
  See specs/intent/roadmap.md for feature priorities.
-->

<!-- REPO CONTEXT START -->
<!-- Add repo-specific context paths here. Content inside these markers is preserved during speckit updates. -->
<!-- REPO CONTEXT END -->

**Feature Branch**: `[NNN-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]  
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  Each SC must state a user-observable outcome AND a verification method.
  Criteria apply to any task type — software, content, financial models, skill libraries, workflow design, etc.

  ────────────────────────────────────────────────────────────────
  WHAT MAKES A STRONG SC
  ────────────────────────────────────────────────────────────────
  ✓ States what a real person observes or measures, not how it was built
  ✓ Names the verification method (who checks, using what, on what sample)
  ✓ Has a threshold that can fail (if every outcome passes by definition, it's not a criterion)
  ✓ For non-software tasks: uses expert review, time-to-complete, coverage counts, or before/after deltas

  ────────────────────────────────────────────────────────────────
  SUCCESS CRITERIA THEATER — ANTIPATTERNS TO AVOID
  ────────────────────────────────────────────────────────────────

  1. EXISTENCE CHECKS
     Criterion verifies a file, directory, field, or attribute exists rather than that it works.
     ✗ "src/agents/ directory exists with factory functions for all crews"
     ✗ "task_review_crew.py exists and is syntactically valid"
     ✓ Fix: State what the existence enables. "Developers can add a new agent type without modifying Python
       source, verified by executing the add-agent workflow end-to-end with a net-new agent."

  2. CONFIGURATION INSPECTION
     Criterion confirms code is written a certain way (config values, YAML structure, attribute counts)
     rather than that it behaves correctly under real conditions.
     ✗ "All CrewAI agents configured with max_retries=3 (verified by inspecting agent configurations)"
     ✗ "All agent goals include quality standards"
     ✓ Fix: Test the behavior. "When an LLM call fails, the system retries exactly 3 times
       before surfacing an error, observable in structured logs."

  3. SPEC-REFERENCE DISPLACEMENT
     Criterion says "See FR-xxx" or links to another document instead of stating the outcome.
     ✗ "See FR-107 (500-line / 5,000-token body limit with progressive disclosure)"
     ✓ Fix: State it directly. "No built skill exceeds 500 lines, confirmed by sorting the
       built output by line count and reviewing the 10 longest files."

  4. SELF-REFERENTIAL VALIDATION
     The same tool or process that implements the feature is used to verify the feature.
     ✗ "Re-running validation after remediation shows all previous violations resolved"
       (the scanner that found violations verifies its own fixes)
     ✗ "A blocking test exists to require at least 17 Task Attributes on all future tasks"
       (verifies that a test exists, not that the behavior is correct)
     ✓ Fix: Use an independent method. "A reviewer unfamiliar with the refactor can locate
       all 12 agents and their corresponding task factories within 5 minutes using only
       the directory README — no source code browsing required."

  5. COVERAGE WITHOUT ENUMERATION
     Uses "all", "100%", or "every" without defining the complete set.
     ✗ "All constitutional violations identified and categorized by severity"
     ✗ "All deprecated code patterns detected with file paths and line numbers"
     ✓ Fix: Name the set. "100% of the 47 deprecated patterns listed in
       docs/deprecated-patterns.md are detected, with zero false negatives on the reference corpus."

  6. MEASUREMENT THEATER
     Attaches precise-looking numbers to things that cannot actually be measured that way,
     or omits the sampling method and sample size.
     ✗ "Developer confidence in 'deployment ready' claims improves to 100%"
     ✗ "90% of users successfully complete the task" (without specifying: which users, how many, on what input)
     ✓ Fix: Show the instrument. "Measured via post-session survey (n ≥ 5 developers); average
       self-rated confidence increases from baseline by ≥1 point on a 5-point scale."

  7. PROCESS COMPLIANCE AS OUTCOME
     Verifies that a workflow step was followed rather than that value was delivered.
     ✗ "100% of accepted skills include verifiable authored, graded, and revised workflow evidence"
       (checks the process trail, not whether skills are actually good)
     ✗ "Every commit includes a reference to a .specify/ artifact"
     ✓ Fix: State the user-visible result the process is meant to produce.
       "In a random sample of 10 published skills reviewed by a domain expert, at least 9
       are accepted as ready-to-use without structural rework."

  8. VAGUE QUALITY CLAIMS
     Uses unmeasured terms like "clearly", "easily", "properly", or "correctly" without a threshold.
     ✗ "Validation report clearly categorizes issues so developer knows what to fix first"
     ✗ "Error messages are informative and actionable"
     ✓ Fix: Define the threshold and name the ground truth. "Validation report lists critical
       and advisory issues in separate labeled sections; a developer unfamiliar with the codebase
       matches a pre-defined severity ranking for the top 3 issues in under 2 minutes, without
       consulting documentation beyond the report itself."

  ────────────────────────────────────────────────────────────────
  NON-SOFTWARE TASKS (content, models, skill libraries, workflow design, spreadsheets)
  ────────────────────────────────────────────────────────────────
  Standard patterns that work for non-code deliverables:

  • Time-to-outcome for a representative user:
    "A [persona] with [experience level] can produce [deliverable] in under [N minutes] using [tool/method]."
  • Expert-sample validation:
    "A [domain expert] reviewing a random sample of [N] outputs confirms that [X%] meet [criterion]."
  • Enumerated coverage:
    "The library contains at least [N] [items] covering all [M] [categories] defined in [source doc]."
  • Before/after delta:
    "Reduces [manual task] from [baseline time/effort] to [target], verified on [representative scenario]."
  • Zero-defect for specific failure modes:
    "Zero [undesirable thing] found by [method] across [scope]."
  • Human completion test (replaces unit tests):
    "A [persona] unfamiliar with [tool] can complete [task] without consulting documentation, in under [time]."
-->

### Measurable Outcomes

- **SC-001**: [User journey + time bound, e.g., "A first-time user can complete [primary task] in under [N] minutes without consulting documentation"]
- **SC-002**: [Quality threshold with verification method, e.g., "[X%] of [outputs] require fewer than [N] corrections before being usable, verified on a sample of [N] by [reviewer type]"]
- **SC-003**: [Zero-defect criterion, e.g., "Zero [failure mode] detected by [method] across [full scope — enumerate or cite source]"]
- **SC-004**: [Before/after or coverage delta, e.g., "[Task] that previously required [baseline] can be completed in under [target], measured on [representative scenario]"]

