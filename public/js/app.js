function createStatusCard(endpoint) {
  const card = document.createElement("div");
  card.className = "status-card";

  const title = document.createElement("h3");
  title.textContent = endpoint;

  const statusText = document.createElement("p");
  statusText.textContent = "Status: Waiting";

  const detailText = document.createElement("pre");
  detailText.textContent = "Not tested yet.";

  card.appendChild(title);
  card.appendChild(statusText);
  card.appendChild(detailText);

  return {
    card,
    statusText,
    detailText
  };
}

function updateCard(cardParts, result) {
  cardParts.card.classList.remove("pass", "fail");

  if (result.ok) {
    cardParts.card.classList.add("pass");
    cardParts.statusText.textContent = "Status: PASS";
  } else {
    cardParts.card.classList.add("fail");
    cardParts.statusText.textContent = "Status: FAIL";
  }

  cardParts.detailText.textContent = JSON.stringify(result, null, 2);
}

function updateCardError(cardParts, endpoint, error) {
  cardParts.card.classList.remove("pass");
  cardParts.card.classList.add("fail");
  cardParts.statusText.textContent = "Status: FAIL";
  cardParts.detailText.textContent = JSON.stringify(
    {
      endpoint,
      ok: false,
      error: error.name === "AbortError" ? "Request timed out" : error.message
    },
    null,
    2
  );
}

async function runApiTests() {
  const resultsContainer = document.getElementById("api-results");
  const summaryBox = document.getElementById("test-summary");

  resultsContainer.innerHTML = "";
  summaryBox.textContent = "Testing API endpoints with lightweight HEAD requests...";

  const cards = new Map();

  for (const endpoint of API_ENDPOINTS) {
    const cardParts = createStatusCard(endpoint);
    cards.set(endpoint, cardParts);
    resultsContainer.appendChild(cardParts.card);
  }

  const testPromises = API_ENDPOINTS.map(async (endpoint) => {
    const cardParts = cards.get(endpoint);

    try {
      const result = await checkEndpoint(endpoint);
      updateCard(cardParts, result);
      return result.ok;
    } catch (error) {
      updateCardError(cardParts, endpoint, error);
      return false;
    }
  });

  const results = await Promise.all(testPromises);
  const passCount = results.filter(Boolean).length;

  summaryBox.textContent = `${passCount} of ${API_ENDPOINTS.length} API endpoints passed.`;
}

async function previewSmallEndpoint(endpoint) {
  const previewBox = document.getElementById("preview-result");

  previewBox.textContent = "Loading preview...";

  try {
    const data = await fetchJson(endpoint);
    previewBox.textContent = JSON.stringify(data, null, 2).slice(0, 1500);
  } catch (error) {
    previewBox.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const testButton = document.getElementById("run-tests-button");
  testButton.addEventListener("click", runApiTests);

  const summaryButton = document.getElementById("preview-summary-button");
  summaryButton.addEventListener("click", () => previewSmallEndpoint("/api/summary"));

  const dbButton = document.getElementById("preview-db-button");
  dbButton.addEventListener("click", () => previewSmallEndpoint("/api/db-test"));
});