import './style.css';
import { fetchStations, fetchStationData, fetchLatestReadings } from './api/opw.js';
import { alarmSystem } from './utils/audio.js';
import { inject } from '@vercel/analytics';
import { createStationCard, updateStationLevelDOM } from './components/StationCard.js';

// Initialize Analytics
inject();

// State
let allStations = [];
let monitoredStations = new Set(JSON.parse(localStorage.getItem('monitoredStations') || '[]'));
let stationDataCache = {}; // { stationRef: { value: 1.2, timestamp: ... } }

// DOM Elements
const stationListEl = document.getElementById('station-list');
const alarmDisplay = document.getElementById('alarm-display');
const installBtn = document.getElementById('install-btn');

// PWA Install Logic
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  if (installBtn) {
    installBtn.style.display = 'inline-block';
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    // Hide the app provided install promotion
    installBtn.style.display = 'none';
    // Show the install prompt
    if (deferredPrompt) {
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      deferredPrompt = null;
    }
  });
}

window.addEventListener('appinstalled', () => {
  // Hide the app-provided install promotion
  if (installBtn) installBtn.style.display = 'none';
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  console.log('PWA was installed');
});

// Init
async function init() {
  // Fetch initial list AND latest data
  renderLoading();

  try {
    const [stations, latestData] = await Promise.all([
      fetchStations(),
      fetchLatestReadings()
    ]);

    // Sort alphabetically
    stations.sort((a, b) => {
      const nameA = a.properties.name || a.properties.ref || '';
      const nameB = b.properties.name || b.properties.ref || '';
      return nameA.localeCompare(nameB);
    });

    allStations = stations;

    // Process latest data into cache
    latestData.forEach(feature => {
      const props = feature.properties;
      // We only want Staff Gauge level (Sensor 0001) for now
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

  } catch (e) {
    console.error("Init failed", e);
  }

  renderStationList(allStations);

  // Start Polling Loop
  monitorLoop();
  setInterval(monitorLoop, 5000);
}

// Rendering
function renderLoading() {
  stationListEl.innerHTML = '<p style="text-align:center">Loading OPW Stations...</p>';
}

function renderStationList(stations) {
  stationListEl.innerHTML = '';
  if (stations.length === 0) {
    stationListEl.innerHTML = '<p style="text-align:center">No stations found.</p>';
    return;
  }

  stations.forEach(station => {
    const ref = station.properties.ref;
    const isMonitored = monitoredStations.has(ref);
    // Only show unmonitored in the main list to avoid duplication if we wanted, 
    // but showing all is fine. For clarity, let's show all.
    const card = createStationCard(station, isMonitored, toggleMonitor);
    stationListEl.appendChild(card);

    // If we have cached data, update it
    if (stationDataCache[ref]) {
      updateStationLevelDOM(ref, stationDataCache[ref].value, false);
    }
  });
}

function renderMonitoredList() {
  // Removed per user request
}

import { requestWakeLock, releaseWakeLock } from './utils/wakeLock.js';

// Actions
function toggleMonitor(station) {
  // Start Audio Context on first interaction
  if (alarmSystem.ctx && alarmSystem.ctx.state === 'suspended') {
    alarmSystem.start();
    setTimeout(() => alarmSystem.stop(), 100);
  } else if (!alarmSystem.ctx) {
    // Just in case it wasn't init yet
    alarmSystem.start();
    setTimeout(() => alarmSystem.stop(), 100);
  }

  const ref = station.properties.ref;
  if (monitoredStations.has(ref)) {
    monitoredStations.delete(ref);
  } else {
    monitoredStations.add(ref);
  }

  // Wake Lock Logic
  if (monitoredStations.size > 0) {
    requestWakeLock();
  } else {
    releaseWakeLock();
  }

  localStorage.setItem('monitoredStations', JSON.stringify(Array.from(monitoredStations)));

  // Re-render main list to update button state
  renderStationList(allStations);
}

// Monitoring Logic
async function monitorLoop() {
  console.log('Checking levels...');
  // Efficiently fetch all latest data in one go
  try {
    const latestData = await fetchLatestReadings();

    // Update cache
    latestData.forEach(feature => {
      const props = feature.properties;
      if ((props.station_id || props.station_ref) && props.sensor_ref === "0001") {
        const ref = props.station_ref || props.station_id;
        const val = parseFloat(props.value);
        if (!isNaN(val)) {
          // Check if this station is being monitored
          if (monitoredStations.has(ref)) {
            const oldVal = stationDataCache[ref] ? stationDataCache[ref].value : null;

            stationDataCache[ref] = {
              value: val,
              timestamp: props.datetime
            };

            // Check High Level Alarm
            // GLOBAL Threshold: 0.5m
            if (val > 0.5) {
              // Find station name
              const station = allStations.find(s => s.properties.ref === ref);
              const name = station ? station.properties.name : ref;
              triggerAlarm(name, val);
            }

            // Update DOM
            // Determine if rising (simple check vs old cache)
            // Note: This loop runs every 60s, so oldVal is from 60s ago. 
            // Real "rising" logic needs longer history, but for basic arrow:
            const isRising = oldVal !== null && val > oldVal;
            updateStationLevelDOM(ref, val, isRising);
          } else {
            // Update cache for non-monitored too, why not?
            stationDataCache[ref] = {
              value: val,
              timestamp: props.datetime
            };
          }
        }
      }
    });

  } catch (e) {
    console.error("Monitor loop failed", e);
  }
}

// Deprecated individual fetch
async function fetchAndProcess(station) {
  // keeping for reference or explicit single-refresh if needed
  // see monitorLoop for main logic
}



function triggerAlarm(stationName, level) {
  console.warn(`ALARM: ${stationName} is at ${level}`);
  alarmDisplay.innerHTML = `<div style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 8px; font-weight: bold; border: 2px solid #ef4444;">
    ⚠️ WARNING: ${stationName} is high (${level.toFixed(2)}m)!
  </div>`;

  // Play sound
  if (alarmSystem.ctx && alarmSystem.ctx.state === 'suspended') {
    alarmSystem.ctx.resume();
  }
  alarmSystem.start();

  showStopButton();
}

function showStopButton() {
  // Check if button already exists in the alarm display
  let btn = document.getElementById('stop-alarm-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'stop-alarm-btn';
    btn.className = 'btn btn-danger';
    btn.textContent = 'STOP ALARM';
    btn.style.marginTop = '0.5rem';
    btn.style.backgroundColor = '#ef4444';
    btn.style.color = 'white';

    btn.addEventListener('click', () => {
      alarmSystem.stop();
      btn.remove();
      alarmDisplay.innerHTML = ''; // Clear warning
    });

    // Append to the alarm display div
    alarmDisplay.appendChild(document.createElement('br'));
    alarmDisplay.appendChild(btn);
  }
}

init();
