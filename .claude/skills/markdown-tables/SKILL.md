---
name: markdown-tables
description: "Use whenever creating or editing a markdown (.md) file that contains or will contain a table. This includes generating new markdown files, adding tables to existing files, or editing existing tables. This skill activates automatically — the user does not need to ask for readable tables."
description: "Apply whenever creating or editing a markdown (.md) file that contains or will contain a table. This includes generating new markdown files, adding tables to existing files, or editing existing tables. This skill activates automatically — the user does not need to ask for readable tables."
---

# Markdown Table Formatting

## Overview

Markdown tables must be readable in their **raw source form**, not just in rendered/preview mode. By default, LLMs produce tables where the column separator `|` positions don't align between the header row and the data rows, making the raw file unreadable. This skill fixes that.

## Scope

This skill applies whenever you write a markdown table in any `.md` file — whether creating a new file, adding a table to an existing file, or editing an existing table. It does NOT require the user to ask for it. If the output contains a markdown table, follow these rules.

## Core Rules

### 1. Align Every Column

Pad each cell so that the column width equals the width of the longest value in that column (including the header). Every `|` separator must line up vertically across all rows.

**Wrong — unreadable raw markdown:**
```
| Use Case | How This Ontology Helps |
|---|---|
| Web search / scraping | Synonym lists and search-query templates per category |
| Data cleanup | Controlled vocabulary, classification decision trees, and normalization rules |
| Underwriting / comp analysis | Facility-level and unit-level attribute separation supports comp set construction |
```

**Right — columns align, readable in source:**
```
| Use Case                      | How This Ontology Helps                                         |
|-------------------------------|------------------------------------------------------------------|
| Web search / scraping         | Synonym lists and search-query templates per category            |
| Data cleanup                  | Controlled vocabulary, classification decision trees, and        |
|                               | normalization rules                                              |
| Underwriting / comp analysis  | Facility-level and unit-level attribute separation supports      |
|                               | comp set construction                                            |
```

### 2. Respect Maximum Table Width (Two-Tier Rule)

The total table width (all columns including `|` separators and padding) is governed by two tiers:

| Tier       | Width         | Action                                                         |
|------------|---------------|----------------------------------------------------------------|
| Target     | ≤120 chars    | Default goal. Apply column budgeting and content wrapping.     |
| Acceptable | 121–160 chars | Allowed only when every column is already at its practical     |
|            |               | minimum width (header length + 2 padding) and no further      |
|            |               | compression is possible. Common with many narrow columns.      |
| Restructure| >160 chars    | Do not ship. Split into multiple tables with a shared key      |
|            |               | column, pivot to vertical/list format, or move to a dedicated  |
|            |               | file and link to it.                                           |

**Why two tiers?** Wide tables fall into two categories:
- **Few wordy columns** — wrapping fixes it (target ≤120).
- **Many narrow columns** — each cell is already 5–10 chars. You can't wrap "Age" any shorter, so forcing 120 would require awkward splits that hurt readability more than a modest scroll. Allow up to 160 in this case.

### 3. Wrap Long Content Intelligently

When one or more columns contain values that push the table beyond 120 characters:

1. **Identify the widest column(s)** causing the overflow.
2. **Set a max column width** that brings the total table width to ≤120 characters. Distribute available width proportionally — give more space to columns with longer content.
3. **Wrap at word boundaries** — never break mid-word. Continue the text on the next row with empty cells in the other columns.
4. **Keep wrapping visually clean** — the continuation row should have blank cells in all non-wrapped columns, with the wrapped text continuing in the same column position.

**Wrapping example — 3-column table:**
```
| Field          | Type     | Description                                          |
|----------------|----------|------------------------------------------------------|
| facility_name  | text     | The legal or commonly used name of the storage       |
|                |          | facility as it appears on signage or marketing       |
|                |          | materials                                            |
| unit_count     | integer  | Total number of rentable units at the facility       |
| climate_tier   | enum     | One of: None, Heated Only, Climate Controlled        |
```

### 4. Restructure When Wrapping Can't Help

When the table has too many columns for any single row to fit within 160 characters even at minimum column widths:

- **Split into sub-tables**: Pick a key column (e.g., ID, Name) and repeat it in each sub-table. Group related columns together.
- **Pivot to vertical format**: Use a definition list or nested bullets when the data is entity-per-section rather than row-per-entity.
- **Move to a separate file**: If the table is a data reference (schema, inventory), put it in its own `.md` file and link to it.

**Split example — 10-column table becomes two 6-column tables:**
```
| Name     | Q1 Rev | Q2 Rev | Q3 Rev | Q4 Rev | Total Rev |
|----------|--------|--------|--------|--------|-----------|
| Acme     | 120    | 135    | 142    | 158    | 555       |

| Name     | Q1 COGS | Q2 COGS | Q3 COGS | Q4 COGS | Total COGS |
|----------|---------|---------|---------|---------|------------|
| Acme     | 60      | 68      | 71      | 79      | 278        |
```

### 5. Separator Row Matches Column Widths

The `|---|---|` separator row must use dashes to match each column's width exactly. If column 1 is 14 characters wide, its separator cell is 14 dashes.

```
| Name           | Value    |
|----------------|----------|
```

Not:
```
| Name | Value |
|---|---|
```

### 6. Consistent Cell Padding

Every cell gets exactly one space of padding on each side of its content:

```
| Name  | Age |     ← one space before and after content
```

Right-pad with spaces to fill the column width.

## When Editing Existing Tables

If you encounter an existing table that violates these rules and you are editing the file (or a section containing the table), reformat the table to comply. Do not reformat tables in files you are only reading.

## Exceptions

- **Code blocks**: Tables inside fenced code blocks (` ``` `) are exempt — they may be showing examples of raw syntax.
- **Single-column tables**: Trivial tables with one column don't need alignment.
<<<<<<< HEAD
- **Tables the user explicitly wants compact**: If the user asks for minimal/compact table syntax, respect that.
=======
- **Tables the user explicitly wants compact**: If the user asks for minimal/compact table syntax, respect that.
>>>>>>> 001-workflow-brainstorm
