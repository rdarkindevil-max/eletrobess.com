import fetch from "node-fetch";

export async function fetchSungrowPlants(integration) {
  const { username, password } = integration.config;

  // 🔴 EXEMPLO (endpoint fictício)
  const loginRes = await fetch("https://api.sungrow.com/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const loginData = await loginRes.json();
  const token = loginData.token;

  const plantsRes = await fetch("https://api.sungrow.com/plants", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const plantsData = await plantsRes.json();

  return plantsData;
}