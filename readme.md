# UNCG Major Earnings

A static chart of UNCG program earnings and high school graduate earnings in North Carolina and the U.S. No dependencies, build step, or external scripts.

Open `index.html` in a browser. Hover or focus a box to see details; click or tap to pin them. Click elsewhere or press Escape to clear the selection.

## Files

- `index.html`: page, source links, and method notes.
- `styles.css`: layout and fixed dark colors.
- `chart.js`: chart rendering and interactions.
- `data.js`: 63 UNCG program records and two high school references. Missing values are `null`.

## Data

UNCG: [NC TOWER](https://tower.nc.gov/data-sets), 2019 bachelor's cohort, fourth year after graduation. 44 records have both an employed count and earnings quartiles; 19 suppressed records remain in the table. Degree names use historical UNCG inventories, and some reporting codes combine degrees.

High school: weighted quartiles from [2019–2023 ACS public microdata](https://www2.census.gov/programs-surveys/acs/data/pums/2023/5-Year/), in 2023 dollars. The sample includes civilian employed adults aged 25–34 with a high school diploma or GED, no school attendance, and positive earnings. The page notes contain the full method and comparison limits.

Box edges show the 25th and 75th percentiles; the internal line shows the median. UNCG box height is proportional to the NC wage sample count. High school boxes have fixed height. Red and green marks identify the lowest and highest quartile edges.

## GitHub Pages

These four page files can be served unchanged by any static host. For GitHub Pages, use the repository root as the publishing folder. No GitHub Actions build is needed.
