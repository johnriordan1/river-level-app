export default async function handler(request, response) {
    const { path } = request.query;

    if (!path) {
        return response.status(400).json({ error: 'No path provided' });
    }

    // path comes from rewrite query param: /api/proxy?path=geojson/latest/
    const urlPath = Array.isArray(path) ? path.join('/') : path;
    const targetUrl = `https://waterlevel.ie/${urlPath}`;

    try {
        const apiResponse = await fetch(targetUrl);

        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.setHeader('Content-Type', 'application/json');

        // Caching: Cache at Edge for 5 minutes (300s), allowing stale while revalidating for another 60s
        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

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
