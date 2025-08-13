// api/teamstats.js - Komplet kode til Vercel Serverless

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { teamName, league, teamId } = req.query;
    
    if (!teamName && !teamId) {
      res.status(400).json({ error: 'teamName or teamId parameter required' });
      return;
    }

    // Environment variables
    const API_KEY = process.env.API_FOOTBALL_KEY;
    const API_HOST = process.env.API_FOOTBALL_HOST;

    if (!API_KEY || !API_HOST) {
      res.status(500).json({ error: 'Missing API configuration' });
      return;
    }

    // Liga konfiguration
    const leagueConfig = {
      'premier': { id: 39, country: 'England', name: 'Premier League' },
      'superliga': { id: 119, country: 'Denmark', name: 'Superliga' },
      'champions': { id: 2, country: 'World', name: 'UEFA Champions League' },
      'conference': { id: 848, country: 'World', name: 'UEFA Conference League' }
    };

    const config = league ? leagueConfig[league] : leagueConfig.premier;
    const season = '2024';

    let finalTeamId = teamId;
    let teamInfo = null;

    // Hvis teamId ikke er angivet, find det via teamName
    if (!finalTeamId && teamName) {
      const teamsUrl = `https://${API_HOST}/teams?league=${config.id}&season=${season}&search=${encodeURIComponent(teamName)}`;
      
      const teamsResponse = await fetch(teamsUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': API_HOST
        }
      });

      if (!teamsResponse.ok) {
        throw new Error(`Teams API call failed: ${teamsResponse.status}`);
      }

      const teamsData = await teamsResponse.json();
      const teams = teamsData.response || [];
      
      if (teams.length === 0) {
        res.status(404).json({ 
          error: 'Team not found',
          teamName: teamName,
          league: league 
        });
        return;
      }

      const team = teams[0];
      finalTeamId = team.team.id;
      teamInfo = team.team;
    }

    // Hent team statistikker
    const statsUrl = `https://${API_HOST}/teams/statistics?league=${config.id}&season=${season}&team=${finalTeamId}`;
    
    const statsResponse = await fetch(statsUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': API_HOST
      }
    });

    if (!statsResponse.ok) {
      // Hvis statistikker ikke er tilgængelige, returner basis info
      res.status(200).json({
        success: true,
        team: teamInfo,
        league: config,
        statistics: null,
        message: 'Live statistics not available - may require upgraded API plan'
      });
      return;
    }

    const statsData = await statsResponse.json();
    
    // Hent seneste kampe for ekstra kontekst
    let recentFixtures = [];
    try {
      const fixturesUrl = `https://${API_HOST}/fixtures?team=${finalTeamId}&last=5`;
      
      const fixturesResponse = await fetch(fixturesUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': API_HOST
        }
      });

      if (fixturesResponse.ok) {
        const fixturesData = await fixturesResponse.json();
        recentFixtures = fixturesData.response || [];
      }
    } catch (error) {
      console.log('Could not fetch recent fixtures:', error.message);
    }

    // Return response
    res.status(200).json({
      success: true,
      team: teamInfo || { id: finalTeamId },
      league: config,
      statistics: statsData.response || null,
      recentFixtures: recentFixtures,
      dataAvailable: {
        statistics: !!statsData.response,
        recentFixtures: recentFixtures.length > 0
      }
    });

  } catch (error) {
    console.error('Team Stats API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch team statistics', 
      details: error.message 
    });
  }
};
