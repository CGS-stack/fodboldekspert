// api/matches.js - Komplet kode til Vercel Serverless

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
    const { league } = req.query;
    
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

    // Danske hold whitelist for superliga filtering
    const danishTeams = [
      'FC København', 'FC Midtjylland', 'Brøndby IF', 'AGF Aarhus',
      'Silkeborg IF', 'FC Nordsjælland', 'Randers FC', 'Viborg FF',
      'OB Odense', 'AaB Aalborg', 'Vejle BK', 'SønderjyskE'
    ];

    let allMatches = [];

    if (league && leagueConfig[league]) {
      // Specifik liga
      const config = leagueConfig[league];
      const season = '2024';
      
      const apiUrl = `https://${API_HOST}/fixtures?league=${config.id}&season=${season}`;
      
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
      let matches = data.response || [];

      // Filter danske kampe for superliga
      if (league === 'superliga') {
        matches = matches.filter(match => {
          const homeTeam = match.teams?.home?.name || '';
          const awayTeam = match.teams?.away?.name || '';
          return danishTeams.some(team => 
            homeTeam.includes(team) || awayTeam.includes(team)
          );
        });
      }

      allMatches = matches;

    } else {
      // Alle ligaer
      const season = '2024';
      
      for (const [leagueKey, config] of Object.entries(leagueConfig)) {
        try {
          const apiUrl = `https://${API_HOST}/fixtures?league=${config.id}&season=${season}`;
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': API_KEY,
              'X-RapidAPI-Host': API_HOST
            }
          });

          if (response.ok) {
            const data = await response.json();
            let matches = data.response || [];

            // Filter danske kampe for superliga
            if (leagueKey === 'superliga') {
              matches = matches.filter(match => {
                const homeTeam = match.teams?.home?.name || '';
                const awayTeam = match.teams?.away?.name || '';
                return danishTeams.some(team => 
                  homeTeam.includes(team) || awayTeam.includes(team)
                );
              });
            }

            // Tilføj liga info til hver kamp
            matches = matches.map(match => ({
              ...match,
              leagueInfo: config
            }));

            allMatches = allMatches.concat(matches);
          }
        } catch (error) {
          console.error(`Error fetching ${leagueKey}:`, error);
          // Continue med andre ligaer selvom en fejler
        }
      }
    }

    // Sorter kampe efter dato
    allMatches.sort((a, b) => {
      const dateA = new Date(a.fixture?.date || 0);
      const dateB = new Date(b.fixture?.date || 0);
      return dateA - dateB;
    });

    // Return response
    res.status(200).json({
      success: true,
      count: allMatches.length,
      league: league || 'all',
      matches: allMatches
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch matches', 
      details: error.message 
    });
  }
};
