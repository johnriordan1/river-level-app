export default async function handler(request, response) {
    // Get the path from the query string (configured in vercel.json)
    const { path } = request.query;

    // Default to nothing if no path
    if (!path) {
        return response.status(400).json({ error: 'No path provided' });
    }

    // Construct target URL
    // path will be an array like ['geojson', 'latest', ''] or string depending on setup
    // We expect calls like /api/geojson/latest/

    // If path is array, join it
    const urlPath = Array.isArray(path) ? path.join('/') : path;
    const targetUrl = `https://waterlevel.ie/${urlPath}`;

    try {
        const apiResponse = await fetch(targetUrl);

        // Copy status
        response.status(apiResponse.status);

        // Set CORS headers explicitly
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.setHeader('Content-Type', 'application/json');

        if (!apiResponse.ok) {
            return response.json({ error: `Upstream error: ${apiResponse.statusText}` });
        }

        const data = await apiResponse.json();
        return response.json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return response.status(500).json({ error: 'Failed to fetch external API' });
    }
}
