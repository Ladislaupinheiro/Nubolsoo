/* =========================================================
   charts.js — wrapper fino sobre ApexCharts
   A lib ApexCharts é carregada via <script> no index.html
   (window.ApexCharts). Este ficheiro apenas monta as opções
   de cada gráfico usando os tokens de cor do styles.css.
   ========================================================= */

/** Lê os design tokens (custom properties) definidos em styles.css */
function chartTokens() {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  return {
    text: v('--text'),
    dim: v('--text-dim'),
    border: v('--border-soft'),
    surface: v('--surface'),
    emerald: v('--emerald'),
    rust: v('--rust'),
    accent: v('--accent'),
    mono: v('--font-mono')
  };
}

/** Opções base partilhadas por todos os gráficos (tema escuro/ledger) */
function baseOptions(extraChart) {
  const t = chartTokens();
  return {
    chart: {
      background: 'transparent',
      foreColor: t.dim,
      fontFamily: t.mono,
      toolbar: { show: false },
      animations: { speed: 260 },
      ...extraChart
    },
    grid: { borderColor: t.border, strokeDashArray: 3, padding: { left: 8, right: 8 } },
    tooltip: { theme: 'dark' }
  };
}

/**
 * Renderiza um donut chart dentro de `container` (elemento já no DOM).
 * data: [{ label, value, color }]
 */
function renderDonutChart(container, data, centerLabel, formatter) {
  if (!container) return null;
  container.innerHTML = '';
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) {
    container.innerHTML = '<p style="font-size:12.5px;color:var(--text-dim);text-align:center;padding:20px 0">Sem dados neste período.</p>';
    return null;
  }
  const t = chartTokens();
  const options = {
    ...baseOptions({ type: 'donut', height: 220 }),
    series: data.map((d) => d.value),
    labels: data.map((d) => d.label),
    colors: data.map((d) => d.color),
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    legend: {
      position: 'right',
      fontSize: '12px',
      labels: { colors: t.dim },
      markers: { size: 5, offsetX: -2 },
      itemMargin: { vertical: 3 },
      formatter: (label, opts) => `${label} · ${Math.round((opts.w.globals.series[opts.seriesIndex] / total) * 100)}%`
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            name: { color: t.dim, fontSize: '10px', offsetY: 18 },
            value: {
              color: t.text,
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: t.mono,
              formatter: (v) => (formatter ? formatter(Number(v)) : v)
            },
            total: {
              show: true,
              label: centerLabel || '',
              color: t.dim,
              fontSize: '10px',
              formatter: () => (formatter ? formatter(total) : String(total))
            }
          }
        }
      }
    }
  };
  const chart = new ApexCharts(container, options);
  chart.render();
  return chart;
}

/**
 * Renderiza um gráfico de barras (receitas vs despesas) dentro de `container`.
 * data: [{ label, income, expense }]
 */
function renderBarChart(container, data) {
  if (!container) return null;
  container.innerHTML = '';
  const t = chartTokens();
  const options = {
    ...baseOptions({ type: 'bar', height: 200 }),
    series: [
      { name: 'Receitas', data: data.map((d) => d.income) },
      { name: 'Despesas', data: data.map((d) => d.expense) }
    ],
    colors: [t.emerald, t.rust],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 3, borderRadiusApplication: 'end' } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: data.map((d) => d.label),
      labels: { style: { colors: t.dim, fontSize: '10px', fontFamily: t.mono } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { labels: { show: false } },
    legend: { show: false }
  };
  const chart = new ApexCharts(container, options);
  chart.render();
  return chart;
}

/**
 * Renderiza um gráfico de área/linha (evolução patrimonial) dentro de `container`.
 * points: [{ label, value }]
 */
function renderLineChart(container, points) {
  if (!container) return null;
  container.innerHTML = '';
  const t = chartTokens();
  const options = {
    ...baseOptions({ type: 'area', height: 180 }),
    series: [{ name: 'Patrimônio', data: points.map((p) => p.value) }],
    colors: [t.accent],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    markers: { size: 3, colors: [t.accent], strokeWidth: 0 },
    xaxis: {
      categories: points.map((p) => p.label),
      labels: { style: { colors: t.dim, fontSize: '10px', fontFamily: t.mono } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { labels: { show: false } },
    legend: { show: false }
  };
  const chart = new ApexCharts(container, options);
  chart.render();
  return chart;
}

window.Charts = { renderDonutChart, renderBarChart, renderLineChart };
