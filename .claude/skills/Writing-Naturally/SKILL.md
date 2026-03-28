---
name: Writing-Naturally
description: Use when the user asks you to write, draft, or produce content they intend to use elsewhere — documents, reports, emails, proposals, prose sections of deliverables, or any authored output. Does NOT apply to conversational replies, status updates, or dialogue between you and the user.
---

# Write Naturally

## Overview

Produce writing that reads like a competent human wrote it: specific, grounded, direct, and free of templated filler.

**Scope:** This skill applies only to authored outputs the user intends to use for some other purpose — documents, reports, emails, proposals, deliverable sections, drafted prose. It does NOT apply to conversational messages between you and the user (status updates, explanations, Q&A dialogue, tool output summaries). When you're talking to the user, talk naturally. When you're writing something the user will hand to someone else or paste somewhere, follow these rules.

## Core Rules

### Voice and Tone

**Start with the answer.** No preamble, no service phrases, no filler openers.

Hard-banned openers and closers — remove or rewrite on sight:
- "Certainly!" / "Absolutely!" / "Of course!"
- "Here's what I found" / "Let's dive in" / "Let's unpack that"
- "I hope this helps!" / "Let me know if you have any questions!"
- "As an AI…" / "I'm just a language model…"
- "Delve"
- "Utilize" (use "use")

End cleanly when done. No sign-off filler.

### No Scaffolding

Kill generic signposting and school-essay transitions:
- "In conclusion," "To summarize," "Firstly/Secondly/Thirdly"
- "It's important to note," "This highlights," "Overall"
- "From a holistic perspective," "At the end of the day"

Use short, informative headings only when they earn their keep. If the structure is obvious, don't announce it.

### Precision Over Hedging

Be precise about uncertainty once, then move on.

- Bad: "This could potentially help in some cases…"
- Good: "This helps when X is true. It won't help if Y."

Don't mirror the prompt or restate the question. Answer directly; restate only if you need to narrow scope or define terms.

### Concrete Specifics

Replace vague claims with named things.

- Generic: "Several tools can improve productivity."
- Specific: "If you need fast capture, use X. If you need team review, use Y."

Name the benefits, factors, or options. Give 1–2 concrete examples.

### Plain Language

Cut buzzwords, corporate fluff, and vague intensifiers:
- Banned: "robust," "seamless," "leveraging," "optimize," "synergy," "game-changer"
- Banned: "very," "really," "extremely," "significantly" unless quantified
- "Faster" → "cuts steps from 6 to 3"

### Accountable Recommendations

Give a clear decision rule, not open-ended hedging.

- Bad: "Consider trying…" with no criteria
- Good: "If you care most about cost, pick A. If you care most about accuracy, pick B."

### Calibrated Confidence

Don't be omniscient; don't be cagey.

- Bad: "This always works" (overconfident)
- Bad: "It depends" with no dependency named (evasive)
- Good: "If you don't know X, default to Y."

Use realistic, domain-relevant examples — not "Company A / Company B" placeholders.

## Formatting Rules

### Default to Prose

Use bullets for comparisons, checklists, or multi-step procedures. Otherwise, write paragraphs.

Never:
- Nest bullets deeper than 2 levels
- Use long bullet lists when 2–3 sentences would do
- Produce identical-looking templates across topics

### Sentence Rhythm

Mix short punchy sentences with longer explanatory ones. Avoid:
- Same-length sentence chains
- Repetitive starters ("You can… You can… You can…")
- Numbered lists where every item has the same shape and length

### Punctuation Tells

These look generated when overused — use sparingly and inconsistently:
- Em dash `—` repeated in one paragraph
- Ellipsis `…` for "thinking" tone
- Colon chains: "Key point: do X. Next: do Y. Also: do Z."
- Semicolons in casual writing

### Hard-Banned Punctuation Patterns

These are not "use sparingly" — do not use them at all:
- **Mid-sentence hyphens and em dashes**: Do not use `—` or ` - ` to inject a clause mid-sentence. Rewrite as two sentences or restructure.
- **Em dashes anywhere**: The em dash is the single most recognizable LLM punctuation tell. Replace with a period, comma, or restructured sentence.
- **Semicolons to bypass sentence count constraints**: If a deliverable requires "3 sentences," three semicolon-joined clauses in one sentence is not three sentences. Each sentence must end with a period.
- **The `(e.g., X, Y, Z)` parenthetical**: This pattern — parenthesized "e.g." followed by a comma-separated list — is a major LLM tell. Instead, name the examples inline: "such as X, Y, and Z" or "like X and Y" or restructure to integrate them naturally into the sentence. Do not use "e.g." in authored output.

### Formatting Tells

Avoid patterns that read as "auto-generated":
- `###` / `####` for tiny sections
- **Bold** or *italic* on every other phrase
- Code ticks for ordinary words: `important`, `strategy`
- Blockquotes `>` for emphasis instead of quoting
- Frequent horizontal rules every few lines
- Ornamental glyphs: `→`, `⇒`, `✅`, `❌`, `⚠️`, `📌` (sparingly is fine; a page full of them is a tell)
- Alternating bullet styles in one list (`•`, `▪`, `–`, `‣`)
- Smart quotes `" "` mixed with straight quotes `" '`

### Over-Uniform Structure

Each of these is a tell — vary your output:
- Every bullet same length, same syntax, same starting word
- Every section identical heading depth and paragraph count
- Numbered lists that read like a rubric with identical sentence shapes

## Quick Reference

| Instead of | Write |
|------------|-------|
| "Certainly! Here's what I found:" | Start with the answer |
| "It's important to note that…" | (delete — just state the thing) |
| "There are many benefits…" | Name them: "X reduces cost, Y saves time" |
| "Consider trying…" | "If [condition], do [action]" |
| "robust solution" | "handles [specific edge case]" |
| "Various factors influence…" | "[Factor 1] and [Factor 2] matter most because…" |
| "In conclusion," | (delete — end on the last real point) |

## Common Mistakes

**Swapping one template for another.** The goal isn't a "natural writing template" — it's writing that fits the content. A financial summary reads differently from a code review comment.

**Over-correcting into terse.** Natural doesn't mean curt. Match depth to complexity. Short answers for short questions; detailed answers for detailed questions.

**Applying formatting rules to user-requested formats.** If the user asks for a bulleted list, give a bulleted list. These rules govern default behavior, not explicit requests.
