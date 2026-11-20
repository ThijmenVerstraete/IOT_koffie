// ---- Elementen ----
const cupsInput = document.getElementById('cups');
const cupsValue = document.getElementById('cups-value');
const strengthInput = document.getElementById('strength');
const strengthValue = document.getElementById('strength-value');
const brewBtn = document.getElementById('brew-btn');
const statusEl = document.getElementById('status');
const tempEl = document.getElementById('temperature');
const waterEl = document.getElementById('water');
const waterBar = document.getElementById('water-bar');

const STRENGTH_LABELS = { 1: 'Mild', 2: 'Medium', 3: 'Sterk' };
const WATER_PER_CUP = 10; // % water per kopje (voorbeeldwaarde)

let state = { temperature: 20, water: 80, brewing: false };

// ---- UI updates ----
function render() {
  tempEl.textContent = state.temperature.toFixed(1);
  waterEl.textContent = Math.round(state.water);
  waterBar.style.width = state.water + '%';
  waterBar.classList.toggle('low', state.water < 20);
}

cupsInput.addEventListener('input', () => {
  cupsValue.textContent = cupsInput.value;
});

strengthInput.addEventListener('input', () => {
  strengthValue.textContent = STRENGTH_LABELS[strengthInput.value];
});

// ---- Koffie zetten ----
brewBtn.addEventListener('click', async () => {
  const cups = Number(cupsInput.value);
  const strength = Number(strengthInput.value);

  if (state.water < cups * WATER_PER_CUP) {
    statusEl.textContent = 'Te weinig water, vul het reservoir bij!';
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
    statusEl.textContent = 'Zetten mislukt, probeer opnieuw';
    return;
  }

  state.brewing = false;
  brewBtn.disabled = false;
  statusEl.textContent = 'Je koffie is klaar! ☕';
  pollSensors();
});

// ---- Verbinding met het IoT apparaat ----
// Vervang deze functies door echte calls (fetch / MQTT / WebSocket).
async function sendBrewCommand({ cups, strength }) {
  const res = await fetch('/api/brew', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cups, strength }),
  });
  if (!res.ok) throw new Error('Brew failed');
}

async function fetchSensorData() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Status failed');
  return res.json(); // { temperature, water }
}

async function pollSensors() {
  try {
    const data = await fetchSensorData();
    state.temperature = data.temperature;
    state.water = data.water;
    render();
  } catch (err) {
    statusEl.textContent = 'Geen verbinding met de koffiemachine';
  }
}

render();
pollSensors();
setInterval(pollSensors, 2000);