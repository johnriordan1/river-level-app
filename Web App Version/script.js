/**
 * River Level App (Lite Version)
 * Consolidated logic: API, Audio, WakeLock, and UI
 */

const PROXY_BASE = 'https://river-level-app.vercel.app/api/proxy?path=';

// --- VISUAL ALERT SYSTEM ---
const alarmSystem = {
    ctx: null,
    osc: null,
    gain: null,

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
    },

    start() {
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Stop previous if running
        this.stop();

        this.osc = this.ctx.createOscillator();
        this.gain = this.ctx.createGain();

        this.osc.type = 'sawtooth'; // Aggressive alert sound
        this.osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        // Beep pattern
        this.osc.frequency.setValueAtTime(600, this.ctx.currentTime + 0.5);
        this.osc.frequency.setValueAtTime(800, this.ctx.currentTime + 1.0);

        this.gain.gain.setValueAtTime(0.5, this.ctx.currentTime);

        this.osc.connect(this.gain);
        this.gain.connect(this.ctx.destination);

        this.osc.start();
    },

    stop() {
        if (this.osc) {
            try {
                this.osc.stop();
                this.osc.disconnect();
            } catch (e) { }
            this.osc = null;
        }
    }
};

// --- WAKE LOCK SYSTEM ---
let wakeLock = null;
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock active');
        } catch (err) {
            console.warn('Wake Lock failed:', err);
        }
    }
}
async function releaseWakeLock() {
    if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
    }
}
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// --- API CLIENT ---
async function fetchStations() {
    try {
        const res = await fetch(`${PROXY_BASE}geojson/`);
        if (!res.ok) throw new Error('Proxy error');
        const data = await res.json();
        return data.features || [];
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function fetchLatestReadings() {
    try {
        const res = await fetch(`${PROXY_BASE}geojson/latest/`);
        if (!res.ok) throw new Error('Proxy error');
        const data = await res.json();
        return data.features || [];
    } catch (e) {
        console.error(e);
        return [];
    }
}

// --- APP STATE ---
let allStations = [];
let monitoredStations = new Set(JSON.parse(localStorage.getItem('monitoredStations') || '[]'));
let stationDataCache = {};

const stationListEl = document.getElementById('station-list');
const alarmDisplay = document.getElementById('alarm-display');

// --- APP LOGIC ---
async function init() {
    // Fetch Data
    const [stations, latest] = await Promise.all([fetchStations(), fetchLatestReadings()]);

    // Sort
    allStations = stations.sort((a, b) => (a.properties.name || '').localeCompare(b.properties.name || ''));

    // Index Data
    latest.forEach(f => {
        const p = f.properties;
        if (p.sensor_ref === "0001") { // Staff gauge
            const ref = p.station_ref || p.station_id;
            stationDataCache[ref] = { value: parseFloat(p.value), timestamp: p.datetime };
        }
    });

    renderList();

    // Start Monitor Loop
    monitorLoop();
    setInterval(monitorLoop, 60000); // Check every minute
}

function renderList() {
    stationListEl.innerHTML = '';
    if (allStations.length === 0) {
        stationListEl.innerHTML = '<p style="text-align:center">Failed to load stations. Check connection.</p>';
        return;
    }

    allStations.forEach(s => {
        const ref = s.properties.ref;
        const isMonitored = monitoredStations.has(ref);
        const level = stationDataCache[ref] ? stationDataCache[ref].value.toFixed(2) + 'm' : '--';

        const div = document.createElement('div');
        div.className = 'card station-item';
        div.innerHTML = `
        <div>
           <div class="station-name">${s.properties.name}</div>
           <div class="station-meta">${s.properties.waterbody || 'Waterbody'} (${ref})</div>
        </div>
        <div style="text-align: right;">
            <div class="level-indicator" id="level-${ref}">${level}</div>
            <button class="btn btn-sm" style="padding: 0.25rem 0.5rem; margin-top:0.5rem; background-color: ${isMonitored ? '#ef4444' : '#0ea5e9'};">
               ${isMonitored ? 'Stop' : 'Monitor'}
            </button>
        </div>
      `;

        // Button Click
        div.querySelector('button').addEventListener('click', () => toggleMonitor(ref));
        stationListEl.appendChild(div);
    });
}

function toggleMonitor(ref) {
    // Init/Resume Audio Context on interaction (Critical for browsers)
    if (!alarmSystem.ctx) {
        alarmSystem.init();
    }
    if (alarmSystem.ctx.state === 'suspended') {
        alarmSystem.ctx.resume();
    }

    if (monitoredStations.has(ref)) {
        monitoredStations.delete(ref);
    } else {
        monitoredStations.add(ref);
        // Track Event
        const s = allStations.find(s => s.properties.ref === ref);
        if (s && window.va) {
            window.va('event', { name: 'Monitor_Station', data: { station: s.properties.name } });
        }
    }

    // Wake Lock
    if (monitoredStations.size > 0) requestWakeLock();
    else releaseWakeLock();

    localStorage.setItem('monitoredStations', JSON.stringify(Array.from(monitoredStations)));
    renderList();
}

window.testAlarm = function () {
    console.log("Testing alarm...");
    triggerAlarm("TEST STATION", 9.99);
};

async function monitorLoop() {
    if (monitoredStations.size === 0) return;

    console.log('Checking levels...');
    const latest = await fetchLatestReadings();

    latest.forEach(f => {
        const p = f.properties;
        if (p.sensor_ref === "0001") {
            const ref = p.station_ref || p.station_id;
            const val = parseFloat(p.value);
            stationDataCache[ref] = { value: val };

            // Alarm Check
            if (monitoredStations.has(ref) && val > 0.5) {
                triggerAlarm(allStations.find(s => s.properties.ref === ref)?.properties.name || ref, val);
            }

            // Update DOM text if visible
            const el = document.getElementById(`level-${ref}`);
            if (el) el.textContent = val.toFixed(2) + 'm';
        }
    });
}

function triggerAlarm(name, level) {
    alarmDisplay.innerHTML = `<div style="background:#fee2e2; color:#991b1b; padding:1rem; border:2px solid red; border-radius:8px;">
     ⚠️ ALARM: ${name} is high (${level.toFixed(2)}m)! <br><br>
     <button class="btn btn-danger" onclick="stopAlarm()">STOP ALARM</button>
   </div>`;
    alarmSystem.start();
}

window.stopAlarm = function () {
    alarmSystem.stop();
    alarmDisplay.innerHTML = '';
};

// Start
init();
