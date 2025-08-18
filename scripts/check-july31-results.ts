#!/usr/bin/env node

/**
 * Check July 31st Results vs Our Predictions
 * 
 * Compare our predictions from today's script against actual results
 * to measure real accuracy with actual betting lines
 */

import axios from 'axios';

interface GameResult {
  game: string;
  actualScore: string;
  actualTotal: number;
  sportsBookLine: number;
  actualResult: 'Over' | 'Under' | 'Push';
  ourPrediction: 'Over' | 'Under';
  ourTotal: number;
  ourConfidence: number;
  edge: number;
  recommendation: string;
  correct: boolean;
  lineResult: 'Win' | 'Loss' | 'Push';
}

// Our predictions from the earlier script
const ourPredictions = [
  {
    game: 'Tampa Bay Rays @ New York Yankees',
    sportsBookLine: 8.5,
    ourPrediction: 'Over' as const,
    ourTotal: 9.8,
    ourConfidence: 80,
    edge: 1.3,
    recommendation: 'STRONG Over (1.3 run edge)'
  },
  {
    game: 'Atlanta Braves @ Cincinnati Reds',
    sportsBookLine: 9.5,
    ourPrediction: 'Over' as const,
    ourTotal: 9.4,
    ourConfidence: 77,
    edge: -0.1,
    recommendation: 'PASS (0.1 run edge)'
  },
  {
    game: 'Texas Rangers @ Seattle Mariners',
    sportsBookLine: 7.5,
    ourPrediction: 'Over' as const,
    ourTotal: 9.3,
    ourConfidence: 77,
    edge: 1.8,
    recommendation: 'STRONG Over (1.8 run edge)'
  }
];

/**
 * Fetch actual game results for July 31st
 */
async function fetchJuly31Results(): Promise<any[]> {
  try {
    console.log('📅 Fetching actual results for July 31st, 2025...');
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2025-07-31&hydrate=linescore`,
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
        actualScore: `${game.teams.away.score}-${game.teams.home.score}`,
        actualTotal: game.teams.home.score + game.teams.away.score,
        homeTeam: game.teams.home.team.name,
        awayTeam: game.teams.away.team.name
      }));

  } catch (error) {
    console.error(`❌ Failed to fetch results for July 31st:`, error);
    return [];
  }
}

/**
 * Match our predictions with actual results
 */
function matchPredictionsWithResults(actualGames: any[]): GameResult[] {
  const results: GameResult[] = [];

  ourPredictions.forEach(prediction => {
    // Find matching actual game
    const actualGame = actualGames.find(ag => {
      const predictionTeams = prediction.game.toLowerCase();
      const actualGameStr = ag.game.toLowerCase();
      
      // Match by team names (flexible matching)
      return (predictionTeams.includes('yankees') && actualGameStr.includes('yankees')) ||
             (predictionTeams.includes('reds') && actualGameStr.includes('reds')) ||
             (predictionTeams.includes('mariners') && actualGameStr.includes('mariners'));
    });

    if (actualGame) {
      // Determine actual result vs sportsbook line
      const actualResult = actualGame.actualTotal > prediction.sportsBookLine ? 'Over' : 
                          actualGame.actualTotal < prediction.sportsBookLine ? 'Under' : 'Push';
      
      // Check if our prediction was correct
      const correct = prediction.ourPrediction === actualResult;
      
      // Determine betting result
      const lineResult = actualResult === 'Push' ? 'Push' : 
                        (correct ? 'Win' : 'Loss');

      results.push({
        game: prediction.game,
        actualScore: actualGame.actualScore,
        actualTotal: actualGame.actualTotal,
        sportsBookLine: prediction.sportsBookLine,
        actualResult,
        ourPrediction: prediction.ourPrediction,
        ourTotal: prediction.ourTotal,
        ourConfidence: prediction.ourConfidence,
        edge: prediction.edge,
        recommendation: prediction.recommendation,
        correct,
        lineResult
      });
    }
  });

  return results;
}

/**
 * Main analysis function
 */
async function analyzeJuly31Results(): Promise<void> {
  console.log('🎯 JULY 31ST RESULTS vs OUR PREDICTIONS');
  console.log('========================================');
  console.log('Checking our predictions against actual betting lines and results\n');

  // Get actual results
  const actualGames = await fetchJuly31Results();
  
  if (actualGames.length === 0) {
    console.log('❌ No completed games found for July 31st');
    return;
  }

  console.log(`📊 Found ${actualGames.length} completed games\n`);

  // Match predictions with results
  const results = matchPredictionsWithResults(actualGames);
  
  if (results.length === 0) {
    console.log('❌ Could not match any predictions with actual results');
    return;
  }

  // Display game-by-game results
  console.log('🎯 GAME-BY-GAME ANALYSIS');
  console.log('=========================');

  results.forEach((result, index) => {
    const resultIcon = result.correct ? '✅' : '❌';
    const pushIcon = result.actualResult === 'Push' ? '🔄' : '';
    
    console.log(`${index + 1}. ${resultIcon}${pushIcon} ${result.game}`);
    console.log(`   📊 Actual Score: ${result.actualScore} = ${result.actualTotal} runs`);
    console.log(`   🎯 Sportsbook Line: Over/Under ${result.sportsBookLine}`);
    console.log(`   📈 Actual Result: ${result.actualResult}`);
    console.log(`   🎯 Our Prediction: ${result.ourPrediction} ${result.ourTotal.toFixed(1)} (${result.ourConfidence}% confidence)`);
    console.log(`   📊 Edge: ${result.edge >= 0 ? '+' : ''}${result.edge.toFixed(1)} runs`);
    console.log(`   💡 Recommendation: ${result.recommendation}`);
    console.log(`   💰 Betting Result: ${result.lineResult}`);
    console.log('');
  });

  // Calculate performance metrics
  const totalGames = results.length;
  const correctPredictions = results.filter(r => r.correct).length;
  const wins = results.filter(r => r.lineResult === 'Win').length;
  const losses = results.filter(r => r.lineResult === 'Loss').length;
  const pushes = results.filter(r => r.lineResult === 'Push').length;
  const accuracy = (correctPredictions / totalGames) * 100;

  console.log('📊 PERFORMANCE SUMMARY');
  console.log('======================');
  console.log(`🎯 Games Analyzed: ${totalGames}`);
  console.log(`✅ Correct Predictions: ${correctPredictions}`);
  console.log(`📈 Accuracy: ${correctPredictions}/${totalGames} = ${accuracy.toFixed(1)}%`);
  console.log(`🎲 vs Random (50%): ${(accuracy - 50).toFixed(1)} percentage points`);

  console.log('\n💰 BETTING RESULTS');
  console.log('==================');
  console.log(`🏆 Wins: ${wins}`);
  console.log(`❌ Losses: ${losses}`);
  console.log(`🔄 Pushes: ${pushes}`);
  
  if (wins + losses > 0) {
    const winRate = (wins / (wins + losses)) * 100;
    console.log(`📊 Win Rate: ${wins}/${wins + losses} = ${winRate.toFixed(1)}%`);
    console.log(`💰 Break-Even Needed: 52.4% (at -110 odds)`);
    
    if (winRate >= 52.4) {
      const roi = ((winRate / 100) * 1.91 - 1) * 100; // Assuming -110 odds
      console.log(`🟢 PROFITABLE: +${roi.toFixed(1)}% ROI`);
    } else {
      const roi = ((winRate / 100) * 1.91 - 1) * 100;
      console.log(`🔴 UNPROFITABLE: ${roi.toFixed(1)}% ROI`);
    }
  }

  // Analyze strong recommendations
  const strongRecs = results.filter(r => r.recommendation.includes('STRONG'));
  const strongWins = strongRecs.filter(r => r.lineResult === 'Win').length;
  
  if (strongRecs.length > 0) {
    console.log('\n🔥 STRONG RECOMMENDATION ANALYSIS');
    console.log('==================================');
    console.log(`💪 Strong Plays: ${strongRecs.length}`);
    console.log(`🏆 Strong Wins: ${strongWins}`);
    console.log(`📊 Strong Win Rate: ${strongWins}/${strongRecs.length} = ${(strongWins/strongRecs.length*100).toFixed(1)}%`);
  }

  // Show prediction errors
  const avgTotalError = results.reduce((sum, r) => sum + Math.abs(r.actualTotal - r.ourTotal), 0) / results.length;
  const avgSportsbookLine = results.reduce((sum, r) => sum + r.sportsBookLine, 0) / results.length;
  const avgActualTotal = results.reduce((sum, r) => sum + r.actualTotal, 0) / results.length;
  const avgOurTotal = results.reduce((sum, r) => sum + r.ourTotal, 0) / results.length;

  console.log('\n📏 TOTAL RUN ANALYSIS');
  console.log('=====================');
  console.log(`🎯 Avg Sportsbook Line: ${avgSportsbookLine.toFixed(1)} runs`);
  console.log(`📊 Avg Actual Total: ${avgActualTotal.toFixed(1)} runs`);
  console.log(`🎯 Avg Our Prediction: ${avgOurTotal.toFixed(1)} runs`);
  console.log(`📐 Avg Prediction Error: ${avgTotalError.toFixed(1)} runs`);

  // Final assessment
  console.log('\n🏆 FINAL ASSESSMENT');
  console.log('===================');
  
  if (accuracy >= 70) {
    console.log('🌟 EXCELLENT: Model showing strong predictive edge');
  } else if (accuracy >= 60) {
    console.log('✅ GOOD: Model demonstrating solid accuracy');
  } else if (accuracy >= 50) {
    console.log('📈 ACCEPTABLE: Model showing slight edge');
  } else {
    console.log('❌ POOR: Model underperforming random chance');
  }

  if (wins > losses) {
    console.log('💰 PROFITABLE: Betting recommendations showing positive results');
  } else if (wins === losses) {
    console.log('⚖️ BREAK-EVEN: Neutral betting performance');
  } else {
    console.log('📉 UNPROFITABLE: Betting recommendations need improvement');
  }

  console.log(`\n💾 Analysis completed on ${results.length} games with actual betting lines`);
}

// Run the analysis
analyzeJuly31Results().catch(console.error);