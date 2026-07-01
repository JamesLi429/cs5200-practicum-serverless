const API_ENDPOINTS = [
  "/api/health",
  "/api/db-test",
  "/api/summary",
  "/api/monthly-trends",
  "/api/restaurant-performance",
  "/api/meal-type-performance",
  "/api/payment-method-performance",
  "/api/alcohol-trends",
  "/api/loyalty-summary",
  "/api/discount-impact",
  "/api/wait-time-analysis",
  "/api/server-performance",
  "/api/daily-trends",
  "/api/metadata",
  "/api/dashboard-highlights",
  "/api/date-holidays",
  "/api/yoy-business-metrics",
  "/api/restaurant-revenue-yoy",
  "/api/customer-yoy-metrics",
  "/api/server-rankings"
];

async function checkEndpoint(endpoint, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal
    });

    return {
      endpoint,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(endpoint, timeoutMs = 30000) {
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
