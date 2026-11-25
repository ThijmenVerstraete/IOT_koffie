import { sendBrewCommand, fetchSensorData, fetchStats } from "./api.js";

// ---- Elementen ----
const cupsInput = document.getElementById("cups");
const cupsValue = document.getElementById("cups-value");
const strengthInput = document.getElementById("strength");
const strengthValue = document.getElementById("strength-value");
const brewBtn = document.getElementById("brew-btn");
const statusEl = document.getElementById("status");
const tempEl = document.getElementById("temperature");
const waterEl = document.getElementById("water");
const sliderEl = document.getElementById("slider");
const waterBar = document.getElementById("water-bar");

const STRENGTH_LABELS = { 1: "Mild", 2: "Medium", 3: "Sterk" };
const WATER_PER_CUP = 10; // % water per kopje (voorbeeldwaarde)

let state = { temperature: 20, water: 80, slider: null, brewing: false };

// ---- UI updates ----
function render() {
  tempEl.textContent = state.temperature.toFixed(1);
  waterEl.textContent = Math.round(state.water);
  sliderEl.textContent = state.slider ?? "--";
  waterBar.style.width = state.water + "%";
  waterBar.classList.toggle("low", state.water < 20);
}

cupsInput.addEventListener("input", () => {
  cupsValue.textContent = cupsInput.value;
});

strengthInput.addEventListener("input", () => {
  strengthValue.textContent = STRENGTH_LABELS[strengthInput.value];
});

// ---- Koffie zetten ----
brewBtn.addEventListener("click", async () => {
  const cups = Number(cupsInput.value);
  const strength = Number(strengthInput.value);

  if (state.water < cups * WATER_PER_CUP) {
    statusEl.textContent = "Te weinig water, vul het reservoir bij!";
    return;
  }

  state.brewing = true;
  brewBtn.disabled = true;
  statusEl.textContent = `Bezig met ${cups} kopje(s) ${STRENGTH_LABELS[strength].toLowerCase()}...`;

  try {
    await sendBrewCommand({ cups, strength });
  } catch (err) {
    state.brewing = false;
    brewBtn.disabled = false;
    statusEl.textContent = "Zetten mislukt, probeer opnieuw";
    return;
  }

  state.brewing = false;
  brewBtn.disabled = false;
  statusEl.textContent = "Je koffie is klaar! ☕";
  pollSensors();
  loadStats();
});

// ---- Grafiek: koffieverbruik ----
let chart = null;
let period = "day";

async function loadStats() {
  if (typeof Chart === "undefined") return; // Chart.js (CDN) not loaded
  try {
    const data = await fetchStats(period);
    const labels = data.labels.map((l) => (period === "hour" ? l.slice(11) : l.slice(5)));
    if (!chart) {
      chart = new Chart(document.getElementById("usage-chart"), {
        type: "bar",
        data: { labels, datasets: [{ label: "Kopjes", data: data.cups, backgroundColor: "#6f4e37", borderRadius: 4 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Kopjes" } } },
        },
      });
    } else {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data.cups;
      chart.update();
    }
  } catch (err) {
    console.error(err);
  }
}

document.querySelectorAll(".period-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    period = btn.dataset.period;
    document.querySelectorAll(".period-btn").forEach((b) => b.classList.toggle("active", b === btn));
    loadStats();
  });
});

// ---- Sensorwaarden ophalen ----
async function pollSensors() {
  try {
    const data = await fetchSensorData();
    state.temperature = data.temperature;
    state.water = data.water;
    state.slider = data.slider;
    render();
  } catch (err) {
    statusEl.textContent = "Geen verbinding of geen geldige API key";
  }
}

render();
pollSensors();
loadStats();
setInterval(pollSensors, 2000);
