const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["#1264a3", "#1f8f4d", "#d64545", "#8e44ad", "#e67e22", "#2f80ed", "#6c5ce7", "#00897b"];
const DEFAULT_YEAR = 2025;

const dashboardState = {
  highlights: null,
  holidays: null,
  businessMetrics: null,
  restaurantRevenue: null,
  customerMetrics: null,
  serverRankings: null
};

const LINE_CHARTS = [
  ["total-revenue-year-select", "total-revenue-chart", "total-revenue-note", "totalRevenue", "Total revenue", "Selected year latest active month revenue", formatMoney],
  ["total-visits-year-select", "total-visits-chart", "total-visits-note", "totalVisits", "Total visits", "Selected year latest active month visits", (v) => formatNumber(v)],
  ["avg-revenue-year-select", "avg-revenue-chart", "avg-revenue-note", "averageRevenuePerVisit", "Average revenue per visit", "Selected year latest active month average revenue per visit", formatMoney],
  ["avg-wait-year-select", "avg-wait-chart", "avg-wait-note", "averageWaitTime", "Average wait time", "Selected year latest active month wait time", (v) => `${formatNumber(v, 2)} min`]
];

const CUSTOMER_LINE_CHARTS = [
  ["customer-capture-year-select", "customer-capture-chart", "customer-capture-note", "knownCustomerCaptureRate", "Known customer capture rate", "Selected year latest active month customer capture rate", (v) => `${formatNumber(v, 2)}%`, true],
  ["loyalty-share-year-select", "loyalty-share-chart", "loyalty-share-note", "loyaltyMemberRevenueShare", "Loyalty member revenue share", "Selected year latest active month loyalty revenue share", (v) => `${formatNumber(v, 2)}%`, true]
];

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  const sign = Number(value) > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 2)}%`;
}

function metricClass(value) { return Number(value) < 0 ? "metric-negative" : "metric-positive"; }
function metricSpan(value, text) { const s = document.createElement("span"); s.className = metricClass(value); s.textContent = text; return s; }
function averageSpan(text) { const s = document.createElement("span"); s.className = "metric-average"; s.textContent = text; return s; }

function setMetricText(id, value, text) {
  const node = document.getElementById(id);
  if (!node) return;
  node.innerHTML = "";
  node.appendChild(metricSpan(value, text));
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function shortMonthYear(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

async function fetchJson(endpoint, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, { method: "GET", cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function setText(id, value) { const node = document.getElementById(id); if (node) node.textContent = value; }

function chooseDefaultYear(years) {
  if (years.includes(DEFAULT_YEAR)) return DEFAULT_YEAR;
  return years.length > 0 ? Math.max(...years) : "";
}

function yearsDesc(years) { return [...years].sort((a, b) => b - a); }

function populateYearSelect(selectId, years, onChange) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = "";
  yearsDesc(years).forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    select.appendChild(option);
  });
  if (currentValue && years.includes(Number(currentValue))) select.value = currentValue;
  else select.value = String(chooseDefaultYear(years));
  select.onchange = onChange;
}

function renderHighlights() {
  const data = dashboardState.highlights?.data;
  const holidays = dashboardState.holidays?.data;
  if (!data) return;

  setText("latest-highlights-title", `Latest Business Highlights (${shortMonthYear(data.dataLastUpdated)})`);

  const list = document.getElementById("latest-highlights");
  list.innerHTML = "";

  const rows = [
    ["Total revenue YOY: ", data.totalRevenueYoy.percentChange, formatPercent(data.totalRevenueYoy.percentChange)],
    ["Total visits YOY: ", data.totalVisitsYoy.percentChange, formatPercent(data.totalVisitsYoy.percentChange)]
  ];

  rows.forEach(([label, value, text]) => {
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(label));
    li.appendChild(metricSpan(value, text));
    list.appendChild(li);
  });

  const best = document.createElement("li");
  if (data.bestRestaurantYoy) {
    best.appendChild(document.createTextNode(`Best restaurant YOY: ${data.bestRestaurantYoy.restaurantName}: `));
    best.appendChild(metricSpan(data.bestRestaurantYoy.revenueYoyPercent, formatPercent(data.bestRestaurantYoy.revenueYoyPercent)));
  } else {
    best.textContent = "Best restaurant YOY: --";
  }
  list.appendChild(best);

  setText("today-date", holidays ? formatDate(holidays.today) : formatDate(new Date().toISOString().slice(0, 10)));
  setText("data-last-updated", formatDate(data.dataLastUpdated));

  const holidayList = document.getElementById("holiday-list");
  holidayList.innerHTML = "";
  if (holidays?.upcomingHolidays) {
    holidays.upcomingHolidays.forEach((holiday) => {
      const item = document.createElement("li");
      item.textContent = `${holiday.name} - ${formatDate(holiday.date)}`;
      holidayList.appendChild(item);
    });
  }
}

function latestNonNullMonth(rows, key) { return [...rows].reverse().find((row) => row[key] !== null && row[key] !== undefined) || null; }

function renderKpis() {
  const data = dashboardState.highlights?.data;
  const customer = dashboardState.customerMetrics?.data;
  if (!data) return;
  setMetricText("kpi-total-revenue-yoy", data.totalRevenueYoy.percentChange, formatPercent(data.totalRevenueYoy.percentChange));
  setMetricText("kpi-total-visits-yoy", data.totalVisitsYoy.percentChange, formatPercent(data.totalVisitsYoy.percentChange));
  setMetricText("kpi-avg-revenue-yoy", data.averageRevenuePerVisitYoy.percentChange, formatPercent(data.averageRevenuePerVisitYoy.percentChange));
  setMetricText("kpi-avg-wait-yoy", data.averageWaitTimeYoy.percentChange, formatPercent(data.averageWaitTimeYoy.percentChange));
  const latest = customer?.monthly ? latestNonNullMonth(customer.monthly, "knownCustomerCaptureRate") : null;
  const loyalty = customer?.monthly ? latestNonNullMonth(customer.monthly, "loyaltyMemberRevenueShare") : null;
  if (latest) setMetricText("kpi-customer-capture-rate", latest.knownCustomerCaptureRate, `${formatNumber(latest.knownCustomerCaptureRate, 2)}%`);
  if (loyalty) setMetricText("kpi-loyalty-revenue-share", loyalty.loyaltyMemberRevenueShare, `${formatNumber(loyalty.loyaltyMemberRevenueShare, 2)}%`);
}

function getSingleYearValues(rows, metricKey, selectedYear) {
  const rowsForYear = rows.filter((row) => row.year === selectedYear);
  return MONTHS.map((_, monthIndex) => {
    const row = rowsForYear.find((item) => item.month === monthIndex + 1);
    return row ? row[metricKey] : null;
  });
}

function renderLineChart(containerId, label, values, color = COLORS[0], options = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const width = 640, height = 220;
  const margin = { top: 18, right: 18, bottom: 34, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const allValues = values.filter((value) => value !== null && value !== undefined);
  if (allValues.length === 0) { container.textContent = "No data available."; return; }
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(0, ...allValues);
  const range = maxValue - minValue || 1;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  const xScale = (i) => margin.left + (i / 11) * chartWidth;
  const yScale = (v) => margin.top + chartHeight - ((v - minValue) / range) * chartHeight;
  for (let i = 0; i < 5; i++) {
    const y = margin.top + (i / 4) * chartHeight;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", margin.left); line.setAttribute("x2", margin.left + chartWidth);
    line.setAttribute("y1", y); line.setAttribute("y2", y); line.setAttribute("stroke", "#d9e2ec");
    svg.appendChild(line);
  }
  MONTHS.forEach((month, index) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", xScale(index)); text.setAttribute("y", height - 12);
    text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "11"); text.textContent = month;
    svg.appendChild(text);
  });
  for (let i = 0; i <= 4; i++) {
    const value = maxValue - (i / 4) * range;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", margin.left - 8); text.setAttribute("y", margin.top + (i / 4) * chartHeight + 4);
    text.setAttribute("text-anchor", "end"); text.setAttribute("font-size", "10");
    text.textContent = options.percent ? `${formatNumber(value, 0)}%` : formatNumber(value, 0);
    svg.appendChild(text);
  }
  const points = values.map((value, index) => value === null || value === undefined ? null : `${xScale(index)},${yScale(value)}`).filter(Boolean).join(" ");
  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("fill", "none"); polyline.setAttribute("stroke", color); polyline.setAttribute("stroke-width", "3"); polyline.setAttribute("points", points);
  svg.appendChild(polyline);
  values.forEach((value, index) => {
    if (value === null || value === undefined) return;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", xScale(index)); circle.setAttribute("cy", yScale(value)); circle.setAttribute("r", "4"); circle.setAttribute("fill", color);
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = options.formatter ? options.formatter(value) : String(value);
    circle.appendChild(title);
    svg.appendChild(circle);
  });
  container.appendChild(svg);
  container.appendChild(createLegend([{ label, color }]));
}

function createLegend(series) {
  const legend = document.createElement("div"); legend.className = "legend";
  series.forEach((item) => {
    const label = document.createElement("span"); label.className = "legend-item";
    const swatch = document.createElement("span"); swatch.className = "legend-swatch"; swatch.style.background = item.color;
    label.appendChild(swatch); label.appendChild(document.createTextNode(item.label)); legend.appendChild(label);
  });
  return legend;
}

function renderBusinessCharts() {
  const data = dashboardState.businessMetrics?.data;
  if (!data) return;
  LINE_CHARTS.forEach(([selectId, chartId, noteId, metricKey, label, noteLabel, formatter]) => {
    populateYearSelect(selectId, data.years, renderBusinessCharts);
    const year = Number(document.getElementById(selectId).value);
    const values = getSingleYearValues(data.monthly, metricKey, year);
    renderLineChart(chartId, `${label} ${year}`, values, COLORS[0], { formatter });
    updateLineNote(noteId, data.monthly, metricKey, noteLabel, year, formatter);
  });
}

function renderCustomerCharts() {
  const data = dashboardState.customerMetrics?.data;
  if (!data) return;
  CUSTOMER_LINE_CHARTS.forEach(([selectId, chartId, noteId, metricKey, label, noteLabel, formatter, percent], index) => {
    populateYearSelect(selectId, data.years, renderCustomerCharts);
    const year = Number(document.getElementById(selectId).value);
    const values = getSingleYearValues(data.monthly, metricKey, year);
    renderLineChart(chartId, `${label} ${year}`, values, COLORS[index], { percent, formatter });
    updateLineNote(noteId, data.monthly, metricKey, noteLabel, year, formatter);
  });
}

function setAverageNote(noteId, latestValue, averageValue, label, formatter) {
  const node = document.getElementById(noteId);
  if (!node) return;
  node.innerHTML = "";
  if (averageValue === null || averageValue === undefined || averageValue === 0 || latestValue === null || latestValue === undefined) {
    node.textContent = `${label}: not enough data for comparison.`;
    return;
  }
  const diff = ((latestValue - averageValue) / averageValue) * 100;
  const direction = diff >= 0 ? "above" : "below";
  node.appendChild(document.createTextNode(`${label}: `));
  node.appendChild(metricSpan(diff, `${formatNumber(Math.abs(diff), 2)}%`));
  node.appendChild(document.createTextNode(` ${direction} the average, `));
  node.appendChild(averageSpan(formatter(averageValue)));
  node.appendChild(document.createTextNode("."));
}

function updateLineNote(noteId, rows, metricKey, label, selectedYear, formatter) {
  const rowsForYear = rows.filter((row) => row.year === selectedYear);
  const values = rowsForYear.map((row) => row[metricKey]).filter((v) => v !== null && v !== undefined && Number(v) !== 0);
  const latest = [...rowsForYear].reverse().find((row) => row[metricKey] !== null && row[metricKey] !== undefined && Number(row[metricKey]) !== 0);
  if (!latest || values.length === 0) { setText(noteId, `${label}: not enough data for comparison.`); return; }
  const average = values.reduce((sum, value) => sum + Number(value), 0) / values.length;
  setAverageNote(noteId, Number(latest[metricKey]), average, label, formatter);
}

function annualRestaurantRows() {
  const data = dashboardState.restaurantRevenue?.data;
  if (!data) return [];
  const rows = [];
  data.years.forEach((year) => {
    data.restaurants.forEach((restaurant) => {
      const total = data.monthly.filter((m) => m.year === year).reduce((sum, m) => sum + Number(m.restaurantRevenue[restaurant.restaurantId] || 0), 0);
      const prevTotal = data.monthly.filter((m) => m.year === year - 1).reduce((sum, m) => sum + Number(m.restaurantRevenue[restaurant.restaurantId] || 0), 0);
      const yoy = prevTotal === 0 ? null : ((total - prevTotal) / prevTotal) * 100;
      rows.push({ year, restaurantId: restaurant.restaurantId, restaurantName: restaurant.restaurantName, totalRevenue: total, yoy });
    });
  });
  return rows;
}

function rankByYear(rows, year, key, limit = 10) {
  return rows.filter((r) => r.year === year && r[key] !== null && r[key] !== undefined)
    .sort((a, b) => Number(b[key]) - Number(a[key]))
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function rankChangeSign(currentRank, previousRank, year) {
  if (year === 2018 || !previousRank) return "";
  const change = previousRank - currentRank;
  if (change > 0) return " 🟢⬆️";
  if (change < 0) return " 🔴⬇️";
  return " ⚪➖";
}

function renderRestaurantRanking() {
  const data = dashboardState.restaurantRevenue?.data;
  if (!data) return;
  populateYearSelect("restaurant-ranking-year-select", data.years, renderRestaurantRanking);
  const year = Number(document.getElementById("restaurant-ranking-year-select").value);
  const allRows = annualRestaurantRows();
  const current = rankByYear(allRows, year, "yoy", 10);
  const previous = rankByYear(allRows, year - 1, "yoy", 99);
  const prevMap = new Map(previous.map((row) => [row.restaurantId, row.rank]));
  renderSimpleRankingTable("restaurant-revenue-ranking", current, ["Rank", "Restaurant", "YOY"], (row) => [
    `${row.rank}${rankChangeSign(row.rank, prevMap.get(row.restaurantId), year)}`,
    row.restaurantName,
    formatPercent(row.yoy)
  ]);
}

function renderStackedRestaurantChart() {
  const data = dashboardState.restaurantRevenue?.data;
  if (!data || data.years.length === 0) return;
  const select = document.getElementById("restaurant-year-select");
  if (select.options.length === 0) {
    populateYearSelect("restaurant-year-select", data.years, renderStackedRestaurantChart);
  }
  const selectedYear = Number(select.value);
  const rows = data.monthly.filter((row) => row.year === selectedYear);
  const restaurants = data.restaurants;
  const container = document.getElementById("restaurant-revenue-chart");
  container.innerHTML = "";
  const width = 640, height = 230;
  const margin = { top: 18, right: 18, bottom: 34, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const totals = rows.map((row) => restaurants.reduce((sum, r) => sum + Number(row.restaurantRevenue[r.restaurantId] || 0), 0));
  const maxTotal = Math.max(...totals, 1);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const barWidth = chartWidth / 12 * 0.68;
  rows.forEach((row, monthIndex) => {
    const x = margin.left + monthIndex * (chartWidth / 12) + (chartWidth / 12 - barWidth) / 2;
    let y = margin.top + chartHeight;
    restaurants.forEach((restaurant, i) => {
      const value = Number(row.restaurantRevenue[restaurant.restaurantId] || 0);
      const h = (value / maxTotal) * chartHeight;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x); rect.setAttribute("y", y - h); rect.setAttribute("width", barWidth); rect.setAttribute("height", h); rect.setAttribute("fill", COLORS[i % COLORS.length]);
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${restaurant.restaurantName}: ${formatMoney(value)}`;
      rect.appendChild(title);
      svg.appendChild(rect);
      y -= h;
    });
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x + barWidth / 2); text.setAttribute("y", height - 12); text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "11"); text.textContent = MONTHS[monthIndex];
    svg.appendChild(text);
  });
  for (let i = 0; i <= 4; i++) {
    const value = maxTotal - (i / 4) * maxTotal;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", margin.left - 8); text.setAttribute("y", margin.top + (i / 4) * chartHeight + 4); text.setAttribute("text-anchor", "end"); text.setAttribute("font-size", "10"); text.textContent = formatNumber(value, 0);
    svg.appendChild(text);
  }
  container.appendChild(svg);
  container.appendChild(createLegend(restaurants.map((r, i) => ({ label: r.restaurantName, color: COLORS[i % COLORS.length] }))));
  const avg = totals.reduce((s, v) => s + v, 0) / Math.max(totals.length, 1);
  const latest = [...totals].reverse().find((v) => v > 0) || 0;
  setAverageNote("restaurant-revenue-note", latest, avg, "Selected year latest active month revenue", formatMoney);
}

function renderSimpleRankingTable(containerId, rows, headers, valueGetter) {
  const container = document.getElementById(containerId); container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "table-wrap";
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((h) => { const th = document.createElement("th"); th.textContent = h; headRow.appendChild(th); });
  thead.appendChild(headRow); table.appendChild(thead);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    valueGetter(row).forEach((v, i) => { const td = document.createElement("td"); if (i === valueGetter(row).length - 1) td.className = "text-right"; td.textContent = v; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); wrap.appendChild(table); container.appendChild(wrap);
}

function renderServerRanking(containerId, selectId, key, formatter) {
  const data = dashboardState.serverRankings?.data;
  if (!data) return;
  populateYearSelect(selectId, data.years, () => renderServerRankings());
  const year = Number(document.getElementById(selectId).value);
  const current = rankByYear(data.yearly, year, key, 10);
  const previous = rankByYear(data.yearly, year - 1, key, 99);
  const prevMap = new Map(previous.map((row) => [row.serverEmpId, row.rank]));
  renderSimpleRankingTable(containerId, current, ["Rank", "Server", "Restaurant", "Value"], (row) => [
    `${row.rank}${rankChangeSign(row.rank, prevMap.get(row.serverEmpId), year)}`,
    row.serverName || `Server ${row.serverEmpId}`,
    row.restaurantName || "--",
    formatter(row[key])
  ]);
}

function renderServerRankings() {
  renderServerRanking("server-revenue-ranking", "server-revenue-year-select", "totalRevenue", formatMoney);
  renderServerRanking("server-visit-ranking", "server-visit-year-select", "visitCount", (v) => formatNumber(v));
  renderServerRanking("server-tip-ranking", "server-tip-year-select", "averageTipPercent", (v) => `${formatNumber(v, 2)}%`);
}

async function loadDashboardData() {
  const status = document.getElementById("dashboard-status");
  status.textContent = "Loading dashboard data...";
  try {
    const [highlights, holidays, businessMetrics, restaurantRevenue, customerMetrics, serverRankings] = await Promise.all([
      fetchJson("/api/dashboard-highlights"), fetchJson("/api/date-holidays"), fetchJson("/api/yoy-business-metrics"), fetchJson("/api/restaurant-revenue-yoy"), fetchJson("/api/customer-yoy-metrics"), fetchJson("/api/server-rankings")
    ]);
    if ([highlights, holidays, businessMetrics, restaurantRevenue, customerMetrics, serverRankings].some((r) => r.ok !== true)) throw new Error("At least one dashboard API returned ok=false.");
    dashboardState.highlights = highlights; dashboardState.holidays = holidays; dashboardState.businessMetrics = businessMetrics; dashboardState.restaurantRevenue = restaurantRevenue; dashboardState.customerMetrics = customerMetrics; dashboardState.serverRankings = serverRankings;
    renderHighlights(); renderKpis(); renderBusinessCharts(); renderCustomerCharts(); renderRestaurantRanking(); renderStackedRestaurantChart(); renderServerRankings();
    status.textContent = "Dashboard data loaded successfully.";
  } catch (error) {
    status.textContent = `Dashboard data load failed: ${error.name === "AbortError" ? "Request timed out" : error.message}`;
  }
}

function setupDragAndDrop() {
  document.querySelectorAll(".chart-zone").forEach((zone) => {
    restoreZoneOrder(zone);
    zone.addEventListener("dragstart", (event) => { const card = event.target.closest(".chart-card"); if (!card) return; card.classList.add("dragging"); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", card.dataset.cardId); });
    zone.addEventListener("dragend", (event) => { const card = event.target.closest(".chart-card"); if (card) card.classList.remove("dragging"); saveZoneOrder(zone); });
    zone.addEventListener("dragover", (event) => { event.preventDefault(); const dragging = zone.querySelector(".dragging"); if (!dragging) return; const after = getDragAfterElement(zone, event.clientY); if (after == null) zone.appendChild(dragging); else zone.insertBefore(dragging, after); });
  });
}
function getDragAfterElement(container, y) {
  return [...container.querySelectorAll(".chart-card:not(.dragging)")].reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2; return offset < 0 && offset > closest.offset ? { offset, element: child } : closest; }, { offset: Number.NEGATIVE_INFINITY }).element;
}
function saveZoneOrder(zone) { localStorage.setItem(`cs5200-dashboard-order-${zone.dataset.zoneId}`, JSON.stringify([...zone.querySelectorAll(".chart-card")].map((card) => card.dataset.cardId))); }
function restoreZoneOrder(zone) {
  const saved = localStorage.getItem(`cs5200-dashboard-order-${zone.dataset.zoneId}`); if (!saved) return;
  try { JSON.parse(saved).forEach((id) => { const card = zone.querySelector(`[data-card-id="${id}"]`); if (card) zone.appendChild(card); }); } catch { localStorage.removeItem(`cs5200-dashboard-order-${zone.dataset.zoneId}`); }
}
function resetChartOrder() { Object.keys(localStorage).filter((k) => k.startsWith("cs5200-dashboard-order-")).forEach((k) => localStorage.removeItem(k)); window.location.reload(); }

document.addEventListener("DOMContentLoaded", () => {
  setupDragAndDrop();
  document.getElementById("load-dashboard-button").addEventListener("click", loadDashboardData);
  document.getElementById("reset-layout-button").addEventListener("click", resetChartOrder);
});
