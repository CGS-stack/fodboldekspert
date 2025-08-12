// api/team-stats.js - Serverless function til at hente rigtige hold statistikker
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

  console.log(`Fetching stats for team: ${teamName} in league: ${league}`);

  // League mapping
  const leagueConfig = {
    'premier': { id: 39, country: 'England', season: new Date().getFullYear() },
    'superliga': { id: 119, country: 'Denmark', season: 2025 },
    'champions': { id: 2, country: 'World', season: 2025 },
    'conference': { id: 848, country: 'World', season: 2025 }
  };

  const config = leagueConfig[league];
  if (!config) {
    return res.status(400).json({ error: 'Invalid league parameter' });
  }

  if (!process.env.API_FOOTBALL_KEY || !process.env.API_FOOTBALL_HOST) {
    return res.status(200).json({
      error: 'API credentials not configured',
      teamStats: null
    });
  }

  try {
    // Step 1: Find team ID by name
    console.log(`Searching for team: ${teamName}`);
    const teamsResponse = await fetch(`https://${process.env.API_FOOTBALL_HOST}/teams?search=${encodeURIComponent(teamName)}`, {
      headers: {
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
        'x-rapidapi-host': process.env.API_FOOTBALL_HOST
      }
    });

    if (!teamsResponse.ok) {
      throw new Error(`Teams API failed: ${teamsResponse.status}`);
    }

    const teamsData = await teamsResponse.json();
    console.log(`Found ${teamsData.response?.length || 0} teams matching "${teamName}"`);

    // Find the exact team match
    let targetTeam = null;
    if (teamsData.response && teamsData.response.length > 0) {
      targetTeam = teamsData.response.find(item => 
        item.team.name.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(item.team.name.toLowerCase())
      ) || teamsData.response[0];
    }

    if (!targetTeam) {
      throw new Error(`Team "${teamName}" not found`);
    }

    const teamId = targetTeam.team.id;
    console.log(`Found team ID: ${teamId} for ${targetTeam.team.name}`);

    // Step 2: Get team statistics for the season
    const statsResponse = await fetch(`https://${process.env.API_FOOTBALL_HOST}/teams/statistics?league=${config.id}&season=${config.season}&team=${teamId}`, {
      headers: {
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
        'x-rapidapi-host': process.env.API_FOOTBALL_HOST
      }
    });

    let teamStats = null;
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      if (statsData.response) {
        const stats = statsData.response;
        teamStats = {
          goalsFor: stats.goals?.for?.total?.total || 0,
          goalsAgainst: stats.goals?.against?.total?.total || 0,
          matchesPlayed: stats.fixtures?.played?.total || 0,
          wins: stats.fixtures?.wins?.total || 0,
          draws: stats.fixtures?.draws?.total || 0,
          losses: stats.fixtures?.loses?.total || 0,
          possession: stats.ball_possession?.average ? parseFloat(stats.ball_possession.average.replace('%', '')) : 50
        };
        console.log(`Team stats found: ${teamStats.goalsFor}GF, ${teamStats.goalsAgainst}GA, ${teamStats.possession}% possession`);
      }
    }

    // Step 3: Get last 5 matches
    const fixturesResponse = await fetch(`https://${process.env.API_FOOTBALL_HOST}/fixtures?team=${teamId}&last=5`, {
      headers: {
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
        'x-rapidapi-host': process.env.API_FOOTBALL_HOST
      }
    });

    let lastMatches = [];
    if (fixturesResponse.ok) {
      const fixturesData = await fixturesResponse.json();
      if (fixturesData.response && fixturesData.response.length > 0) {
        lastMatches = fixturesData.response.map(fixture => {
          const homeTeam = fixture.teams.home;
          const awayTeam = fixture.teams.away;
          const homeScore = fixture.goals.home;
          const awayScore = fixture.goals.away;
          
          let result = 'D'; // Default draw
          if (homeScore > awayScore) {
            result = homeTeam.id === teamId ? 'W' : 'L';
          } else if (awayScore > homeScore) {
            result = awayTeam.id === teamId ? 'W' : 'L';
          }
          
          return {
            result: result,
            opponent: homeTeam.id === teamId ? awayTeam.name : homeTeam.name,
            score: `${homeScore}-${awayScore}`,
            date: fixture.fixture.date
          };
        });
        console.log(`Last 5 matches: ${lastMatches.map(m => m.result).join('')}`);
      }
    }

    // Return compiled stats
    const response = {
      team: targetTeam.team.name,
      teamId: teamId,
      logo: targetTeam.team.logo,
      stats: teamStats,
      lastMatches: lastMatches,
      form: lastMatches.map(m => m.result), // ['W', 'L', 'D', 'W', 'L']
      debug: {
        league: config.id,
        season: config.season,
        statsFound: !!teamStats,
        matchesFound: lastMatches.length
      }
    };

    console.log(`Returning stats for ${targetTeam.team.name}: Form ${response.form.join('')}`);
    return res.status(200).json(response);

  } catch (error) {
    console.error(`Error fetching stats for ${teamName}:`, error.message);
    
    return res.status(200).json({
      error: error.message,
      team: teamName,
      stats: null,
      lastMatches: [],
      form: []
    });
  }
}
