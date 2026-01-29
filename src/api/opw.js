/**
 * OPW Water Level API Client
 */

const IS_PROD = import.meta.env.PROD;

// Helper to construct URL
function getUrl(path) {
    if (IS_PROD) {
        // In production, use the absolute serverless proxy URL
        // This allows 'npm run preview' or local builds to work by hitting the live proxy
        const cleanPath = path.replace(/^\/api\//, '');
        return `https://river-level-app.vercel.app/api/proxy?path=${cleanPath}`;
    }
    // In dev, use the vite proxy path directly
    return path;
}

const STATIONS_PATH = '/api/geojson/';
const LATEST_READINGS_PATH = '/api/geojson/latest/';

// Helper to fetch JSON
async function fetchJson(path) {
    const url = getUrl(path);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Fetch all stations
 * @returns {Promise<Array>} List of station features
 */
export async function fetchStations() {
    try {
        const data = await fetchJson(STATIONS_PATH);
        return data.features || [];
    } catch (error) {
        console.error('Error fetching stations:', error);
        return [];
    }
}

/**
 * Fetch latest readings for ALL stations
 * @returns {Promise<Array>} List of features with value and timestamp
 */
export async function fetchLatestReadings() {
    try {
        const data = await fetchJson(LATEST_READINGS_PATH);
        // Returns a FeatureCollection where features have properties like { station_ref, value, datetime, ... }
        return data.features || [];
    } catch (error) {
        console.error('Error fetching latest readings:', error);
        return [];
    }
}

/**
 * Fetch latest sensor data for a station (Historical/Detailed)
 */
export async function fetchStationData(stationId, sensorRef = '0001') {
    const path = `/api/data/month/${stationId}_${sensorRef}.json`;
    try {
        const data = await fetchJson(path);
        return data; // { station_id, sensor_ref, data: [...] }
    } catch (error) {
        console.warn(`Could not fetch data for station ${stationId}`, error);
        return null;
    }
}
