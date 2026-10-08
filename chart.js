const root = document.getElementById('uncg-programs');
const tooltip = root.querySelector('.quartile-tooltip');
const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const countFormatter = new Intl.NumberFormat('en-US');
const money = value => value === null ? 'Suppressed' : moneyFormatter.format(value);
const count = value => value === null ? 'Suppressed' : countFormatter.format(value);
const hasBox = entry => [entry.earningsCount, entry.q1, entry.median, entry.q3].every(Number.isFinite) && entry.earningsCount > 0;
const byMedian = (a, b) => (a.median ?? Infinity) - (b.median ?? Infinity) || a.label.localeCompare(b.label);
const fields = new Map(earningsData.fields.map(field => [field.cip, field]));
const programs = earningsData.programs.filter(hasBox);
const observations = [...earningsData.programs, ...earningsData.references].sort(byMedian);
const boxes = [...programs, ...earningsData.references];
const heightScale = 54 / Math.max(...programs.map(program => program.earningsCount));
const circleScale = 32 / Math.sqrt(Math.max(...earningsData.fields.map(field => field.residualCount ?? 0)));
const circleSize = value => Math.sqrt(value) * circleScale;
const lowest = Math.min(...boxes.map(entry => entry.q1));
const highest = Math.max(...boxes.map(entry => entry.q3));
const domain = { low: -highest * .16, high: highest * 1.06 };
const position = value => (value - domain.low) / (domain.high - domain.low) * 100;
const extremes = [
  { label: 'Lowest floor', field: 'q1', value: lowest, color: 'var(--red)' },
  { label: 'Lowest ceiling', field: 'q3', value: Math.min(...boxes.map(entry => entry.q3)), color: 'var(--red)' },
  { label: 'Highest floor', field: 'q1', value: Math.max(...boxes.map(entry => entry.q1)), color: 'var(--green)' },
  { label: 'Highest ceiling', field: 'q3', value: highest, color: 'var(--green)' }
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
const circleKey = root.querySelector('.circle-key');
circleKey.setAttribute('viewBox', '0 0 240 56');
for (const [index, sampleCount] of [50, 150, 300].entries()) {
  circleKey.append(
    svgElement('circle', { cx: 35 + index * 80, cy: 19, r: circleSize(sampleCount) / 2 }),
    svgElement('text', { x: 35 + index * 80, y: 52, 'text-anchor': 'middle' }, sampleCount)
  );
}

for (const entry of observations) {
  const reference = entry.kind === 'reference';
  const field = fields.get(entry.cip.slice(0, 2));
  const available = reference || hasBox(entry);
  const boxHeight = reference ? 22 : available ? entry.earningsCount * heightScale : 0;
  const row = element('div', 'chart-row');
  row.dataset.cip = entry.cip;
  row.style.minHeight = `${Math.max(matchMedia('(pointer: coarse)').matches ? 44 : 36, boxHeight + 12)}px`;
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
    for (const extreme of extremes.filter(extreme => entry[extreme.field] === extreme.value)) {
      const edge = element('span', `extreme-line ${extreme.field === 'q3' ? 'ceiling' : 'floor'}`);
      edge.dataset.extreme = extreme.label;
      edge.dataset.value = extreme.value;
      edge.style.setProperty('--edge-color', extreme.color);
      box.append(edge);
    }
    for (const mark of box.children) mark.setAttribute('aria-hidden', 'true');
    addMark(`${entry.cip}:box`, box, entry);
    plot.append(box);
  } else {
    const message = element('span', 'missing-quartiles text-muted', 'Quartiles suppressed');
    message.style.left = `${position(0)}%`;
    plot.append(message);
  }
  if (field && field.residualCount !== null) {
    const circle = element('button', 'residual-hit');
    circle.dataset.field = field.cip;
    circle.style.left = `${position(0)}%`;
    circle.style.setProperty('--circle-size', `${circleSize(field.residualCount)}px`);
    circle.setAttribute('aria-label', `${entry.label}: shared UNCG field CIP ${field.cip}, ${field.label}. ${count(field.residualCount)} graduates with no observed or marginal employment, ${residualShare(field)} of the field employment counts. This is not a program-level count or zero earnings.`);
    const fill = element('span', 'residual-fill');
    fill.setAttribute('aria-hidden', 'true');
    circle.append(fill);
    addMark(`${entry.cip}:residual`, circle, field, true);
    plot.append(circle);
  }
  row.append(label, plot);
  root.querySelector('.chart-rows').append(row);
}

root.querySelector('.program-summary').textContent = `${programs.length} UNCG program boxes · ${earningsData.references.length} high school boxes · ${earningsData.programs.length - programs.length} program groups with suppressed quartiles · shared field circles repeated on program rows`;

for (const [entries, selector, counts] of [
  [earningsData.programs, '.program-table tbody', ['earningsCount']],
  [earningsData.fields, '.field-table tbody', ['earningsCount', 'observedCount', 'residualCount']]
]) {
  for (const entry of [...entries].sort((a, b) => a.label.localeCompare(b.label))) {
    const row = element('tr');
    const name = element('th');
    name.scope = 'row';
    name.append(element('div', '', entry.label), element('div', 'text-small text-muted', `CIP ${entry.cip} · ${entry.source}`));
    row.append(name);
    for (const key of ['q1', 'median', 'q3']) row.append(element('td', 'text-end text-nowrap tabular-nums', money(entry[key])));
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
  const fraction = active.residual || active.entry.q3 === active.entry.q1 ? .5 : (active.entry.median - active.entry.q1) / (active.entry.q3 - active.entry.q1);
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
  tooltip.querySelector('.tip-title').textContent = residual ? `${entry.label} · shared field CIP ${entry.cip}` : entry.label;
  tooltip.querySelector('.tip-sample').textContent = residual ? `${count(entry.residualCount)} no observed / marginal employment · ${residualShare(entry)} of field counts` : reference ? `${count(entry.sampleCount)} survey records · fixed box height` : `${count(entry.earningsCount)} graduates in the earnings sample`;
  tooltip.querySelector('.tip-quartiles').textContent = residual ? `${count(entry.observedCount)} employed graduates in the same field (employment file)` : `${money(entry.q1)} · ${money(entry.median)} · ${money(entry.q3)} (25th · median · 75th)`;
  tooltip.querySelector('.tip-graduates').textContent = residual ? 'Shared by all rows with this two-digit CIP. Not a count for this individual major.' : reference ? 'Ages 25–34; high school diploma or GED only; civilian employed, positive earnings, no school enrollment.' : 'Covered earnings in at least three quarters, meeting the annual minimum-earnings threshold. May still be enrolled.';
  tooltip.querySelector('.tip-source').textContent = reference ? 'Census ACS 2019–2023 · weighted estimates · 2023 dollars' : `Census PSEO ${earningsData.release} · CIP ${entry.cip} · ${earningsData.cohort} graduates, year 5`;
  tooltip.querySelector('.tip-note').textContent = residual ? 'Circle at $0 is a count marker, not an earnings estimate. Includes excluded jobs, no observed work, and low or intermittent earnings. Counts are privacy protected; do not add repeated circles.' : reference ? 'Different employment filters from PSEO. Survey sample counts are not graduation-cohort counts.' : `${entry.source}. Quartiles apply to the whole four-digit group. ${earningsData.earningsYears} earnings in 2023 dollars; counts and earnings are privacy protected.`;
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
