const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["#1264a3", "#1f8f4d", "#d64545", "#8e44ad", "#e67e22", "#2f80ed", "#6c5ce7", "#00897b"];

const LINE_CHARTS = [
  {
    selectId: "total-revenue-year-select",
    chartId: "total-revenue-chart",
    noteId: "total-revenue-note",
    metricKey: "totalRevenue",
    label: "Total revenue",
    noteLabel: "Selected year latest active month revenue"
  },
  {
    selectId: "total-visits-year-select",
    chartId: "total-visits-chart",
    noteId: "total-visits-note",
    metricKey: "totalVisits",
    label: "Total visits",
    noteLabel: "Selected year latest active month visits"
  },
  {
    selectId: "avg-revenue-year-select",
    chartId: "avg-revenue-chart",
    noteId: "avg-revenue-note",
    metricKey: "averageRevenuePerVisit",
    label: "Average revenue per visit",
    noteLabel: "Selected year latest active month average revenue per visit"
  },
  {
    selectId: "avg-wait-year-select",
    chartId: "avg-wait-chart",
    noteId: "avg-wait-note",
    metricKey: "averageWaitTime",
    label: "Average wait time",
    noteLabel: "Selected year latest active month wait time"
  }
];

const CUSTOMER_LINE_CHARTS = [
  {
    selectId: "customer-capture-year-select",
    chartId: "customer-capture-chart",
    noteId: "customer-capture-note",
    metricKey: "knownCustomerCaptureRate",
    label: "Known customer capture rate",
    noteLabel: "Selected year latest active month customer capture rate",
    percent: true
  },
  {
    selectId: "loyalty-share-year-select",
    chartId: "loyalty-share-chart",
    noteId: "loyalty-share-note",
    metricKey: "loyaltyMemberRevenueShare",
    label: "Loyalty member revenue share",
    noteLabel: "Selected year latest active month loyalty revenue share",
    percent: true
  }
];

const dashboardState = {
  highlights: null,
  holidays: null,
  businessMetrics: null,
  restaurantRevenue: null,
  customerMetrics: null,
  serverRankings: null
};

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  const sign = Number(value) > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 2)}%`;
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(`${value}T00:00:00Z`);

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

async function fetchJson(endpoint, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function setText(id, value) {
  const node = document.getElementById(id);

  if (node) {
    node.textContent = value;
  }
}

function renderHighlights() {
  const data = dashboardState.highlights?.data;
  const holidays = dashboardState.holidays?.data;

  if (!data) {
    return;
  }

  const bestRestaurant = data.bestRestaurantYoy
    ? `${data.bestRestaurantYoy.restaurantName}: ${formatPercent(data.bestRestaurantYoy.revenueYoyPercent)}`
    : "--";

  const list = document.getElementById("latest-highlights");
  list.innerHTML = "";

  [
    `Total revenue YOY: ${formatPercent(data.totalRevenueYoy.percentChange)}`,
    `Total visits YOY: ${formatPercent(data.totalVisitsYoy.percentChange)}`,
    `Best restaurant YOY: ${bestRestaurant}`
  ].forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    list.appendChild(item);
  });

  setText("today-date", holidays ? formatDate(holidays.today) : formatDate(new Date().toISOString().slice(0, 10)));
  setText("data-last-updated", formatDate(data.dataLastUpdated));

  const holidayList = document.getElementById("holiday-list");
  holidayList.innerHTML = "";

  if (holidays && holidays.upcomingHolidays) {
    holidays.upcomingHolidays.forEach((holiday) => {
      const item = document.createElement("li");
      item.textContent = `${holiday.name} - ${formatDate(holiday.date)}`;
      holidayList.appendChild(item);
    });
  }
}

function renderKpis() {
  const data = dashboardState.highlights?.data;
  const customer = dashboardState.customerMetrics?.data;

  if (!data) {
    return;
  }

  setText("kpi-total-revenue-yoy", formatPercent(data.totalRevenueYoy.percentChange));
  setText("kpi-total-visits-yoy", formatPercent(data.totalVisitsYoy.percentChange));
  setText("kpi-avg-revenue-yoy", formatPercent(data.averageRevenuePerVisitYoy.percentChange));
  setText("kpi-avg-wait-yoy", formatPercent(data.averageWaitTimeYoy.percentChange));

  if (customer && customer.monthly.length > 0) {
    const latest = latestNonNullMonth(customer.monthly, "knownCustomerCaptureRate");
    const loyalty = latestNonNullMonth(customer.monthly, "loyaltyMemberRevenueShare");

    setText("kpi-customer-capture-rate", latest ? `${formatNumber(latest.knownCustomerCaptureRate, 2)}%` : "--");
    setText("kpi-loyalty-revenue-share", loyalty ? `${formatNumber(loyalty.loyaltyMemberRevenueShare, 2)}%` : "--");
  }
}

function latestNonNullMonth(rows, key) {
  return [...rows].reverse().find((row) => row[key] !== null && row[key] !== undefined) || null;
}

function populateYearSelect(selectId, years, onChange) {
  const select = document.getElementById(selectId);

  if (!select) {
    return;
  }

  const currentValue = select.value;
  select.innerHTML = "";

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    select.appendChild(option);
  });

  if (currentValue && years.includes(Number(currentValue))) {
    select.value = currentValue;
  } else if (years.length > 0) {
    select.value = String(years[years.length - 1]);
  }

  select.onchange = onChange;
}

function getSingleYearSeries(monthlyRows, metricKey, label, selectedYear, color = COLORS[0]) {
  const rowsForYear = monthlyRows.filter((row) => row.year === selectedYear);

  return [{
    label: String(label),
    color,
    values: MONTHS.map((_, monthIndex) => {
      const row = rowsForYear.find((item) => item.month === monthIndex + 1);
      return row ? row[metricKey] : null;
    })
  }];
}

function renderLineChart(containerId, series, options = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const width = 640;
  const height = 220;
  const margin = { top: 18, right: 18, bottom: 34, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const allValues = series.flatMap((item) => item.values).filter((value) => value !== null && value !== undefined);

  if (allValues.length === 0) {
    container.textContent = "No data available.";
    return;
  }

  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(0, ...allValues);
  const range = maxValue - minValue || 1;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");

  function xScale(index) {
    return margin.left + (index / 11) * chartWidth;
  }

  function yScale(value) {
    return margin.top + chartHeight - ((value - minValue) / range) * chartHeight;
  }

  for (let i = 0; i < 5; i++) {
    const y = margin.top + (i / 4) * chartHeight;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", margin.left);
    line.setAttribute("x2", margin.left + chartWidth);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#d9e2ec");
    svg.appendChild(line);
  }

  MONTHS.forEach((month, index) => {
    const x = xScale(index);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", height - 12);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "11");
    text.textContent = month;
    svg.appendChild(text);
  });

  for (let i = 0; i <= 4; i++) {
    const value = maxValue - (i / 4) * range;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", margin.left - 8);
    text.setAttribute("y", margin.top + (i / 4) * chartHeight + 4);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("font-size", "10");
    text.textContent = options.percent ? `${formatNumber(value, 0)}%` : formatNumber(value, 0);
    svg.appendChild(text);
  }

  series.forEach((item) => {
    const points = item.values
      .map((value, index) => value === null || value === undefined ? null : `${xScale(index)},${yScale(value)}`)
      .filter(Boolean)
      .join(" ");

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", item.color);
    polyline.setAttribute("stroke-width", "3");
    polyline.setAttribute("points", points);
    svg.appendChild(polyline);

    item.values.forEach((value, index) => {
      if (value === null || value === undefined) {
        return;
      }

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", xScale(index));
      circle.setAttribute("cy", yScale(value));
      circle.setAttribute("r", "3.2");
      circle.setAttribute("fill", item.color);
      svg.appendChild(circle);
    });
  });

  container.appendChild(svg);
  container.appendChild(createLegend(series));
}

function createLegend(series) {
  const legend = document.createElement("div");
  legend.className = "legend";

  series.forEach((item) => {
    const label = document.createElement("span");
    label.className = "legend-item";

    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.background = item.color;

    label.appendChild(swatch);
    label.appendChild(document.createTextNode(item.label));
    legend.appendChild(label);
  });

  return legend;
}

function renderBusinessCharts() {
  const data = dashboardState.businessMetrics?.data;

  if (!data) {
    return;
  }

  LINE_CHARTS.forEach((chart) => {
    populateYearSelect(chart.selectId, data.years, renderBusinessCharts);

    const selectedYear = Number(document.getElementById(chart.selectId).value);
    const series = getSingleYearSeries(data.monthly, chart.metricKey, `${chart.label} ${selectedYear}`, selectedYear);

    renderLineChart(chart.chartId, series);
    updateLineNote(chart.noteId, data.monthly, chart.metricKey, chart.noteLabel, selectedYear);
  });
}

function renderCustomerCharts() {
  const data = dashboardState.customerMetrics?.data;

  if (!data) {
    return;
  }

  CUSTOMER_LINE_CHARTS.forEach((chart, index) => {
    populateYearSelect(chart.selectId, data.years, renderCustomerCharts);

    const selectedYear = Number(document.getElementById(chart.selectId).value);
    const series = getSingleYearSeries(
      data.monthly,
      chart.metricKey,
      `${chart.label} ${selectedYear}`,
      selectedYear,
      COLORS[index]
    );

    renderLineChart(chart.chartId, series, { percent: chart.percent });
    updateLineNote(chart.noteId, data.monthly, chart.metricKey, chart.noteLabel, selectedYear);
  });
}

function renderStackedRestaurantChart() {
  const data = dashboardState.restaurantRevenue?.data;

  if (!data || data.years.length === 0) {
    return;
  }

  const select = document.getElementById("restaurant-year-select");

  if (select.options.length === 0) {
    data.years.forEach((year) => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      select.appendChild(option);
    });

    select.value = String(data.years[data.years.length - 1]);
    select.addEventListener("change", renderStackedRestaurantChart);
  }

  const selectedYear = Number(select.value);
  const rows = data.monthly.filter((row) => row.year === selectedYear);
  const restaurants = data.restaurants;
  const container = document.getElementById("restaurant-revenue-chart");
  container.innerHTML = "";

  const width = 640;
  const height = 230;
  const margin = { top: 18, right: 18, bottom: 34, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const monthTotals = rows.map((row) =>
    restaurants.reduce((sum, restaurant) => sum + Number(row.restaurantRevenue[restaurant.restaurantId] || 0), 0)
  );

  const maxTotal = Math.max(...monthTotals, 1);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");

  const barWidth = chartWidth / 12 * 0.68;

  rows.forEach((row, monthIndex) => {
    const x = margin.left + monthIndex * (chartWidth / 12) + (chartWidth / 12 - barWidth) / 2;
    let currentY = margin.top + chartHeight;

    restaurants.forEach((restaurant, rIndex) => {
      const value = Number(row.restaurantRevenue[restaurant.restaurantId] || 0);
      const barHeight = (value / maxTotal) * chartHeight;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", currentY - barHeight);
      rect.setAttribute("width", barWidth);
      rect.setAttribute("height", barHeight);
      rect.setAttribute("fill", COLORS[rIndex % COLORS.length]);
      svg.appendChild(rect);

      currentY -= barHeight;
    });

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x + barWidth / 2);
    text.setAttribute("y", height - 12);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "11");
    text.textContent = MONTHS[monthIndex];
    svg.appendChild(text);
  });

  for (let i = 0; i <= 4; i++) {
    const value = maxTotal - (i / 4) * maxTotal;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", margin.left - 8);
    text.setAttribute("y", margin.top + (i / 4) * chartHeight + 4);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("font-size", "10");
    text.textContent = formatNumber(value, 0);
    svg.appendChild(text);
  }

  container.appendChild(svg);
  container.appendChild(createLegend(restaurants.map((restaurant, index) => ({
    label: restaurant.restaurantName,
    color: COLORS[index % COLORS.length]
  }))));

  const averageMonthlyRevenue = monthTotals.reduce((sum, value) => sum + value, 0) / Math.max(monthTotals.length, 1);
  const latestMonthTotal = [...monthTotals].reverse().find((value) => value > 0) || 0;
  setText("restaurant-revenue-note", compareToAverage(latestMonthTotal, averageMonthlyRevenue, "Selected year latest active month revenue"));
}

function compareToAverage(latestValue, averageValue, label) {
  if (latestValue === null || latestValue === undefined || averageValue === null || averageValue === undefined || averageValue === 0) {
    return `${label}: not enough data for comparison.`;
  }

  const diff = ((latestValue - averageValue) / averageValue) * 100;
  const direction = diff >= 0 ? "above" : "below";

  return `${label}: ${formatNumber(Math.abs(diff), 2)}% ${direction} the average.`;
}

function updateLineNote(noteId, rows, metricKey, label, selectedYear) {
  const rowsForYear = rows.filter((row) => row.year === selectedYear);
  const values = rowsForYear
    .map((row) => row[metricKey])
    .filter((value) => value !== null && value !== undefined && Number(value) !== 0);

  const latest = [...rowsForYear]
    .reverse()
    .find((row) => row[metricKey] !== null && row[metricKey] !== undefined && Number(row[metricKey]) !== 0);

  if (!latest || values.length === 0) {
    setText(noteId, `${label}: not enough data for comparison.`);
    return;
  }

  const average = values.reduce((sum, value) => sum + Number(value), 0) / values.length;
  setText(noteId, compareToAverage(Number(latest[metricKey]), average, label));
}

function renderRankingTable(containerId, rows, valueKey, valueFormatter) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Rank</th><th>Server</th><th>Restaurant</th><th class=\"text-right\">Value</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const rank = document.createElement("td");
    rank.textContent = row.rank;

    const server = document.createElement("td");
    server.textContent = row.serverName || `Server ${row.serverEmpId}`;

    const restaurant = document.createElement("td");
    restaurant.textContent = row.restaurantName || "--";

    const value = document.createElement("td");
    value.className = "text-right";
    value.textContent = valueFormatter(row[valueKey]);

    tr.appendChild(rank);
    tr.appendChild(server);
    tr.appendChild(restaurant);
    tr.appendChild(value);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);
}

function renderServerRankings() {
  const data = dashboardState.serverRankings?.data;

  if (!data) {
    return;
  }

  renderRankingTable("server-revenue-ranking", data.revenueRanking, "totalRevenue", formatMoney);
  renderRankingTable("server-visit-ranking", data.visitCountRanking, "visitCount", (value) => formatNumber(value));
  renderRankingTable("server-tip-ranking", data.averageTipPercentRanking, "averageTipPercent", (value) => `${formatNumber(value, 2)}%`);
}

async function loadDashboardData() {
  const status = document.getElementById("dashboard-status");
  status.textContent = "Loading dashboard data...";

  try {
    const [
      highlights,
      holidays,
      businessMetrics,
      restaurantRevenue,
      customerMetrics,
      serverRankings
    ] = await Promise.all([
      fetchJson("/api/dashboard-highlights"),
      fetchJson("/api/date-holidays"),
      fetchJson("/api/yoy-business-metrics"),
      fetchJson("/api/restaurant-revenue-yoy"),
      fetchJson("/api/customer-yoy-metrics"),
      fetchJson("/api/server-rankings")
    ]);

    const responses = [highlights, holidays, businessMetrics, restaurantRevenue, customerMetrics, serverRankings];

    if (responses.some((response) => response.ok !== true)) {
      throw new Error("At least one dashboard API returned ok=false.");
    }

    dashboardState.highlights = highlights;
    dashboardState.holidays = holidays;
    dashboardState.businessMetrics = businessMetrics;
    dashboardState.restaurantRevenue = restaurantRevenue;
    dashboardState.customerMetrics = customerMetrics;
    dashboardState.serverRankings = serverRankings;

    renderHighlights();
    renderKpis();
    renderBusinessCharts();
    renderStackedRestaurantChart();
    renderCustomerCharts();
    renderServerRankings();

    status.textContent = "Dashboard data loaded successfully.";
  } catch (error) {
    status.textContent = `Dashboard data load failed: ${error.name === "AbortError" ? "Request timed out" : error.message}`;
  }
}

function setupDragAndDrop() {
  document.querySelectorAll(".chart-zone").forEach((zone) => {
    restoreZoneOrder(zone);

    zone.addEventListener("dragstart", (event) => {
      const card = event.target.closest(".chart-card");

      if (!card) {
        return;
      }

      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", card.dataset.cardId);
    });

    zone.addEventListener("dragend", (event) => {
      const card = event.target.closest(".chart-card");

      if (card) {
        card.classList.remove("dragging");
      }

      saveZoneOrder(zone);
    });

    zone.addEventListener("dragover", (event) => {
      event.preventDefault();

      const dragging = zone.querySelector(".dragging");

      if (!dragging) {
        return;
      }

      const afterElement = getDragAfterElement(zone, event.clientY);

      if (afterElement == null) {
        zone.appendChild(dragging);
      } else {
        zone.insertBefore(dragging, afterElement);
      }
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".chart-card:not(.dragging)")];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return {
        offset,
        element: child
      };
    }

    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveZoneOrder(zone) {
  const key = `cs5200-dashboard-order-${zone.dataset.zoneId}`;
  const ids = [...zone.querySelectorAll(".chart-card")].map((card) => card.dataset.cardId);
  localStorage.setItem(key, JSON.stringify(ids));
}

function restoreZoneOrder(zone) {
  const key = `cs5200-dashboard-order-${zone.dataset.zoneId}`;
  const saved = localStorage.getItem(key);

  if (!saved) {
    return;
  }

  try {
    const ids = JSON.parse(saved);

    ids.forEach((id) => {
      const card = zone.querySelector(`[data-card-id="${id}"]`);

      if (card) {
        zone.appendChild(card);
      }
    });
  } catch {
    localStorage.removeItem(key);
  }
}

function resetChartOrder() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("cs5200-dashboard-order-"))
    .forEach((key) => localStorage.removeItem(key));

  window.location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  setupDragAndDrop();

  document
    .getElementById("load-dashboard-button")
    .addEventListener("click", loadDashboardData);

  document
    .getElementById("reset-layout-button")
    .addEventListener("click", resetChartOrder);
});
