# Excel Tables — Detailed Reference

Companion reference for `creating-excel-tables` skill. Load when you need full implementation patterns, per-library guidance, or the complete decision heuristic.

---

## Default Environment Assumptions

Unless stated otherwise:
- Environment is **Windows** with **Microsoft Excel desktop** installed
- Workbook will be opened and used by human users in Excel
- Preserving native Excel behavior is a priority — not just producing a valid `.xlsx` file

When Excel is installed and user interaction matters, prefer tools that operate through the **native Excel object model** over file-only libraries.

### Preferred order
1. `xlwings` — high-level Python interface to live Excel; sufficient for most table tasks
2. `pywin32` / COM — when direct `ListObject` control is needed
3. `openpyxl` — file-level editing when Excel automation is not practical
4. `XlsxWriter` — deterministic write-only generation when headless creation is acceptable

---

## Library Selection Rules

### Prefer `xlwings` when
- Excel is installed and available during execution
- the workbook is intended for interactive desktop Excel use
- native tables, formulas, autofit, formatting, and visible Excel behavior matter
- the agent needs a cleaner Python interface than raw COM

### Prefer `pywin32` / COM when
- exact `ListObject` control is required
- table creation, resizing, total rows, and style operations need maximum fidelity
- the agent must invoke Excel features that the higher-level wrapper does not expose

### Prefer `openpyxl` when
- the agent must edit an existing workbook at the file level
- Excel is not available during execution or should not be launched
- preserving workbook structure matters, but some Excel-native behavior can be recreated

### Prefer `XlsxWriter` when
- generating a workbook from scratch, write-only, no live Excel
- the workbook does not require live Excel automation during creation
- the workbook can be validated later in Excel

---

## Windows + Excel Native Implementation Rules

### `xlwings` guidance
Use `xlwings` first when the task needs native Excel behavior. Use it for:
- converting ranges into native tables
- resizing tables after data changes
- applying table styles through Excel
- preserving user-facing workbook behavior

### `pywin32` / COM guidance
Use COM when exact `ListObject` control is required. Agent mindset:
- treat tables as **Excel objects**, not just rectangular file regions
- prefer Excel-managed resize/add/remove operations over manually rewriting worksheet geometry

### Validation rule (after Excel automation)
After creating or resizing a table through Excel automation, validate:
- table name
- exact table range
- header row visibility state
- total row state if used
- formula fill behavior in calculated columns
- whether filters and style are present as expected

---

## Python Implementation Rules

### `openpyxl`
1. Add tables with `ws.add_table(tab)` — do not just create the object without adding it.
2. Ensure the table name is unique workbook-wide.
3. Ensure all header cells are strings.
4. Do not use spaces in the table display name.
5. Do not assume row/column insertion or deletion will safely update formulas, charts, or table dependencies.
6. If you structurally reshape a sheet, be prepared to rebuild affected table references explicitly.

#### `openpyxl` agent pattern
```python
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo

wb = Workbook()
ws = wb.active

# Write headers and data first
headers = ["Unit", "Tenant", "Monthly Rent", "Status"]
ws.append(headers)
ws.append(["101", "Smith", 2500, "Occupied"])
ws.append(["102", "Jones", 2800, "Occupied"])

# Create and add table
tab = Table(displayName="tblRentRoll", ref="A1:D3")
style = TableStyleInfo(name="TableStyleMedium9", showRowStripes=True)
tab.tableStyleInfo = style
ws.add_table(tab)  # Must call add_table — not just create the object

wb.save("rent_roll.xlsx")
# Reopen and validate: check table name, range, and header values
```

### `XlsxWriter`
1. Use `worksheet.add_table(...)` only in normal mode, not `constant_memory` mode.
2. Check the return code from `add_table(...)` — treat non-zero as failure.
3. Total-row behavior must be configured explicitly.
4. Structured-reference formulas supported by XlsxWriter are more limited than modern Excel's full syntax; prefer conservative formula patterns.

#### `XlsxWriter` agent pattern
```python
import xlsxwriter

wb = xlsxwriter.Workbook("transactions.xlsx")
ws = wb.add_worksheet()

headers = ["Date", "Type", "Amount", "Description"]
data = [
    ["2026-01-15", "CapEx", 50000, "Roof repair"],
    ["2026-02-01", "OpEx", 1200, "Utilities"],
]

# Write data first
for col, h in enumerate(headers):
    ws.write(0, col, h)
for row_idx, row_data in enumerate(data, start=1):
    for col, val in enumerate(row_data):
        ws.write(row_idx, col, val)

# Add table — compute exact rectangle
ws.add_table(0, 0, len(data), len(headers) - 1, {
    "name": "tblTransactions",
    "style": "Table Style Medium 9",
    "columns": [{"header": h} for h in headers],
})

wb.close()
```

### `pandas` + Excel writer rule
If the workflow starts with a DataFrame:
1. Export the DataFrame via the writer engine.
2. Access the underlying worksheet/workbook object.
3. Add the native Excel table afterward.

Do not assume that writing a DataFrame automatically creates a native Excel table.

```python
import pandas as pd
from openpyxl import load_workbook
from openpyxl.worksheet.table import Table, TableStyleInfo

df.to_excel("output.xlsx", index=False, sheet_name="Data")

# Open and add the table
wb = load_workbook("output.xlsx")
ws = wb["Data"]
last_row = ws.max_row
last_col = ws.max_column
col_letter = ws.cell(1, last_col).column_letter

tab = Table(displayName="tblData", ref=f"A1:{col_letter}{last_row}")
tab.tableStyleInfo = TableStyleInfo(name="TableStyleMedium9", showRowStripes=True)
ws.add_table(tab)
wb.save("output.xlsx")
```

---

## Recognition Heuristics for Complex Workbooks

### Likely table candidate — most of these are true
- one header row only, no blank header cells
- each row is the same type of object
- formulas are copied down row by row
- users would benefit from filter buttons
- no merged cells inside the data body
- no intentional blank separator rows inside the body
- the block may expand over time

### Probably not a table candidate — any of these dominate
- multi-line or stacked headers
- subtotals interspersed among detail rows
- section breaks inside the body
- presentation formatting is the main purpose
- layout is a custom report, not a dataset
- the range is output from a dynamic-array formula

### Borderline case rule
If a range mixes data storage and presentation, split the responsibilities:
- put the raw or normalized data in a table
- keep the presentation/report section separate

---

## Formula Conversion Rules

When converting a plain dataset to a table:
1. Keep the header row clean and unique.
2. Convert repeated row formulas to calculated-column formulas using `@` current-row references.
3. Replace external A1-style summary formulas with structured references when result is clearer.
4. Do **not** rewrite every formula mechanically if structured syntax becomes harder to understand.

### Prefer conversion when
- the original formula is repeated down many rows
- the formula points to sibling columns in the same row
- future column insertions are likely

### Avoid conversion when
- the formula is already clearer in plain A1 form
- the formula interacts with a spill range
- library limitations make the structured form fragile

---

## Structured Reference Syntax — Full Reference

### Within a calculated column
```excel
=[@[Quantity]] * [@[Unit Price]]
=IF([@[Move Out Date]]="", TODAY()-[@[Move In Date]], [@[Move Out Date]]-[@[Move In Date]])
=IFERROR(VLOOKUP([@[Unit ID]], tblRates[#Data], 2, FALSE), 0)
```

### External to the table
```excel
=SUM(tblRentRoll[Monthly Rent])
=COUNTIFS(tblInventory[Status],"Occupied")
=SUMIFS(tblTransactions[Amount], tblTransactions[Type], "CapEx")
=AVERAGE(tblKPIs[Occupancy Rate])
```

### Special item specifiers
| Specifier | Refers to |
|---|---|
| `[#All]` | Entire table including headers and totals |
| `[#Data]` | Data body rows only |
| `[#Headers]` | Header row |
| `[#Totals]` | Totals row |
| `[@]` | Current row (all columns) |

### Header name rules
Table names and column headers should be machine-friendly when the workbook is generated programmatically:
- Prefer: `tblTransactions`, `tblRentRoll`, `tblUnitInventory`, `tblMonthlyKPIs`
- Avoid: `Table1`, names that look like cell references, names with spaces
- Headers with `,` `.` `[` `]` `#` `'` `@` `_` `~` require extra brackets or escaping — prefer simple names

---

## Practical Decision Heuristic (8 Questions)

Ask these in order when deciding how to structure a range:

1. **Is this range a homogeneous dataset with one row per record?**
   - If no, do not default to a table.

2. **Will rows be appended or filtered by users?**
   - If yes, table candidacy increases.

3. **Will the workbook be opened in Excel on Windows?**
   - If yes, prefer native Excel table creation through `xlwings` or COM.

4. **Do formulas repeat down the rows with sibling-column logic?**
   - If yes, table candidacy increases.

5. **Does the range contain merged cells, subtotal rows, section breaks, or multi-row headers?**
   - If yes, table candidacy decreases sharply.

6. **Does the range need spill formulas?**
   - If yes, keep spill output outside the table.

7. **Will the workbook be edited programmatically with row/column insertion?**
   - If yes, use tables carefully and plan for post-edit validation or rebuild.

8. **Would a named range communicate the intent better?**
   - If yes, use a named range instead.

---

## Sources

- [Overview of Excel tables](https://support.microsoft.com/en-us/office/overview-of-excel-tables-7ab0bb7d-3a9e-4b56-a3c9-6c94334e492c)
- [Using structured references with Excel tables](https://support.microsoft.com/en-us/office/using-structured-references-with-excel-tables-f5ed2452-2337-4f71-bed3-c8ae6d2b276e)
- [Dynamic array formulas and spilled array behavior](https://support.microsoft.com/en-us/office/dynamic-array-formulas-and-spilled-array-behavior-205c6b06-03ba-4151-89a1-87a7eb36e531)
- [xlwings Table API](https://docs.xlwings.org/en/stable/api/table.html)
- [openpyxl Worksheet Tables](https://openpyxl.readthedocs.io/en/3.1/worksheet_tables.html)
- [XlsxWriter Working with Worksheet Tables](https://xlsxwriter.readthedocs.io/working_with_tables.html)
- [Excel ListObjects.Add (VBA)](https://learn.microsoft.com/en-us/office/vba/api/excel.listobjects.add)
