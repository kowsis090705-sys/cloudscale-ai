const API_URL = "http://127.0.0.1:8000";

export async function fetchRealMetrics() {
  const response = await fetch(`${API_URL}/metrics`);

  if (!response.ok) {
    throw new Error("Failed to fetch metrics");
  }

  return response.json();
}

export async function fetchAIAnalysis() {
  const response = await fetch(`${API_URL}/analyze`);

  if (!response.ok) {
    throw new Error("Failed to fetch analysis");
  }

  return response.json();
}