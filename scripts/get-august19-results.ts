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
    'San Diego Padres': 'Padres',
    'New York Mets': 'Mets',
    'Washington Nationals': 'Nationals',
    'New York Yankees': 'Yankees',
    'Tampa Bay Rays': 'Rays',
    'Oakland Athletics': 'Athletics',
    'Minnesota Twins': 'Twins'
  };
  
  return teamMap[teamName] || teamName;
}

function evaluatePrediction(actualTotal: number, predictedTotal: number, direction: string): string {
  if (direction === 'Over') {
    if (actualTotal > predictedTotal) return '✅ WIN';
    if (actualTotal < predictedTotal) return '❌ LOSS';
    return '🔄 PUSH';
  } else {
    if (actualTotal < predictedTotal) return '✅ WIN';
    if (actualTotal > predictedTotal) return '❌ LOSS';
    return '🔄 PUSH';
  }
}

function evaluateAgainstMarketLine(actualTotal: number, marketLine: number, prediction: string): string {
  const direction = prediction.split(' ')[0];
  if (direction === 'Over') {
    if (actualTotal > marketLine) return '✅ WIN';
    if (actualTotal < marketLine) return '❌ LOSS';
    return '🔄 PUSH';
  } else {
    if (actualTotal < marketLine) return '✅ WIN';
    if (actualTotal > marketLine) return '❌ LOSS';
    return '🔄 PUSH';
  }
}

async function main() {
  const games = await getMLBGamesForDate('2025-08-19');
  
  console.log('\n🏆 MLB ACTUAL RESULTS - AUGUST 19, 2025');
  console.log('=======================================');
  
  if (games.length === 0) {
    console.log('No games found for this date or games may not be completed yet.');
    return;
  }

  const actualResults: { [key: string]: number } = {};
  
  for (const game of games) {
    const awayTeam = getTeamAbbreviation(game.teams.away.team.name);
    const homeTeam = getTeamAbbreviation(game.teams.home.team.name);
    const gameKey = `${awayTeam} @ ${homeTeam}`;
    
    if (game.linescore && game.status.abstractGameState === 'Final') {
      const awayRuns = game.linescore.teams.away.runs;
      const homeRuns = game.linescore.teams.home.runs;
      const totalRuns = awayRuns + homeRuns;
      actualResults[gameKey] = totalRuns;
      
      console.log(`${gameKey}: ${awayRuns}-${homeRuns} (Total: ${totalRuns})`);
    } else {
      console.log(`${gameKey}: ${game.status.detailedState}`);
    }
  }

  // V4 and V5 predictions from the comparison
  const v4Predictions = [
    { teams: 'Brewers @ Cubs', prediction: 'Under 7.61', marketLine: 6.5, note: 'STRONG Under' },
    { teams: 'Astros @ Tigers', prediction: 'Under 8.2', marketLine: 7.0, note: 'NO PLAY' },
    { teams: 'Jays @ Pirates', prediction: 'Over 9.16', marketLine: 7.5, note: 'NO PLAY' },
    { teams: 'Cardinals @ Marlins', prediction: 'Under 8.4', marketLine: 7.5, note: 'NO PLAY' },
    { teams: 'Mets @ Nationals', prediction: 'Under 7.61', marketLine: 9.0, note: 'STRONG Under' },
    { teams: 'Mariners @ Phillies', prediction: 'Under 7.76', marketLine: 8.0, note: 'STRONG Under' },
    { teams: 'Orioles @ Sox', prediction: 'Under 8.04', marketLine: 9.0, note: 'NO PLAY' },
    { teams: 'White Sox @ Braves', prediction: 'Under 7.84', marketLine: 8.5, note: 'NO PLAY' },
    { teams: 'Yankees @ Rays', prediction: 'Over 8.81', marketLine: 8.5, note: 'NO PLAY' },
    { teams: 'Rangers @ Royals', prediction: 'Under 8.12', marketLine: 8.5, note: 'NO PLAY' },
    { teams: 'Athletics @ Twins', prediction: 'Under 8.35', marketLine: 8.5, note: 'SLIGHT Under' },
    { teams: 'Dodgers @ Rockies', prediction: 'Over 9.48', marketLine: 12.0, note: 'NO PLAY' },
    { teams: 'Reds @ Angels', prediction: 'Under 7.67', marketLine: 8.5, note: 'NO PLAY' },
    { teams: 'Guardians @ Diamondbacks', prediction: 'Over 8.51', marketLine: 8.5, note: 'NO PLAY' },
    { teams: 'Giants @ Padres', prediction: 'Under 6.8', marketLine: 8.0, note: 'NO PLAY' }
  ];

  const v5Predictions = [
    { teams: 'Brewers @ Cubs', prediction: 'Under 7.5', marketLine: 6.5, note: 'STRONG Under' },
    { teams: 'Astros @ Tigers', prediction: 'Under 7.5', marketLine: 7.0, note: 'MODERATE Under' },
    { teams: 'Jays @ Pirates', prediction: 'Under 8.16', marketLine: 7.5, note: 'NO PLAY (HIGH risk)' },
    { teams: 'Cardinals @ Marlins', prediction: 'Under 7.77', marketLine: 7.5, note: 'MODERATE Under' },
    { teams: 'Mets @ Nationals', prediction: 'Under 7.9', marketLine: 9.0, note: 'MODERATE Under' },
    { teams: 'Mariners @ Phillies', prediction: 'Under 8.3', marketLine: 8.0, note: 'NO PLAY (HIGH risk)' },
    { teams: 'Orioles @ Sox', prediction: 'Under 8.3', marketLine: 9.0, note: 'NO PLAY' },
    { teams: 'White Sox @ Braves', prediction: 'Over 8.97', marketLine: 8.5, note: 'NO PLAY (HIGH risk)' },
    { teams: 'Yankees @ Rays', prediction: 'Under 8.05', marketLine: 8.5, note: 'NO PLAY (EXTREME)' },
    { teams: 'Rangers @ Royals', prediction: 'Under 8.05', marketLine: 8.5, note: 'NO PLAY (HIGH risk)' },
    { teams: 'Athletics @ Twins', prediction: 'Under 7.5', marketLine: 8.5, note: 'STRONG Under' },
    { teams: 'Dodgers @ Rockies', prediction: 'Over 10.49', marketLine: 12.0, note: 'NO PLAY (EXTREME)' },
    { teams: 'Reds @ Angels', prediction: 'Under 7.74', marketLine: 8.5, note: 'MODERATE Under' },
    { teams: 'Guardians @ Diamondbacks', prediction: 'Under 8.46', marketLine: 8.5, note: 'NO PLAY (HIGH risk)' },
    { teams: 'Giants @ Padres', prediction: 'Under 7.5', marketLine: 8.0, note: 'STRONG Under' }
  ];

  console.log('\n📊 V4 MODEL PERFORMANCE vs ACTUAL RESULTS');
  console.log('==========================================');
  
  let v4Wins = 0, v4Losses = 0, v4Pushes = 0;
  let v4PlayableWins = 0, v4PlayableLosses = 0, v4PlayablePushes = 0;
  
  for (const pred of v4Predictions) {
    const actual = actualResults[pred.teams];
    if (actual !== undefined) {
      const predictedTotal = parseFloat(pred.prediction.split(' ')[1]);
      const direction = pred.prediction.split(' ')[0];
      const result = evaluatePrediction(actual, predictedTotal, direction);
      const marketResult = evaluateAgainstMarketLine(actual, pred.marketLine, pred.prediction);
      const error = Math.abs(actual - predictedTotal);
      
      if (result.includes('WIN')) v4Wins++;
      else if (result.includes('LOSS')) v4Losses++;
      else v4Pushes++;
      
      if (!pred.note.includes('NO PLAY')) {
        if (result.includes('WIN')) v4PlayableWins++;
        else if (result.includes('LOSS')) v4PlayableLosses++;
        else v4PlayablePushes++;
      }
      
      console.log(`${pred.teams}: ${pred.prediction} → Actual: ${actual} ${result} (Error: ${error.toFixed(1)}) | vs Market ${pred.marketLine}: ${marketResult} | ${pred.note}`);
    }
  }

  console.log('\n📊 V5 MODEL PERFORMANCE vs ACTUAL RESULTS');
  console.log('==========================================');
  
  let v5Wins = 0, v5Losses = 0, v5Pushes = 0;
  let v5PlayableWins = 0, v5PlayableLosses = 0, v5PlayablePushes = 0;
  
  for (const pred of v5Predictions) {
    const actual = actualResults[pred.teams];
    if (actual !== undefined) {
      const predictedTotal = parseFloat(pred.prediction.split(' ')[1]);
      const direction = pred.prediction.split(' ')[0];
      const result = evaluatePrediction(actual, predictedTotal, direction);
      const marketResult = evaluateAgainstMarketLine(actual, pred.marketLine, pred.prediction);
      const error = Math.abs(actual - predictedTotal);
      
      if (result.includes('WIN')) v5Wins++;
      else if (result.includes('LOSS')) v5Losses++;
      else v5Pushes++;
      
      if (!pred.note.includes('NO PLAY')) {
        if (result.includes('WIN')) v5PlayableWins++;
        else if (result.includes('LOSS')) v5PlayableLosses++;
        else v5PlayablePushes++;
      }
      
      console.log(`${pred.teams}: ${pred.prediction} → Actual: ${actual} ${result} (Error: ${error.toFixed(1)}) | vs Market ${pred.marketLine}: ${marketResult} | ${pred.note}`);
    }
  }

  console.log('\n📈 PERFORMANCE SUMMARY');
  console.log('======================');
  console.log(`V4 MODEL:`);
  console.log(`  Overall: ${v4Wins}-${v4Losses}-${v4Pushes} (${((v4Wins / (v4Wins + v4Losses)) * 100).toFixed(1)}%)`);
  console.log(`  Playable: ${v4PlayableWins}-${v4PlayableLosses}-${v4PlayablePushes} (${v4PlayableWins + v4PlayableLosses > 0 ? ((v4PlayableWins / (v4PlayableWins + v4PlayableLosses)) * 100).toFixed(1) : 0}%)`);
  
  console.log(`V5 MODEL:`);
  console.log(`  Overall: ${v5Wins}-${v5Losses}-${v5Pushes} (${((v5Wins / (v5Wins + v5Losses)) * 100).toFixed(1)}%)`);
  console.log(`  Playable: ${v5PlayableWins}-${v5PlayableLosses}-${v5PlayablePushes} (${v5PlayableWins + v5PlayableLosses > 0 ? ((v5PlayableWins / (v5PlayableWins + v5PlayableLosses)) * 100).toFixed(1) : 0}%)`);
}

main().catch(console.error);