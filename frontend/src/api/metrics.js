
const API_URL = "http://127.0.0.1:8000";

// Common API helper
async function getJSON(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(
      `API ${path} failed: HTTP ${response.status}`
    );
  }

  return response.json();
}

// Real metrics from Spring Boot through Python
export function fetchRealMetrics() {
  return getJSON("/metrics");
}

// CPU, memory, error and latency analysis
export function fetchAIAnalysis() {
  return getJSON("/analyze");
}

// Random Forest ML traffic prediction
export function fetchMLPrediction(recentLoads) {
  return getJSON("/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recent_loads: recentLoads,
    }),
  });
}
