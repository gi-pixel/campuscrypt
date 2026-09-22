export default async function handler(req, res) {
    const { q, mode } = req.query;
    const apiKey = process.env.GIPHY_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Missing Giphy API key' });
    }

    const url = mode === 'search'
        ? `https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(q || '')}&limit=20&rating=g`
        : `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=20&rating=g`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: 'Giphy fetch failed' });
    }
}