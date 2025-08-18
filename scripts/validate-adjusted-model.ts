#!/usr/bin/env node

/**
 * Validate Adjusted Model - August 2nd
 * 
 * Test the adjusted model against August 1st games to measure improvement
 */

import { predictGameTotal, GameData, formatBreakdown } from '../src/models/improved/component-additive-model';

// August 1st games with actual data for validation
const august1Games: Array<{gameData: GameData; actualTotal: number; sportsBookLine: number; actualResult: 'Over' | 'Under'}> = [
  {
    gameData: {
      home_team: 'Cincinnati Reds',
      away_team: 'Atlanta Braves', 
      venue: 'Great American Ball Park',
      date: '2025-08-01',
      weather: { temp_f: 82, humidity: 65, wind_speed_mph: 8, wind_direction: 'SW', conditions: 'clear sky' },
      market_line: 9.5
    },
    actualTotal: 5,
    sportsBookLine: 9.5,
    actualResult: 'Under'
  },
  {
    gameData: {
      home_team: 'Chicago Cubs',
      away_team: 'Baltimore Orioles',
      venue: 'Wrigley Field', 
      date: '2025-08-01',
      weather: { temp_f: 78, humidity: 70, wind_speed_mph: 12, wind_direction: 'NE', conditions: 'clear sky' },
      market_line: 7.5
    },
    actualTotal: 1,
    sportsBookLine: 7.5,
    actualResult: 'Under'
  },
  {
    gameData: {
      home_team: 'Philadelphia Phillies',
      away_team: 'Detroit Tigers',
      venue: 'Citizens Bank Park',
      date: '2025-08-01', 
      weather: { temp_f: 84, humidity: 60, wind_speed_mph: 6, wind_direction: 'S', conditions: 'clear sky' },
      market_line: 7.5
    },
    actualTotal: 9,
    sportsBookLine: 7.5,
    actualResult: 'Over'
  },
  {
    gameData: {
      home_team: 'Cleveland Guardians',
      away_team: 'Minnesota Twins',
      venue: 'Progressive Field',
      date: '2025-08-01',
      weather: { temp_f: 76, humidity: 72, wind_speed_mph: 9, wind_direction: 'W', conditions: 'clear sky' },
      market_line: 7.0
    },
    actualTotal: 5,
    sportsBookLine: 7.0,
    actualResult: 'Under'
  },
  {
    gameData: {
      home_team: 'Boston Red Sox',
      away_team: 'Houston Astros',
      venue: 'Fenway Park',
      date: '2025-08-01',
      weather: { temp_f: 79, humidity: 68, wind_speed_mph: 11, wind_direction: 'E', conditions: 'clear sky' },
      market_line: 8.0
    },
    actualTotal: 3,
    sportsBookLine: 8.0,
    actualResult: 'Under'
  },
  {
    gameData: {
      home_team: 'Colorado Rockies',
      away_team: 'Pittsburgh Pirates',
      venue: 'Coors Field',
      date: '2025-08-01',
      weather: { temp_f: 88, humidity: 45, wind_speed_mph: 5, wind_direction: 'SW', conditions: 'clear sky' },
      market_line: 11.5
    },
    actualTotal: 33,
    sportsBookLine: 11.5,
    actualResult: 'Over'
  },
  {
    gameData: {
      home_team: 'Los Angeles Angels',
      away_team: 'Chicago White Sox',
      venue: 'Angel Stadium',
      date: '2025-08-01',
      weather: { temp_f: 86, humidity: 55, wind_speed_mph: 7, wind_direction: 'W', conditions: 'clear sky' },
      market_line: 9.5
    },
    actualTotal: 9,
    sportsBookLine: 9.5,
    actualResult: 'Under'
  },
  {
    gameData: {
      home_team: 'Seattle Mariners',
      away_team: 'Texas Rangers',
      venue: 'T-Mobile Park',
      date: '2025-08-01',
      weather: { temp_f: 72, humidity: 75, wind_speed_mph: 8, wind_direction: 'NW', conditions: 'clear sky' },
      market_line: 7.5
    },
    actualTotal: 7,
    sportsBookLine: 7.5,
    actualResult: 'Under'
  }
];

interface ValidationResult {
  game: string;
  oldPrediction: number;
  newPrediction: number;
  newConfidence: number;
  actualTotal: number;
  sportsBookLine: number;
  actualResult: 'Over' | 'Under';
  oldCorrect: boolean;
  newCorrect: boolean;
  improvement: boolean;
  predictionChange: number;
  confidenceChange: string;
}

function validateAdjustedModel(): void {
  console.log('🔧 ADJUSTED MODEL VALIDATION - AUGUST 2ND');
  console.log('==========================================');
  console.log('Testing model adjustments against August 1st results\n');

  const results: ValidationResult[] = [];
  let oldCorrect = 0;
  let newCorrect = 0;
  let totalImprovement = 0;

  // Original predictions for comparison (simplified)
  const originalPredictions: {[key: string]: {total: number; confidence: number}} = {
    'Atlanta Braves @ Cincinnati Reds': {total: 9.3, confidence: 77},
    'Baltimore Orioles @ Chicago Cubs': {total: 8.6, confidence: 75}, 
    'Detroit Tigers @ Philadelphia Phillies': {total: 8.7, confidence: 75},
    'Minnesota Twins @ Cleveland Guardians': {total: 8.9, confidence: 75},
    'Houston Astros @ Boston Red Sox': {total: 9.1, confidence: 75},
    'Pittsburgh Pirates @ Colorado Rockies': {total: 8.8, confidence: 75},
    'Chicago White Sox @ Los Angeles Angels': {total: 8.4, confidence: 75},
    'Texas Rangers @ Seattle Mariners': {total: 9.4, confidence: 77}
  };

  for (const testCase of august1Games) {
    // Generate new prediction with adjusted model
    const newPrediction = predictGameTotal(testCase.gameData);
    const gameKey = `${testCase.gameData.away_team} @ ${testCase.gameData.home_team}`;
    const oldPred = originalPredictions[gameKey];
    
    if (!oldPred) continue;

    // Determine correctness
    const oldCorrectPred = (oldPred.total > testCase.sportsBookLine) === (testCase.actualResult === 'Over');
    const newCorrectPred = (newPrediction.final_total > testCase.sportsBookLine) === (testCase.actualResult === 'Over');
    
    if (oldCorrectPred) oldCorrect++;
    if (newCorrectPred) newCorrect++;

    const improvement = !oldCorrectPred && newCorrectPred;
    if (improvement) totalImprovement++;

    const predictionChange = newPrediction.final_total - oldPred.total;
    const edge = Math.abs(newPrediction.final_total - testCase.sportsBookLine);
    const confidenceChange = edge > 1.5 ? 'CAPPED at 70%' : 'Normal';

    results.push({
      game: gameKey,
      oldPrediction: oldPred.total,
      newPrediction: newPrediction.final_total,
      newConfidence: newPrediction.confidence,
      actualTotal: testCase.actualTotal,
      sportsBookLine: testCase.sportsBookLine,
      actualResult: testCase.actualResult,
      oldCorrect: oldCorrectPred,
      newCorrect: newCorrectPred,
      improvement,
      predictionChange,
      confidenceChange
    });
  }

  // Display results
  console.log('📊 GAME-BY-GAME COMPARISON');
  console.log('===========================');

  results.forEach((result, index) => {
    const improvementIcon = result.improvement ? '📈' : result.newCorrect ? '✅' : '❌';
    const changeIcon = result.predictionChange < 0 ? '📉' : result.predictionChange > 0 ? '📈' : '➡️';
    
    console.log(`${index + 1}. ${improvementIcon} ${result.game}`);
    console.log(`   🎯 Actual: ${result.actualTotal} runs (${result.actualResult})`);
    console.log(`   📊 Sportsbook Line: ${result.sportsBookLine}`);
    console.log(`   🔄 Old Prediction: ${result.oldPrediction.toFixed(1)} (${result.oldCorrect ? 'Correct' : 'Wrong'})`);
    console.log(`   🔧 New Prediction: ${result.newPrediction.toFixed(1)} (${result.newCorrect ? 'Correct' : 'Wrong'})`);
    console.log(`   ${changeIcon} Change: ${result.predictionChange >= 0 ? '+' : ''}${result.predictionChange.toFixed(1)} runs`);
    console.log(`   🎯 New Confidence: ${result.newConfidence}% (${result.confidenceChange})`);
    if (result.improvement) {
      console.log(`   ⭐ IMPROVEMENT: Fixed incorrect prediction!`);
    }
    console.log('');
  });

  // Summary statistics
  const oldAccuracy = (oldCorrect / results.length) * 100;
  const newAccuracy = (newCorrect / results.length) * 100;
  const accuracyChange = newAccuracy - oldAccuracy;

  console.log('📈 VALIDATION SUMMARY');
  console.log('====================');
  console.log(`🎯 Games Tested: ${results.length}`);
  console.log(`📊 Old Model Accuracy: ${oldCorrect}/${results.length} = ${oldAccuracy.toFixed(1)}%`);
  console.log(`🔧 New Model Accuracy: ${newCorrect}/${results.length} = ${newAccuracy.toFixed(1)}%`);
  console.log(`📈 Accuracy Change: ${accuracyChange >= 0 ? '+' : ''}${accuracyChange.toFixed(1)} percentage points`);
  console.log(`⭐ Direct Improvements: ${totalImprovement} games`);

  // Analyze changes
  const avgPredictionChange = results.reduce((sum, r) => sum + r.predictionChange, 0) / results.length;
  const avgNewConfidence = results.reduce((sum, r) => sum + r.newConfidence, 0) / results.length;
  const cappedConfidenceGames = results.filter(r => r.confidenceChange === 'CAPPED at 70%').length;

  console.log('\n🔧 MODEL ADJUSTMENTS ANALYSIS');
  console.log('==============================');
  console.log(`📉 Avg Prediction Change: ${avgPredictionChange >= 0 ? '+' : ''}${avgPredictionChange.toFixed(2)} runs`);
  console.log(`🎯 Avg New Confidence: ${avgNewConfidence.toFixed(1)}%`);
  console.log(`🚫 Games with Capped Confidence: ${cappedConfidenceGames}/${results.length}`);

  // Assessment
  console.log('\n🏆 ADJUSTMENT ASSESSMENT');
  console.log('========================');
  
  if (newAccuracy > oldAccuracy) {
    console.log(`✅ POSITIVE: Model accuracy improved by ${accuracyChange.toFixed(1)} points`);
  } else if (newAccuracy === oldAccuracy) {
    console.log(`➡️ NEUTRAL: No change in accuracy`);
  } else {
    console.log(`⚠️ NEGATIVE: Accuracy decreased by ${Math.abs(accuracyChange).toFixed(1)} points`);
  }

  if (avgPredictionChange < -0.3) {
    console.log(`📉 Predictions are now ${Math.abs(avgPredictionChange).toFixed(2)} runs lower on average`);
    console.log(`💡 This should help with over-prediction bias seen on August 1st`);
  }

  if (cappedConfidenceGames > 0) {
    console.log(`🎯 ${cappedConfidenceGames} games had confidence capped due to large edges`);
    console.log(`💡 This prevents false confidence in extreme predictions`);
  }

  console.log('\n📝 RECOMMENDATIONS');
  console.log('==================');
  
  if (newAccuracy <= oldAccuracy && totalImprovement === 0) {
    console.log('⚠️ Consider rolling back adjustments - no improvement detected');
  } else if (newAccuracy > 35) {
    console.log('✅ Adjustments show promise - proceed with live testing');
  } else {
    console.log('🔄 Mixed results - monitor next few games closely');
  }

  console.log('\n💾 Next steps: Test adjusted model on new games and monitor performance');
}

// Run validation
validateAdjustedModel();