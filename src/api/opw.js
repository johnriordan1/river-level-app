/**
 * OPW Water Level API Client
 */

const STATIONS_URL = '/api/geojson/';
const LATEST_READINGS_URL = '/api/geojson/latest/';

// Helper to fetch JSON
async function fetchJson(url) {
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
        const data = await fetchJson(STATIONS_URL);
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
        const data = await fetchJson(LATEST_READINGS_URL);
        // Returns a FeatureCollection where features have properties like { station_ref, value, datetime, ... }
        // Note: The structure might be slightly different than stations list, usually properties have the data.
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
    const url = `/api/data/month/${stationId}_${sensorRef}.json`;
    try {
        const data = await fetchJson(url);
        return data; // { station_id, sensor_ref, data: [...] }
    } catch (error) {
        console.warn(`Could not fetch data for station ${stationId}`, error);
        return null;
    }
}
