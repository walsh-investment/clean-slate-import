---
name: starfleet-writing-style
description: Use when writing any annotation, justification, or evaluation for Starfleet, the internal human data annotation platform for LLM training data. Triggers for any Starfleet task type including Arena SXS comparisons, evaluation writeups, or any task requiring the Starfleet voice. Includes global voice rules and project-specific guidance for Arena SXS pairwise comparisons.
---

# Starfleet Writing Style

## Overview

Starfleet is an internal human data annotation platform used for creating LLM training data. Many different annotation task types exist, each with different requirements. All Starfleet writing shares a common voice: analytical in structure, opinionated in tone, specific in evidence, and short on scaffolding. This is usually a bullet-list format, but not always.

This skill is organized in two tiers:
1. **Global rules** - apply to all Starfleet task types
2. **Arena SXS rules** - apply only to pairwise model comparison tasks

---

# Global Rules (All Starfleet Tasks)

## Analytical Scaffolding - Delete It

You will be tempted to label the analytical move you are making. Delete the label and keep only the evidence or conclusion.

| Scaffolding to delete                                                                    | What to write instead                                                   |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| "functions as a reusable template: replace the X rows and the entire report recalculates" | "replace the source rows and the report recalculates"                   |
| "B's formula derivation eliminates X and guarantees Y"                                   | say what it eliminates and guarantees; skip naming the mechanism         |
| "represents scope gaps"                                                                  | say what is missing                                                     |
| "structurally absent from the primary section"                                           | say it's not there                                                      |
| "no calculation infrastructure to produce those values"                                  | "no dynamic formulas"                                                   |
| "This is a meaningful limitation for this dimension"                                     | cut entirely                                                            |
| "Model A cannot be considered for the overall win"                                       | "Model B wins"                                                          |

## Formula Names

Do not enumerate formula types as standard evidence. Do not write "COUNTA, SUM, ROUND, COUNTIF, and SUMIF" - write "dynamic formulas" or "formulas tied to a data tab." Use specific function names only when the specific function is the point.

## Specific Evidence - Always Keep

Keep all factual specifics: column counts, dollar figures, the exact blank metrics, raw integer problems (24 instead of 24%), garbled values (',397' not $6,397). Strip everything else; keep the numbers.

## Global Antipatterns

These are the most common ways the Starfleet voice goes wrong. Check every justification against this list before submitting.

### 1. Em dashes
Forbidden. Do not use `—`. Rewrite the sentence or use a regular hyphen.

- Bad: `"raw data tab — formula-driven report"`
- Good: `"a raw data tab backing a formula-driven report"`

### 2. Checklist phrases
These sound like a rubric reviewer, not an analyst. Cut them.

- "All required sections present"
- "Right structure"
- "Consistent formatting throughout"
- "Professional layout"
- "All sections present"

If something is present and correct, say what it is. Do not announce that it checked a box.

### 3. Agent vocabulary
These words and phrases do not belong in this voice:

- "Looks and works like an operational tool"
- "Fully dynamic"
- "Structured, readable, professional" (descriptor triplets)
- "Fragmentation costs it"
- "Stands out as thin"
- "Typed values" (say "hardcoded" or "0 formulas")
- "Over-fragmented for a daily operational report"
- "Garbled versions of $X and $Y" (just cite the garbled value)

### 4. Hex codes as evidence
Do not cite hex color codes as primary evidence for visual quality. Describe what the colors look like and what effect they have on readability or professionalism. A hex code is an implementation detail that means nothing to someone reading the justification.

- Bad: "A uses BDD7EE for input cells and 2F5496 for headers across 436 shaded cells"
- Good: "A uses light blue input cells against dark headers, making editable fields stand out immediately"
- Acceptable: citing a hex code as secondary evidence after describing the visual effect, when distinguishing two similar colors

### 5. Cell counts, formula counts, and tone counts as evidence
Do not cite counts of colored cells, formulas, or color tones as primary evidence. These are forensic measurements that tell the reader nothing about the user experience.

- Bad: "A has 436 shaded cells" / "B employs 1,566 formulas" / "A's 17-tone palette"
- Bad: "B has 851 colored cells in high-saturation tones"
- Good: "A shades every input cell so editable fields stand out immediately"
- Good: "B's bright saturated colors are harder to scan in a long data run"
- Good: "B backs every calculated output with a live formula"

### 6. Bare verdict closers
Do not end a justification with a bare verdict that repeats the selection column: "Tie.", "A wins.", "B wins." The closing sentence must explain *why* the result holds.

- Bad: "Tie."
- Bad: "A wins."
- Good: "Neither model has an advantage on task accuracy"
- Good: "This is a tie because there is no accuracy edge"
- Good: "A wins as the more ready-to-use deliverable"

### 7. Formula-syntax scaffolding in TA
Do not cite the full mathematical formula when both models get the same calculation right. "Both calculate compound escalation correctly" is sufficient. The formula notation (e.g., "Monthly Rent = $/SF/Mo x SF x (1+esc)^(year-1)") adds no information when it describes shared behavior.

Cite formula syntax only when:
- The formula itself is wrong in one model
- The two models use meaningfully different approaches (e.g., POWER() vs ^ is not meaningful; SUMIF vs SUM is meaningful)

The same principle applies to buffer math and assumption details. When both models state reasonable assumptions (escalation rates, buffer percentages, contingency figures), compress to "both state reasonable assumptions" or "reasonable assumptions provided." Do not enumerate every buffer figure when the point is simply that assumptions exist and are sound.

### 8. Describe what you see, not what you measured
For VP justifications, lead with observations a human would notice when opening the file: font size too small to read, text running beyond cell boundaries, white font on light backgrounds, column headers not sized to their content. Cell counts, hex codes, and fill-pattern inventories are secondary evidence at best.

- Bad: "B has 851 colored cells in high-saturation tones"
- Bad: "A's 17-tone palette provides alternating light and dark bands"
- Bad: "A differentiates scenarios with dark themed headers (green 375623, orange 843C0C, purple 3F1F62) and light-tinted data rows (E2EFDA, FCE4D6, E2D4F0)"
- Good: "B's bright saturated colors are harder to scan in a long data run"
- Good: "B uses size 9 fonts in the monthly rent matrix which is too small to read"
- Good: "A's header labels are not sized to the column width so the first impression is a jumbled mess"
- Good: "B uses childish pastel scenario colors which provide less visual contrast between input cells and output rows making the data hard to read"
- Good: "white font on the yellow background is tough to read"

### 9. Dimension-recap Overall closers
Do not restate sub-dimension wins as though reading from a scorecard. State the practical bottom line in end-user terms.

- Bad: "A wins IF on explicit input labeling, VP on the professional blue hierarchy, and XL on formula traceability via CEILING-based year derivation. B is functionally correct but never gains an advantage on any dimension."
- Good: "A wins as the more ready-to-use deliverable"
- Good: "A wins easily by being a little more helpful and user friendly at each step of the way"
- Good: "B wins a very close race with better visual scenario differentiation and slightly better excel functionality"

This also applies to restating evidence from sub-dimensions. In Overall, reference sub-dimension findings by category name, not by repeating the actual figures. "A's quantified ZOPA analysis" conveys the point; "A's 10-15% price convergence target with 8-year contract horizon" restates TA evidence that belongs in the TA justification, not Overall.

### 10. Parenthetical enumerations
When the category name or count conveys the point, do not enumerate every item in parentheses. The list adds length without insight.

- Bad: "8 negotiation levers (price, volume, timing, payment terms, warranty, service level, delivery schedule, and escalation)"
- Bad: "covers all required sections (executive summary, market analysis, financial projections, risk assessment, implementation timeline, and appendix)"
- Good: "8 negotiation levers"
- Good: "covers all required sections"

Use a count or category name. If individual items matter to the comparison, pick the 1-2 that differentiate the models and name only those.

### 11. Word counts as evidence
Do not cite word counts to compare deliverables. The reader does not care that a memo is 509 words. Describe the qualitative effect instead.

- Bad: "A's memo is 509 words" / "roughly 509 words"
- Bad: "B's analysis runs to 1,200 words"
- Good: "A's memo reads like a one-pager"
- Good: "A's response is noticeably thinner than B's"

### 12. Role and team enumeration
Do not list every stakeholder role when a collective noun conveys the same point. Enumerating roles adds length without adding insight unless the specific roles are the differentiator.

- Bad: "identifies CPO, Finance, Engineering, Supply Chain, Legal, and Category Buyer as stakeholders"
- Good: "identifies six cross-functional stakeholders"
- Good: "names the full negotiation team"

---

# Arena SXS Project Rules

The following rules apply specifically to Arena SXS pairwise model comparison tasks, where two model outputs are evaluated across dimensions (IF, TA, VP, XL Logic, Overall).

## Sentence Format

A good justification lets someone who hasn't seen the deliverables understand exactly why one model was chosen over the other. If the reasoning is defensible and grounded in the actual outputs, it's acceptable, even if you might have weighted things differently.

Each justification sentence should generally follow this structure: **[Verdict] + [specific difference + example] + [why it matters]**. The verdict names the winning model or states the relevant finding. The specific difference identifies exactly what one model did that the other didn't, with a concrete example from the deliverable. The "why it matters" clause explains the practical consequence - why the difference is meaningful to the task or the intended audience.

## Length

**60-100 words per justification.** If you are under 60 words you have almost certainly left out evidence or reasoning.

## Tone: Opinionated, Not Neutral

Do not hedge. State opinions directly and editorialize where it adds clarity.

**Phrases like these belong in this writing:**
- "Not what you want at the end of the day"
- "That should be the easy part"
- "A may as well have been a Word doc"
- "a black box"
- "easy choice"
- "B uses childish pastel scenario colors"
- "the first impression is a jumbled mess"
- "that clarity matters for a tenant facing document"
- "a more ready to use deliverable"
- "its hard to read visually"

**Phrases like these do not belong:**
- "This represents a meaningful limitation"
- "Model A cannot be considered for the overall win"
- "B is the more accurate and analytically useful record"
- "functional but the brightness makes long data runs harder to scan"
- "B applies saturated named colors"
- "A differentiates scenarios with dark themed headers"

State the conclusion plainly. Wrap up with an opinion, not a restatement. Frame differences by what the end user would experience, not what the analyst measured.

## SXS Antipatterns

### 1. Explanatory qualifiers on verdicts
Do not label why you are picking a winner. State the evidence, then state the winner.

- Bad: "A edges IF on completeness"
- Bad: "A wins TA on payment detail"
- Bad: "A edges on labeling clarity and notes detail"
- Bad: "A edges on consistency"
- Bad: "A edges on traceability"
- Bad: "right format for a daily report"
- Bad: "a rounding difference, not an error"
- Good: state what A has that B doesn't, then say A wins

### 2. Concession clauses in Overall
The Overall justification does not make concessions for the loser. It states why the winner wins and ends. Do not write "B's extra detail is nice but fragmentation costs it" - that hedges. Say why A wins, then say A wins.

### 3. Fusing separate failures into one sentence
When a model fails on format (sheet count, structure) AND separately on content (blank metrics, garbled values), each failure gets its own sentence. Do not connect them with "and" or "but" in one clause where the content failure becomes subordinate to the format failure.

- Bad: `"Model A has four sheets and its Summary tab opens with Total Revenue... all blank."`
- Bad: `"Model B spreads across four sheets but its Summary tab has three metrics missing."`
- Good: `"Model A distributes the content across four sheets. Its Summary tab has Total Revenue, Average Revenue per Rental, and Average Daily Rate all blank."`

Also avoid vague paraphrases that stand in for concrete facts. "The Summary is where the shift performance is supposed to live" means "the headline metrics go in the Summary tab." Just say that.

### 4. Baseline-first sentence order
When both models share a common baseline, lead with it before stating differentiators. "Both cover all required sections" comes first, then "A wins because..." This grounds the reader in what is shared before asking them to evaluate the difference.

- Bad: "A includes a detailed risk matrix that B omits entirely. Both cover the five required sections."
- Good: "Both cover the five required sections. A wins because its risk matrix is more detailed and actionable."

### 5. Redundant loser closers
Do not end a justification with a sentence restating the loser's weakness when the verdict sentence already established the win. The closing should advance the argument, not echo it.

- Bad (after already stating A wins for having a quantified ZOPA): "B's lack of specific pricing targets makes it the weaker deliverable."
- Good: End on the verdict sentence. If the win is already clear, stop writing.

### 6. Conjunction style for short comparisons
When two short model observations form a natural pair, join them with "and" or "but" rather than writing separate sentences or using semicolons.

- Bad: "A provides 8 levers; B provides 5 levers."
- Good: "A provides 8 levers and B provides 5."
- Good: "Both cover the required sections but A adds a walkaway framework that B omits."

## Pairwise Comparisons and Verbatim Reuse

SXS tasks are pairwise comparisons of a finite set of model responses. The same deliverable file will appear in multiple rounds against different opponents. What was true about that file in round one is still true in round two and three - the file has not changed, only the comparison partner has. It is therefore acceptable and expected to reuse verbatim approved text that describes a particular file when that file appears again in a later round. There is no need to rephrase a correct observation just to avoid repeating yourself. If a phrase accurately describes a model's deliverable, use it again.

**Critical: A/B labels change between rounds.** A file that was "Model A" in one comparison may be "Model B" in the next. Before reusing any phrase, verify the model letter matches the label assigned in the current round. Using the wrong letter is a non-negotiable error that invalidates the justification.

## Arena SXS Reference Examples

These are real justifications written in the correct voice. Use them to calibrate length, sentence structure, tone, and closing style.

### IF - A wins
> Both models cover all required sections. 
Both models cover all required metrics. 
The prompt asks for "brief insightful observations" at the end of the report which both provide. 
Model A wins this close contest because its brief observations are more insightful than Model B's. 
A's seven observations are each a complete analytical sentence pairing a specific data point with a direct managerial implication: 'Website dominates with 40% of rentals (10 of 25) and generated the highest revenue ($6,397)' is followed by a clear strategic takeaway. 
B provides bullet sub-points with directional statements without the specificity that makes A's insights immediately actionable. 

### XL Logic - A wins
> Both models use dynamic formulas
Both models include linked  source data that can be audited  and/or refreshed. 
Neither model creates a real excel table for the source data in order to use structured formula syntax
Model A wins because it wraps all division operations in IF() guards to prevent division by zero errors. Model B's unguarded division would break if any category returned zero. Model A also uses bounded cell ranges (Data!A2:A26) which are more predictable than Model B's whole-column references ('Rental Data'!A:A).

### TA - A wins
> Both model calculate the metrics accurately. 
Both models calculate their metrics through auditable Excel formulas tied to source data.
Model B wins because Model A has a factual error here: "Credit Card is the preferred payment method (44% of rentals, ~48% of revenue),". "~48% of revenue" is incorrect it must be "38.4% of revenue". 

Model A's Summary sheet leaves Total Revenue, Average Revenue per Rental, and Average Daily Rate all blank. Three of the six required headline metrics are simply missing. The observations section compounds this by citing corrupted values: ',397' instead of $6,397 and '2,446' instead of $12,446, suggesting the author's dollar-sign formatting broke during composition and was never corrected. Model B reports all six metrics accurately ($12,446.00, $497.84, $133.83, 3.72 days) with category utilization correctly displayed as percentages rather than raw integers. B wins TA and it isn't close.
