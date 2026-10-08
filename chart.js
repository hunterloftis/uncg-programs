const root = document.getElementById('uncg-programs');
const tooltip = root.querySelector('.quartile-tooltip');
const rowsContainer = root.querySelector('.chart-rows');
const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const countFormatter = new Intl.NumberFormat('en-US');
const money = value => value === null ? 'Suppressed' : moneyFormatter.format(value);
const count = value => value === null ? 'Suppressed' : countFormatter.format(value);
const cipNumber = cip => `${cip.slice(0, 2)}.${cip.slice(2)}`;
const hasBox = program => [program.employed, program.q1, program.median, program.q3].every(Number.isFinite) && program.employed > 0;
const programs = earningsData.programs.filter(hasBox);
const observations = [...programs, ...earningsData.references].sort((a, b) => a.median - b.median || a.label.localeCompare(b.label));
const heightScale = 54 / Math.max(...programs.map(program => program.employed));
const lowest = Math.min(...observations.map(entry => entry.q1));
const highest = Math.max(...observations.map(entry => entry.q3));
const padding = (highest - lowest) * .06;
const domain = { low: lowest - padding, high: highest + padding };
const position = value => (value - domain.low) / (domain.high - domain.low) * 100;
const extremes = [
  { label: 'Lowest floor', field: 'q1', value: lowest, color: 'var(--red)' },
  { label: 'Lowest ceiling', field: 'q3', value: Math.min(...observations.map(entry => entry.q3)), color: 'var(--red)' },
  { label: 'Highest floor', field: 'q1', value: Math.max(...observations.map(entry => entry.q1)), color: 'var(--green)' },
  { label: 'Highest ceiling', field: 'q3', value: highest, color: 'var(--green)' }
];
const plottedRows = new Map();
let selectedCip = null;
let activeCip = null;

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
  const boxHeight = reference ? 22 : entry.employed * heightScale;
  const row = element('div', 'chart-row');
  row.dataset.cip = entry.cip;
  row.style.minHeight = `${Math.max(matchMedia('(pointer: coarse)').matches ? 44 : 32, boxHeight + 12)}px`;
  const label = element('div', 'row-label');
  const name = element('span', 'degree-name', reference ? `${entry.shortLabel} graduates` : entry.label);
  label.append(name);
  if (!reference) label.append(element('span', 'cip', `· ${cipNumber(entry.cip)}`));
  const plot = element('div', 'row-plot');
  const box = element('button', 'box-hit');
  box.type = 'button';
  box.setAttribute('aria-label', `${entry.label}: 25th percentile ${money(entry.q1)}, median ${money(entry.median)}, 75th percentile ${money(entry.q3)}. ${reference ? count(entry.sampleCount) + ' survey records' : count(entry.employed) + ' graduates with NC wages'}.`);
  box.setAttribute('aria-pressed', 'false');
  box.style.left = `${position(entry.q1)}%`;
  box.style.width = `${position(entry.q3) - position(entry.q1)}%`;
  box.style.setProperty('--box-height', `${boxHeight}px`);
  box.style.setProperty('--box-color', reference ? entry.cip === 'hs-nc' ? 'var(--nc)' : 'var(--us)' : 'var(--college)');
  const fill = element('span', 'box-fill');
  const median = element('span', 'median');
  median.style.left = `${(entry.median - entry.q1) / (entry.q3 - entry.q1) * 100}%`;
  box.append(fill, median);
  for (const extreme of extremes.filter(extreme => entry[extreme.field] === extreme.value)) {
    const edge = element('span', `extreme-line ${extreme.field === 'q3' ? 'ceiling' : 'floor'}`);
    edge.dataset.extreme = extreme.label;
    edge.dataset.value = extreme.value;
    edge.style.setProperty('--edge-color', extreme.color);
    box.append(edge);
  }
  for (const mark of box.children) mark.setAttribute('aria-hidden', 'true');
  plot.append(box);
  row.append(label, plot);
  rowsContainer.append(row);
  plottedRows.set(entry.cip, { entry, box, plot });
  box.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showEntry(entry.cip); });
  box.addEventListener('pointerleave', () => showEntry(selectedCip));
  box.addEventListener('focus', () => showEntry(entry.cip));
  box.addEventListener('blur', () => showEntry(selectedCip));
  box.addEventListener('click', () => selectEntry(entry.cip === selectedCip ? null : entry.cip));
}

const tableBody = root.querySelector('tbody');
for (const program of [...earningsData.programs].sort((a, b) => a.label.localeCompare(b.label))) {
  const row = element('tr');
  const name = element('th');
  name.scope = 'row';
  name.append(
    element('div', '', program.label),
    element('div', 'text-small text-muted', `CIP ${cipNumber(program.cip)} · ${program.source}`),
    element('div', 'text-small text-muted', `${program.note}${hasBox(program) ? '' : ' Box omitted: count or quartile suppressed.'}`)
  );
  row.append(name);
  for (const field of ['q1', 'median', 'q3']) row.append(element('td', 'text-end text-nowrap tabular-nums', money(program[field])));
  for (const field of ['employed', 'graduates']) row.append(element('td', 'text-end tabular-nums', count(program[field])));
  tableBody.append(row);
}

function positionTooltip() {
  const active = plottedRows.get(activeCip);
  if (!active) return;
  const rootRect = root.getBoundingClientRect();
  const boxRect = active.box.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();
  const medianFraction = (active.entry.median - active.entry.q1) / (active.entry.q3 - active.entry.q1);
  const medianX = boxRect.left - rootRect.left + boxRect.width * medianFraction;
  tooltip.style.left = `${Math.max(8, Math.min(rootRect.width - tipRect.width - 8, medianX - tipRect.width / 2))}px`;
  tooltip.style.top = `${Math.max(0, boxRect.top - rootRect.top - tipRect.height - 12)}px`;
}

function showEntry(cip) {
  activeCip = cip;
  for (const [key, { box }] of plottedRows) box.classList.toggle('is-selected', key === cip);
  const active = plottedRows.get(cip);
  tooltip.hidden = !active;
  if (!active) return;
  const { entry } = active;
  const reference = entry.kind === 'reference';
  tooltip.querySelector('.tip-title').textContent = entry.label;
  tooltip.querySelector('.tip-sample').textContent = reference ? `${count(entry.sampleCount)} survey records · fixed box height` : `${count(entry.employed)} graduates with NC wages`;
  tooltip.querySelector('.tip-quartiles').textContent = `${money(entry.q1)} · ${money(entry.median)} · ${money(entry.q3)} (25th · median · 75th)`;
  tooltip.querySelector('.tip-graduates').textContent = reference ? 'Ages 25–34; high school diploma or GED only; civilian employed, positive earnings, no school enrollment.' : `All graduates in source cohort: ${count(entry.graduates)}. Wage count includes only NC covered employment.`;
  tooltip.querySelector('.tip-source').textContent = reference ? 'Census ACS 2019–2023 · weighted estimates · 2023 dollars' : `NC TOWER · CIP ${cipNumber(entry.cip)} · 2019 cohort, year 4`;
  tooltip.querySelector('.tip-note').textContent = reference ? 'Survey sample counts differ from graduation-cohort counts. See notes for the method.' : entry.note;
  positionTooltip();
}

function selectEntry(cip) {
  selectedCip = cip;
  for (const [key, { box }] of plottedRows) box.setAttribute('aria-pressed', String(key === cip));
  showEntry(cip);
  root.querySelector('.selection-status').textContent = cip ? plottedRows.get(cip).box.getAttribute('aria-label') : 'Selection cleared.';
}

function drawTicks() {
  const plotWidth = root.querySelector('.row-plot').getBoundingClientRect().width;
  const targetCount = plotWidth < 300 ? 3 : 6;
  const roughStep = (domain.high - domain.low) / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10].find(factor => factor * magnitude >= roughStep) * magnitude;
  const ticks = [];
  for (let value = Math.ceil(domain.low / step) * step; value <= domain.high; value += step) ticks.push(value);
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
  for (const { plot } of plottedRows.values()) {
    for (const line of plot.querySelectorAll('.grid-line')) line.remove();
    for (const value of ticks) {
      const line = element('span', 'grid-line');
      line.style.left = `${position(value)}%`;
      line.setAttribute('aria-hidden', 'true');
      plot.prepend(line);
    }
  }
  positionTooltip();
}

document.addEventListener('click', event => { if (!event.target.closest('.box-hit')) selectEntry(null); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') selectEntry(null); });
new ResizeObserver(drawTicks).observe(root);
drawTicks();
