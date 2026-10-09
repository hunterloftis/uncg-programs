# UNCG Major Earnings

A static chart of UNCG program earnings and high school graduate earnings in North Carolina and the U.S. No dependencies, build step, or external scripts.

Open `index.html` in a browser. Hover or focus a box, circle, or share cell to see details. CSS controls tooltip visibility and anchor positioning.

## Files

- `index.html`: page, source links, and method notes.
- `styles.css`: layout and colors.
- `chart.js`: chart rendering and interactions.
- `data.js`: generated chart data. Missing values are `null`.
- `data/`: source snapshots, degree names, field names, and high school estimates.
- `prepare-data.py`: rebuilds `data.js` from those local files with Python's standard library. Run `python3 prepare-data.py` after a data change.
- `prepare-high-school.py`: rebuilds `data/high-school.json` from the Census national ACS person ZIP with Python's standard library.

## Data

UNCG uses [Census PSEO release R2026Q2](https://lehd.ces.census.gov/data/pseo/R2026Q2/nc/), bachelor’s graduates, five years after graduation. All earnings are in 2023 dollars. The program data have three groups:

- **Main data:** 42 four-digit program groups have published quartiles for 2016–2018 graduates, measured in 2021–2023. They appear as boxes.
- **Pooled data:** five groups have no median for that cohort but have a published median across all available five-year cohorts: 2001–2018 graduates, measured in 2006–2023. They appear as blue median circles: Germanic languages (16.05), Classical Studies (16.12), Philosophy (38.01), Religious Studies (38.02), and Physics (40.08).
- **Unavailable data:** Languages, Literatures, and Cultures (16.01), Peace and Conflict Studies (30.05), other interdisciplinary studies (30.99), and Arts Administration (50.10) have suppressed five-year medians in both selections. They are omitted from the chart and listed in the notes.

Residual counts are published for 19 of 21 two-digit broad fields and always use the 2016–2018 cohort.

The source snapshots filter institution `00297600`, degree level `05`, national geography, and all industries. Main earnings and employment use cohort `2016` (three graduation years); `pseo-pooled-earnings.csv` uses cohort `0000` (all cohorts). Earnings come from `pseoe_nc.csv.gz`; employment counts come from `pseof_nc.csv.gz`. The pooled medians are published Census values, not averages of cohort medians. Field labels come from the [Census CIP labels](https://lehd.ces.census.gov/data/schema/latest/label_cipcode.csv). Degree names use historical UNCG inventories. A reporting group can combine several degrees.

PSEO earnings cover graduates with positive covered earnings in at least three quarters and annual earnings that meet its minimum threshold. Graduates can still be in school. Covered jobs exclude some work, including unincorporated self-employment and military service. See the [PSEO definitions](https://lehd.ces.census.gov/data/pseo_documentation.html).

The residual category means **no observed employment or marginal employment**, not unemployment. It includes graduates who do not meet the earnings-sample rules. PSEO protects counts and earnings with noise and suppresses some values. Earnings-file and employment-file counts can differ.

High school: weighted estimates from [2019–2023 ACS public microdata](https://www2.census.gov/programs-surveys/acs/data/pums/2023/5-Year/), in 2023 dollars. The base includes civilians aged 25–34 with only a regular high school diploma or GED and no school attendance in the last three months. It includes employed, unemployed, and out-of-labor-force adults. NC uses residents of North Carolina; the U.S. includes the 50 states and DC.

Annual earnings use wage-and-salary income (`WAGP`), excluding net self-employment income. The qualifying group has unadjusted annual wages of at least **$12,687.50**: 35 hours × 50 weeks × $7.25, following the [PSEO technical guide, page 6 (June 2023)](https://lehd.ces.census.gov/doc/PSEOTechnicalDocumentation.pdf#page=6). The federal minimum wage was $7.25 throughout 2019–2023, so the nominal cutoff is the same for every survey year. Apply the cutoff **before** inflation adjustment, then adjust qualifying wages to 2023 dollars with `ADJINC / 1,000,000` for the quartiles. The threshold is an earnings benchmark, not evidence of full-time work.

Wages below the cutoff, including zero, form the no/low wage earnings group. Adults whose income comes only from self-employment belong to this group because their wage-and-salary income is zero. Each person belongs to exactly one group; current employment status does not determine the group. `minimumEarnings` is the unadjusted cutoff; `minimumEarningsBasis` records that distinction. `dollarsYear` applies to the reported earnings quartiles.

Each group's population estimate uses person weights (`PWGTP`). Quartiles use the qualifying group's weights and take the first earnings value where cumulative weight reaches 25%, 50%, or 75%; results are rounded to dollars. `sampleCount` is the qualifying survey record count; `totalSampleCount` is the full base record count. `observedCount` and `residualCount` are the qualifying and below-cutoff weighted population estimates; `populationEstimate` is their total. These are survey estimates, not graduation-cohort counts. Confidence intervals are not shown.

**ACS no/low wage earnings is not the PSEO residual measure.** ACS cannot identify earnings in each calendar quarter or reproduce PSEO's covered-job rules. Income refers to the prior 12 months rather than a calendar year. No quarterly or weeks-worked test is imposed. The cutoff follows the linked PSEO technical guide; it does not establish that ACS reproduces the rules of release R2026Q2. The populations and periods differ. These comparisons do not measure the causal effect of a degree.

To rebuild, download [the national person ZIP](https://www2.census.gov/programs-surveys/acs/data/pums/2023/5-Year/csv_pus.zip) outside the repository, then run:

```sh
python3 prepare-high-school.py /path/to/csv_pus.zip
python3 prepare-data.py
```

The script reads all four national person CSV parts and derives both geographic estimates from the same source.

## Rendering

Box edges show the 25th and 75th percentiles; the internal line shows the median. UNCG box height is proportional to the earnings sample count. Both high school boxes are yellow and have fixed height; their row labels identify NC and the U.S. Red and green marks identify the lowest and highest quartile edges among UNCG program boxes. High school references are excluded. UNCG rows group by two-digit field code; fields sort by their lowest displayed median. Rows within each field sort by the displayed median, including pooled circles. High school references appear first.

Blue circles have fixed size. Their position is the pooled median; their area does not represent a count. Pooled quartiles are available in the source but are not drawn. Tooltips name the data source, cohort, and sample count. Source links are in the notes; the page has no raw-data tables. The pooled earnings rules and nationwide coverage match the main PSEO data, but the periods differ.

One “Employed above threshold” cell spans all displayed program rows in each broad field. The share is the field employed count divided by the sum of its residual and employed counts. Qualifying graduates meet PSEO’s annual earnings cutoff and three-quarter employment test. Both counts come from the 2016–2018 employment file, including beside pooled median circles. A dash means the field counts are suppressed.

**This is a shared field share, not a measured share for the individual major.** Tooltips show the field totals. Do not divide a field's residual count by a program's earnings count.

Each high school reference has its own “Employed above threshold” cell: weighted population at or above the cutoff divided by the full weighted base. “Above” includes earnings exactly at the cutoff. Tooltips identify the ACS source and show the cutoff and counts. The high school measure cannot reproduce PSEO’s quarterly employment test or job coverage; current employment status is not required.

## Static hosting

Serve `index.html`, `styles.css`, `chart.js`, and `data.js` unchanged on any static host. For GitHub Pages, use the repository root as the publishing folder. No GitHub Actions build is needed.
