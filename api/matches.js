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
    
    // League mapping - Updated for current season
    const leagueIds = {
      'premier': 39,
      'superliga': 271
    };

    const leagueId = leagueIds[league];
    if (!leagueId) {
      return res.status(400).json({ error: 'Invalid league parameter. Use: premier or superliga' });
    }

    // Check environment variables
    if (!process.env.API_FOOTBALL_KEY) {
      throw new Error('API_FOOTBALL_KEY environment variable not set');
    }

    // Calculate date range
    const today = new Date();
    const futureDate = new Date(today.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = futureDate.toISOString().split('T')[0];

    console.log(`Fetching ${league} matches from ${fromDate} to ${toDate} with key: ${process.env.API_FOOTBALL_KEY?.substring(0, 8)}...`);

    // Try current season (2025) first, then fallback to 2024
    let response, data;
    const seasons = [2025, 2024];
    
    for (const season of seasons) {
      try {
        console.log(`Trying season ${season} for league ${leagueId}`);
        
        // Fixed headers to match RapidAPI format
        response = await fetch(
          `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&from=${fromDate}&to=${toDate}`,
          {
            headers: {
              'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
              'x-rapidapi-host': process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io'
            }
          }
        );

        if (response.ok) {
          data = await response.json();
          console.log(`Season ${season} response:`, data.response?.length || 0, 'matches', 'Remaining requests:', data.requests?.remaining);
          
          if (data.response && data.response.length > 0) {
            break; // Found matches, exit loop
          }
        } else {
          const errorText = await response.text();
          console.log(`Season ${season} failed with status ${response.status}:`, errorText);
        }
      } catch (seasonError) {
        console.log(`Season ${season} failed:`, seasonError.message);
        continue;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`API-Football error: ${response?.status || 'No response'}`);
    }

    // Process and format data
    const matches = data.response?.map(fixture => {
      const matchDate = new Date(fixture.fixture.date);
      const daysUntil = Math.ceil((matchDate - new Date()) / (1000 * 60 * 60 * 1000 * 24));

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

    // If no matches found, create some realistic demo matches
    if (matches.length === 0) {
      console.log('No matches found from API, creating demo matches');
      const demoMatches = createDemoMatches(league, fromDate, toDate);
      
      return res.status(200).json({
        success: true,
        count: demoMatches.length,
        matches: demoMatches,
        note: 'Demo data - API returned no matches for requested period',
        apiInfo: {
          requestsRemaining: data?.requests?.remaining || 'unknown',
          status: 'no_matches_found'
        }
      });
    }

    // Cache real data for 10 minutes
    res.setHeader('Cache-Control', 's-maxage=600');
    
    res.status(200).json({
      success: true,
      count: matches.length,
      matches,
      apiInfo: {
        requestsRemaining: data?.requests?.remaining || 'unknown',
        status: 'success'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Return demo data as fallback
    const { league } = req.query;
    const today = new Date();
    const futureDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const demoMatches = createDemoMatches(league || 'premier', 
      today.toISOString().split('T')[0], 
      futureDate.toISOString().split('T')[0]
    );
    
    res.status(200).json({
      success: true,
      count: demoMatches.length,
      matches: demoMatches,
      error: 'API failed, using demo data',
      message: error.message,
      apiInfo: {
        status: 'fallback_demo'
      }
    });
  }
}

function createDemoMatches(league, fromDate, toDate) {
  const today = new Date();
  
  if (league === 'premier') {
    return [
      {
        id: 'demo_pl_1',
        homeTeam: 'Liverpool',
        awayTeam: 'Manchester United',
        homeTeamId: 40,
        awayTeamId: 33,
        date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'Anfield',
        status: 'NS',
        round: 'Regular Season - 22',
        daysUntil: 1,
        league: 'Premier League'
      },
      {
        id: 'demo_pl_2',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        homeTeamId: 42,
        awayTeamId: 49,
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'Emirates Stadium',
        status: 'NS',
        round: 'Regular Season - 22',
        daysUntil: 3,
        league: 'Premier League'
      },
      {
        id: 'demo_pl_3',
        homeTeam: 'Manchester City',
        awayTeam: 'Tottenham Hotspur',
        homeTeamId: 50,
        awayTeamId: 47,
        date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'Etihad Stadium',
        status: 'NS',
        round: 'Regular Season - 22',
        daysUntil: 5,
        league: 'Premier League'
      }
    ];
  } else {
    return [
      {
        id: 'demo_sl_1',
        homeTeam: 'FC København',
        awayTeam: 'Brøndby IF',
        homeTeamId: 2905,
        awayTeamId: 2999,
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'Parken Stadium',
        status: 'NS',
        round: 'Regular Season - 19',
        daysUntil: 2,
        league: 'Superligaen'
      },
      {
        id: 'demo_sl_2',
        homeTeam: 'FC Midtjylland',
        awayTeam: 'AGF',
        homeTeamId: 2998,
        awayTeamId: 3000,
        date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'MCH Arena',
        status: 'NS',
        round: 'Regular Season - 19',
        daysUntil: 4,
        league: 'Superligaen'
      }
    ];
  }
}
