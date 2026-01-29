import './style.css';
import { stationMetadata } from './api/station_metadata.js';
import { fetchStations, fetchStationData, fetchLatestReadings } from './api/opw.js';
import { alarmSystem } from './utils/audio.js';
import { createStationCard, updateStationLevelDOM } from './components/StationCard.js';
import { requestWakeLock, releaseWakeLock } from './utils/wakeLock.js';

// State
let allStations = [];
// Map<ref, { threshold: number }>
let monitoredStations = new Map();
let stationDataCache = {};

// Load State from LocalStorage
try {
  const raw = JSON.parse(localStorage.getItem('monitoredStations') || '[]');
  if (Array.isArray(raw)) {
    // Migration: Convert old array [ref, ref] to Map { ref: {threshold: 1.0} }
    raw.forEach(ref => {
      if (typeof ref === 'string') monitoredStations.set(ref, { threshold: 1.0 });
      // Handle if it was already an object array (future proofing)
      else if (ref.id) monitoredStations.set(ref.id, { threshold: ref.threshold || 1.0 });
    });
  }
} catch (e) {
  console.log("State reset");
}

// DOM Elements
const stationListEl = document.getElementById('station-list');
const monitoredListEl = document.getElementById('monitored-list');
const monitoredSection = document.getElementById('monitored-section');
const searchInput = document.getElementById('station-search');
const countyFilter = document.getElementById('county-filter');
const alarmDisplay = document.getElementById('alarm-display');
const installBtn = document.getElementById('install-btn');

// --- PWA Install Logic ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // if (installBtn) installBtn.style.display = 'inline-block'; // Hidden by user request
});
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    installBtn.style.display = 'none';
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt = null;
    }
  });
}
window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.style.display = 'none';
  deferredPrompt = null;
});

// --- Init ---
async function init() {
  renderLoading();

  try {
    const [stations, latestData] = await Promise.all([
      fetchStations(),
      fetchLatestReadings()
    ]);

    // MERGE METADATA (County/River)
    stations.forEach(s => {
      const ref = s.properties.ref;
      const meta = stationMetadata.find(m => m.ref === ref);
      if (meta) {
        s.properties.county = meta.county || "";
        s.properties.river = meta.river || "";
      }
    });

    // Sort alphabetically by Name
    stations.sort((a, b) => {
      const nameA = a.properties.name || a.properties.ref || '';
      const nameB = b.properties.name || b.properties.ref || '';
      return nameA.localeCompare(nameB);
    });

    allStations = stations;

    // Populate County Dropdown
    populateCounties();

    // Process Latest Data
    processLatestData(latestData);

  } catch (e) {
    console.error("Init failed", e);
    stationListEl.innerHTML = '<p style="text-align:center; color:red">Failed to load data.</p>';
  }

  // Initial Render
  renderAll();

  // Start Polling
  monitorLoop();
  setInterval(monitorLoop, 5000);
}

function populateCounties() {
  if (!countyFilter) return;

  const counties = new Set();
  allStations.forEach(s => {
    if (s.properties.county) counties.add(s.properties.county);
  });

  const sorted = Array.from(counties).sort();

  sorted.forEach(c => {
    if (!c) return; // Skip empty
    const opt = document.createElement('option');
    opt.value = c;
    opt.innerText = c;
    countyFilter.appendChild(opt);
  });
}

// Data Processing
function processLatestData(latestData) {
  latestData.forEach(feature => {
    const props = feature.properties;
    if ((props.station_id || props.station_ref) && props.sensor_ref === "0001") {
      const ref = props.station_ref || props.station_id;
      const val = parseFloat(props.value);
      if (!isNaN(val)) {
        stationDataCache[ref] = {
          value: val,
          timestamp: props.datetime
        };
      }
    }
  });
}

// --- Rendering ---
function renderLoading() {
  stationListEl.innerHTML = '<p style="text-align:center">Loading OPW Stations...</p>';
}

function renderAll() {
  renderMonitoredList();
  renderStationList();
}

// 1. Monitored List (Top)
function renderMonitoredList() {
  monitoredListEl.innerHTML = '';

  if (monitoredStations.size === 0) {
    if (monitoredSection) monitoredSection.style.display = 'none';
  } else {
    // Show section
    if (monitoredSection) monitoredSection.style.display = 'block';

    monitoredStations.forEach((details, ref) => {
      const station = allStations.find(s => s.properties.ref === ref);
      if (station) {
        const card = createStationCard(
          station,
          true, // isMonitored
          toggleMonitor,
          details.threshold,
          updateThreshold
        );
        monitoredListEl.appendChild(card);

        // Update level immediately if we have it
        if (stationDataCache[ref]) {
          updateStationLevelDOM(ref, stationDataCache[ref].value, false);
        }
      }
    });
  }
}

// 2. Search Results List (Bottom)
function renderStationList() {
  stationListEl.innerHTML = '';

  // Check valid list
  if (!allStations || allStations.length === 0) {
    stationListEl.innerHTML = '<p style="text-align:center">No stations loaded.</p>';
    return;
  }

  // Filter: Exclude monitored stations AND match search query
  const rawQuery = searchInput ? searchInput.value : "";
  const query = (rawQuery || "").trim().toLowerCase();
  const county = countyFilter ? countyFilter.value : "";

  const filtered = allStations.filter(s => {
    // If monitored, don't show in search list
    if (monitoredStations.has(s.properties.ref)) return false;

    // 1. County Filter
    if (county && s.properties.county !== county) return false;

    // 2. Search Filter (if empty, show all in county)
    if (query.length === 0) return true;

    // Safe access to properties
    const name = (s.properties.name || '').toLowerCase();
    const ref = (s.properties.ref || '').toLowerCase();
    const river = (s.properties.river || '').toLowerCase();

    // Check match (Name, Ref, or River)
    return name.includes(query) || ref.includes(query) || river.includes(query);
  });

  if (filtered.length === 0) {
    stationListEl.innerHTML = '<p style="text-align:center; color:#94a3b8">No matching stations found.</p>';
    return;
  }

  // Limit rendering for performance (first 50 only)
  const toRender = filtered.slice(0, 50);

  toRender.forEach(station => {
    const card = createStationCard(station, false, toggleMonitor);
    stationListEl.appendChild(card);
  });

  if (filtered.length > 50) {
    const moreMsg = document.createElement('p');
    moreMsg.style.textAlign = 'center';
    moreMsg.style.color = '#94a3b8';
    moreMsg.style.fontSize = '0.8rem';
    moreMsg.innerText = `...and ${filtered.length - 50} more. Keep typing to narrow down.`;
    stationListEl.appendChild(moreMsg);
  }
}

// --- Actions ---

// Toggle Monitor (Add/Remove)
function toggleMonitor(station) {
  // Silent unlock audio (Safe Wrap)
  try {
    if (alarmSystem) alarmSystem.unlock();
  } catch (e) {
    console.warn("Audio unlock failed", e);
  }

  const ref = station.properties.ref;

  if (monitoredStations.has(ref)) {
    // REMOVE (Stop Alarm)
    monitoredStations.delete(ref);
  } else {
    // ADD
    monitoredStations.set(ref, { threshold: 3 }); // Default 3m (User Request)
    // Clear search
    if (searchInput) searchInput.value = '';
  }

  persistState();
  renderAll();

  // Trigger wake lock check
  if (monitoredStations.size > 0) requestWakeLock();
  else releaseWakeLock();

  // Re-check alarms immediately
  checkAlarms();
}

// Update Threshold
function updateThreshold(station, newVal) {
  const ref = station.properties.ref;
  if (monitoredStations.has(ref)) {
    const data = monitoredStations.get(ref);
    data.threshold = newVal;
    monitoredStations.set(ref, data);
    persistState();
    // Re-check alarms immediately (in case new threshold triggers it)
    checkAlarms();
  }
}

function persistState() {
  // Save Map as Array of objects: [{id, threshold}]
  const storageFormat = [];
  monitoredStations.forEach((val, key) => {
    storageFormat.push({ id: key, threshold: val.threshold });
  });
  localStorage.setItem('monitoredStations', JSON.stringify(storageFormat));
}

// --- Search Listener ---
if (countyFilter) {
  countyFilter.addEventListener('change', () => {
    renderStationList();
  });
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    renderStationList();
  });
}

// --- Monitoring & Alarm Logic ---
async function monitorLoop() {
  // console.log('Checking levels...');
  try {
    const latestData = await fetchLatestReadings();
    processLatestData(latestData);

    // Update DOM for monitored stations
    monitoredStations.forEach((_, ref) => {
      if (stationDataCache[ref]) {
        updateStationLevelDOM(ref, stationDataCache[ref].value, false);
      }
    });

    checkAlarms();

  } catch (e) {
    console.error("Monitor loop failed", e);
  }
}

function checkAlarms() {
  let anyAlarmActive = false;
  let alarmMsg = "";

  monitoredStations.forEach((settings, ref) => {
    const data = stationDataCache[ref];
    if (data && data.value >= settings.threshold) {
      anyAlarmActive = true;
      const station = allStations.find(s => s.properties.ref === ref);
      const name = station ? station.properties.name : ref;
      alarmMsg += `<div>⚠️ ${name} (${data.value.toFixed(2)}m) exceeds ${settings.threshold}m!</div>`;
    }
  });

  if (anyAlarmActive) {
    // Show Alarm
    if (alarmDisplay) {
      alarmDisplay.innerHTML = `<div style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 8px; font-weight: bold; border: 2px solid #ef4444;">
              ${alarmMsg}
            </div>`;
    }

    // Play Sound
    if (alarmSystem.ctx && alarmSystem.ctx.state === 'suspended') {
      alarmSystem.ctx.resume();
    }
    alarmSystem.start();
  } else {
    // Clear Alarm
    if (alarmDisplay) alarmDisplay.innerHTML = '';
    alarmSystem.stop();
  }
}

// Start
init();
