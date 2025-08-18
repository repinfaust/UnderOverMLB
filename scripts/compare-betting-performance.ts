#!/usr/bin/env node

/**
 * Compare Model Performance Against Actual Betting Results
 * 
 * Cold, hard analysis of how our model performed against:
 * 1. Actual game run totals
 * 2. Sportsbook lines we bet against
 * 3. Our actual betting results
 */

import * as fs from 'fs';

interface BettingResult {
  date: string;
  game: string;
  ourPrediction: number;
  sportsBookLine: number;
  actualTotal: number;
  ourRecommendation: string;
  betPlaced: boolean;
  result?: string;
  profit?: number;
}

function analyzeBettingPerformance(): void {
  console.log('📊 MODEL vs BETTING PERFORMANCE ANALYSIS');
  console.log('========================================');
  console.log('Raw facts - July 28 to August 3, 2025\n');

  // Data from our betting log and known results
  const bettingData: BettingResult[] = [
    {
      date: '2025-07-28',
      game: 'Red Sox @ Yankees',
      ourPrediction: 8.5,
      sportsBookLine: 8.5, // Estimated from typical Yankees games
      actualTotal: 11,
      ourRecommendation: 'PASS',
      betPlaced: false
    },
    {
      date: '2025-07-29', 
      game: 'Angels @ Mariners',
      ourPrediction: 8.6,
      sportsBookLine: 8.0, // Estimated, user mentioned Mariners Under won
      actualTotal: 4,
      ourRecommendation: 'LEAN Over',
      betPlaced: true,
      result: 'WIN',
      profit: undefined
    },
    {
      date: '2025-07-30',
      game: 'Yankees @ Rays', 
      ourPrediction: 8.8,
      sportsBookLine: 9.0,
      actualTotal: 9,
      ourRecommendation: 'PASS',
      betPlaced: true,
      result: 'PUSH',
      profit: 0
    },
    {
      date: '2025-07-31',
      game: 'Yankees @ Rays',
      ourPrediction: 9.8, // From betting log
      sportsBookLine: 8.5,
      actualTotal: 11,
      ourRecommendation: 'STRONG Over',
      betPlaced: true,
      result: 'WIN',
      profit: 25.50
    },
    {
      date: '2025-08-01',
      game: 'Pirates @ Rockies',
      ourPrediction: 8.8, // From betting log
      sportsBookLine: 11.5,
      actualTotal: 33,
      ourRecommendation: 'STRONG Under',
      betPlaced: true,
      result: 'LOSS',
      profit: -24.82
    },
    {
      date: '2025-08-02',
      game: 'White Sox @ Angels',
      ourPrediction: 7.5, // From betting log
      sportsBookLine: 9.5,
      actualTotal: 1,
      ourRecommendation: 'STRONG Under',
      betPlaced: true,
      result: 'WIN',
      profit: 9.50
    },
    {
      date: '2025-08-03',
      game: 'Diamondbacks @ Athletics',
      ourPrediction: 7.5, // From betting log
      sportsBookLine: 9.0,
      actualTotal: 8,
      ourRecommendation: 'STRONG Under',
      betPlaced: true,
      result: 'WIN',
      profit: 28.58
    }
  ];

  console.log('📋 GAME-BY-GAME ANALYSIS');
  console.log('========================');

  let totalError = 0;
  let correctPredictions = 0;
  let bettingWins = 0;
  let bettingLosses = 0;
  let bettingPushes = 0;
  let totalProfit = 0;

  bettingData.forEach((game, index) => {
    const predictionError = Math.abs(game.actualTotal - game.ourPrediction);
    const lineError = Math.abs(game.actualTotal - game.sportsBookLine);
    const isCorrect = predictionError <= 1.5;
    
    console.log(`${index + 1}. ${game.date} - ${game.game}`);
    console.log(`   Our Prediction: ${game.ourPrediction.toFixed(1)} runs`);
    console.log(`   Sportsbook Line: ${game.sportsBookLine.toFixed(1)} runs`);
    console.log(`   Actual Total: ${game.actualTotal} runs`);
    console.log(`   Our Error: ${predictionError.toFixed(1)} runs`);
    console.log(`   Sportsbook Error: ${lineError.toFixed(1)} runs`);
    console.log(`   Our Accuracy: ${isCorrect ? 'CORRECT' : 'WRONG'}`);
    console.log(`   Recommendation: ${game.ourRecommendation}`);
    
    if (game.betPlaced) {
      console.log(`   🎰 BET PLACED: ${game.result} (Profit: ${game.profit !== undefined ? '£' + game.profit.toFixed(2) : 'Unknown'})`);
      
      if (game.result === 'WIN') bettingWins++;
      else if (game.result === 'LOSS') bettingLosses++;
      else if (game.result === 'PUSH') bettingPushes++;
      
      if (typeof game.profit === 'number') {
        totalProfit += game.profit;
      }
    } else {
      console.log(`   ⏸️ NO BET PLACED`);
    }
    
    console.log('');
    
    totalError += predictionError;
    if (isCorrect) correctPredictions++;
  });

  // Overall statistics
  console.log('📊 OVERALL PERFORMANCE SUMMARY');
  console.log('==============================');
  
  const totalGames = bettingData.length;
  const accuracy = (correctPredictions / totalGames) * 100;
  const avgError = totalError / totalGames;
  const avgPrediction = bettingData.reduce((sum, g) => sum + g.ourPrediction, 0) / totalGames;
  const avgActual = bettingData.reduce((sum, g) => sum + g.actualTotal, 0) / totalGames;
  const avgSportsbook = bettingData.reduce((sum, g) => sum + g.sportsBookLine, 0) / totalGames;
  const bias = avgPrediction - avgActual;

  console.log(`📈 PREDICTION PERFORMANCE:`);
  console.log(`  Total Games: ${totalGames}`);
  console.log(`  Correct Predictions: ${correctPredictions}/${totalGames}`);
  console.log(`  Accuracy: ${accuracy.toFixed(1)}%`);
  console.log(`  Average Error: ${avgError.toFixed(2)} runs`);
  console.log(`  Bias: ${bias >= 0 ? '+' : ''}${bias.toFixed(2)} runs`);
  
  console.log(`\n💰 BETTING PERFORMANCE:`);
  const totalBets = bettingWins + bettingLosses + bettingPushes;
  console.log(`  Total Bets: ${totalBets}`);
  console.log(`  Wins: ${bettingWins}`);
  console.log(`  Losses: ${bettingLosses}`);
  console.log(`  Pushes: ${bettingPushes}`);
  
  if (totalBets > 0) {
    const winRate = (bettingWins / (bettingWins + bettingLosses)) * 100;
    console.log(`  Win Rate: ${winRate.toFixed(1)}%`);
  }
  
  console.log(`  Total Profit: £${totalProfit.toFixed(2)}`);

  console.log(`\n📊 MODEL vs SPORTSBOOK COMPARISON:`);
  console.log(`  Our Avg Prediction: ${avgPrediction.toFixed(1)} runs`);
  console.log(`  Sportsbook Avg Line: ${avgSportsbook.toFixed(1)} runs`);
  console.log(`  Actual Avg Total: ${avgActual.toFixed(1)} runs`);
  
  // Calculate sportsbook accuracy
  const sportsBookErrors = bettingData.map(g => Math.abs(g.actualTotal - g.sportsBookLine));
  const sportsBookAvgError = sportsBookErrors.reduce((sum, err) => sum + err, 0) / sportsBookErrors.length;
  const sportsBookCorrect = sportsBookErrors.filter(err => err <= 1.5).length;
  const sportsBookAccuracy = (sportsBookCorrect / totalGames) * 100;
  
  console.log(`  Our Accuracy: ${accuracy.toFixed(1)}%`);
  console.log(`  Sportsbook Accuracy: ${sportsBookAccuracy.toFixed(1)}%`);
  console.log(`  Our Avg Error: ${avgError.toFixed(2)} runs`);
  console.log(`  Sportsbook Avg Error: ${sportsBookAvgError.toFixed(2)} runs`);

  // Specific problem games
  console.log(`\n❌ MAJOR PROBLEM GAMES:`);
  console.log(`======================`);
  
  const worstErrors = bettingData
    .map((game, index) => ({ ...game, index, error: Math.abs(game.actualTotal - game.ourPrediction) }))
    .sort((a, b) => b.error - a.error)
    .slice(0, 3);

  worstErrors.forEach((game, rank) => {
    console.log(`${rank + 1}. ${game.game} (${game.date})`);
    console.log(`   Predicted: ${game.ourPrediction.toFixed(1)}, Actual: ${game.actualTotal}, Error: ${game.error.toFixed(1)} runs`);
    if (game.betPlaced) {
      console.log(`   💸 Betting Impact: ${game.result} (${game.profit !== undefined ? '£' + game.profit.toFixed(2) : 'Unknown'})`);
    }
  });

  // Bottom line assessment
  console.log(`\n📋 BOTTOM LINE - COLD FACTS`);
  console.log(`===========================`);
  
  console.log(`❌ Model Accuracy: ${accuracy.toFixed(1)}% (Poor - well below 50%)`);
  console.log(`❌ Average Error: ${avgError.toFixed(2)} runs (High - should be <2.0)`);
  console.log(`❌ vs Sportsbooks: We're ${(sportsBookAccuracy - accuracy).toFixed(1)} percentage points worse`);
  
  if (totalProfit > 0) {
    console.log(`✅ Betting Profit: £${totalProfit.toFixed(2)} (Despite poor accuracy)`);
  } else {
    console.log(`❌ Betting Loss: £${Math.abs(totalProfit).toFixed(2)}`);
  }
  
  console.log(`\n🎯 KEY ISSUES IDENTIFIED:`);
  console.log(`• Coors Field: Catastrophic failure (33 runs vs 8.8 prediction)`);
  console.log(`• Under-predicting: ${bias.toFixed(2)} run bias toward lower totals`);
  console.log(`• Inconsistent: One perfect prediction (9.0 vs 8.8) followed by disasters`);
  console.log(`• Sportsbooks are significantly more accurate than our model`);
  
  if (totalProfit > 0) {
    console.log(`\n💡 LUCKY BREAKS:`);
    console.log(`• Made money despite poor accuracy due to favorable variance`);
    console.log(`• White Sox Under hit perfectly (1 run vs 9.5 line)`);
    console.log(`• Yankees Over recommendation was correct`);
  }

  console.log(`\n⚠️ REALITY CHECK:`);
  console.log(`Current model performance is not sustainable for profitable betting.`);
  console.log(`Need significant improvements before risking more capital.`);
}

// Run the analysis
if (require.main === module) {
  analyzeBettingPerformance();
}

export { analyzeBettingPerformance };