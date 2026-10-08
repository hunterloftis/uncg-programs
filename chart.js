const root = document.getElementById('uncg-programs');
const tooltip = root.querySelector('.quartile-tooltip');
const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const countFormatter = new Intl.NumberFormat('en-US');
const money = value => value === null ? 'Suppressed' : moneyFormatter.format(value);
const count = value => value === null ? 'Suppressed' : countFormatter.format(value);
const hasBox = entry => [entry.earningsCount, entry.q1, entry.median, entry.q3].every(Number.isFinite) && entry.earningsCount > 0;
const plottedMedian = entry => entry.median ?? entry.fallback?.median ?? null;
const byMedian = (a, b) => (plottedMedian(a) ?? Infinity) - (plottedMedian(b) ?? Infinity) || a.label.localeCompare(b.label);
const fields = new Map(earningsData.fields.map(field => [field.cip, field]));
const programs = earningsData.programs.filter(hasBox);
const fallbackPrograms = earningsData.programs.filter(entry => entry.fallback);
const omittedPrograms = earningsData.programs.filter(entry => plottedMedian(entry) === null);
const observations = [...programs, ...fallbackPrograms, ...earningsData.references].sort(byMedian);
const boxes = [...programs, ...earningsData.references];
const heightScale = 54 / Math.max(...programs.map(program => program.earningsCount));
const highest = Math.max(...boxes.map(entry => entry.q3));
const domain = { low: 0, high: highest * 1.06 };
const position = value => (value - domain.low) / (domain.high - domain.low) * 100;
const extremes = [
  { label: 'Lowest floor', field: 'q1', value: Math.min(...programs.map(entry => entry.q1)), color: 'var(--red)' },
  { label: 'Lowest ceiling', field: 'q3', value: Math.min(...programs.map(entry => entry.q3)), color: 'var(--red)' },
  { label: 'Highest floor', field: 'q1', value: Math.max(...programs.map(entry => entry.q1)), color: 'var(--green)' },
  { label: 'Highest ceiling', field: 'q3', value: Math.max(...programs.map(entry => entry.q3)), color: 'var(--green)' }
];
const marks = new Map();
const plots = [];
let selectedKey = null;
let activeKey = null;

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

function residualShare(field) {
  const total = field.observedCount + field.residualCount;
  return Number.isFinite(field.observedCount) && Number.isFinite(field.residualCount) && total > 0
    ? `${(field.residualCount / total * 100).toFixed(1)}%`
    : 'Suppressed';
}

function addMark(key, node, entry, residual = false) {
  node.type = 'button';
  node.classList.add('chart-hit');
  node.setAttribute('aria-pressed', 'false');
  marks.set(key, { node, entry, residual });
  node.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showEntry(key); });
  node.addEventListener('pointerleave', () => showEntry(selectedKey));
  node.addEventListener('focus', () => showEntry(key));
  node.addEventListener('blur', () => showEntry(selectedKey));
  node.addEventListener('click', () => selectEntry(key === selectedKey ? null : key));
}

for (const extreme of extremes) {
  const label = element('span');
  const swatch = element('span', `extreme-key ${extreme.field === 'q3' ? 'ceiling' : 'floor'}`);
  swatch.style.setProperty('--edge-color', extreme.color);
  swatch.setAttribute('aria-hidden', 'true');
  label.append(swatch, `${extreme.label} ${money(extreme.value)}`);
  root.querySelector('.extreme-legend').append(label);
}

const heightKey = root.querySelector('.height-key');
heightKey.setAttribute('viewBox', '0 0 240 72');
for (const [index, sampleCount] of [20, 100, 300].entries()) {
  heightKey.append(
    svgElement('rect', { x: 20 + index * 80, y: 54 - sampleCount * heightScale, width: 30, height: sampleCount * heightScale }),
    svgElement('text', { x: 35 + index * 80, y: 70, 'text-anchor': 'middle' }, sampleCount)
  );
}
for (const entry of observations) {
  const reference = entry.kind === 'reference';
  const field = fields.get(entry.cip.slice(0, 2));
  const available = reference || hasBox(entry);
  const boxHeight = reference ? 22 : available ? entry.earningsCount * heightScale : 0;
  const residualHeight = hasBox(entry) && Number.isFinite(field?.residualCount) && field.observedCount > 0
    ? boxHeight * (field.residualCount / field.observedCount)
    : null;
  const row = element('div', 'chart-row');
  row.dataset.cip = entry.cip;
  row.style.minHeight = `${Math.max(matchMedia('(pointer: coarse)').matches ? 44 : 36, boxHeight + 12, (residualHeight ?? 0) + 12)}px`;
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
    addMark(`${entry.cip}:box`, box, entry);
    plot.append(box);
  } else if (entry.fallback) {
    const circle = element('button', 'median-hit');
    circle.style.left = `${position(entry.fallback.median)}%`;
    circle.setAttribute('aria-label', `${entry.label}: median ${money(entry.fallback.median)}. ${entry.fallback.source}, ${entry.fallback.cohort} graduates, year five. Circle size is fixed.`);
    const fill = element('span', 'median-fill');
    fill.setAttribute('aria-hidden', 'true');
    circle.append(fill);
    addMark(`${entry.cip}:median`, circle, entry);
    plot.append(circle);
  }
  if (residualHeight !== null) {
    const box = element('button', 'box-hit residual-hit');
    box.dataset.field = field.cip;
    box.style.left = `${position(0)}%`;
    box.style.width = `${position(entry.q1) - position(0)}%`;
    box.style.setProperty('--box-height', `${residualHeight}px`);
    box.style.setProperty('--box-color', 'var(--residual)');
    box.setAttribute('aria-label', `${entry.label}: shared UNCG field CIP ${field.cip}, ${field.label}. ${count(field.residualCount)} graduates with no observed or marginal employment and ${count(field.observedCount)} employed graduates. Purple-to-blue height ratio uses these field counts, not counts for this individual major. The horizontal span does not represent earnings.`);
    const fill = element('span', 'box-fill');
    fill.setAttribute('aria-hidden', 'true');
    box.append(fill);
    addMark(`${entry.cip}:residual`, box, field, true);
    plot.append(box);
  }
  row.append(label, plot);
  root.querySelector('.chart-rows').append(row);
}

root.querySelector('.program-summary').textContent = `${programs.length} UNCG program boxes · ${fallbackPrograms.length} pooled-cohort median circles · ${earningsData.references.length} high school boxes · ${omittedPrograms.length} unavailable program groups omitted`;

const programNames = entries => entries.map(entry => `${entry.label} (CIP ${entry.cip})`).join('; ');
for (const [label, description] of [
  ['Main data:', `${programs.length} UNCG program groups use PSEO quartiles for ${earningsData.cohort} graduates, measured at year five in ${earningsData.earningsYears}. Boxes use this cohort only.`],
  ['Pooled data:', `${fallbackPrograms.length} groups use PSEO's published median across all available five-year cohorts (2001–2018 graduates; 2006–2023 earnings, adjusted to 2023 dollars). Teal circles have fixed size; their area does not represent a count. The employment rules and nationwide coverage match the main PSEO data, but the periods differ. ${programNames(fallbackPrograms)}.`],
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
    if (entry.kind === 'field') row.append(element('td', 'text-end tabular-nums', residualShare(entry)));
    root.querySelector(selector).append(row);
  }
}

function positionTooltip() {
  const active = marks.get(activeKey);
  if (!active) return;
  const rootRect = root.getBoundingClientRect();
  const markRect = active.node.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();
  const fraction = active.residual || active.entry.fallback || active.entry.q3 === active.entry.q1 ? .5 : (active.entry.median - active.entry.q1) / (active.entry.q3 - active.entry.q1);
  const anchorX = markRect.left - rootRect.left + markRect.width * fraction;
  tooltip.style.left = `${Math.max(8, Math.min(rootRect.width - tipRect.width - 8, anchorX - tipRect.width / 2))}px`;
  tooltip.style.top = `${Math.max(0, markRect.top - rootRect.top - tipRect.height - 12)}px`;
}

function showEntry(key) {
  activeKey = key;
  const active = marks.get(key);
  tooltip.hidden = !active;
  for (const [markKey, mark] of marks) {
    const shared = active?.residual && mark.residual && mark.entry.cip === active.entry.cip;
    mark.node.classList.toggle('is-selected', markKey === key || Boolean(shared));
  }
  if (!active) return;
  const { entry, residual } = active;
  const reference = entry.kind === 'reference';
  const fallback = entry.fallback;
  const stats = residual ? [
    ['No observed / marginal employment', count(entry.residualCount)],
    ['Employed', count(entry.observedCount)],
    ['Residual share', residualShare(entry)]
  ] : [
    ...(fallback ? [['Median', money(fallback.median)]] : [
      ['25th percentile', money(entry.q1)],
      ['Median', money(entry.median)],
      ['75th percentile', money(entry.q3)]
    ]),
    [reference ? 'Survey records' : 'Graduates in sample', count(reference ? entry.sampleCount : (fallback ?? entry).earningsCount)]
  ];
  tooltip.querySelector('.tip-title').textContent = entry.label;
  tooltip.querySelector('.tip-context').textContent = residual ? `Shared field · CIP ${entry.cip}`
    : reference ? 'Ages 25–34 · employed, not enrolled'
    : `${fallback ? 'Pooled program group' : 'Program group'} · CIP ${entry.cip}`;
  const details = tooltip.querySelector('.tip-stats');
  details.replaceChildren();
  for (const [label, value] of stats) details.append(element('dt', '', label), element('dd', '', value));
  tooltip.querySelector('.tip-source').textContent = reference ? 'Census ACS' : 'Census PSEO';
  tooltip.querySelector('.tip-period').textContent = reference ? `${entry.period} survey`
    : `${(fallback ?? earningsData).cohort} graduates · year ${earningsData.yearsAfterGraduation}`;
  positionTooltip();
}

function selectEntry(key) {
  selectedKey = key;
  for (const [markKey, { node }] of marks) node.setAttribute('aria-pressed', String(markKey === key));
  showEntry(key);
  root.querySelector('.selection-status').textContent = key ? marks.get(key).node.getAttribute('aria-label') : 'Selection cleared.';
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
  positionTooltip();
}

document.addEventListener('click', event => { if (!event.target.closest('.chart-hit')) selectEntry(null); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') selectEntry(null); });
new ResizeObserver(drawTicks).observe(root);
drawTicks();
