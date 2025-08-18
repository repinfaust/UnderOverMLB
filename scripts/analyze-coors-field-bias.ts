#!/usr/bin/env node

/**
 * Coors Field Specific Analysis
 * 
 * Analyze our model's systematic failure at Coors Field since the August 1st adjustment
 */

interface CoorsGame {
  date: string;
  teams: string;
  ourPrediction: number;
  actualTotal: number;
  sportsBookLine: number;
  ourRecommendation: string;
  actualResult: 'Over' | 'Under' | 'Push';
  correct: boolean;
  predictionError: number;
}

// Coors Field games since our model adjustments
const coorsFieldGames: CoorsGame[] = [
  {
    date: '2025-08-01',
    teams: 'Pirates @ Rockies', 
    ourPrediction: 8.8,
    actualTotal: 33,
    sportsBookLine: 11.5,
    ourRecommendation: 'STRONG Under (2.7 edge)',
    actualResult: 'Over',
    correct: false,
    predictionError: 24.2
  },
  {
    date: '2025-08-02',
    teams: 'Pirates @ Rockies',
    ourPrediction: 8.0,
    actualTotal: 13,
    sportsBookLine: 10.0,
    ourRecommendation: 'STRONG Under (2.0 edge)',
    actualResult: 'Over',
    correct: false,
    predictionError: 5.0
  },
  {
    date: '2025-08-03',
    teams: 'Pirates @ Rockies',
    ourPrediction: 8.0,
    actualTotal: 14,
    sportsBookLine: 11.5,
    ourRecommendation: 'STRONG Under (3.5 edge)',
    actualResult: 'Over',  
    correct: false,
    predictionError: 6.0
  }
];

function analyzeCoorsFieldBias(): void {
  console.log('🏔️ COORS FIELD SYSTEMATIC ANALYSIS');
  console.log('==================================');
  console.log('Analyzing our model\'s consistent failures at altitude\n');
  
  console.log('📊 GAME-BY-GAME COORS FIELD RESULTS');
  console.log('====================================');
  
  coorsFieldGames.forEach((game, index) => {
    console.log(`${index + 1}. ${game.date} - ${game.teams}`);
    console.log(`   🎯 Our Prediction: ${game.ourPrediction} runs`);
    console.log(`   📊 Actual Total: ${game.actualTotal} runs`);
    console.log(`   📈 Sportsbook Line: ${game.sportsBookLine} runs`);
    console.log(`   💡 Our Recommendation: ${game.ourRecommendation}`);
    console.log(`   📐 Prediction Error: ${game.predictionError.toFixed(1)} runs`);
    console.log(`   ❌ Result: WRONG (${game.actualResult})`);
    console.log('');
  });
  
  // Statistical Analysis
  const totalGames = coorsFieldGames.length;
  const avgOurPrediction = coorsFieldGames.reduce((sum, g) => sum + g.ourPrediction, 0) / totalGames;
  const avgActualTotal = coorsFieldGames.reduce((sum, g) => sum + g.actualTotal, 0) / totalGames;
  const avgSportsBookLine = coorsFieldGames.reduce((sum, g) => sum + g.sportsBookLine, 0) / totalGames;
  const avgError = coorsFieldGames.reduce((sum, g) => sum + g.predictionError, 0) / totalGames;
  
  console.log('📈 COORS FIELD STATISTICS');
  console.log('=========================');
  console.log(`🎯 Games Analyzed: ${totalGames}`);
  console.log(`✅ Correct Predictions: 0/${totalGames} (0.0%)`);
  console.log(`📊 Average Our Prediction: ${avgOurPrediction.toFixed(1)} runs`);
  console.log(`📊 Average Actual Total: ${avgActualTotal.toFixed(1)} runs`);
  console.log(`📊 Average Sportsbook Line: ${avgSportsBookLine.toFixed(1)} runs`);
  console.log(`📐 Average Prediction Error: ${avgError.toFixed(1)} runs`);
  
  // Bias Analysis
  const underBias = avgActualTotal - avgOurPrediction;
  const sportsBookAccuracy = avgActualTotal - avgSportsBookLine;
  
  console.log('\n🎯 BIAS ANALYSIS');
  console.log('================');
  console.log(`📉 Our Under Bias: ${underBias.toFixed(1)} runs (we predict too low)`);
  console.log(`📊 Sportsbook Accuracy: ${sportsBookAccuracy >= 0 ? '+' : ''}${sportsBookAccuracy.toFixed(1)} runs off actual`);
  console.log(`🔄 Sportsbooks vs Our Model: ${(avgSportsBookLine - avgOurPrediction).toFixed(1)} runs higher`);
  
  // Pattern Recognition
  console.log('\n🔍 PATTERN ANALYSIS');
  console.log('===================');
  
  const allStrongUnders = coorsFieldGames.every(g => g.ourRecommendation.includes('STRONG Under'));
  const allWrongDirection = coorsFieldGames.every(g => !g.correct);
  const increasingErrors = coorsFieldGames[2].predictionError < coorsFieldGames[0].predictionError;
  
  if (allStrongUnders) {
    console.log('🚨 SYSTEMATIC BIAS: All 3 games were STRONG Under recommendations');
  }
  
  if (allWrongDirection) {
    console.log('🚨 COMPLETE FAILURE: 0% accuracy at Coors Field since adjustments');
  }
  
  console.log(`📈 Actual totals: ${coorsFieldGames.map(g => g.actualTotal).join(', ')} runs`);
  console.log(`🎯 Our predictions: ${coorsFieldGames.map(g => g.ourPrediction).join(', ')} runs`);
  console.log(`📊 Sportsbook lines: ${coorsFieldGames.map(g => g.sportsBookLine).join(', ')} runs`);
  
  // Model Component Analysis
  console.log('\n🔧 MODEL COMPONENT ANALYSIS');
  console.log('===========================');
  console.log('Current Coors Field adjustment in model: +1.0 runs');
  console.log(`Actual additional runs needed: +${underBias.toFixed(1)} runs`);
  console.log(`Suggested Coors Field adjustment: +${(1.0 + underBias - 1.0).toFixed(1)} runs (increase from +1.0)`);
  
  // Compare to historical Coors expectation
  const historicalCoorsAvg = 11.5; // Rough historical average at Coors
  console.log(`\nHistorical Coors Field average: ~${historicalCoorsAvg} runs`);
  console.log(`Recent actual average: ${avgActualTotal.toFixed(1)} runs`);
  console.log(`Our model average: ${avgOurPrediction.toFixed(1)} runs`);
  
  // Edge Analysis 
  console.log('\n💰 BETTING EDGE ANALYSIS');
  console.log('========================');
  coorsFieldGames.forEach((game, index) => {
    const ourEdge = Math.abs(game.ourPrediction - game.sportsBookLine);
    const actualEdge = Math.abs(game.actualTotal - game.sportsBookLine);
    console.log(`Game ${index + 1}: Our edge ${ourEdge.toFixed(1)}, Actual edge ${actualEdge.toFixed(1)}`);
  });
  
  const avgOurEdge = coorsFieldGames.reduce((sum, g) => sum + Math.abs(g.ourPrediction - g.sportsBookLine), 0) / totalGames;
  console.log(`Average "edge" we thought we had: ${avgOurEdge.toFixed(1)} runs`);
  console.log('💡 These edges were completely false - sportsbooks much more accurate');
  
  // Recommendations
  console.log('\n🔄 RECOMMENDED FIXES');
  console.log('===================');
  console.log('1. INCREASE Coors Field adjustment from +1.0 to +3.0 runs minimum');
  console.log('2. ADD altitude-specific August factor (+0.5 additional runs)');
  console.log('3. REDUCE confidence for all Coors Field predictions (cap at 65%)');
  console.log('4. CONSIDER team-specific Coors adjustments (some teams hit better there)');
  console.log('5. WEATHER amplification at altitude (hot + altitude = explosive offense)');
  
  console.log('\n⚠️ CRITICAL INSIGHT');
  console.log('===================');
  console.log('Our August 2nd "adjustments" made us MORE conservative at the exact venue');
  console.log('where we should be MOST aggressive. This is a systematic model flaw.');
  console.log('User is 100% correct - we need immediate Coors Field recalibration.');
  
  console.log('\n🎲 BETTING IMPACT');
  console.log('=================');
  console.log('If user had bet OPPOSITE our Coors recommendations:');
  coorsFieldGames.forEach((game, index) => {
    const wouldWin = game.actualResult === 'Over';
    console.log(`Game ${index + 1}: Bet Over instead of Under = ${wouldWin ? 'WIN' : 'LOSS'}`);
  });
  console.log('Result: 3/3 wins = 100% success rate by doing OPPOSITE of our model');
  
  console.log('\n💾 Coors Field analysis complete - URGENT model fix needed');
}

// Run the analysis
analyzeCoorsFieldBias();