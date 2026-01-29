export function createStationCard(station, isMonitored, onToggleMonitor, threshold = 1.0, onThresholdChange = null) {
    const div = document.createElement('div');
    div.className = 'card station-item';
    div.dataset.id = station.properties.ref;

    const stationRef = station.properties.ref;
    const name = station.properties.name;
    const river = "Ireland"; // Placeholder

    if (isMonitored) {
        // MONITORED VIEW: Expanded with Threshold Input
        div.style.borderLeft = "4px solid #ef4444";
        div.style.backgroundColor = "#fff1f2"; // Light red tint

        div.innerHTML = `
        <div style="margin-bottom: 0.5rem;">
            <div class="station-name" style="font-size: 1.1rem;">${name}</div>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1rem;">
            <div style="text-align: center;">
                <label style="font-size: 0.75rem; color: #64748b; display: block;">Current Level</label>
                <div class="level-indicator" id="level-${stationRef}" style="font-size: 1.5rem;">--</div>
            </div>

            <div style="text-align: center;">
                 <label style="font-size: 0.75rem; color: #64748b; display: block;">Alarm Limit (m)</label>
                 <input type="number" class="threshold-input" 
                    value="${threshold}" min="0.5" max="5.0" step="0.1" 
                    style="width: 70px; padding: 0.25rem; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-size: 0.9rem;">
            </div>
        </div>

        <button class="btn btn-sm action-btn" style="width: 100%; margin-top: 1rem; background-color: #ef4444; color: white; padding: 0.3rem; font-size: 0.85rem;">
            Stop Monitoring
        </button>
        `;

        // Threshold Change Listener
        const input = div.querySelector('.threshold-input');
        input.addEventListener('change', (e) => {
            const newVal = parseFloat(e.target.value);
            if (onThresholdChange) onThresholdChange(station, newVal);
        });

    } else {
        // SEARCH RESULT VIEW: Compact
        div.innerHTML = `
        <div>
          <div class="station-name">${name}</div>
        </div>
        <div style="text-align: right;">
            <button class="btn btn-sm action-btn" style="padding: 0.4rem 1rem; background-color: #0ea5e9;">
                Monitor
            </button>
        </div>
      `;
    }

    // Toggle button logic
    const btn = div.querySelector('.action-btn');
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
