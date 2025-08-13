// api/teams.js - Komplet kode til Vercel Serverless

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
    const { league, search } = req.query;
    
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

    // Danske hold whitelist
    const danishTeams = [
      'FC København', 'FC Midtjylland', 'Brøndby IF', 'AGF Aarhus',
      'Silkeborg IF', 'FC Nordsjælland', 'Randers FC', 'Viborg FF',
      'OB Odense', 'AaB Aalborg', 'Vejle BK', 'SønderjyskE'
    ];

    let allTeams = [];

    if (league && leagueConfig[league]) {
      // Specifik liga
      const config = leagueConfig[league];
      const season = '2024';
      
      let apiUrl = `https://${API_HOST}/teams?league=${config.id}&season=${season}`;
      
      // Tilføj search parameter hvis angivet
      if (search) {
        apiUrl += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': API_HOST
        }
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      let teams = data.response || [];

      // Filter danske hold for superliga
      if (league === 'superliga') {
        teams = teams.filter(teamData => {
          const teamName = teamData.team?.name || '';
          return danishTeams.some(danishTeam => 
            teamName.includes(danishTeam) || danishTeam.includes(teamName)
          );
        });
      }

      // Tilføj liga info til hvert hold
      allTeams = teams.map(teamData => ({
        ...teamData,
        leagueInfo: config
      }));

    } else {
      // Alle ligaer
      const season = '2024';
      
      for (const [leagueKey, config] of Object.entries(leagueConfig)) {
        try {
          let apiUrl = `https://${API_HOST}/teams?league=${config.id}&season=${season}`;
          
          // Tilføj search parameter hvis angivet
          if (search) {
            apiUrl += `&search=${encodeURIComponent(search)}`;
          }
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': API_KEY,
              'X-RapidAPI-Host': API_HOST
            }
          });

          if (response.ok) {
            const data = await response.json();
            let teams = data.response || [];

            // Filter danske hold for superliga
            if (leagueKey === 'superliga') {
              teams = teams.filter(teamData => {
                const teamName = teamData.team?.name || '';
                return danishTeams.some(danishTeam => 
                  teamName.includes(danishTeam) || danishTeam.includes(teamName)
                );
              });
            }

            // Tilføj liga info til hvert hold
            teams = teams.map(teamData => ({
              ...teamData,
              leagueInfo: config
            }));

            allTeams = allTeams.concat(teams);
          }
        } catch (error) {
          console.error(`Error fetching teams from ${leagueKey}:`, error);
          // Continue med andre ligaer selvom en fejler
        }
      }
    }

    // Sorter hold alfabetisk
    allTeams.sort((a, b) => {
      const nameA = a.team?.name || '';
      const nameB = b.team?.name || '';
      return nameA.localeCompare(nameB);
    });

    // Return response
    res.status(200).json({
      success: true,
      count: allTeams.length,
      league: league || 'all',
      search: search || null,
      teams: allTeams
    });

  } catch (error) {
    console.error('Teams API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch teams', 
      details: error.message 
    });
  }
};
