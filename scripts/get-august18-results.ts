import axios from 'axios';

interface MLBGame {
  gamePk: number;
  gameDate: string;
  teams: {
    away: { team: { name: string } };
    home: { team: { name: string } };
  };
  linescore?: {
    currentInning?: number;
    currentInningOrdinal?: string;
    inningState?: string;
    isTopInning?: boolean;
    teams: {
      home: { runs: number; hits: number; errors: number };
      away: { runs: number; hits: number; errors: number };
    };
  };
  status: {
    abstractGameState: string;
    codedGameState: string;
    detailedState: string;
  };
}

async function getMLBGamesForDate(date: string): Promise<MLBGame[]> {
  try {
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule`,
      {
        params: {
          sportId: 1,
          date: date,
          hydrate: 'linescore,team'
        }
      }
    );

    return response.data.dates[0]?.games || [];
  } catch (error) {
    console.error('Error fetching MLB games:', error);
    return [];
  }
}

function getTeamAbbreviation(teamName: string): string {
  const teamMap: { [key: string]: string } = {
    'Milwaukee Brewers': 'Brewers',
    'Chicago Cubs': 'Cubs', 
    'Houston Astros': 'Astros',
    'Detroit Tigers': 'Tigers',
    'Toronto Blue Jays': 'Jays',
    'Pittsburgh Pirates': 'Pirates',
    'St. Louis Cardinals': 'Cardinals',
    'Miami Marlins': 'Marlins',
    'Seattle Mariners': 'Mariners',
    'Philadelphia Phillies': 'Phillies',
    'Baltimore Orioles': 'Orioles',
    'Boston Red Sox': 'Sox',
    'Chicago White Sox': 'White Sox',
    'Atlanta Braves': 'Braves',
    'Texas Rangers': 'Rangers',
    'Kansas City Royals': 'Royals',
    'Los Angeles Dodgers': 'Dodgers',
    'Colorado Rockies': 'Rockies',
    'Cincinnati Reds': 'Reds',
    'Los Angeles Angels': 'Angels',
    'Cleveland Guardians': 'Guardians',
    'Arizona Diamondbacks': 'Diamondbacks',
    'San Francisco Giants': 'Giants',
    'San Diego Padres': 'Padres'
  };
  
  return teamMap[teamName] || teamName;
}

async function main() {
  const games = await getMLBGamesForDate('2025-08-18');
  
  console.log('\n🏆 MLB ACTUAL RESULTS - AUGUST 18, 2025');
  console.log('=======================================');
  
  if (games.length === 0) {
    console.log('No games found for this date or games may not be completed yet.');
    return;
  }

  for (const game of games) {
    const awayTeam = getTeamAbbreviation(game.teams.away.team.name);
    const homeTeam = getTeamAbbreviation(game.teams.home.team.name);
    
    if (game.linescore && game.status.abstractGameState === 'Final') {
      const awayRuns = game.linescore.teams.away.runs;
      const homeRuns = game.linescore.teams.home.runs;
      const totalRuns = awayRuns + homeRuns;
      
      console.log(`${awayTeam} @ ${homeTeam}: ${awayRuns}-${homeRuns} (Total: ${totalRuns})`);
    } else {
      console.log(`${awayTeam} @ ${homeTeam}: ${game.status.detailedState}`);
    }
  }

  // Now compare with predictions
  console.log('\n📊 COMPARING WITH MODEL PREDICTIONS');
  console.log('===================================');
  
  const v4Predictions = [
    { teams: 'Brewers @ Cubs', prediction: 'Under 7.77', line: 7.0 },
    { teams: 'Astros @ Tigers', prediction: 'Under 8.4', line: 6.5, note: 'NO PLAY' },
    { teams: 'Jays @ Pirates', prediction: 'Over 8.59', line: 8.0, note: 'NO PLAY' },
    { teams: 'Cardinals @ Marlins', prediction: 'Over 8.5', line: 8.0, note: 'NO PLAY' },
    { teams: 'Mariners @ Phillies', prediction: 'Under 7.72', line: 8.0, note: 'NO PLAY' },
    { teams: 'Orioles @ Red Sox', prediction: 'Under 7.85', line: 9.5, note: 'NO PLAY' },
    { teams: 'White Sox @ Braves', prediction: 'Over 8.99', line: 9.0, note: 'NO PLAY' },
    { teams: 'Rangers @ Royals', prediction: 'Over 9.16', line: 8.5, note: 'STRONG Over' },
    { teams: 'Dodgers @ Rockies', prediction: 'Over 9.64', line: 12.0, note: 'NO PLAY' },
    { teams: 'Reds @ Angels', prediction: 'Under 7.75', line: 9.0, note: 'STRONG Under' },
    { teams: 'Guardians @ Diamondbacks', prediction: 'Over 8.68', line: 9.0, note: 'NO PLAY' },
    { teams: 'Giants @ Padres', prediction: 'Under 7.58', line: 8.0, note: 'NO PLAY' }
  ];

  const v5Predictions = [
    { teams: 'Brewers @ Cubs', prediction: 'Under 7.74', line: 7.0, note: 'MODERATE Under' },
    { teams: 'Astros @ Tigers', prediction: 'Under 7.7', line: 6.5, note: 'MODERATE Under' },
    { teams: 'Jays @ Pirates', prediction: 'Under 8.03', line: 8.0, note: 'NO PLAY' },
    { teams: 'Cardinals @ Marlins', prediction: 'Under 7.97', line: 8.0, note: 'MODERATE Under' },
    { teams: 'Mariners @ Phillies', prediction: 'Under 8.5', line: 8.0, note: 'NO PLAY' },
    { teams: 'Orioles @ Red Sox', prediction: 'Under 8.5', line: 9.5, note: 'MODERATE Under' },
    { teams: 'White Sox @ Braves', prediction: 'Over 8.82', line: 9.0, note: 'NO PLAY' },
    { teams: 'Rangers @ Royals', prediction: 'Under 8.27', line: 8.5, note: 'NO PLAY' },
    { teams: 'Dodgers @ Rockies', prediction: 'Over 9.9', line: 12.0, note: 'NO PLAY (EXTREME RISK)' },
    { teams: 'Reds @ Angels', prediction: 'Under 7.74', line: 9.0, note: 'STRONG Under' },
    { teams: 'Guardians @ Diamondbacks', prediction: 'Under 8.46', line: 9.0, note: 'NO PLAY' },
    { teams: 'Giants @ Padres', prediction: 'Under 7.5', line: 8.0, note: 'STRONG Under' }
  ];

  console.log('\nV4 PREDICTIONS vs ACTUAL:');
  for (const pred of v4Predictions) {
    const matchingGame = games.find(game => {
      const awayTeam = getTeamAbbreviation(game.teams.away.team.name);
      const homeTeam = getTeamAbbreviation(game.teams.home.team.name);
      const gameString = `${awayTeam} @ ${homeTeam}`;
      return pred.teams === gameString;
    });

    if (matchingGame && matchingGame.linescore && matchingGame.status.abstractGameState === 'Final') {
      const actualTotal = matchingGame.linescore.teams.away.runs + matchingGame.linescore.teams.home.runs;
      const predictedNum = parseFloat(pred.prediction.split(' ')[1]);
      const predictedDir = pred.prediction.split(' ')[0];
      
      let result = '';
      if (predictedDir === 'Over') {
        result = actualTotal > predictedNum ? '✅ WIN' : '❌ LOSS';
      } else {
        result = actualTotal < predictedNum ? '✅ WIN' : '❌ LOSS';
      }
      
      console.log(`${pred.teams}: ${pred.prediction} → Actual: ${actualTotal} ${result} ${pred.note || ''}`);
    }
  }

  console.log('\nV5 PREDICTIONS vs ACTUAL:');
  for (const pred of v5Predictions) {
    const matchingGame = games.find(game => {
      const awayTeam = getTeamAbbreviation(game.teams.away.team.name);
      const homeTeam = getTeamAbbreviation(game.teams.home.team.name);
      const gameString = `${awayTeam} @ ${homeTeam}`;
      return pred.teams === gameString;
    });

    if (matchingGame && matchingGame.linescore && matchingGame.status.abstractGameState === 'Final') {
      const actualTotal = matchingGame.linescore.teams.away.runs + matchingGame.linescore.teams.home.runs;
      const predictedNum = parseFloat(pred.prediction.split(' ')[1]);
      const predictedDir = pred.prediction.split(' ')[0];
      
      let result = '';
      if (predictedDir === 'Over') {
        result = actualTotal > predictedNum ? '✅ WIN' : '❌ LOSS';
      } else {
        result = actualTotal < predictedNum ? '✅ WIN' : '❌ LOSS';
      }
      
      console.log(`${pred.teams}: ${pred.prediction} → Actual: ${actualTotal} ${result} ${pred.note || ''}`);
    }
  }
}

main().catch(console.error);