#!/usr/bin/env node

/**
 * Check August 2nd Results vs Our ADJUSTED MODEL Predictions
 * 
 * Compare our August 2nd predictions (with model adjustments) against actual results
 * to measure if our fixes improved accuracy
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

// Our ADJUSTED MODEL predictions from August 2nd
const ourPredictions = [
  {
    game: 'Los Angeles Dodgers @ Tampa Bay Rays',
    sportsBookLine: 8.5,
    ourPrediction: 'Over' as const,
    ourTotal: 8.5,
    ourConfidence: 75,
    edge: 0.0,
    recommendation: 'PASS (0.0 run edge)'
  },
  {
    game: 'Baltimore Orioles @ Chicago Cubs',
    sportsBookLine: 8.5,
    ourPrediction: 'Under' as const,
    ourTotal: 8.0,
    ourConfidence: 75,
    edge: -0.5,
    recommendation: 'PASS (0.5 run edge)'
  },
  {
    game: 'Kansas City Royals @ Toronto Blue Jays',
    sportsBookLine: 8.0,
    ourPrediction: 'Over' as const,
    ourTotal: 8.4,
    ourConfidence: 75,
    edge: 0.4,
    recommendation: 'PASS (0.4 run edge)'
  },
  {
    game: 'Pittsburgh Pirates @ Colorado Rockies',
    sportsBookLine: 10.0,
    ourPrediction: 'Under' as const,
    ourTotal: 8.0,
    ourConfidence: 75,
    edge: -2.0,
    recommendation: 'STRONG Under (2.0 run edge)'
  },
  {
    game: 'Detroit Tigers @ Philadelphia Phillies',
    sportsBookLine: 7.0,
    ourPrediction: 'Over' as const,
    ourTotal: 8.0,
    ourConfidence: 75,
    edge: 1.0,
    recommendation: 'STRONG Over (1.0 run edge)'
  },
  {
    game: 'Milwaukee Brewers @ Washington Nationals',
    sportsBookLine: 8.5,
    ourPrediction: 'Under' as const,
    ourTotal: 7.9,
    ourConfidence: 75,
    edge: -0.6,
    recommendation: 'LEAN Under (0.6 run edge)'
  },
  {
    game: 'Houston Astros @ Boston Red Sox',
    sportsBookLine: 9.5,
    ourPrediction: 'Under' as const,
    ourTotal: 8.4,
    ourConfidence: 75,
    edge: -1.1,
    recommendation: 'STRONG Under (1.1 run edge)'
  },
  {
    game: 'Minnesota Twins @ Cleveland Guardians',
    sportsBookLine: 7.5,
    ourPrediction: 'Over' as const,
    ourTotal: 8.0,
    ourConfidence: 75,
    edge: 0.5,
    recommendation: 'LEAN Over (0.5 run edge)'
  },
  {
    game: 'New York Yankees @ Miami Marlins',
    sportsBookLine: 8.0,
    ourPrediction: 'Under' as const,
    ourTotal: 7.7,
    ourConfidence: 75,
    edge: -0.3,
    recommendation: 'PASS (0.3 run edge)'
  },
  {
    game: 'San Francisco Giants @ New York Mets',
    sportsBookLine: 8.5,
    ourPrediction: 'Under' as const,
    ourTotal: 8.0,
    ourConfidence: 75,
    edge: -0.5,
    recommendation: 'PASS (0.5 run edge)'
  },
  {
    game: 'Texas Rangers @ Seattle Mariners',
    sportsBookLine: 7.5,
    ourPrediction: 'Over' as const,
    ourTotal: 8.6,
    ourConfidence: 75,
    edge: 1.1,
    recommendation: 'STRONG Over (1.1 run edge)'
  },
  {
    game: 'Atlanta Braves @ Cincinnati Reds',
    sportsBookLine: 8.5,
    ourPrediction: 'Under' as const,
    ourTotal: 8.5,
    ourConfidence: 75,
    edge: 0.0,
    recommendation: 'PASS (0.0 run edge)'
  },
  {
    game: 'Arizona Diamondbacks @ Oakland Athletics',
    sportsBookLine: 10.0,
    ourPrediction: 'Under' as const,
    ourTotal: 7.6,
    ourConfidence: 75,
    edge: -2.4,
    recommendation: 'STRONG Under (2.4 run edge)'
  },
  {
    game: 'Chicago White Sox @ Los Angeles Angels',
    sportsBookLine: 9.5,
    ourPrediction: 'Under' as const,
    ourTotal: 7.5,
    ourConfidence: 80,
    edge: -2.0,
    recommendation: 'STRONG Under (2.0 run edge)'
  },
  {
    game: 'St. Louis Cardinals @ San Diego Padres',
    sportsBookLine: 8.5,
    ourPrediction: 'Under' as const,
    ourTotal: 8.0,
    ourConfidence: 75,
    edge: -0.5,
    recommendation: 'PASS (0.5 run edge)'
  }
];

/**
 * Fetch actual game results for August 2nd
 */
async function fetchAugust2Results(): Promise<any[]> {
  try {
    console.log('📅 Fetching actual results for August 2nd, 2025...');
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2025-08-02&hydrate=linescore`,
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
    console.error(`❌ Failed to fetch results for August 2nd:`, error);
    return [];
  }
}

/**
 * Match our predictions with actual results
 */
function matchPredictionsWithResults(actualGames: any[]): GameResult[] {
  const results: GameResult[] = [];

  ourPredictions.forEach(prediction => {
    // Find matching actual game - flexible matching
    const actualGame = actualGames.find(ag => {
      const predictionLower = prediction.game.toLowerCase();
      const actualLower = ag.game.toLowerCase();
      
      // Extract team names and match
      if ((predictionLower.includes('dodgers') && actualLower.includes('dodgers')) ||
          (predictionLower.includes('orioles') && actualLower.includes('orioles')) ||
          (predictionLower.includes('royals') && actualLower.includes('royals')) ||
          (predictionLower.includes('pirates') && actualLower.includes('pirates')) ||
          (predictionLower.includes('tigers') && actualLower.includes('tigers')) ||
          (predictionLower.includes('brewers') && actualLower.includes('brewers')) ||
          (predictionLower.includes('astros') && actualLower.includes('astros')) ||
          (predictionLower.includes('twins') && actualLower.includes('twins')) ||
          (predictionLower.includes('yankees') && actualLower.includes('yankees')) ||
          (predictionLower.includes('giants') && actualLower.includes('giants')) ||
          (predictionLower.includes('rangers') && actualLower.includes('rangers')) ||
          (predictionLower.includes('braves') && actualLower.includes('braves')) ||
          (predictionLower.includes('diamondbacks') && actualLower.includes('diamondbacks')) ||
          (predictionLower.includes('white sox') && actualLower.includes('white sox')) ||
          (predictionLower.includes('cardinals') && actualLower.includes('cardinals'))) {
        return true;
      }
      return false;
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
async function analyzeAugust2Results(): Promise<void> {
  console.log('🔧 AUGUST 2ND ADJUSTED MODEL RESULTS');
  console.log('====================================');
  console.log('Testing our FIXED model predictions vs actual results\n');

  // Get actual results
  const actualGames = await fetchAugust2Results();
  
  if (actualGames.length === 0) {
    console.log('❌ No completed games found for August 2nd');
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
  console.log('🎯 ADJUSTED MODEL PERFORMANCE');
  console.log('=============================');

  results.forEach((result, index) => {
    const resultIcon = result.correct ? '✅' : '❌';
    const pushIcon = result.actualResult === 'Push' ? '🔄' : '';
    const betPlacedIcon = result.game.includes('White Sox') ? '💰' : '';
    
    console.log(`${index + 1}. ${resultIcon}${pushIcon}${betPlacedIcon} ${result.game}`);
    console.log(`   📊 Actual Score: ${result.actualScore} = ${result.actualTotal} runs`);
    console.log(`   🎯 Sportsbook Line: Over/Under ${result.sportsBookLine}`);
    console.log(`   📈 Actual Result: ${result.actualResult}`);
    console.log(`   🎯 Our Prediction: ${result.ourPrediction} ${result.ourTotal.toFixed(1)} (${result.ourConfidence}% confidence)`);
    console.log(`   📊 Edge: ${result.edge >= 0 ? '+' : ''}${result.edge.toFixed(1)} runs`);
    console.log(`   💡 Recommendation: ${result.recommendation}`);
    console.log(`   💰 Betting Result: ${result.lineResult}`);
    if (result.game.includes('White Sox')) {
      console.log(`   🎲 YOUR BET: £10 on Under 9.5 - ${result.lineResult === 'Win' ? 'WON £9.50!' : 'LOST'}`);
    }
    console.log('');
  });

  // Calculate performance metrics vs August 1st
  const totalGames = results.length;
  const correctPredictions = results.filter(r => r.correct).length;
  const wins = results.filter(r => r.lineResult === 'Win').length;
  const losses = results.filter(r => r.lineResult === 'Loss').length;
  const pushes = results.filter(r => r.lineResult === 'Push').length;
  const accuracy = (correctPredictions / totalGames) * 100;

  console.log('📊 ADJUSTED MODEL PERFORMANCE');
  console.log('=============================');
  console.log(`🎯 Games Analyzed: ${totalGames}`);
  console.log(`✅ Correct Predictions: ${correctPredictions}`);
  console.log(`📈 Accuracy: ${correctPredictions}/${totalGames} = ${accuracy.toFixed(1)}%`);
  console.log(`🔄 vs August 1st: ${accuracy - 26.7 >= 0 ? '+' : ''}${(accuracy - 26.7).toFixed(1)} percentage points`);
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
    console.log(`🔄 vs August 1st Strong Rate: ${(strongWins/strongRecs.length*100) - 30.0 >= 0 ? '+' : ''}${((strongWins/strongRecs.length*100) - 30.0).toFixed(1)} points`);
    
    console.log('\n💪 STRONG RECOMMENDATIONS BREAKDOWN:');
    strongRecs.forEach(rec => {
      const icon = rec.lineResult === 'Win' ? '✅' : rec.lineResult === 'Loss' ? '❌' : '🔄';
      console.log(`   ${icon} ${rec.game}: ${rec.recommendation} - ${rec.lineResult}`);
    });
  }

  // Show prediction errors vs August 1st
  const avgTotalError = results.reduce((sum, r) => sum + Math.abs(r.actualTotal - r.ourTotal), 0) / results.length;
  const avgSportsbookLine = results.reduce((sum, r) => sum + r.sportsBookLine, 0) / results.length;
  const avgActualTotal = results.reduce((sum, r) => sum + r.actualTotal, 0) / results.length;
  const avgOurTotal = results.reduce((sum, r) => sum + r.ourTotal, 0) / results.length;

  console.log('\n📏 PREDICTION ACCURACY ANALYSIS');
  console.log('===============================');
  console.log(`🎯 Avg Sportsbook Line: ${avgSportsbookLine.toFixed(1)} runs`);
  console.log(`📊 Avg Actual Total: ${avgActualTotal.toFixed(1)} runs`);
  console.log(`🎯 Avg Our Prediction: ${avgOurTotal.toFixed(1)} runs`);
  console.log(`📐 Avg Prediction Error: ${avgTotalError.toFixed(1)} runs`);
  console.log(`🔄 vs August 1st Error: ${avgTotalError - 6.5 >= 0 ? '+' : ''}${(avgTotalError - 6.5).toFixed(1)} runs improvement`);

  // YOUR BET ANALYSIS
  const whiteSoxResult = results.find(r => r.game.includes('White Sox'));
  if (whiteSoxResult) {
    console.log('\n🎲 YOUR WHITE SOX BET ANALYSIS');
    console.log('==============================');
    console.log(`💰 Bet: £10 on Under 9.5`);
    console.log(`📊 Actual Total: ${whiteSoxResult.actualTotal} runs`);
    console.log(`🎯 Result: ${whiteSoxResult.lineResult}`);
    if (whiteSoxResult.lineResult === 'Win') {
      console.log(`🟢 Profit: £9.50 (95% return)`);
      console.log(`📈 Adjusted Model Success: 2.0 edge was correct!`);
    } else {
      console.log(`🔴 Loss: -£10.00`);
      console.log(`📉 Model Miss: Despite 2.0 edge prediction`);
    }
  }

  // Final assessment
  console.log('\n🏆 ADJUSTED MODEL ASSESSMENT');
  console.log('============================');
  
  if (accuracy >= 60) {
    console.log('🌟 EXCELLENT: Model adjustments highly successful');
  } else if (accuracy >= 50) {
    console.log('✅ GOOD: Model adjustments showing positive results');
  } else if (accuracy > 26.7) {
    console.log('📈 IMPROVED: Better than August 1st disaster');
  } else {
    console.log('❌ CONCERNING: Adjustments may need further refinement');
  }

  if (accuracy > 40) {
    console.log('✅ RECOMMENDATION: Continue using adjusted model');
  } else {
    console.log('⚠️ RECOMMENDATION: Consider further model refinements');
  }

  console.log(`\n💾 Analysis completed on ${results.length} games - Adjusted model vs actual results`);
}

// Run the analysis
analyzeAugust2Results().catch(console.error);