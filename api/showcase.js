
export default function handler(req, res) {
    // Base64 encoded image of realtime-water-levels.png
    const imageBase64 = `iVBORw0KGgoAAAANSUhEUgAABQAAAALQCAYAAADPfd1WAAAAAXNSR0IArs4c6QAAIABJREFU
eJzs3Xd4VFXa//HvaTNJMplMeiG9kIQUQhJIgNBLICgoKq6KXV11V111V/25u+quu2JfdV11
146KCiKoIEgJkBZKCAmQ3iaZPpNpJtP3748JgSSZSSYzk3J/rmuuzJxz7rkz9wx58jnnPuc+
... (This will be the full base64 string I captured) ...
SUVORK5CYII=`;

    const imageBuffer = Buffer.from(imageBase64, 'base64');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.send(imageBuffer);
}
