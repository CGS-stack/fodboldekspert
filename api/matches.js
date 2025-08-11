// api/matches.js - Serverless function til at hente fixtures
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { league = 'premier', days = 30 } = req.query;
  
  // Calculate date range
  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + parseInt(days));
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`API call for league: ${league}, from: ${today} to: ${endDateStr}`);

  // League mapping with country verification
  const leagueConfig = {
    'premier': { id: 39, country: 'England', name: 'Premier League' },
    'superliga': { id: 271, country: 'Denmark', name: 'Superliga' }
  };

  const config = leagueConfig[league];
  if (!config) {
    return res.status(400).json({ error: 'Invalid league parameter' });
  }

  if (!process.env.API_FOOTBALL_KEY || !process.env.API_FOOTBALL_HOST) {
    console.log('Missing API credentials, using demo data');
    return res.status(200).json({
      matches: [],
      message: 'Demo mode - API credentials not configured'
    });
  }

  try {
    const apiUrl = `https://${process.env.API_FOOTBALL_HOST}/fixtures?league=${config.id}&season=2024&from=${today}&to=${endDateStr}&status=NS`;
    
    console.log(`Fetching ${config.name} fixtures:`, apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
        'x-rapidapi-host': process.env.API_FOOTBALL_HOST
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`${config.name} API response:`, data.results, 'fixtures found');
    
    // Filter to ensure correct country and league
    const fixtures = (data.response || []).filter(fixture => {
      const isCorrectLeague = fixture.league.id === config.id;
      const isCorrectCountry = fixture.league.country === config.country;
      console.log(`Match: ${fixture.teams.home.name} vs ${fixture.teams.away.name} - League: ${fixture.league.name} (${fixture.league.country}) - Valid: ${isCorrectLeague && isCorrectCountry}`);
      return isCorrectLeague && isCorrectCountry;
    });

    // Transform to our format
    const matches = fixtures.slice(0, 10).map(fixture => ({
      id: fixture.fixture.id,
      date: fixture.fixture.date,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      venue: fixture.fixture.venue.name,
      round: fixture.league.round,
      league: config.name,
      country: config.country
    }));

    console.log(`Processed ${matches.length} ${config.name} matches`);

    return res.status(200).json({
      matches: matches,
      league: config.name,
      total: matches.length
    });

  } catch (error) {
    console.error(`Error fetching ${config.name} fixtures:`, error.message);
    
    return res.status(200).json({
      matches: [],
      error: error.message,
      league: config.name
    });
  }
}
