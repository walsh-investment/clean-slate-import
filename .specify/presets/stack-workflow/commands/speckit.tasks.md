---
description: Generate an actionable, dependency-ordered tasks.md with test-plan integration, contract sync tasks, per-story close-out blocks, and cross-repo attestation.
handoffs: 
  - label: Analyze For Consistency
    agent: speckit.analyze
    prompt: Run a project analysis for consistency
    send: true
  - label: Implement Project
    agent: speckit.implement
    prompt: Start the implementation in phases
    send: true
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

1. **Setup**: Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load design documents**: Read from FEATURE_DIR:
   - **Required**: plan.md (tech stack, libraries, structure), spec.md (user stories with priorities)
   - **Optional**: data-model.md (entities), contracts/ (interface contracts), research.md (decisions), quickstart.md (test scenarios)
   - **Optional**: test-plan.md (produced by speckit.plan with stack-workflow preset)
   - Note: Not all projects have all documents. Generate tasks based on what's available.

3. **Execute task generation workflow**:
   - Load plan.md and extract tech stack, libraries, project structure
   - Load spec.md and extract user stories with their priorities (P1, P2, P3, etc.)
   - If data-model.md exists: Extract entities and map to user stories
   - If contracts/ exists: Map interface contracts to user stories
   - If research.md exists: Extract decisions for setup tasks
   - If test-plan.md exists: Extract test priorities and coverage gaps (see Test-Plan Integration below)
   - Generate tasks organized by user story (see Task Generation Rules below)
   - **For each user story phase**: Append structural task blocks per the stack-workflow preset rules (see Structural Task Blocks below)
   - Generate dependency graph showing user story completion order
   - Create parallel execution examples per user story
   - Validate task completeness (each user story has all needed tasks, independently testable)

4. **Generate tasks.md**: Use `.specify/templates/tasks-template.md` as structure, fill with:
   - Correct feature name from plan.md
   - Phase 1: Setup tasks (project initialization)
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: One phase per user story (in priority order from spec.md)
   - Each phase includes: story goal, independent test criteria, tests (if requested), implementation tasks, **structural task blocks** (contract sync if applicable, close-out, attestation if applicable)
   - Final Phase: Polish & cross-cutting concerns
   - All tasks must follow the strict checklist format (see Task Generation Rules below)
   - Clear file paths for each task
   - Dependencies section showing story completion order
   - Parallel execution examples per story
   - Implementation strategy section (MVP first, incremental delivery)

5. **Report**: Output path to generated tasks.md and summary:
   - Total task count
   - Task count per user story
   - Parallel opportunities identified
   - Independent test criteria for each story
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file paths)
   - Structural task blocks summary: number of contract sync tasks, close-out blocks, attestation tasks generated

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.

---

## Test-Plan Integration (stack-workflow preset — US5)

When `FEATURE_DIR/test-plan.md` exists, incorporate its findings before generating tasks:

### Coverage Gap Tasks

For each Coverage Gap identified in test-plan.md (rows where Coverage Gaps ≠ "None"):
- Add a task in the relevant user story phase: `[T-NNN] [US-N] Address coverage gap: [gap description] — add acceptance scenario or scenario matrix row for FR-NNN`
- Position before close-out tasks but after implementation tasks

### High-Severity Risk Tasks

For each row in test-plan.md Risk Analysis with Severity = "High":
- Add a task in the relevant user story phase: `[T-NNN] [US-N] Mitigate [risk description] via [mitigation] (test-plan risk)`
- Position before coverage gap tasks

### Scenario Priority Tasks

When test-plan.md Scenario Priorities table has entries:
- Add a comment in the relevant phase noting priority order: `<!-- Test-plan scenario priorities: [priority descriptions] -->`
- This is informational only — no separate implementation tasks

---

## Structural Task Blocks (stack-workflow preset — US8)

After generating all standard implementation tasks for each user story phase, append the following **structural task blocks** in this order:

### 1. Contract Sync Task (conditional)

**Detection**: `contracts/` directory exists in FEATURE_DIR.

**When to append**: For each user story that references contract entities, append as the last implementation task before close-out.

**Task format**:
```markdown
- [ ] [T-NNN] [US-N] Sync contracts/*.md — verify every enum, key name, and status value matches implementation output
```

**Rules**:
- One task per user story that references contract entities
- If no `contracts/` directory: omit entirely (no placeholder, no comment)
- If contracts/ exists but a specific user story has no contract references: omit for that story

### 2. Close-Out Task Block (always)

**Detection**: Always generated for every user story phase, regardless of story content.

**Append at the end of each user story phase** (after contract sync if present):

```markdown
#### Close-Out
- [ ] [T-NNN] [US-N] Update spec.md status for User Story N
- [ ] [T-NNN] [US-N] Sync plan.md file listing with actual artifacts created
- [ ] [T-NNN] [US-N] Verify task count accuracy (planned vs actual completed)
- [ ] [T-NNN] [US-N] Update tech-debt-report if applicable
```

**Rules**:
- Always exactly 4 tasks per user story
- Positioned at the end of each user story phase (after all implementation tasks and contract sync)
- For infrastructure-only features (no user story phases): append a single close-out block at the end of the task list — omit the `[US-N]` story label from the 4 tasks

### 3. Cross-Repo Attestation Task (conditional)

**Detection**: Scan spec.md full text for the regex pattern `C:\\Repos\\[A-Z][a-zA-Z]+`.

**When to append**: For each unique external repository path found, append one attestation task after the close-out block of the last user story phase (or at the end of the task list).

**Task format**:
```markdown
- [ ] [T-NNN] Cross-repo attestation for [OtherRepo]:
  - Commit SHA: ___
  - File path: ___
  - SHA-256 hash: ___
```

**Rules**:
- One attestation task per unique external repository name (e.g., one for `C:\Repos\Accounting`, one for `C:\Repos\Frontend`)
- If no cross-repo paths found in spec.md: omit entirely
- Multiple external repos → multiple attestation tasks, one per unique repo

---

## Task Generation Rules

**CRITICAL**: Tasks MUST be organized by user story to enable independent implementation and testing.

**Tests are OPTIONAL**: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach.

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential number (T001, T002, T003...) in execution order
3. **[P] marker**: Include ONLY if task is parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: REQUIRED for user story phase tasks only
   - Format: [US1], [US2], [US3], etc. (maps to user stories from spec.md)
   - Setup phase: NO story label
   - Foundational phase: NO story label  
   - User Story phases: MUST have story label
   - Polish phase: NO story label
   - Structural task blocks (close-out, contract sync, attestation): MUST have story label (except infrastructure-only close-out)
5. **Description**: Clear action with exact file path

**Examples**:

- ✅ CORRECT: `- [ ] T001 Create project structure per implementation plan`
- ✅ CORRECT: `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ CORRECT: `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ CORRECT: `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ WRONG: `- [ ] Create User model` (missing ID and Story label)
- ❌ WRONG: `T001 [US1] Create model` (missing checkbox)
- ❌ WRONG: `- [ ] [US1] Create User model` (missing Task ID)
- ❌ WRONG: `- [ ] T001 [US1] Create model` (missing file path)

### Task Organization

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets its own phase
   - Map all related components to their story:
     - Models needed for that story
     - Services needed for that story
     - Interfaces/UI needed for that story
     - If tests requested: Tests specific to that story
   - Mark story dependencies (most stories should be independent)

2. **From Contracts**:
   - Map each interface contract → to the user story it serves
   - If tests requested: Each interface contract → contract test task [P] before implementation in that story's phase

3. **From Data Model**:
   - Map each entity to the user story(ies) that need it
   - If entity serves multiple stories: Put in earliest story or Setup phase
   - Relationships → service layer tasks in appropriate story phase

4. **From Setup/Infrastructure**:
   - Shared infrastructure → Setup phase (Phase 1)
   - Foundational/blocking tasks → Foundational phase (Phase 2)
   - Story-specific setup → within that story's phase

### Phase Structure

- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites - MUST complete before user stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Within each story: Tests (if requested) → Models → Services → Endpoints → Integration → Contract Sync (if applicable) → **Close-Out** → Attestation (if applicable)
  - Each phase should be a complete, independently testable increment
- **Final Phase**: Polish & Cross-Cutting Concerns
