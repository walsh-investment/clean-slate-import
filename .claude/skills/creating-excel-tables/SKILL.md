---
name: creating-excel-tables
description: "Use when working with Excel tables (ListObjects), structured-reference formulas, or deciding whether a range should be a table vs. named range vs. plain range. Triggers on: calculated column, structured reference, tblName[Column], add_table, ListObject, xlwings table, openpyxl add_table, XlsxWriter add_table, FILTER outside table, spill and table, rent roll, transaction ledger, unit inventory, auto-expand, filter UI, total row, calculated column, table style. Load alongside the xlsx skill whenever native Excel table behavior matters."
---

# Creating Excel Tables and Structured References

Companion skill for `xlsx`. Load this whenever the task involves native table creation, structured-reference formulas, or range-vs-table decisions.

Default assumptions: **Windows**, **Excel desktop installed**, workbook opened by human users. Goal is native Excel behavior — not just a valid `.xlsx` file.

## Quick Reference — What Structure to Use

| Situation | Use |
|---|---|
| Record dataset, rows grow, users filter/sort | **Table** |
| Scalar input / assumption cell / control block | **Named range** |
| Dashboard, merged-cell layout, presentation block | **Plain range** |
| Spill output (`FILTER`, `SORT`, `UNIQUE`, `SEQUENCE`) | **Plain range** — never inside a table |
| Calculated column (sibling columns, same row) | `=[@[Qty]]*[@[Unit Price]]` |
| External column summary | `=SUM(tblTransactions[Amount])` |

## Library Preference (Windows, Excel installed)

1. **`xlwings`** — preferred for interactive workbooks; creates tables through live Excel
2. **`pywin32` / COM** — when direct `ListObject` control is required
3. **`openpyxl`** — file-level editing, Excel not running
4. **`XlsxWriter`** — headless write-only generation

See [excel-tables-reference.md](references/excel-tables-reference.md) for per-library implementation patterns, Python gotchas, and the full 8-question decision heuristic.

## When to Use a Table

Strong signals:
- one header row, same schema on every row
- rows will be appended over time
- users filter, sort, or use total-row features
- formulas repeat row-by-row (e.g., `=C2*D2` copied down)
- charts or pivots should auto-expand with added rows

Do NOT use a table for:
- dashboards, merged-cell regions, multi-row headers
- subtotal rows inside the body
- spill output ranges
- blocks that are mostly presentation, not data records

Borderline rule: if a block mixes data and presentation, put raw data in a table and keep the presentation block separate.

## Structured Reference Syntax

```excel
=[@[Qty]] * [@[Unit Price]]           ' calculated column (current row)
=SUM(tblRentRoll[Monthly Rent])       ' external column summary
=COUNTIFS(tblInv[Status],"Occupied")  ' external criteria match
=IF([@[Move Out Date]]="", TODAY()-[@[Move In Date]], [@[Move Out Date]]-[@[Move In Date]])
```

Header gotcha: headers containing `,` `.` `[` `]` `#` `'` `@` make structured references brittle. Use machine-friendly names when generating workbooks programmatically.

Table naming — prefer `tblTransactions`, `tblRentRoll`, `tblUnitInventory`. Avoid generic names like `Table1` or names that look like cell references.

## Table as Single Source of Truth

When a master table exists (e.g., a config table holding entity names, IDs, rates, or dates), every downstream sheet that needs that data should **reference the table via structured references or lookups** — not re-materialize the same columns as independent literals from the build script.

**Why this matters**: Tables auto-expand, support structured references, and give auditors a single traceable source. Hardcoding the same values onto multiple sheets defeats all three benefits — the data looks tabular but the linkage is an illusion.

**Pattern — key-column + lookup**:
- The master table owns the full record (all columns)
- Each downstream table or range gets only a **key column** as a hardcoded value
- All other columns use `=XLOOKUP([@Key], tblMaster[Key], tblMaster[TargetCol])` or `=INDEX(tblMaster[TargetCol], MATCH([@Key], tblMaster[Key], 0))`

**When building via Python**: Write the key as a literal, write everything else as a formula string. If a downstream sheet's partner-name column is `=XLOOKUP(...)` instead of `p.name`, the workbook is self-documenting and any manual edit to the master table propagates automatically.

**Edge case — performance**: For workbooks with 10,000+ lookup rows, consider caching via a helper sheet with `INDEX/MATCH` rather than per-cell `XLOOKUP`. The DRY principle still holds — the helper sheet is formula-linked, not a second literal copy.

## High-Value Gotchas

1. **Spill formulas and tables do not mix.** Never put `FILTER()`, `SORT()`, `UNIQUE()`, or `SEQUENCE()` inside a table body. Place the spill formula outside; let it feed from the table.
2. **Bad headers invalidate the table.** Blank, duplicate, or non-string headers cause creation to fail silently. Normalize before table creation.
3. **`openpyxl` structural edits do not auto-maintain formulas.** After inserting/deleting rows or columns, rebuild affected table references explicitly.
4. **`XlsxWriter` constant-memory mode disables table support.** Use normal mode.
5. **Converting a range to a table does not retro-convert existing formulas.** A1-style references elsewhere stay as-is.
6. **Validate after creation.** Check: table name, exact range, header row state, total row state, filter UI, calculated-column fill behavior.

## Minimal Examples

**Good table candidate — rent roll:**
Columns: Unit, Tenant, Move In, Monthly Rent, Status. Each row = one lease. Users filter by status. New rows expected monthly. → Use a table. If Excel is running, create via `xlwings` or COM for full native behavior.

**Not a table candidate — summary sheet:**
Merged title, quarterly subtotals between sections, commentary cells. → Plain range. Separate raw data into a table on a different sheet if needed.

**Spill + table split:**
Transactions table feeds a `FILTER()` showing only 2026 CapEx rows. → Keep transactions as a table; place `FILTER()` formula outside the table body. Never make the spill output the table itself.
