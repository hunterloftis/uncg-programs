const root = document.getElementById('uncg-programs');
const tooltipTemplate = root.querySelector('#tooltip-template');
const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const countFormatter = new Intl.NumberFormat('en-US');
const money = value => value === null ? 'Suppressed' : moneyFormatter.format(value);
const count = value => value === null ? 'Suppressed' : countFormatter.format(value);
const earningsCutoff = entry => `${entry.minimumEarnings.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} ${entry.minimumEarningsBasis}`;
const hasBox = entry => [entry.earningsCount, entry.q1, entry.median, entry.q3].every(Number.isFinite) && entry.earningsCount > 0;
const plottedMedian = entry => entry.median ?? entry.fallback?.median ?? null;
const byMedian = (a, b) => (plottedMedian(a) ?? Infinity) - (plottedMedian(b) ?? Infinity) || a.label.localeCompare(b.label);
const programs = earningsData.programs.filter(hasBox);
const fallbackPrograms = earningsData.programs.filter(entry => entry.fallback);
const omittedPrograms = earningsData.programs.filter(entry => plottedMedian(entry) === null);
const displayedPrograms = [...programs, ...fallbackPrograms];
const groups = [
  ...earningsData.references.map(entry => ({ field: entry, entries: [entry] })),
  ...earningsData.fields.map(field => ({
    field,
    entries: displayedPrograms.filter(entry => entry.cip.startsWith(`${field.cip}.`)).sort(byMedian)
  })).filter(group => group.entries.length).sort((a, b) => byMedian(a.entries[0], b.entries[0]))
];
const boxes = [...programs, ...earningsData.references];
const heightScale = 54 / Math.max(...programs.map(program => program.earningsCount));
const highest = Math.max(...boxes.map(entry => entry.q3));
const domain = { low: 0, high: highest * 1.06 };
const position = value => (value - domain.low) / (domain.high - domain.low) * 100;
const extremes = [
  { label: 'Low floor', field: 'q1', value: Math.min(...programs.map(entry => entry.q1)), color: 'var(--red)' },
  { label: 'Low ceiling', field: 'q3', value: Math.min(...programs.map(entry => entry.q3)), color: 'var(--red)' },
  { label: 'High floor', field: 'q1', value: Math.max(...programs.map(entry => entry.q1)), color: 'var(--green)' },
  { label: 'High ceiling', field: 'q3', value: Math.max(...programs.map(entry => entry.q3)), color: 'var(--green)' }
];
const plots = [];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgElement(tag, attributes, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function employmentShare(field) {
  const total = field.observedCount + field.residualCount;
  return Number.isFinite(field.observedCount) && Number.isFinite(field.residualCount) && total > 0
    ? `${(field.observedCount / total * 100).toFixed(1)}%`
    : 'Suppressed';
}

function addTooltip(key, node, entry, shareCell = false) {
  const tooltip = tooltipTemplate.content.firstElementChild.cloneNode(true);
  tooltip.id = `tip-${key}`;
  node.type = 'button';
  node.classList.add('chart-hit');
  node.setAttribute('aria-describedby', tooltip.id);
  const reference = entry.kind === 'reference';
  const fallback = entry.fallback;
  const stats = shareCell && reference ? [
    ['At or above nominal wage cutoff', count(entry.observedCount)],
    ['Below nominal wage cutoff', count(entry.residualCount)],
    ['Employed above threshold', employmentShare(entry)],
    ['Survey records (all)', count(entry.totalSampleCount)]
  ] : shareCell ? [
    ['Meets annual and quarterly earnings rules', count(entry.observedCount)],
    ['No observed / marginal employment', count(entry.residualCount)],
    ['Employed above threshold', employmentShare(entry)]
  ] : [
    ...(fallback ? [['Median', money(fallback.median)]] : [
      ['25th percentile', money(entry.q1)],
      ['Median', money(entry.median)],
      ['75th percentile', money(entry.q3)]
    ]),
    [reference ? 'Survey records (qualifying)' : 'Graduates in sample', count(reference ? entry.sampleCount : (fallback ?? entry).earningsCount)],
    ...(reference ? [['Estimated people (qualifying)', count(entry.observedCount)]] : [])
  ];
  tooltip.querySelector('.tip-title').textContent = entry.label;
  tooltip.querySelector('.tip-context').textContent = reference ? `Ages 25–34 · not enrolled · ${shareCell ? 'all wage levels' : `annual wages ≥ ${earningsCutoff(entry)}`}`
    : shareCell ? `Shared field · CIP ${entry.cip}`
    : `${fallback ? 'Pooled program group' : 'Program group'} · CIP ${entry.cip}`;
  const details = tooltip.querySelector('.tip-stats');
  for (const [label, value] of stats) details.append(element('dt', '', label), element('dd', '', value));
  tooltip.querySelector('.tip-source').textContent = reference ? `Census ACS · ${entry.dollarsYear} dollars` : 'Census PSEO';
  tooltip.querySelector('.tip-period').textContent = reference ? `${entry.period} survey`
    : `${(fallback ?? earningsData).cohort} graduates · year ${earningsData.yearsAfterGraduation}`;
  return tooltip;
}

const heightKey = root.querySelector('.height-key');
heightKey.setAttribute('viewBox', '0 0 240 72');
for (const [index, sampleCount] of [20, 100, 300].entries()) {
  heightKey.append(
    svgElement('rect', { x: 20 + index * 80, y: 54 - sampleCount * heightScale, width: 30, height: sampleCount * heightScale }),
    svgElement('text', { x: 35 + index * 80, y: 70, 'text-anchor': 'middle' }, sampleCount)
  );
}
for (const { field, entries } of groups) {
  const group = element('div', 'chart-group');
  group.dataset.field = field.cip;
  const cell = element('button', 'share-cell');
  cell.style.gridRow = `1 / span ${entries.length}`;
  const reference = field.kind === 'reference';
  const share = employmentShare(field);
  if (share !== 'Suppressed') cell.style.setProperty('--share-width', share);
  cell.append(
    element('span', 'cip', reference ? field.shortLabel : `CIP ${field.cip}`),
    element('span', 'share-value tabular-nums', share === 'Suppressed' ? '—' : share)
  );
  cell.setAttribute('aria-label', reference
    ? `${field.label}: ${share} with annual wage-and-salary earnings at or above ${earningsCutoff(field)}. ACS estimate, ${field.period}.`
    : `CIP ${field.cip}, ${field.label}: ${share} employed above threshold, meeting annual and quarterly covered-earnings requirements. Shared field share for ${earningsData.cohort} graduates, not an individual major's employment rate.`);
  group.append(cell, addTooltip(`${field.cip}:share`, cell, field, true));
  for (const entry of entries) {
    const reference = entry.kind === 'reference';
    const available = reference || hasBox(entry);
    const boxHeight = reference ? 22 : available ? entry.earningsCount * heightScale : 0;
    const row = element('div', 'chart-row');
    row.dataset.cip = entry.cip;
    row.style.setProperty('--row-height', `${Math.max(matchMedia('(pointer: coarse)').matches ? 44 : 36, boxHeight + 12)}px`);
    const label = element('div', 'row-label');
    label.append(element('span', 'degree-name', reference ? `${entry.shortLabel} graduates` : entry.label));
    if (!reference) label.append(element('span', 'cip', `· ${entry.cip}`));
    const plot = element('div', 'row-plot');
    plots.push(plot);
    if (available) {
      const box = element('button', 'box-hit');
      box.setAttribute('aria-label', `${entry.label}: 25th percentile ${money(entry.q1)}, median ${money(entry.median)}, 75th percentile ${money(entry.q3)}. ${reference ? count(entry.sampleCount) + ' survey records' : count(entry.earningsCount) + ' graduates in the earnings sample'}.`);
      box.style.left = `${position(entry.q1)}%`;
      box.style.width = `${position(entry.q3) - position(entry.q1)}%`;
      box.style.setProperty('--box-height', `${boxHeight}px`);
      box.style.setProperty('--box-color', reference ? entry.cip === 'hs-nc' ? 'var(--nc)' : 'var(--us)' : 'var(--college)');
      const median = element('span', 'median');
      median.style.left = `${entry.q3 === entry.q1 ? 50 : (entry.median - entry.q1) / (entry.q3 - entry.q1) * 100}%`;
      box.append(element('span', 'box-fill'), median);
      for (const extreme of extremes.filter(extreme => !reference && entry[extreme.field] === extreme.value)) {
        const edge = element('span', `extreme-line ${extreme.field === 'q3' ? 'ceiling' : 'floor'}`);
        edge.dataset.extreme = extreme.label;
        edge.dataset.value = extreme.value;
        edge.style.setProperty('--edge-color', extreme.color);
        box.append(edge);
      }
      for (const mark of box.children) mark.setAttribute('aria-hidden', 'true');
      plot.append(box, addTooltip(`${entry.cip}:box`, box, entry));
    } else if (entry.fallback) {
      const circle = element('button', 'median-hit');
      circle.style.left = `${position(entry.fallback.median)}%`;
      circle.setAttribute('aria-label', `${entry.label}: median ${money(entry.fallback.median)}. ${entry.fallback.source}, ${entry.fallback.cohort} graduates, year five. Circle size is fixed.`);
      const fill = element('span', 'median-fill');
      fill.setAttribute('aria-hidden', 'true');
      circle.append(fill);
      plot.append(circle, addTooltip(`${entry.cip}:median`, circle, entry));
    }
    row.append(label, plot);
    group.append(row);
  }
  root.querySelector('.chart-rows').append(group);
}

root.querySelector('.program-summary').textContent = `${programs.length} UNCG program boxes · ${fallbackPrograms.length} pooled-cohort median circles · ${earningsData.references.length} high school boxes · ${omittedPrograms.length} unavailable program groups omitted`;

const programNames = entries => entries.map(entry => `${entry.label} (CIP ${entry.cip})`).join('; ');
for (const [label, description] of [
  ['Main data:', `${programs.length} UNCG program groups use PSEO quartiles for ${earningsData.cohort} graduates, measured at year five in ${earningsData.earningsYears}. Boxes use this cohort only.`],
  ['Pooled data:', `${fallbackPrograms.length} groups use PSEO's published median across all available five-year cohorts (2001–2018 graduates; 2006–2023 earnings, adjusted to 2023 dollars). Blue circles have fixed size; their area does not represent a count. The employment rules and nationwide coverage match the main PSEO data, but the periods differ. ${programNames(fallbackPrograms)}.`],
  ['Unavailable data:', `${omittedPrograms.length} groups have no published five-year median in either PSEO cohort selection. They are omitted from the chart and retained in the table: ${programNames(omittedPrograms)}.`]
]) {
  const note = element('li');
  note.append(element('strong', '', `${label} `), description);
  root.querySelector('.data-group-notes').append(note);
}

for (const [entries, selector, counts] of [
  [earningsData.programs, '.program-table tbody', ['earningsCount']],
  [earningsData.fields, '.field-table tbody', ['earningsCount', 'observedCount', 'residualCount']]
]) {
  for (const entry of [...entries].sort((a, b) => a.label.localeCompare(b.label))) {
    const row = element('tr');
    const name = element('th');
    name.scope = 'row';
    name.append(element('div', '', entry.label), element('div', 'text-small text-muted', `CIP ${entry.cip} · ${entry.source}`));
    if (entry.fallback) name.append(element('div', 'text-small text-muted', `Median: pooled ${entry.fallback.cohort} cohorts. Other columns: ${earningsData.cohort} cohort.`));
    row.append(name);
    for (const key of ['q1', 'median', 'q3']) row.append(element('td', 'text-end text-nowrap tabular-nums', money(key === 'median' ? plottedMedian(entry) : entry[key])));
    for (const key of counts) row.append(element('td', 'text-end tabular-nums', count(entry[key])));
    if (entry.kind === 'field') row.append(element('td', 'text-end tabular-nums', employmentShare(entry)));
    root.querySelector(selector).append(row);
  }
}

for (const entry of earningsData.references) {
  const row = element('tr');
  const name = element('th', '', entry.label);
  name.scope = 'row';
  row.append(name);
  for (const key of ['q1', 'median', 'q3']) row.append(element('td', 'text-end text-nowrap tabular-nums', money(entry[key])));
  for (const key of ['observedCount', 'residualCount']) row.append(element('td', 'text-end tabular-nums', count(entry[key])));
  row.append(element('td', 'text-end tabular-nums', employmentShare(entry)));
  row.append(element('td', 'text-end tabular-nums', count(entry.totalSampleCount)));
  root.querySelector('.reference-table tbody').append(row);
}

function drawTicks() {
  const plotWidth = plots[0].getBoundingClientRect().width;
  const roughStep = domain.high / (plotWidth < 300 ? 3 : 6);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10].find(factor => factor * magnitude >= roughStep) * magnitude;
  const ticks = [];
  for (let value = 0; value <= domain.high; value += step) ticks.push(value);
  for (const axis of root.querySelectorAll('.axis')) {
    axis.replaceChildren();
    for (const value of ticks) {
      const tick = element('span', 'tick', `$${value / 1000}k`);
      tick.style.left = `${position(value)}%`;
      axis.append(tick);
    }
    const axisRect = axis.getBoundingClientRect();
    for (const tick of axis.children) {
      const tickRect = tick.getBoundingClientRect();
      if (tickRect.left < axisRect.left) tick.style.transform = 'none';
      if (tickRect.right > axisRect.right) tick.style.transform = 'translateX(-100%)';
    }
  }
  for (const plot of plots) {
    plot.querySelectorAll('.grid-line').forEach(line => line.remove());
    for (const value of ticks) {
      const line = element('span', value === 0 ? 'grid-line zero-line' : 'grid-line');
      line.style.left = `${position(value)}%`;
      line.setAttribute('aria-hidden', 'true');
      plot.prepend(line);
    }
  }
}

new ResizeObserver(drawTicks).observe(root);
drawTicks();
