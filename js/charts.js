/* =========================================================
   charts.js — gráficos vanilla (sem bibliotecas externas)
   Donut via conic-gradient CSS | Barras via SVG gerado em JS
   ========================================================= */

/**
 * Constrói um donut chart em CSS puro (conic-gradient) + legenda.
 * data: [{ label, value, color }]
 * returns: HTMLElement (container com donut + legenda)
 */
function buildDonutChart(data, centerLabel, centerValueFormatter) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const wrap = document.createElement('div');
  wrap.className = 'row';
  wrap.style.gap = '18px';
  wrap.style.alignItems = 'center';

  const donut = document.createElement('div');
  donut.className = 'donut';

  if (total <= 0) {
    donut.style.background = 'var(--surface-3)';
  } else {
    let acc = 0;
    const stops = data.map((d) => {
      const start = (acc / total) * 360;
      acc += d.value;
      const end = (acc / total) * 360;
      return `${d.color} ${start}deg ${end}deg`;
    });
    donut.style.background = `conic-gradient(${stops.join(', ')})`;
  }

  const center = document.createElement('div');
  center.className = 'donut-center';
  center.innerHTML = `<span class="value mono">${centerValueFormatter ? centerValueFormatter(total) : total}</span><span class="label">${centerLabel || ''}</span>`;
  donut.appendChild(center);

  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.style.flex = '1';
  data
    .slice()
    .sort((a, b) => b.value - a.value)
    .forEach((d) => {
      const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
      const item = document.createElement('div');
      item.className = 'legend__item';
      item.innerHTML = `
        <span class="legend__swatch" style="background:${d.color}"></span>
        <span class="legend__name">${d.label}</span>
        <span class="legend__value mono">${pct}%</span>
      `;
      legend.appendChild(item);
    });

  wrap.appendChild(donut);
  wrap.appendChild(legend);
  return wrap;
}

/**
 * Constrói um gráfico de barras (receitas vs despesas) em SVG puro.
 * data: [{ label, income, expense }]
 * returns: SVGElement
 */
function buildBarChart(data, formatCurrencyShort) {
  const w = 300, h = 150, padBottom = 20, padTop = 6, barGap = 8;
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const groupW = w / data.length;
  const barW = (groupW - barGap * 3) / 2;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('class', 'barchart');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  data.forEach((d, i) => {
    const groupX = i * groupW;
    const incH = ((h - padBottom - padTop) * d.income) / maxVal;
    const expH = ((h - padBottom - padTop) * d.expense) / maxVal;

    const incRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    incRect.setAttribute('x', groupX + barGap);
    incRect.setAttribute('y', h - padBottom - incH);
    incRect.setAttribute('width', barW);
    incRect.setAttribute('height', Math.max(incH, 1));
    incRect.setAttribute('rx', 2);
    incRect.setAttribute('fill', 'var(--emerald)');
    svg.appendChild(incRect);

    const expRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    expRect.setAttribute('x', groupX + barGap * 2 + barW);
    expRect.setAttribute('y', h - padBottom - expH);
    expRect.setAttribute('width', barW);
    expRect.setAttribute('height', Math.max(expH, 1));
    expRect.setAttribute('rx', 2);
    expRect.setAttribute('fill', 'var(--rust)');
    svg.appendChild(expRect);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', groupX + groupW / 2);
    label.setAttribute('y', h - 6);
    label.setAttribute('text-anchor', 'middle');
    label.textContent = d.label;
    svg.appendChild(label);
  });

  return svg;
}

/**
 * Constrói um gráfico de linha (evolução patrimonial) em SVG puro.
 * points: [{ label, value }]
 */
function buildLineChart(points) {
  const w = 300, h = 130, pad = 10;
  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p.value - min) / range) * (h - pad * 2);
    return [x, y];
  });

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('class', 'barchart');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // área preenchida
  const areaPath = [`M ${coords[0][0]} ${h - pad}`, ...coords.map(([x, y]) => `L ${x} ${y}`), `L ${coords[coords.length - 1][0]} ${h - pad}`, 'Z'].join(' ');
  const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  area.setAttribute('d', areaPath);
  area.setAttribute('fill', 'var(--accent-soft)');
  svg.appendChild(area);

  // linha
  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', linePath);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'var(--accent)');
  line.setAttribute('stroke-width', '2');
  svg.appendChild(line);

  coords.forEach(([x, y], i) => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('r', 2.5);
    dot.setAttribute('fill', 'var(--accent)');
    svg.appendChild(dot);

    if (i === 0 || i === coords.length - 1 || points.length <= 6) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', h - 1);
      label.setAttribute('text-anchor', i === 0 ? 'start' : i === coords.length - 1 ? 'end' : 'middle');
      label.textContent = points[i].label;
      svg.appendChild(label);
    }
  });

  return svg;
}

window.Charts = { buildDonutChart, buildBarChart, buildLineChart };
