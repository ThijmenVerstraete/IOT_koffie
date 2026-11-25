// ---- API key (asked once per browser tab) ----
let promptDeclined = false;

export function getApiKey() {
  let key = sessionStorage.getItem("apiKey");
  if (!key && !promptDeclined) {
    key = prompt("API key:");
    if (key) sessionStorage.setItem("apiKey", key);
    else promptDeclined = true;
  }
  return key;
}

export async function apiFetch(url, options = {}) {
  const key = getApiKey();
  if (!key) throw new Error("API key required");
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), "X-API-Key": key },
  });
  if (res.status === 401 || res.status === 403) {
    sessionStorage.removeItem("apiKey"); // wrong key: ask again next time
  }
  return res;
}

// ---- Calls to the Flask server ----
export async function sendBrewCommand({ cups, strength }) {
  const res = await apiFetch("/api/brew", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cups, strength }),
  });
  if (!res.ok) throw new Error("Brew failed");
}

export async function fetchSensorData() {
  const res = await apiFetch("/api/status");
  if (!res.ok) throw new Error("Status failed");
  return res.json(); // { temperature, water, slider }
}
