const API_TIMEOUT_MS = 45000;
const charts = new Map();

const endpoints = {
  summary: "/api/summary",
  monthlyTrends: "/api/monthly-trends",
  restaurantPerformance: "/api/restaurant-performance",
  mealTypePerformance: "/api/meal-type-performance",
  paymentMethodPerformance: "/api/payment-method-performance",
  alcoholTrends: "/api/alcohol-trends",
  loyaltySummary: "/api/loyalty-summary",
  discountImpact: "/api/discount-impact",
  waitTimeAnalysis: "/api/wait-time-analysis",
  serverPerformance: "/api/server-performance",
  dailyTrends: "/api/daily-trends"
};

function setStatus(message) {
  document.getElementById("dashboard-status").textContent = message;
}

function toNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 0;
  }

  return Number(value);
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return Number(value).toLocaleString("en-US");
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

function formatDecimal(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

async function fetchJson(endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`${endpoint} returned HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (payload.ok !== true) {
      throw new Error(`${endpoint} returned ok=false`);
    }

    return payload.data;
  } finally {
    clearTimeout(timer);
  }
}

function ensureChartLibrary() {
  if (typeof Chart === "undefined") {
    throw new Error("Chart.js did not load. Check your internet connection or CDN access.");
  }
}

function replaceChart(canvasId, config) {
  ensureChartLibrary();

  if (charts.has(canvasId)) {
    charts.get(canvasId).destroy();
  }

  const canvas = document.getElementById(canvasId);
  const chart = new Chart(canvas, config);
  charts.set(canvasId, chart);
}

function baseChartOptions(yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom"
      },
      tooltip: {
        mode: "index",
        intersect: false
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: Boolean(yTitle),
          text: yTitle || ""
        }
      }
    }
  };
}

function updateSummaryCards(summary) {
  document.getElementById("kpi-total-visits").textContent = formatNumber(summary.totalVisits);
  document.getElementById("kpi-total-sales").textContent = formatMoney(summary.totalSales);
  document.getElementById("kpi-total-tips").textContent = formatMoney(summary.totalTips);
  document.getElementById("kpi-date-range").textContent = `${summary.firstVisitDate || "--"} to ${summary.lastVisitDate || "--"}`;
}

function renderMonthlyCharts(rows) {
  const labels = rows.map((row) => row.yearMonth);

  replaceChart("monthly-sales-chart", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total Sales",
          data: rows.map((row) => toNumber(row.totalSales)),
          tension: 0.25
        },
        {
          label: "Total Tips",
          data: rows.map((row) => toNumber(row.totalTips)),
          tension: 0.25
        }
      ]
    },
    options: baseChartOptions("USD")
  });

  replaceChart("monthly-visits-chart", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Visit Count",
          data: rows.map((row) => toNumber(row.visitCount)),
          tension: 0.25
        }
      ]
    },
    options: baseChartOptions("Visits")
  });
}

function renderRestaurantChart(rows) {
  const topRows = [...rows]
    .sort((a, b) => toNumber(b.totalSales) - toNumber(a.totalSales))
    .slice(0, 10);

  replaceChart("restaurant-sales-chart", {
    type: "bar",
    data: {
      labels: topRows.map((row) => row.restaurantName),
      datasets: [
        {
          label: "Total Sales",
          data: topRows.map((row) => toNumber(row.totalSales))
        }
      ]
    },
    options: baseChartOptions("USD")
  });
}

function renderMealTypeChart(rows) {
  replaceChart("meal-type-chart", {
    type: "bar",
    data: {
      labels: rows.map((row) => row.mealType),
      datasets: [
        {
          label: "Total Sales",
          data: rows.map((row) => toNumber(row.totalSales))
        },
        {
          label: "Visit Count",
          data: rows.map((row) => toNumber(row.visitCount))
        }
      ]
    },
    options: baseChartOptions("Amount")
  });
}

function renderPaymentMethodChart(rows) {
  replaceChart("payment-method-chart", {
    type: "bar",
    data: {
      labels: rows.map((row) => row.paymentMethod),
      datasets: [
        {
          label: "Average Transaction Value",
          data: rows.map((row) => toNumber(row.averageTransactionValue))
        }
      ]
    },
    options: baseChartOptions("USD")
  });
}

function renderAlcoholTrendChart(rows) {
  replaceChart("alcohol-trend-chart", {
    type: "line",
    data: {
      labels: rows.map((row) => row.yearMonth),
      datasets: [
        {
          label: "Alcohol Sales %",
          data: rows.map((row) => toNumber(row.alcoholSalesPercentage)),
          tension: 0.25
        }
      ]
    },
    options: baseChartOptions("Percent")
  });
}

function renderLoyaltyChart(rows) {
  replaceChart("loyalty-chart", {
    type: "bar",
    data: {
      labels: rows.map((row) => row.loyaltyStatus),
      datasets: [
        {
          label: "Total Sales",
          data: rows.map((row) => toNumber(row.totalSales))
        },
        {
          label: "Visit Count",
          data: rows.map((row) => toNumber(row.visitCount))
        }
      ]
    },
    options: baseChartOptions("Amount")
  });
}

function renderDiscountChart(rows) {
  replaceChart("discount-chart", {
    type: "bar",
    data: {
      labels: rows.map((row) => row.discountGroup),
      datasets: [
        {
          label: "Total Sales",
          data: rows.map((row) => toNumber(row.totalSales))
        },
        {
          label: "Average Discount %",
          data: rows.map((row) => toNumber(row.averageDiscountPercentage))
        }
      ]
    },
    options: baseChartOptions("Amount")
  });
}

function renderWaitTimeChart(rows) {
  replaceChart("wait-time-chart", {
    type: "bar",
    data: {
      labels: rows.map((row) => row.waitTimeGroup),
      datasets: [
        {
          label: "Average Sales",
          data: rows.map((row) => toNumber(row.averageSales))
        },
        {
          label: "Average Tips",
          data: rows.map((row) => toNumber(row.averageTips))
        }
      ]
    },
    options: baseChartOptions("USD")
  });
}

function renderServerTable(rows) {
  const body = document.getElementById("server-performance-body");
  const topRows = [...rows]
    .sort((a, b) => toNumber(b.totalSales) - toNumber(a.totalSales))
    .slice(0, 10);

  body.innerHTML = "";

  if (topRows.length === 0) {
    body.innerHTML = '<tr><td colspan="5">No server data was returned.</td></tr>';
    return;
  }

  for (const row of topRows) {
    const tr = document.createElement("tr");
    const serverName = `${row.serverFirstName || ""} ${row.serverLastName || ""}`.trim() || `Server ${row.serverEmployeeId}`;

    tr.innerHTML = `
      <td>${serverName}</td>
      <td>${row.restaurantName || "--"}</td>
      <td>${formatNumber(row.visitCount)}</td>
      <td>${formatMoney(row.totalSales)}</td>
      <td>${formatMoney(row.totalTips)}</td>
    `;

    body.appendChild(tr);
  }
}

function renderDailyChart(rows) {
  const labels = rows.map((row) => row.visitDate);

  replaceChart("daily-sales-chart", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Daily Total Sales",
          data: rows.map((row) => toNumber(row.totalSales)),
          tension: 0.2
        }
      ]
    },
    options: baseChartOptions("USD")
  });
}

function renderDailyTable(rows) {
  const body = document.getElementById("daily-trends-body");
  const recentRows = [...rows].slice(-30).reverse();

  body.innerHTML = "";

  if (recentRows.length === 0) {
    body.innerHTML = '<tr><td colspan="5">No daily data was returned.</td></tr>';
    return;
  }

  for (const row of recentRows) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.visitDate || "--"}</td>
      <td>${formatNumber(row.visitCount)}</td>
      <td>${formatMoney(row.totalSales)}</td>
      <td>${formatMoney(row.totalTips)}</td>
      <td>${formatDecimal(row.averageWaitTime)}</td>
    `;

    body.appendChild(tr);
  }
}

async function loadDashboardData() {
  const loadButton = document.getElementById("load-dashboard-button");
  const dailyButton = document.getElementById("load-daily-button");

  loadButton.disabled = true;
  dailyButton.disabled = true;
  setStatus("Loading dashboard data with asynchronous API calls...");

  try {
    const [
      summary,
      monthlyTrends,
      restaurantPerformance,
      mealTypePerformance,
      paymentMethodPerformance,
      alcoholTrends,
      loyaltySummary,
      discountImpact,
      waitTimeAnalysis,
      serverPerformance
    ] = await Promise.all([
      fetchJson(endpoints.summary),
      fetchJson(endpoints.monthlyTrends),
      fetchJson(endpoints.restaurantPerformance),
      fetchJson(endpoints.mealTypePerformance),
      fetchJson(endpoints.paymentMethodPerformance),
      fetchJson(endpoints.alcoholTrends),
      fetchJson(endpoints.loyaltySummary),
      fetchJson(endpoints.discountImpact),
      fetchJson(endpoints.waitTimeAnalysis),
      fetchJson(endpoints.serverPerformance)
    ]);

    updateSummaryCards(summary);
    renderMonthlyCharts(monthlyTrends);
    renderRestaurantChart(restaurantPerformance);
    renderMealTypeChart(mealTypePerformance);
    renderPaymentMethodChart(paymentMethodPerformance);
    renderAlcoholTrendChart(alcoholTrends);
    renderLoyaltyChart(loyaltySummary);
    renderDiscountChart(discountImpact);
    renderWaitTimeChart(waitTimeAnalysis);
    renderServerTable(serverPerformance);

    setStatus("Dashboard data loaded successfully. Daily details are still unloaded to keep the page fast.");
    dailyButton.disabled = false;
  } catch (error) {
    setStatus(`Dashboard load failed: ${error.name === "AbortError" ? "Request timed out" : error.message}`);
  } finally {
    loadButton.disabled = false;
  }
}

async function loadDailyDetails() {
  const dailyButton = document.getElementById("load-daily-button");

  dailyButton.disabled = true;
  setStatus("Loading daily trend details...");

  try {
    const dailyTrends = await fetchJson(endpoints.dailyTrends);
    renderDailyChart(dailyTrends);
    renderDailyTable(dailyTrends);
    setStatus("Daily details loaded successfully. The table shows the most recent 30 days.");
  } catch (error) {
    setStatus(`Daily detail load failed: ${error.name === "AbortError" ? "Request timed out" : error.message}`);
    dailyButton.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("load-dashboard-button")
    .addEventListener("click", loadDashboardData);

  document
    .getElementById("load-daily-button")
    .addEventListener("click", loadDailyDetails);
});
