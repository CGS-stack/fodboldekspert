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
    // Try both current and next season
    const currentSeason = new Date().getFullYear();
    const seasons = [currentSeason, currentSeason - 1]; // Try 2025 and 2024
    
    let fixtures = [];
    
    for (const season of seasons) {
      const apiUrl = `https://${process.env.API_FOOTBALL_HOST}/fixtures?league=${config.id}&season=${season}&from=${today}&to=${endDateStr}`;
      
      console.log(`Fetching ${config.name} fixtures for season ${season}:`, apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
          'x-rapidapi-host': process.env.API_FOOTBALL_HOST
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`${config.name} season ${season} response:`, data.response?.length || 0, 'fixtures found');
        
        if (data.response && data.response.length > 0) {
          // Filter to ensure correct country and league
          const seasonFixtures = data.response.filter(fixture => {
            const isCorrectLeague = fixture.league.id === config.id;
            const isCorrectCountry = fixture.league.country === config.country;
            const isUpcoming = ['NS', 'TBD', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT'].includes(fixture.fixture.status.short);
            
            console.log(`Match: ${fixture.teams.home.name} vs ${fixture.teams.away.name} - Status: ${fixture.fixture.status.short} - Valid: ${isCorrectLeague && isCorrectCountry && isUpcoming}`);
            return isCorrectLeague && isCorrectCountry && isUpcoming;
          });
          
          fixtures = fixtures.concat(seasonFixtures);
          if (fixtures.length >= 10) break; // Stop if we have enough matches
        }
      }
    }

    // If still no fixtures, try without date filter (next few matches)
    if (fixtures.length === 0) {
      console.log(`No upcoming fixtures found, trying next available matches for ${config.name}...`);
      
      const apiUrl = `https://${process.env.API_FOOTBALL_HOST}/fixtures?league=${config.id}&season=${currentSeason}&next=10`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
          'x-rapidapi-host': process.env.API_FOOTBALL_HOST
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`${config.name} next matches response:`, data.response?.length || 0, 'fixtures found');
        
        if (data.response && data.response.length > 0) {
          fixtures = data.response.filter(fixture => {
            const isCorrectLeague = fixture.league.id === config.id;
            const isCorrectCountry = fixture.league.country === config.country;
            return isCorrectLeague && isCorrectCountry;
          });
        }
      }
    }

    // Transform to our format
    const matches = fixtures.slice(0, 10).map(fixture => ({
      id: fixture.fixture.id,
      date: fixture.fixture.date,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      venue: fixture.fixture.venue?.name || 'TBA',
      round: fixture.league.round || 'TBA',
      league: config.name,
      country: config.country,
      status: fixture.fixture.status.short
    }));

    console.log(`Processed ${matches.length} ${config.name} matches`);

    return res.status(200).json({
      matches: matches,
      league: config.name,
      total: matches.length,
      debug: {
        seasonsChecked: seasons,
        originalFixtures: fixtures.length,
        processedMatches: matches.length
      }
    });

  } catch (error) {
    console.error(`Error fetching ${config.name} fixtures:`, error.message);
    
    return res.status(200).json({
      matches: [],
      error: error.message,
      league: config.name,
      debug: {
        errorType: 'API_ERROR',
        message: error.message
      }
    });
  }
}
