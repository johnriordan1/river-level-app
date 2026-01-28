export function createStationCard(station, isMonitored, onToggleMonitor) {
    const div = document.createElement('div');
    div.className = 'card station-item';
    div.dataset.id = station.properties.ref;

    // Level display placeholder (will be updated async)
    const stationRef = station.properties.ref;
    const name = station.properties.name;
    const river = "Ireland"; // Waterbody missing in JSON

    div.innerHTML = `
    <div>
      <div class="station-name">${name}</div>
      <div class="station-meta">${river} (${stationRef})</div>
    </div>
    <div style="text-align: right;">
        <div class="level-indicator" id="level-${stationRef}">--</div>
        <button class="btn btn-sm action-btn" style="padding: 0.25rem 0.5rem; margin-top: 0.5rem; font-size: 0.8rem;">
            ${isMonitored ? 'Stop Monitoring' : 'Monitor'}
        </button>
    </div>
  `;

    // Toggle button logic
    const btn = div.querySelector('.action-btn');
    if (isMonitored) {
        btn.style.backgroundColor = '#ef4444'; // Red for stop
    } else {
        btn.style.backgroundColor = '#0ea5e9'; // Blue for monitor
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onToggleMonitor(station);
    });

    return div;
}

export function updateStationLevelDOM(stationRef, level, isRising) {
    const el = document.getElementById(`level-${stationRef}`);
    if (el) {
        el.textContent = level !== null ? `${level.toFixed(2)}m` : 'N/A';
        if (isRising) {
            el.classList.add('rising');
            el.innerHTML += ' <span>▲</span>';
        } else {
            el.classList.remove('rising');
        }
    }
}
