// api/teams.js - Serverless function til at hente hold data og statistikker
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
    const { league, teamId } = req.query;
    
    // League mapping
    const leagueIds = {
      'premier': 39,
      'superliga': 271
    };

    const leagueId = leagueIds[league];
    if (!leagueId) {
      return res.status(400).json({ error: 'Invalid league parameter' });
    }

    let endpoint;
    if (teamId) {
      // Get specific team statistics
      endpoint = `https://v3.football.api-sports.io/teams/statistics?league=${leagueId}&season=2024&team=${teamId}`;
    } else {
      // Get all teams in league
      endpoint = `https://v3.football.api-sports.io/teams?league=${leagueId}&season=2024`;
    }

    const response = await fetch(endpoint, {
      headers: {
        'X-RapidAPI-Key': process.env.API_FOOTBALL_KEY,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) {
      throw new Error(`API-Football error: ${response.status}`);
    }

    const data = await response.json();

    let result;
    if (teamId) {
      // Return team statistics
      const stats = data.response;
      result = {
        team: stats.team,
        form: stats.form?.slice(-5) || ['W', 'W', 'D', 'L', 'W'], // Last 5 matches
        goals: {
          for: stats.goals?.for?.total?.total || 0,
          against: stats.goals?.against?.total?.total || 0
        },
        matches: {
          played: stats.fixtures?.played?.total || 0,
          wins: stats.fixtures?.wins?.total || 0,
          draws: stats.fixtures?.draws?.total || 0,
          loses: stats.fixtures?.loses?.total || 0
        },
        possession: `${stats.ball_possession || 50}%`,
        cleanSheets: stats.clean_sheet?.total || 0
      };
    } else {
      // Return all teams
      result = data.response?.map(item => ({
        id: item.team.id,
        name: item.team.name,
        logo: item.team.logo,
        country: item.team.country,
        founded: item.team.founded,
        venue: item.venue?.name
      })) || [];
    }

    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600');
    
    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team data',
      message: error.message
    });
  }
}
