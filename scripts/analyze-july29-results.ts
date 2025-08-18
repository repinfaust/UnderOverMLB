#!/usr/bin/env node

/**
 * Analyze July 29th Results
 * 
 * Fetch actual July 29th results and analyze what happened
 * vs general expectations (not specific predictions since we didn't make them beforehand)
 */

import axios from 'axios';

interface GameResult {
  game: string;
  actualTotal: number;
  actualResult: 'Over' | 'Under';
  homeScore: number;
  awayScore: number;
  venue: string;
}

/**
 * Fetch actual game results for July 29th
 */
async function fetchJuly29Results(): Promise<GameResult[]> {
  try {
    console.log('📅 Fetching actual results for July 30th, 2025...');
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2025-07-30&hydrate=linescore`,
      { timeout: 10000 }
    );

    if (!response.data.dates || response.data.dates.length === 0) {
      return [];
    }

    const games = response.data.dates[0]?.games || [];
    
    return games
      .filter((game: any) => 
        game.status.abstractGameState === 'Final' &&
        game.teams?.home?.score !== undefined &&
        game.teams?.away?.score !== undefined
      )
      .map((game: any) => ({
        game: `${game.teams.away.team.name} @ ${game.teams.home.team.name}`,
        actualTotal: game.teams.home.score + game.teams.away.score,
        actualResult: (game.teams.home.score + game.teams.away.score) > 8.5 ? 'Over' : 'Under',
        homeScore: game.teams.home.score,
        awayScore: game.teams.away.score,
        venue: game.venue.name
      }));

  } catch (error) {
    console.error(`❌ Failed to fetch results for July 29th:`, error);
    return [];
  }
}

async function analyzeLastNightResults(): Promise<void> {
  console.log('📊 JULY 30TH RESULTS ANALYSIS');
  console.log('==============================');
  console.log('Analyzing what actually happened last night...\n');

  const results = await fetchJuly29Results();
  
  if (results.length === 0) {
    console.log('❌ No completed games found for July 30th');
    return;
  }

  console.log(`📈 Found ${results.length} completed games from July 30th\n`);

  // Display all results
  results.forEach((result, index) => {
    const resultIcon = result.actualResult === 'Over' ? '📈' : '📉';
    console.log(`${index + 1}. ${resultIcon} ${result.game}`);
    console.log(`   Score: ${result.awayScore}-${result.homeScore} = ${result.actualTotal} runs (${result.actualResult})`);
    console.log(`   Venue: ${result.venue}\n`);
  });

  // Calculate summary statistics
  const overGames = results.filter(r => r.actualResult === 'Over').length;
  const underGames = results.filter(r => r.actualResult === 'Under').length;
  const overPercentage = (overGames / results.length) * 100;
  
  const avgTotal = results.reduce((sum, r) => sum + r.actualTotal, 0) / results.length;
  const highestScoring = results.reduce((max, r) => r.actualTotal > max.actualTotal ? r : max);
  const lowestScoring = results.reduce((min, r) => r.actualTotal < min.actualTotal ? r : min);

  console.log('📊 SUMMARY STATISTICS');
  console.log('=====================');
  console.log(`📈 Over Results: ${overGames}/${results.length} (${overPercentage.toFixed(1)}%)`);
  console.log(`📉 Under Results: ${underGames}/${results.length} (${(100-overPercentage).toFixed(1)}%)`);
  console.log(`📏 Average Total: ${avgTotal.toFixed(1)} runs`);
  console.log(`🎯 MLB Expected: ~8.8 runs (July baseline)`);
  console.log(`📐 Difference: ${(avgTotal - 8.8).toFixed(1)} runs ${avgTotal > 8.8 ? 'above' : 'below'} expected\n`);

  console.log('🏆 EXTREME GAMES');
  console.log('================');
  console.log(`🔥 Highest Scoring: ${highestScoring.game} - ${highestScoring.actualTotal} runs`);
  console.log(`❄️ Lowest Scoring: ${lowestScoring.game} - ${lowestScoring.actualTotal} runs\n`);

  // Analyze by scoring ranges
  const highScoring = results.filter(r => r.actualTotal >= 12).length;
  const lowScoring = results.filter(r => r.actualTotal <= 6).length;
  const normalScoring = results.filter(r => r.actualTotal >= 7 && r.actualTotal <= 11).length;

  console.log('📊 SCORING DISTRIBUTION');
  console.log('=======================');
  console.log(`🔥 High Scoring (12+ runs): ${highScoring}/${results.length} games (${(highScoring/results.length*100).toFixed(1)}%)`);
  console.log(`📊 Normal Scoring (7-11 runs): ${normalScoring}/${results.length} games (${(normalScoring/results.length*100).toFixed(1)}%)`);
  console.log(`❄️ Low Scoring (≤6 runs): ${lowScoring}/${results.length} games (${(lowScoring/results.length*100).toFixed(1)}%)\n`);

  // Show all high-scoring games
  if (highScoring > 0) {
    console.log('🔥 HIGH-SCORING GAMES (12+ runs)');
    console.log('=================================');
    results
      .filter(r => r.actualTotal >= 12)
      .sort((a, b) => b.actualTotal - a.actualTotal)
      .forEach(r => {
        console.log(`   ${r.game}: ${r.actualTotal} runs (${r.awayScore}-${r.homeScore})`);
      });
    console.log('');
  }

  // Show all low-scoring games
  if (lowScoring > 0) {
    console.log('❄️ LOW-SCORING GAMES (≤6 runs)');
    console.log('===============================');
    results
      .filter(r => r.actualTotal <= 6)
      .sort((a, b) => a.actualTotal - b.actualTotal)
      .forEach(r => {
        console.log(`   ${r.game}: ${r.actualTotal} runs (${r.awayScore}-${r.homeScore})`);
      });
    console.log('');
  }

  // Venue analysis for notable parks
  const pitcherFriendlyParks = ['Oracle Park', 'Petco Park', 'Marlins Park', 'Tropicana Field'];
  const hitterFriendlyParks = ['Yankee Stadium', 'Fenway Park', 'Coors Field', 'Globe Life Field'];
  
  console.log('🏟️ NOTABLE VENUE RESULTS');
  console.log('=========================');
  
  pitcherFriendlyParks.forEach(park => {
    const parkGames = results.filter(r => r.venue.includes(park.split(' ')[0]));
    if (parkGames.length > 0) {
      parkGames.forEach(game => {
        console.log(`📉 ${park}: ${game.game} - ${game.actualTotal} runs (${game.actualResult})`);
      });
    }
  });

  hitterFriendlyParks.forEach(park => {
    const parkGames = results.filter(r => r.venue.includes(park.split(' ')[0]));
    if (parkGames.length > 0) {
      parkGames.forEach(game => {
        console.log(`📈 ${park}: ${game.game} - ${game.actualTotal} runs (${game.actualResult})`);
      });
    }
  });

  console.log('\n💡 ANALYSIS INSIGHTS');
  console.log('====================');
  
  if (overPercentage >= 60) {
    console.log('🔥 HIGH-SCORING NIGHT: Significantly more Overs than expected');
    console.log('   Possible factors: Hot weather, offensive explosions, poor pitching');
  } else if (overPercentage <= 40) {
    console.log('❄️ LOW-SCORING NIGHT: Significantly more Unders than expected');
    console.log('   Possible factors: Good pitching, cool weather, defensive games');
  } else {
    console.log('📊 BALANCED NIGHT: Normal distribution of scoring');
  }

  if (avgTotal >= 10.0) {
    console.log('🎯 OFFENSIVE EXPLOSION: Average scoring well above normal');
  } else if (avgTotal <= 7.5) {
    console.log('🛡️ PITCHERS DOMINATED: Average scoring well below normal');
  } else {
    console.log('📏 NORMAL SCORING: Average runs within expected range');
  }

  if (highScoring >= 3) {
    console.log('💥 MULTIPLE BLOWOUTS: Several games had explosive scoring');
  }

  if (lowScoring >= 3) {
    console.log('🎯 PITCHERS DUELS: Several low-scoring defensive battles');
  }

  console.log(`\n📋 Summary: ${results.length} games averaged ${avgTotal.toFixed(1)} runs with ${overPercentage.toFixed(1)}% Overs`);
}

// Run the analysis
analyzeLastNightResults().catch(console.error);