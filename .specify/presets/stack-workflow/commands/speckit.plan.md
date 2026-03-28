---
description: Execute the implementation planning workflow to generate design artifacts, test-plan.md, and formula spec blocks for quantitative requirements.
handoffs: 
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Create Checklist
    agent: speckit.checklist
    prompt: Create a checklist for the following domain...
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

1. **Setup**: Run `.specify/scripts/powershell/setup-plan.ps1 -Json` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN — if the file existed before setup (script output says "already exists, skipping"), this is the existing plan to update; if newly created, this is the template to fill. If IMPL_PLAN already contains content beyond the template, you are updating an existing plan — preserve existing sections and only modify what the user requested.

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Phase 1: Update agent context by running the agent script
   - Re-evaluate Constitution Check post-design

4. **Test Plan Generation** (stack-workflow preset — US5): After completing the standard plan artifacts, generate test-plan.md per the rules in the Test Plan section below.

5. **Formula Spec Generation** (stack-workflow preset — US7): After completing test-plan.md, scan spec.md FRs for quantitative indicators and produce the `## Formula Spec` section in data-model.md if applicable, per the rules in the Formula Spec section below.

6. **Stop and report**: Command ends after all phases. Report branch, IMPL_PLAN path, generated artifacts including test-plan.md (if produced) and any formula spec additions.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Define interface contracts** (if project has external interfaces) → `/contracts/`:
   - Identify what interfaces the project exposes to users or other systems
   - Document the contract format appropriate for the project type
   - Examples: public APIs for libraries, command schemas for CLI tools, endpoints for web services, grammars for parsers, UI contracts for applications
   - Skip if project is purely internal (build scripts, one-off tools, etc.)

3. **Agent context update**:
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
   - These scripts detect which AI agent is in use
   - Update the appropriate agent-specific context file
   - Add only new technology from current plan
   - Preserve manual additions between markers

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

---

## Test Plan Generation (stack-workflow preset — US5)

### When to Produce test-plan.md

Always produce `test-plan.md` in the feature directory (`FEATURE_DIR/test-plan.md`) when the stack-workflow preset is installed. This is additive to the standard plan artifacts.

### Skill Detection

Before generating test-plan.md, check for the test-theater skill:

```
IF EXISTS: skills/detecting-test-theater/SKILL.md  →  full risk analysis (skill available)
IF EXISTS: .claude/skills/detecting-test-theater/SKILL.md  →  full risk analysis (skill available)
OTHERWISE  →  basic test-plan.md without risk analysis section
```

### test-plan.md Structure

```markdown
# Test Plan: [FEATURE NAME]

**Feature**: [NNN-feature-name]
**Date**: [DATE]
**Source**: spec.md acceptance scenarios + scenario matrices

## Coverage Analysis

| User Story | Acceptance Scenarios | Scenario Matrix Rows | Coverage Gaps |
|------------|---------------------|---------------------|---------------|
| US1        | N                   | M                   | [gaps or "None"] |
| US2        | N                   | M                   | [gaps or "None"] |

## Risk Analysis

<!-- Include this section ONLY when test-theater skill is available -->

| Risk | Severity | Pattern | Mitigation |
|------|----------|---------|------------|
| [risk description] | High/Medium/Low | [test-theater pattern] | [mitigation] |

<!-- When test-theater skill is NOT available, replace the table with: -->
> Test-theater skill not detected. Risk analysis limited to spec-derived coverage gaps.

## Scenario Priorities

| Priority | Scenario | Rationale |
|----------|----------|-----------|
| 1        | [scenario reference] | [why test first] |
| 2        | [scenario reference] | [why test second] |
```

### Coverage Analysis Rules

- One row per user story — count acceptance scenarios from the **Given/When/Then** lines in spec.md
- Scenario Matrix Rows — count rows in `### Scenarios` tables in spec.md (if present)
- Coverage Gaps — identify which FR variants have no acceptance scenario or scenario matrix row

### Risk Analysis Rules (when test-theater skill available)

- Reference test patterns from SKILL.md in risk description
- Severity: High (data integrity, security), Medium (functional correctness), Low (UX, edge cases)
- Mitigation: Reference the specific test-theater pattern that addresses the risk

### Scenario Priorities Rules

- Order scenarios by: (1) highest severity risk, (2) most FRs covered, (3) story priority
- Reference the user story and acceptance scenario or `### Scenarios` row by number

---

## Formula Spec Generation (stack-workflow preset — US7)

### Quantitative FR Detection

After generating data-model.md, scan all FR text in spec.md for quantitative indicators (case-insensitive):

**Keywords**: `formula`, `calculation`, `accumulation`, `depreciation`, `amortization`, `sum`, `total`, `multiply`, `divide`, `percentage`, `ratio`, `Excel`, `financial`, `compounding`, `interest`, `NPV`, `IRR`, `SUM()`, `VLOOKUP()`

**Symbols**: `$`, `%`

**Threshold**: At least one FR must contain at least one indicator to trigger generation.

### When to Generate

```
IF any FR contains a quantitative indicator  →  append ## Formula Spec to data-model.md
IF no quantitative indicators found          →  OMIT section entirely (no empty section)
```

### Formula Spec Block Structure

Append as a new section at the end of `data-model.md`:

```markdown
## Formula Spec

### [Entity].[Field]

​```
[field] = [algebraic expression]
where:
  [variable] = [source description]
  [variable] = [source description]
​```

**Constraints**: [rounding rules, min/max bounds, sign rules]
**FR**: [FR-NNN]
```

### Formula Spec Rules

- One `### [Entity].[Field]` block per distinct quantitative computation
- Use algebraic notation (not prose): `depreciation = (cost - salvage) / useful_life`
- `where:` clause maps each variable to its data source (e.g., field name, input parameter, constant)
- **Constraints** line is required: specify rounding (e.g., round to 2 decimal places), min/max (e.g., >= 0), and sign rules (e.g., always negative for expenses)
- **FR** line must reference the functional requirement that mandates this computation
- For mixed specs (some quantitative FRs, some not): cover only the quantitative FRs — do not include non-quantitative entities in this section

---

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
