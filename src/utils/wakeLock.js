/**
 * Screen Wake Lock Manager
 * Keeps the screen on while monitoring is active.
 */

let wakeLock = null;

export async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active');

            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock was released');
            });
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    } else {
        console.warn('Screen Wake Lock API not supported.');
    }
}

export async function releaseWakeLock() {
    if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
    }
}

// Re-acquire lock when page becomes visible
const handleVisibilityChange = async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
};

document.addEventListener('visibilitychange', handleVisibilityChange);
