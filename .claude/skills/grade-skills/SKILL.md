---
name: grade-skills
description: Use when the user asks to grade, review, evaluate, score, or QA a skill file. Also triggers when a skill has just been created or edited and needs quality verification before deployment or committing.
---

# Skill Grading

## When to Grade

- After creating a new skill
- After editing an existing skill
- When reviewing a skill before deployment
- When auditing skills for quality

## Scoring Method

**Base score: 7.** Subtract 2 per Major error. Subtract 1 per Minor error. Floor: 3.

**Pass threshold: 6.** Skills scoring below 6 must be revised before deployment.

## Major Errors (−2 each)

| Error Type | What to Check |
|------------|---------------|
| Missing Frontmatter | No YAML frontmatter, or missing `name` or `description` fields. |
| Bad Description | Description summarizes workflow/process instead of triggering conditions. Must start with "Use when..." and describe ONLY when to activate. |
| Not Discoverable | No keywords matching symptoms, error messages, or tool names a future agent would search for. Skill is invisible to Claude Search Optimization. |
| Wrong Abstraction Level | Project-specific convention disguised as a skill (belongs in CLAUDE.md), OR a one-off solution that isn't reusable across projects. |
| Narrative, Not Reference | Reads as a story about how a problem was solved once ("In session X, we found...") instead of a reusable technique, pattern, or reference guide. |
| Untested | No evidence the skill was tested with a pressure scenario or subagent baseline. No rationalization table for discipline-enforcing skills. |
| Critical Gap | A core use case the description promises is not covered in the skill body. Agent would load the skill and find no guidance for the advertised trigger. |
| Silent Tool Dependency | Skill depends on an external tool (web search, code execution, MCP server, file system) but doesn't declare the dependency or include a fail-loud check. |
| Silent Build Skip | Skill source file is inside a `references/`, `examples/`, or `scripts/` directory — build.ps1 silently skips all three, the file is never built or deployed and no error is reported. Also applies if the file is at the `skills/` root without a category subdirectory (e.g., `skills/my-skill.md`). |
| Incorrect Source Layout | Source file nested more than one level below its category (e.g., `{category}/{name}/{name}.md` adds a redundant extra directory), or a `references/`-only directory is masquerading as a skill category. Correct form: `skills/{category}/{skill-name}.md` — one category level, flat skill files. |

## Minor Errors (−1 each)

| Error Type | What to Check |
|------------|---------------|
| No Quick Reference | Missing a scannable table or bullet list for common operations. Agent must read prose to find basic usage. |
| No Common Mistakes | Missing a section on what goes wrong and how to fix it. |
| Weak Examples | Examples are contrived templates, multi-language diluted, or not runnable. One excellent example beats many mediocre ones. |
| Flowchart Misuse | Uses flowchart for linear instructions, reference material, or code examples. Flowcharts are only for non-obvious decisions and process loops. |
| Code in Wrong Place | Heavy reference (100+ lines) inline instead of a separate file, OR trivial patterns (< 50 lines) in a separate file unnecessarily. |
| Vague Triggering | Description uses abstract terms ("for async testing") instead of concrete symptoms ("race conditions, timing dependencies, pass/fail inconsistently"). |
| Redundant Content | Repeats information available in cross-referenced skills instead of using a reference link. |
| Name Not Active | Skill name uses noun form ("skill-creation") instead of active verb form ("creating-skills"). |
| Filename Mismatch | Source filename (without `.md`) doesn't match the `name:` frontmatter field. The build uses the filename as the deployed skill name, so a mismatch means the skill is discovered, cross-referenced, and inventoried under a different name than it declares. |
| Loose Non-Markdown Files | Supporting files (`.js`, `.ps1`, `.dot`, `.py`, `.json`) placed directly in a category directory instead of a named subdirectory. Defined subdirectories: `references/` (heavy reference docs), `examples/` (runnable examples), `scripts/` (executable tools — both unique-to-one-skill and category-shared scripts belong here). Loose files at the category root have undefined deploy behavior and may not be copied to target repos. |
| Category Not Kebab-Case | Category directory name uses spaces, underscores, or PascalCase instead of lowercase-kebab-case. Reverse-synced orphan skills land in `uncategorized/` if no `category:` frontmatter field is present. |
| Excessive Token Count | Skill exceeds 5,000 estimated tokens without justification. Consider moving heavy reference to a separate file. |
| Description Too Long | Description exceeds 500 characters or frontmatter exceeds 1024 characters total. |
| Undertriggering Description | Description is too conservative — doesn't include adjacent contexts, near-miss triggers, or enough concrete phrases. Skills with undertriggering descriptions are useful but invisible; descriptions should be slightly pushy about when to apply. |
| MUST/NEVER Overuse | A technique or reference skill uses MUST/NEVER mandates in all-caps where explaining *why* the rule matters would be more effective. Reserve MUST/NEVER for discipline-enforcing skills only. |
| Flattened Consolidation Mistakes | A consolidated canonical skill kept one generic common-mistakes list and dropped mode/type-specific pitfalls from merged legacy skills. |
| Missing Discoverability Cues | A consolidated skill has no Discoverability Cues section — no trigger phrases covering merged domains and no near-miss routing to sibling skills. Agents find the skill for the primary mode and miss the secondary ones. |
| Missing Progressive Disclosure | A consolidated skill has no Progressive Disclosure section defining layered response depth. Without it, the agent has no guidance on how much to deliver — risk of over- or under-producing output. |

## Consolidation Pattern Check

When grading a consolidated canonical skill (multiple legacy skills merged into one):

### Common Mistakes Decomposition
- Check that each mode/type in the quick reference has a dedicated common-mistakes reference file.
- Check that the canonical skill has a routing section to those mode/type-specific mistakes files.
- Recommended fix for generic lists: make the first canonical common mistake `Not checking for the [mode/type]-specific common mistakes file.`
- If mode/type-specific pitfalls are missing, apply `Flattened Consolidation Mistakes` (Minor, -1).

### Discoverability
- Check for a **Discoverability Cues** section after the Quick Reference table.
- Section must include trigger phrases covering all merged modes/types — not just the primary one.
- Section must include near-miss routing rules that name sibling skills explicitly.
- If missing entirely, apply `Missing Discoverability Cues` (Minor, -1).

### Progressive Disclosure
- Check for a **Progressive Disclosure** section defining layered response depth (quick → expanded → deep).
- Section must include an escalation rule (when to move from Layer 1 to Layer 2/3).
- If missing entirely, apply `Missing Progressive Disclosure` (Minor, -1).

## Review Process

### 1. Frontmatter Check

- [ ] `name:` present, uses only letters, numbers, hyphens
- [ ] `description:` present, starts with "Use when..."
- [ ] Description describes triggering conditions ONLY (no workflow summary)
- [ ] Description is sufficiently pushy — includes adjacent contexts and near-miss triggers, not just the obvious case
- [ ] Description written in third person
- [ ] Frontmatter under 1024 characters total, description under 500

### 2. File & Folder Structure Check

- [ ] Source file at exactly `skills/{category}/{skill-name}.md` — one category dir, flat skill files, no extra subdir
- [ ] Source file is NOT inside `references/` or `examples/` (would be silently skipped by build)
- [ ] Filename (without `.md`) exactly matches `name:` frontmatter field
- [ ] Category directory is lowercase-kebab-case (`uncategorized/` is valid for reverse-synced orphans)
- [ ] Non-markdown supporting files in a named subdirectory (`references/`, `examples/`, or `scripts/`) — not loose in the category root
- [ ] Category-level shared resources use the correct subdirectory: `{category}/references/` (shared docs), `{category}/examples/` (shared runnable examples), `{category}/scripts/` (shared or skill-unique executable tools)

### 3. Content Structure Check

- [ ] Overview section with core principle in 1-2 sentences
- [ ] Quick reference table or scannable bullet list
- [ ] Common mistakes or pitfalls section
- [ ] For consolidated skills: per-mode/per-type common-mistakes references exist and are routed from the canonical skill
- [ ] For consolidated skills: first canonical common-mistake bullet enforces checking the mode/type-specific common-mistakes file
- [ ] For consolidated skills: Discoverability Cues section present with trigger phrases and near-miss routing
- [ ] For consolidated skills: Progressive Disclosure section present with layered depth model and escalation rule
- [ ] Code examples are runnable and well-commented
- [ ] SKILL.md body under 500 lines; heavy reference moved to `references/` if approaching limit
- [ ] Bundled resources (`scripts/`, `references/`, `assets/`) used appropriately for their type
- [ ] Supporting files only for heavy reference (100+ lines) or reusable tools

### 4. Content Quality

- [ ] Teaches a reusable technique, pattern, or reference — not a one-off narrative
- [ ] Addresses concrete symptoms and use cases, not abstract concepts
- [ ] Keywords cover errors, symptoms, synonyms, and tool names agents would search
- [ ] One excellent example per pattern (not multi-language dilution)
- [ ] Cross-references use skill name with explicit requirement markers, not @ links

### 5. Discipline Checks (for rule-enforcing skills only)

- [ ] Rationalization table built from baseline testing
- [ ] Red flags list for self-checking
- [ ] Explicit loophole counters for known workarounds
- [ ] "No exceptions" blocks that close spirit-vs-letter arguments

### 6. Tool Dependencies

- [ ] All required external tools declared in a "Required Tools" section
- [ ] Fail-loud instructions present for each tool dependency
- [ ] Graceful degradation documented where fallbacks exist
- [ ] No silent skipping of tool-dependent steps

### 7. Token Efficiency

- [ ] Getting-started workflows: < 150 words
- [ ] Frequently-loaded skills: < 200 words
- [ ] Other skills: < 500 words (or justified if larger)
- [ ] Details moved to tool `--help` where appropriate
- [ ] No redundant content that duplicates cross-referenced skills

## Output Format

```markdown
## Skill Grade: [skill-name]

**Score: X/7**

### Major Errors
- [Error Type]: [Explanation of the specific issue]

### Minor Errors
- [Error Type]: [Explanation of the specific issue]

### Strengths
- [What the skill does well]

### Required Fixes (if score < 6)
1. [Specific fix needed]
2. [Specific fix needed]
```

## Grading Calibration

| Score | Meaning |
|-------|---------|
| 7 | Publication-ready. No errors found. |
| 6 | Deployable. Minor issues only; can fix post-deploy. |
| 5 | Needs revision. One major or several minor issues. |
| 3-4 | Significant rework. Multiple major errors. |
| 3 | Floor. Fundamental problems with approach or content. |
