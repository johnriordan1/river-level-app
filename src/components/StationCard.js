export function createStationCard(station, isMonitored, onToggleMonitor, threshold = 1.0, onThresholdChange = null, currentLevel = null) {
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
        // Fix for .station-item flex row: Force column layout for detailed view
        div.style.flexDirection = "column";
        div.style.alignItems = "stretch";

        div.innerHTML = `
        <div style="margin-bottom: 0.5rem;">
            <div class="station-name" style="font-size: 1.1rem;">${name}</div>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1rem;">
            <div style="text-align: center;">
                <label style="font-size: 0.75rem; color: #64748b; display: block;">Current Level</label>
                <div class="level-indicator" id="level-${stationRef}" style="font-size: 1.5rem;">--</div>
            </div>

            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 50%;">
                 <label style="font-size: 0.75rem; color: #64748b; display: block;">Alarm Limit (m)</label>
                 
                 <input type="number" class="threshold-input" 
                    value="${threshold}" min="0.5" max="10.0" step="0.1" 
                    style="width: 100%; max-width: 120px; padding: 0.5rem; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-size: 1.1rem;">
            </div>
        </div>

        <div style="text-align: center; margin-top: 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
            <button class="confirm-btn" style="display: none; background-color: #22c55e; color: white; padding: 0.8rem 2rem; font-size: 1rem; width: 80%; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                Confirm
            </button> <!-- Moved here and styled to match Stop button -->
            
            <button class="btn btn-sm action-btn" style="background-color: #ef4444; color: white; padding: 0.8rem 2rem; font-size: 1rem; width: 80%;">
                Stop Monitoring
            </button>
        </div>
        `;

        // Threshold Change Logic
        const input = div.querySelector('.threshold-input');
        const confirmBtn = div.querySelector('.confirm-btn');

        input.addEventListener('input', () => {
            confirmBtn.style.display = 'block';
            confirmBtn.innerText = `Confirm ${input.value}m`;
        });

        confirmBtn.addEventListener('click', () => {
            const newVal = parseFloat(input.value);
            if (onThresholdChange) onThresholdChange(station, newVal);
            confirmBtn.style.display = 'none';
        });

    } else {
        // SEARCH RESULT VIEW: Compact but with Level
        const levelDisplay = currentLevel !== null ? `${currentLevel.toFixed(2)}m` : 'N/A';
        div.innerHTML = `
        <div style="flex: 1;">
          <div class="station-name">${name}</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 0.25rem;">Level: <strong>${levelDisplay}</strong></div>
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
