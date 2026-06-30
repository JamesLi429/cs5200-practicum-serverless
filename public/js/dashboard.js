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
    currency: "USD"
  });
}

async function fetchJson(endpoint) {
  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function updateSummaryCards(summary) {
  document.getElementById("kpi-total-visits").textContent =
    formatNumber(summary.totalVisits);

  document.getElementById("kpi-total-sales").textContent =
    formatMoney(summary.totalSales);

  document.getElementById("kpi-total-tips").textContent =
    formatMoney(summary.totalTips);

  document.getElementById("kpi-date-range").textContent =
    `${summary.firstVisitDate} to ${summary.lastVisitDate}`;
}

async function checkDashboardReadiness() {
  const status = document.getElementById("dashboard-status");

  status.textContent = "Loading summary data...";

  try {
    const result = await fetchJson("/api/summary");

    if (result.ok !== true) {
      throw new Error("Summary API returned ok=false.");
    }

    updateSummaryCards(result.data);
    status.textContent = "Dashboard foundation is ready. Summary API data loaded successfully.";
  } catch (error) {
    status.textContent = `Dashboard readiness check failed: ${error.message}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("load-dashboard-button")
    .addEventListener("click", checkDashboardReadiness);
});