// api/matches.js - Serverless function til at hente fixtures
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { league, days = 30 } = req.query;
    
    // League mapping
    const leagueIds = {
      'premier': 39,
      'superliga': 271
    };

    const leagueId = leagueIds[league];
    if (!leagueId) {
      return res.status(400).json({ error: 'Invalid league parameter' });
    }

    // Calculate date range
    const today = new Date();
    const futureDate = new Date(today.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = futureDate.toISOString().split('T')[0];

    // Call API-Football
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=2024&from=${fromDate}&to=${toDate}&status=NS`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.API_FOOTBALL_KEY,
          'X-RapidAPI-Host': 'v3.football.api-sports.io'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API-Football error: ${response.status}`);
    }

    const data = await response.json();

    // Process and format data
    const matches = data.response?.map(fixture => {
      const matchDate = new Date(fixture.fixture.date);
      const daysUntil = Math.ceil((matchDate - new Date()) / (1000 * 60 * 60 * 24));

      return {
        id: fixture.fixture.id,
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeTeamId: fixture.teams.home.id,
        awayTeamId: fixture.teams.away.id,
        date: fixture.fixture.date,
        venue: fixture.fixture.venue?.name || 'TBA',
        status: fixture.fixture.status.short,
        round: fixture.league.round,
        daysUntil,
        league: league === 'premier' ? 'Premier League' : 'Superligaen'
      };
    }) || [];

    // Cache for 10 minutes
    res.setHeader('Cache-Control', 's-maxage=600');
    
    res.status(200).json({
      success: true,
      count: matches.length,
      matches
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      message: error.message
    });
  }
}
