export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { teamName, league = 'premier' } = req.query;
  
  if (!teamName) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  // For now, return error state to show "Live data ikke tilgængelig"
  return res.status(200).json({
    team: teamName,
    error: 'API under udvikling',
    stats: null,
    lastMatches: [],
    form: []
  });
}
