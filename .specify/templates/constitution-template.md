# [PROJECT_NAME] Constitution
<!-- Example: Spec Constitution, TaskFlow Constitution, etc. -->

<!--
  PRINCIPLE HEADING FORMAT
  ========================
  All principle headings MUST follow this exact format:
    ### [Roman numeral]. [Principle Name]
  Examples:
    ### I. Specifications as Lingua Franca
    ### VIII. Library-First Architecture

  VALIDITY CONDITIONS
  ===================
  A constitution.md is valid when:
  1. Both <!-- GLOBAL CONSTITUTION START/END --> markers are present and non-empty.
  2. Both <!-- REPO CONSTITUTION START/END --> markers are present (content may be empty).
  3. The global section appears before the repo-specific section in the file.
  4. All principle headings match the ### [Roman numeral]. [Name] format.
  5. No ordinal is used twice across both sections.
  6. No principle name appears in both sections (no semantic duplicates).

  EDITING RULES
  =============
  - The GLOBAL section is managed by the canonical source (Speckit-custom).
    DO NOT edit content between the GLOBAL CONSTITUTION START/END markers.
    Global principles can only be changed in .specify/memory/global-constitution.md
    in the canonical repo, then propagated via fleet rollout.
  - The REPO section is where project-specific principles live.
    Add, edit, or remove principles in the repo-specific section freely.
  - The rollout renumbers all principles automatically: globals first (I–N),
    then repo-specific (N+1 onward). Manual renumbering is not required.
-->

<!-- GLOBAL CONSTITUTION START -->
<!-- Content injected by rollout from .specify/memory/global-constitution.md -->
<!-- GLOBAL CONSTITUTION END -->

<!-- REPO CONSTITUTION START -->
## [PROJECT_NAME]-Specific Principles
<!-- Add repo-specific principles below. Use the heading format: ### [Roman numeral]. [Name] -->
<!-- The rollout will assign correct Roman numeral ordinals automatically. -->

### [PRINCIPLE_1_NAME]
<!-- Example: VIII. Library-First Architecture -->
[PRINCIPLE_1_DESCRIPTION]
<!-- Example: Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries -->
<!-- REPO CONSTITUTION END -->

## [SECTION_2_NAME]
<!-- Example: Additional Constraints, Security Requirements, Performance Standards, etc. -->

[SECTION_2_CONTENT]
<!-- Example: Technology stack requirements, compliance standards, deployment policies, etc. -->

## [SECTION_3_NAME]
<!-- Example: Development Workflow, Review Process, Quality Gates, etc. -->

[SECTION_3_CONTENT]
<!-- Example: Code review requirements, testing gates, deployment approval process, etc. -->

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

[GOVERNANCE_RULES]
<!-- Example: All PRs/reviews must verify compliance; Complexity must be justified; Use [GUIDANCE_FILE] for runtime development guidance -->

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->
