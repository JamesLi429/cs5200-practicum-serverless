const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["#1264a3", "#1f8f4d", "#d64545", "#8e44ad", "#e67e22", "#2f80ed", "#6c5ce7", "#00897b"];
const DEFAULT_YEAR = 2025;

const state = {
  highlights: null,
  holidays: null,
  business: null,
  restaurant: null,
  customer: null,
  server: null
};

const businessCharts = [
  ["total-revenue-year-select", "total-revenue-chart", "total-revenue-note", "totalRevenue", "Total revenue", "Selected year latest active month revenue", formatMoney],
  ["total-visits-year-select", "total-visits-chart", "total-visits-note", "totalVisits", "Total visits", "Selected year latest active month visits", (v) => formatNumber(v)],
  ["avg-revenue-year-select", "avg-revenue-chart", "avg-revenue-note", "averageRevenuePerVisit", "Average revenue per visit", "Selected year latest active month average revenue per visit", formatMoney],
  ["avg-wait-year-select", "avg-wait-chart", "avg-wait-note", "averageWaitTime", "Average wait time", "Selected year latest active month wait time", (v) => `${formatNumber(v, 2)} min`]
];

const customerCharts = [
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

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function metricClass(value) {
  return Number(value) < 0 ? "metric-negative" : "metric-positive";
}

function makeMetricSpan(value, text) {
  const span = document.createElement("span");
  span.className = metricClass(value);
  span.textContent = text;
  return span;
}

function setMetric(id, value, text) {
  const node = document.getElementById(id);
  if (!node) return;
  node.innerHTML = "";
  node.appendChild(makeMetricSpan(value, text));
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
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

function chooseYear(years) {
  return years.includes(DEFAULT_YEAR) ? DEFAULT_YEAR : years[years.length - 1];
}

function populateYearSelect(id, years, onChange) {
  const select = document.getElementById(id);
  if (!select) return;
  const previous = Number(select.value);
  select.innerHTML = "";
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    select.appendChild(option);
  });
  select.value = String(years.includes(previous) ? previous : chooseYear(years));
  select.onchange = onChange;
}

function renderHighlights() {
  const data = state.highlights?.data;
  const holidays = state.holidays?.data;
  if (!data) return;

  const list = document.getElementById("latest-highlights");
  list.innerHTML = "";

  const revenueItem = document.createElement("li");
  revenueItem.append("Total revenue YOY: ", makeMetricSpan(data.totalRevenueYoy.percentChange, formatPercent(data.totalRevenueYoy.percentChange)));
  list.appendChild(revenueItem);

  const visitItem = document.createElement("li");
  visitItem.append("Total visits YOY: ", makeMetricSpan(data.totalVisitsYoy.percentChange, formatPercent(data.totalVisitsYoy.percentChange)));
  list.appendChild(visitItem);

  const bestItem = document.createElement("li");
  if (data.bestRestaurantYoy) {
    bestItem.append(`Best restaurant YOY: ${data.bestRestaurantYoy.restaurantName}: `, makeMetricSpan(data.bestRestaurantYoy.revenueYoyPercent, formatPercent(data.bestRestaurantYoy.revenueYoyPercent)));
  } else {
    bestItem.textContent = "Best restaurant YOY: --";
  }
  list.appendChild(bestItem);

  setText("today-date", holidays ? formatDate(holidays.today) : formatDate(new Date().toISOString().slice(0, 10)));
  setText("data-last-updated", formatDate(data.dataLastUpdated));

  const holidayList = document.getElementById("holiday-list");
  holidayList.innerHTML = "";
  (holidays?.upcomingHolidays || []).forEach((holiday) => {
    const item = document.createElement("li");
    item.textContent = `${holiday.name} - ${formatDate(holiday.date)}`;
    holidayList.appendChild(item);
  });
}

function latestNonNull(rows, key) {
  return [...rows].reverse().find((row) => row[key] !== null && row[key] !== undefined);
}

function renderKpis() {
  const data = state.highlights?.data;
  const customer = state.customer?.data;
  if (!data) return;
  setMetric("kpi-total-revenue-yoy", data.totalRevenueYoy.percentChange, formatPercent(data.totalRevenueYoy.percentChange));
  setMetric("kpi-total-visits-yoy", data.totalVisitsYoy.percentChange, formatPercent(data.totalVisitsYoy.percentChange));
  setMetric("kpi-avg-revenue-yoy", data.averageRevenuePerVisitYoy.percentChange, formatPercent(data.averageRevenuePerVisitYoy.percentChange));
  setMetric("kpi-avg-wait-yoy", data.averageWaitTimeYoy.percentChange, formatPercent(data.averageWaitTimeYoy.percentChange));

  const capture = latestNonNull(customer?.monthly || [], "knownCustomerCaptureRate");
  const loyalty = latestNonNull(customer?.monthly || [], "loyaltyMemberRevenueShare");
  if (capture) setMetric("kpi-customer-capture-rate", capture.knownCustomerCaptureRate, `${formatNumber(capture.knownCustomerCaptureRate, 2)}%`);
  if (loyalty) setMetric("kpi-loyalty-revenue-share", loyalty.loyaltyMemberRevenueShare, `${formatNumber(loyalty.loyaltyMemberRevenueShare, 2)}%`);
}

function getValuesForYear(rows, year, key) {
  return MONTHS.map((_, index) => {
    const row = rows.find((item) => item.year === year && item.month === index + 1);
    return row ? row[key] : null;
  });
}

function renderLineChart(containerId, label, values, options = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const width = 640, height = 220;
  const margin = { top: 18, right: 18, bottom: 34, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const valid = values.filter((v) => v !== null && v !== undefined);
  if (valid.length === 0) { container.textContent = "No data available."; return; }
  const max = Math.max(...valid, 1);
  const min = Math.min(0, ...valid);
  const range = max - min || 1;
  const x = (i) => margin.left + (i / 11) * chartWidth;
  const y = (v) => margin.top + chartHeight - ((v - min) / range) * chartHeight;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");

  for (let i = 0; i < 5; i++) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const yy = margin.top + (i / 4) * chartHeight;
    line.setAttribute("x1", margin.left); line.setAttribute("x2", margin.left + chartWidth);
    line.setAttribute("y1", yy); line.setAttribute("y2", yy); line.setAttribute("stroke", "#d9e2ec");
    svg.appendChild(line);
  }

  MONTHS.forEach((month, i) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x(i)); text.setAttribute("y", height - 12); text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "11"); text.textContent = month;
    svg.appendChild(text);
  });

  for (let i = 0; i <= 4; i++) {
    const val = max - (i / 4) * range;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", margin.left - 8); text.setAttribute("y", margin.top + (i / 4) * chartHeight + 4); text.setAttribute("text-anchor", "end"); text.setAttribute("font-size", "10");
    text.textContent = options.percent ? `${formatNumber(val, 0)}%` : formatNumber(val, 0);
    svg.appendChild(text);
  }

  const points = values.map((v, i) => v === null || v === undefined ? null : `${x(i)},${y(v)}`).filter(Boolean).join(" ");
  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("fill", "none"); polyline.setAttribute("stroke", COLORS[0]); polyline.setAttribute("stroke-width", "3"); polyline.setAttribute("points", points);
  svg.appendChild(polyline);
  values.forEach((v, i) => {
    if (v === null || v === undefined) return;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x(i)); circle.setAttribute("cy", y(v)); circle.setAttribute("r", "3.2"); circle.setAttribute("fill", COLORS[0]);
    svg.appendChild(circle);
  });

  container.appendChild(svg);
  container.appendChild(createLegend([{ label, color: COLORS[0] }]));
}

function createLegend(items) {
  const legend = document.createElement("div");
  legend.className = "legend";
  items.forEach((item) => {
    const span = document.createElement("span");
    span.className = "legend-item";
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.background = item.color;
    span.append(swatch, document.createTextNode(item.label));
    legend.appendChild(span);
  });
  return legend;
}

function setAverageNote(noteId, latest, average, label, formatter) {
  const node = document.getElementById(noteId);
  node.innerHTML = "";
  if (!average || latest === null || latest === undefined) { node.textContent = `${label}: not enough data for comparison.`; return; }
  const diff = ((latest - average) / average) * 100;
  const direction = diff >= 0 ? "above" : "below";
  node.append(`${label}: `, makeMetricSpan(diff, `${formatNumber(Math.abs(diff), 2)}%`), ` ${direction} the average, `, makeMetricSpan(average, formatter(average)), ".");
}

function updateLineNote(noteId, rows, key, label, year, formatter) {
  const rowsForYear = rows.filter((r) => r.year === year);
  const values = rowsForYear.map((r) => r[key]).filter((v) => v !== null && v !== undefined && Number(v) !== 0);
  const latest = [...rowsForYear].reverse().find((r) => r[key] !== null && r[key] !== undefined && Number(r[key]) !== 0);
  if (!latest || values.length === 0) { setText(noteId, `${label}: not enough data for comparison.`); return; }
  const average = values.reduce((sum, v) => sum + Number(v), 0) / values.length;
  setAverageNote(noteId, Number(latest[key]), average, label, formatter);
}

function renderBusinessCharts() {
  const data = state.business?.data;
  if (!data) return;
  businessCharts.forEach(([selectId, chartId, noteId, key, label, noteLabel, formatter]) => {
    populateYearSelect(selectId, data.years, renderBusinessCharts);
    const year = Number(document.getElementById(selectId).value);
    renderLineChart(chartId, `${label} ${year}`, getValuesForYear(data.monthly, year, key));
    updateLineNote(noteId, data.monthly, key, noteLabel, year, formatter);
  });
}

function renderCustomerCharts() {
  const data = state.customer?.data;
  if (!data) return;
  customerCharts.forEach(([selectId, chartId, noteId, key, label, noteLabel, formatter, percent]) => {
    populateYearSelect(selectId, data.years, renderCustomerCharts);
    const year = Number(document.getElementById(selectId).value);
    renderLineChart(chartId, `${label} ${year}`, getValuesForYear(data.monthly, year, key), { percent });
    updateLineNote(noteId, data.monthly, key, noteLabel, year, formatter);
  });
}

function renderRestaurantChart() {
  const data = state.restaurant?.data;
  if (!data || data.years.length === 0) return;
  const select = document.getElementById("restaurant-year-select");
  if (select.options.length === 0) {
    data.years.forEach((year) => {
      const option = document.createElement("option"); option.value = String(year); option.textContent = String(year); select.appendChild(option);
    });
    select.value = String(chooseYear(data.years));
    select.addEventListener("change", renderRestaurantChart);
  }
  const year = Number(select.value);
  const rows = data.monthly.filter((r) => r.year === year);
  const restaurants = data.restaurants;
  const container = document.getElementById("restaurant-revenue-chart");
  container.innerHTML = "";
  const width = 640, height = 230;
  const margin = { top: 18, right: 18, bottom: 34, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const totals = rows.map((row) => restaurants.reduce((s, r) => s + Number(row.restaurantRevenue[r.restaurantId] || 0), 0));
  const max = Math.max(...totals, 1);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  const barWidth = chartWidth / 12 * 0.68;

  rows.forEach((row, monthIndex) => {
    const barX = margin.left + monthIndex * (chartWidth / 12) + (chartWidth / 12 - barWidth) / 2;
    let currentY = margin.top + chartHeight;
    restaurants.forEach((restaurant, rIndex) => {
      const value = Number(row.restaurantRevenue[restaurant.restaurantId] || 0);
      const barHeight = (value / max) * chartHeight;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", barX); rect.setAttribute("y", currentY - barHeight); rect.setAttribute("width", barWidth); rect.setAttribute("height", barHeight); rect.setAttribute("fill", COLORS[rIndex % COLORS.length]);
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${restaurant.restaurantName}: ${formatMoney(value)}`;
      rect.appendChild(title);
      svg.appendChild(rect);
      currentY -= barHeight;
    });
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", barX + barWidth / 2); text.setAttribute("y", height - 12); text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "11"); text.textContent = MONTHS[monthIndex];
    svg.appendChild(text);
  });

  for (let i = 0; i <= 4; i++) {
    const value = max - (i / 4) * max;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", margin.left - 8); text.setAttribute("y", margin.top + (i / 4) * chartHeight + 4); text.setAttribute("text-anchor", "end"); text.setAttribute("font-size", "10"); text.textContent = formatNumber(value, 0);
    svg.appendChild(text);
  }

  container.appendChild(svg);
  container.appendChild(createLegend(restaurants.map((r, i) => ({ label: r.restaurantName, color: COLORS[i % COLORS.length] }))));
  const average = totals.reduce((s, v) => s + v, 0) / Math.max(totals.length, 1);
  const latest = [...totals].reverse().find((v) => v > 0) || 0;
  setAverageNote("restaurant-revenue-note", latest, average, "Selected year latest active month revenue", formatMoney);
}

function renderRankingTable(containerId, rows, valueKey, formatter) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "table-wrap";
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Rank</th><th>Server</th><th>Restaurant</th><th class='text-right'>Value</th></tr></thead>";
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    [[row.rank, ""], [row.serverName || `Server ${row.serverEmpId}`, ""], [row.restaurantName || "--", ""], [formatter(row[valueKey]), "text-right"]].forEach(([text, cls]) => {
      const td = document.createElement("td"); td.textContent = text; if (cls) td.className = cls; tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); wrap.appendChild(table); container.appendChild(wrap);
}

function renderServerRankings() {
  const data = state.server?.data;
  if (!data) return;
  renderRankingTable("server-revenue-ranking", data.revenueRanking, "totalRevenue", formatMoney);
  renderRankingTable("server-visit-ranking", data.visitCountRanking, "visitCount", (v) => formatNumber(v));
  renderRankingTable("server-tip-ranking", data.averageTipPercentRanking, "averageTipPercent", (v) => `${formatNumber(v, 2)}%`);
}

async function loadDashboardData() {
  const status = document.getElementById("dashboard-status");
  status.textContent = "Loading dashboard data...";
  try {
    const [highlights, holidays, business, restaurant, customer, server] = await Promise.all([
      fetchJson("/api/dashboard-highlights"),
      fetchJson("/api/date-holidays"),
      fetchJson("/api/yoy-business-metrics"),
      fetchJson("/api/restaurant-revenue-yoy"),
      fetchJson("/api/customer-yoy-metrics"),
      fetchJson("/api/server-rankings")
    ]);
    if ([highlights, holidays, business, restaurant, customer, server].some((r) => r.ok !== true)) throw new Error("At least one dashboard API returned ok=false.");
    Object.assign(state, { highlights, holidays, business, restaurant, customer, server });
    renderHighlights(); renderKpis(); renderBusinessCharts(); renderRestaurantChart(); renderCustomerCharts(); renderServerRankings();
    status.textContent = "Dashboard data loaded successfully.";
  } catch (error) {
    status.textContent = `Dashboard data load failed: ${error.name === "AbortError" ? "Request timed out" : error.message}`;
  }
}

function setupDragAndDrop() {
  document.querySelectorAll(".chart-zone").forEach((zone) => {
    restoreZoneOrder(zone);
    zone.addEventListener("dragstart", (event) => {
      const card = event.target.closest(".chart-card"); if (!card) return;
      card.classList.add("dragging"); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", card.dataset.cardId);
    });
    zone.addEventListener("dragend", (event) => { const card = event.target.closest(".chart-card"); if (card) card.classList.remove("dragging"); saveZoneOrder(zone); });
    zone.addEventListener("dragover", (event) => {
      event.preventDefault(); const dragging = zone.querySelector(".dragging"); if (!dragging) return;
      const after = getDragAfterElement(zone, event.clientY); if (after == null) zone.appendChild(dragging); else zone.insertBefore(dragging, after);
    });
  });
}

function getDragAfterElement(container, y) {
  return [...container.querySelectorAll(".chart-card:not(.dragging)")].reduce((closest, child) => {
    const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2;
    return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveZoneOrder(zone) {
  localStorage.setItem(`cs5200-dashboard-order-${zone.dataset.zoneId}`, JSON.stringify([...zone.querySelectorAll(".chart-card")].map((c) => c.dataset.cardId)));
}

function restoreZoneOrder(zone) {
  const saved = localStorage.getItem(`cs5200-dashboard-order-${zone.dataset.zoneId}`);
  if (!saved) return;
  try { JSON.parse(saved).forEach((id) => { const card = zone.querySelector(`[data-card-id="${id}"]`); if (card) zone.appendChild(card); }); }
  catch { localStorage.removeItem(`cs5200-dashboard-order-${zone.dataset.zoneId}`); }
}

function resetChartOrder() {
  Object.keys(localStorage).filter((key) => key.startsWith("cs5200-dashboard-order-")).forEach((key) => localStorage.removeItem(key));
  window.location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  setupDragAndDrop();
  document.getElementById("load-dashboard-button").addEventListener("click", loadDashboardData);
  document.getElementById("reset-layout-button").addEventListener("click", resetChartOrder);
});
