
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    // Path to the image in the 'public' folder
    // Note: In Vercel serverless, 'public' files are often moved. 
    // We try to resolve it relative to the current working directory.

    // Try multiple paths because Vercel file structure varies by deployment type
    const possiblePaths = [
        path.join(process.cwd(), 'public', 'showcase.png'),
        path.join(process.cwd(), 'showcase.png'),
    ];

    let imagePath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            imagePath = p;
            break;
        }
    }

    if (!imagePath) {
        return res.status(404).json({ error: 'Image not found', cwd: process.cwd() });
    }

    const imageBuffer = fs.readFileSync(imagePath);

    res.setHeader('Content-Type', 'image/png');
    res.send(imageBuffer);
}
