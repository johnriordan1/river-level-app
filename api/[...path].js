export default async function handler(request, response) {
    // Vercel Dynamic Routes: path is the query param for [...path].js
    const { path } = request.query;

    if (!path) {
        return response.status(400).json({ error: 'No path provided' });
    }

    // path is array of segments: ['geojson', 'latest']
    const urlPath = Array.isArray(path) ? path.join('/') : path;
    const targetUrl = `https://waterlevel.ie/${urlPath}`;

    try {
        const apiResponse = await fetch(targetUrl);

        // Set CORS headers
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.setHeader('Content-Type', 'application/json');

        if (!apiResponse.ok) {
            return response.status(apiResponse.status).json({ error: apiResponse.statusText });
        }

        const data = await apiResponse.json();
        return response.status(200).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        return response.status(500).json({ error: 'Failed to fetch upstream' });
    }
}
