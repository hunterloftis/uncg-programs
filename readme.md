# UNCG Major Earnings

A static chart of UNCG program earnings and high school graduate earnings in North Carolina and the U.S. No dependencies, build step, or external scripts.

Open `index.html` in a browser. Hover or focus a box or circle to see details; click or tap to pin them. Click elsewhere or press Escape to clear the selection.

## Files

- `index.html`: page, source links, and method notes.
- `styles.css`: layout and colors.
- `chart.js`: chart rendering and interactions.
- `data.js`: generated chart data. Missing values are `null`.
- `data/`: source snapshots, degree names, field names, and high school estimates.
- `prepare-data.py`: rebuilds `data.js` from those local files with Python's standard library. Run `python3 prepare-data.py` after a data change.

## Data

UNCG uses [Census PSEO release R2026Q2](https://lehd.ces.census.gov/data/pseo/R2026Q2/nc/), bachelor’s graduates, five years after graduation. All earnings are in 2023 dollars. The program data have three groups:

- **Main data:** 42 four-digit program groups have published quartiles for 2016–2018 graduates, measured in 2021–2023. They appear as boxes.
- **Pooled data:** five groups have no median for that cohort but have a published median across all available five-year cohorts: 2001–2018 graduates, measured in 2006–2023. They appear as teal median circles: Germanic languages (16.05), Classical Studies (16.12), Philosophy (38.01), Religious Studies (38.02), and Physics (40.08).
- **Unavailable data:** Languages, Literatures, and Cultures (16.01), Peace and Conflict Studies (30.05), other interdisciplinary studies (30.99), and Arts Administration (50.10) have suppressed five-year medians in both selections. They remain in the table and are omitted from the chart.

Residual counts are published for 19 of 21 two-digit broad fields and always use the 2016–2018 cohort.

The source snapshots filter institution `00297600`, degree level `05`, national geography, and all industries. Main earnings and employment use cohort `2016` (three graduation years); `pseo-pooled-earnings.csv` uses cohort `0000` (all cohorts). Earnings come from `pseoe_nc.csv.gz`; employment counts come from `pseof_nc.csv.gz`. The pooled medians are published Census values, not averages of cohort medians. Field labels come from the [Census CIP labels](https://lehd.ces.census.gov/data/schema/latest/label_cipcode.csv). Degree names use historical UNCG inventories. A reporting group can combine several degrees.

PSEO earnings cover graduates with positive covered earnings in at least three quarters and annual earnings that meet its minimum threshold. Graduates can still be in school. Covered jobs exclude some work, including unincorporated self-employment and military service. See the [PSEO definitions](https://lehd.ces.census.gov/data/pseo_documentation.html).

The residual category means **no observed employment or marginal employment**, not unemployment. It includes graduates who do not meet the earnings-sample rules. PSEO protects counts and earnings with noise and suppresses some values. Earnings-file and employment-file counts can differ.

High school: weighted quartiles from [2019–2023 ACS public microdata](https://www2.census.gov/programs-surveys/acs/data/pums/2023/5-Year/), in 2023 dollars. The sample includes civilian employed adults aged 25–34 with a high school diploma or GED, no school attendance, and positive earnings. These filters differ from PSEO. The page notes contain the full method and comparison limits.

## Rendering

Box edges show the 25th and 75th percentiles; the internal line shows the median. UNCG box height is proportional to the earnings sample count. High school boxes have fixed height. Red and green marks identify the lowest and highest quartile edges among UNCG program boxes. High school references are excluded. Rows sort by the displayed median, including pooled circles.

Teal circles have fixed size. Their position is the pooled median; their area does not represent a count. Pooled quartiles are available in the source but are not drawn. Tooltips name the cohort and sample count. The program table uses a pooled median where available and labels it; other columns still describe the main cohort. The pooled earnings rules and nationwide coverage match the main PSEO data, but the periods differ.

Purple boxes extend from $0 to the blue box's left edge. Purple height equals blue height multiplied by the broad-field residual count divided by its employed count. If half the field is in the residual category, these counts are equal and the boxes have equal heights. Purple width and area do not represent an earnings range or a count.

**This is a shared field ratio, not a measured ratio for the individual major.** The numerator and denominator both come from the 2016–2018 employment file. Do not divide a field's residual count by a program's earnings count. Tooltips show the shared field totals and ratio; hovering highlights the other rows that share it. Purple boxes are omitted when field counts are suppressed or the row has only a pooled median circle.

## Static hosting

Serve `index.html`, `styles.css`, `chart.js`, and `data.js` unchanged on any static host. For GitHub Pages, use the repository root as the publishing folder. No GitHub Actions build is needed.
