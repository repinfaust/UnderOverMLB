#!/usr/bin/env node

/**
 * Check August 1st Results vs Our Predictions
 * 
 * Compare our August 1st predictions against actual results
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

// Our predictions from August 1st
const ourPredictions = [
  {
    game: 'Atlanta Braves @ Cincinnati Reds',
    sportsBookLine: 9.5,
    ourPrediction: 'Over' as const,
    ourTotal: 9.3,
    ourConfidence: 77,
    edge: -0.2,
    recommendation: 'PASS (0.2 run edge)'
  },
  {
    game: 'Baltimore Orioles @ Chicago Cubs',
    sportsBookLine: 7.5,
    ourPrediction: 'Over' as const,
    ourTotal: 8.6,
    ourConfidence: 75,
    edge: 1.1,
    recommendation: 'STRONG Over (1.1 run edge)'
  },
  {
    game: 'Detroit Tigers @ Philadelphia Phillies',
    sportsBookLine: 7.5,
    ourPrediction: 'Over' as const,
    ourTotal: 8.7,
    ourConfidence: 75,
    edge: 1.2,
    recommendation: 'STRONG Over (1.2 run edge)'
  },
  {
    game: 'Milwaukee Brewers @ Washington Nationals',
    sportsBookLine: 8.5,
    ourPrediction: 'Under' as const,
    ourTotal: 8.5,
    ourConfidence: 75,
    edge: 0.0,
    recommendation: 'PASS (0.0 run edge)'
  },
  {
    game: 'Kansas City Royals @ Toronto Blue Jays',
    sportsBookLine: 8.0,
    ourPrediction: 'Over' as const,
    ourTotal: 8.9,
    ourConfidence: 67,
    edge: 0.9,
    recommendation: 'PASS (0.9 run edge)'
  },
  {
    game: 'Minnesota Twins @ Cleveland Guardians',
    sportsBookLine: 7.0,
    ourPrediction: 'Over' as const,
    ourTotal: 8.9,
    ourConfidence: 75,
    edge: 1.9,
    recommendation: 'STRONG Over (1.9 run edge)'
  },
  {
    game: 'Houston Astros @ Boston Red Sox',
    sportsBookLine: 8.0,
    ourPrediction: 'Over' as const,
    ourTotal: 9.1,
    ourConfidence: 75,
    edge: 1.1,
    recommendation: 'STRONG Over (1.1 run edge)'
  },
  {
    game: 'New York Yankees @ Miami Marlins',
    sportsBookLine: 7.5,
    ourPrediction: 'Under' as const,
    ourTotal: 8.4,
    ourConfidence: 77,
    edge: 0.9,
    recommendation: 'LEAN Over (0.9 run edge)'
  },
  {
    game: 'San Francisco Giants @ New York Mets',
    sportsBookLine: 7.5,
    ourPrediction: 'Over' as const,
    ourTotal: 8.8,
    ourConfidence: 75,
    edge: 1.3,
    recommendation: 'STRONG Over (1.3 run edge)'
  },
  {
    game: 'Los Angeles Dodgers @ Tampa Bay Rays',
    sportsBookLine: 9.0,
    ourPrediction: 'Over' as const,
    ourTotal: 9.4,
    ourConfidence: 77,
    edge: 0.4,
    recommendation: 'PASS (0.4 run edge)'
  },
  {
    game: 'Pittsburgh Pirates @ Colorado Rockies',
    sportsBookLine: 11.5,
    ourPrediction: 'Over' as const, // Note: We predicted Under, but based on our total of 8.8 vs line 11.5
    ourTotal: 8.8,
    ourConfidence: 75,
    edge: -2.7,
    recommendation: 'STRONG Under (2.7 run edge)'
  },
  {
    game: 'Chicago White Sox @ Los Angeles Angels',
    sportsBookLine: 9.5,
    ourPrediction: 'Under' as const,
    ourTotal: 8.4,
    ourConfidence: 75,
    edge: -1.1,
    recommendation: 'STRONG Under (1.1 run edge)'
  },
  {
    game: 'St. Louis Cardinals @ San Diego Padres',
    sportsBookLine: 7.5,
    ourPrediction: 'Over' as const,
    ourTotal: 8.8,
    ourConfidence: 75,
    edge: 1.3,
    recommendation: 'STRONG Over (1.3 run edge)'
  },
  {
    game: 'Arizona Diamondbacks @ Oakland Athletics',
    sportsBookLine: 9.5,
    ourPrediction: 'Under' as const,
    ourTotal: 8.4,
    ourConfidence: 75,
    edge: -1.1,
    recommendation: 'STRONG Under (1.1 run edge)'
  },
  {
    game: 'Texas Rangers @ Seattle Mariners',
    sportsBookLine: 7.5,
    ourPrediction: 'Over' as const,
    ourTotal: 9.4,
    ourConfidence: 77,
    edge: 1.9,
    recommendation: 'STRONG Over (1.9 run edge)'
  }
];

/**
 * Fetch actual game results for August 1st
 */
async function fetchAugust1Results(): Promise<any[]> {
  try {
    console.log('📅 Fetching actual results for August 1st, 2025...');
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2025-08-01&hydrate=linescore`,
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
    console.error(`❌ Failed to fetch results for August 1st:`, error);
    return [];
  }
}

/**
 * Match our predictions with actual results
 */
function matchPredictionsWithResults(actualGames: any[]): GameResult[] {
  const results: GameResult[] = [];

  ourPredictions.forEach(prediction => {
    // Find matching actual game - more flexible matching
    const actualGame = actualGames.find(ag => {
      const predictionLower = prediction.game.toLowerCase();
      const actualLower = ag.game.toLowerCase();
      
      // Extract team names and match
      if ((predictionLower.includes('braves') && actualLower.includes('braves')) ||
          (predictionLower.includes('orioles') && actualLower.includes('orioles')) ||
          (predictionLower.includes('tigers') && actualLower.includes('tigers')) ||
          (predictionLower.includes('brewers') && actualLower.includes('brewers')) ||
          (predictionLower.includes('royals') && actualLower.includes('royals')) ||
          (predictionLower.includes('twins') && actualLower.includes('twins')) ||
          (predictionLower.includes('astros') && actualLower.includes('astros')) ||
          (predictionLower.includes('yankees') && actualLower.includes('yankees')) ||
          (predictionLower.includes('giants') && actualLower.includes('giants')) ||
          (predictionLower.includes('dodgers') && actualLower.includes('dodgers')) ||
          (predictionLower.includes('pirates') && actualLower.includes('pirates')) ||
          (predictionLower.includes('white sox') && actualLower.includes('white sox')) ||
          (predictionLower.includes('cardinals') && actualLower.includes('cardinals')) ||
          (predictionLower.includes('diamondbacks') && actualLower.includes('diamondbacks')) ||
          (predictionLower.includes('rangers') && actualLower.includes('rangers'))) {
        return true;
      }
      return false;
    });

    if (actualGame) {
      // Determine actual result vs sportsbook line
      const actualResult = actualGame.actualTotal > prediction.sportsBookLine ? 'Over' : 
                          actualGame.actualTotal < prediction.sportsBookLine ? 'Under' : 'Push';
      
      // For Pirates game, we predicted Under but our format shows Over - fix this
      let ourActualPrediction = prediction.ourPrediction;
      if (prediction.game.includes('Pirates') && prediction.recommendation.includes('Under')) {
        ourActualPrediction = 'Under';
      }
      
      // Check if our prediction was correct
      const correct = ourActualPrediction === actualResult;
      
      // Determine betting result
      const lineResult = actualResult === 'Push' ? 'Push' : 
                        (correct ? 'Win' : 'Loss');

      results.push({
        game: prediction.game,
        actualScore: actualGame.actualScore,
        actualTotal: actualGame.actualTotal,
        sportsBookLine: prediction.sportsBookLine,
        actualResult,
        ourPrediction: ourActualPrediction,
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
async function analyzeAugust1Results(): Promise<void> {
  console.log('🎯 AUGUST 1ST RESULTS vs OUR PREDICTIONS');
  console.log('=========================================');
  console.log('Checking our predictions against actual betting lines and results\n');

  // Get actual results
  const actualGames = await fetchAugust1Results();
  
  if (actualGames.length === 0) {
    console.log('❌ No completed games found for August 1st');
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
    const betPlacedIcon = result.game.includes('Pirates') ? '💰' : '';
    
    console.log(`${index + 1}. ${resultIcon}${pushIcon}${betPlacedIcon} ${result.game}`);
    console.log(`   📊 Actual Score: ${result.actualScore} = ${result.actualTotal} runs`);
    console.log(`   🎯 Sportsbook Line: Over/Under ${result.sportsBookLine}`);
    console.log(`   📈 Actual Result: ${result.actualResult}`);
    console.log(`   🎯 Our Prediction: ${result.ourPrediction} ${result.ourTotal.toFixed(1)} (${result.ourConfidence}% confidence)`);
    console.log(`   📊 Edge: ${result.edge >= 0 ? '+' : ''}${result.edge.toFixed(1)} runs`);
    console.log(`   💡 Recommendation: ${result.recommendation}`);
    console.log(`   💰 Betting Result: ${result.lineResult}`);
    if (result.game.includes('Pirates')) {
      console.log(`   🎲 YOUR BET: £24.82 on Under 11.5 - ${result.lineResult === 'Win' ? 'WON £23.58!' : 'LOST'}`);
    }
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
    
    console.log('\n💪 STRONG RECOMMENDATIONS BREAKDOWN:');
    strongRecs.forEach(rec => {
      const icon = rec.lineResult === 'Win' ? '✅' : rec.lineResult === 'Loss' ? '❌' : '🔄';
      console.log(`   ${icon} ${rec.game}: ${rec.recommendation} - ${rec.lineResult}`);
    });
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

  // YOUR BET ANALYSIS
  const piratesResult = results.find(r => r.game.includes('Pirates'));
  if (piratesResult) {
    console.log('\n🎲 YOUR PIRATES BET ANALYSIS');
    console.log('=============================');
    console.log(`💰 Bet: £24.82 on Under 11.5`);
    console.log(`📊 Actual Total: ${piratesResult.actualTotal} runs`);
    console.log(`🎯 Result: ${piratesResult.lineResult}`);
    if (piratesResult.lineResult === 'Win') {
      console.log(`🟢 Profit: £23.58 (95% return)`);
      console.log(`📈 Model Edge: Our +2.7 edge was correct!`);
    } else {
      console.log(`🔴 Loss: -£24.82`);
      console.log(`📉 Model Miss: Despite +2.7 edge prediction`);
    }
  }

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
analyzeAugust1Results().catch(console.error);