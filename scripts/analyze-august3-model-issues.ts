#!/usr/bin/env node

/**
 * Deep Analysis of August 3rd Model Issues
 * 
 * Analyze systematic problems with our adjusted model on August 3rd
 * to determine if we over-corrected or hit unusual conditions
 */

interface GameAnalysis {
  game: string;
  ourPrediction: number;
  actualTotal: number;
  sportsBookLine: number;
  predictionError: number;
  lineError: number;
  modelBias: 'Over' | 'Under' | 'Neutral';
  lineBias: 'Over' | 'Under' | 'Neutral';
  errorMagnitude: 'Small' | 'Medium' | 'Large' | 'Extreme';
  gameType: 'Low' | 'Average' | 'High' | 'Explosion';
}

// August 3rd detailed results
const august3Results = [
  { game: 'Astros @ Red Sox', ourPrediction: 8.7, actualTotal: 7, sportsBookLine: 8.5 },
  { game: 'Dodgers @ Rays', ourPrediction: 8.7, actualTotal: 3, sportsBookLine: 8.5 },
  { game: 'Brewers @ Nationals', ourPrediction: 8.0, actualTotal: 17, sportsBookLine: 8.5 },
  { game: 'Royals @ Blue Jays', ourPrediction: 8.5, actualTotal: 11, sportsBookLine: 8.0 },
  { game: 'Twins @ Guardians', ourPrediction: 7.9, actualTotal: 9, sportsBookLine: 8.5 },
  { game: 'Yankees @ Marlins', ourPrediction: 7.5, actualTotal: 10, sportsBookLine: 8.0 },
  { game: 'Giants @ Mets', ourPrediction: 7.8, actualTotal: 16, sportsBookLine: 8.5 },
  { game: 'Orioles @ Cubs', ourPrediction: 8.2, actualTotal: 8, sportsBookLine: 8.5 },
  { game: 'Pirates @ Rockies', ourPrediction: 8.0, actualTotal: 14, sportsBookLine: 11.5 },
  { game: 'Diamondbacks @ Athletics', ourPrediction: 7.5, actualTotal: 10, sportsBookLine: 10.0 },
  { game: 'White Sox @ Angels', ourPrediction: 7.3, actualTotal: 13, sportsBookLine: 9.5 },
  { game: 'Cardinals @ Padres', ourPrediction: 8.0, actualTotal: 10, sportsBookLine: 8.0 },
  { game: 'Rangers @ Mariners', ourPrediction: 8.6, actualTotal: 9, sportsBookLine: 7.5 },
  { game: 'Tigers @ Phillies', ourPrediction: 8.0, actualTotal: 2, sportsBookLine: 8.0 }
];

// Previous days for comparison
const august2Results = [
  { game: 'Dodgers @ Rays', ourPrediction: 8.5, actualTotal: 4, sportsBookLine: 8.5 },
  { game: 'Orioles @ Cubs', ourPrediction: 8.0, actualTotal: 7, sportsBookLine: 8.5 },
  { game: 'Royals @ Blue Jays', ourPrediction: 8.4, actualTotal: 6, sportsBookLine: 8.0 },
  { game: 'Pirates @ Rockies', ourPrediction: 8.0, actualTotal: 13, sportsBookLine: 10.0 },
  { game: 'Tigers @ Phillies', ourPrediction: 8.0, actualTotal: 12, sportsBookLine: 7.0 },
  { game: 'Brewers @ Nationals', ourPrediction: 7.9, actualTotal: 10, sportsBookLine: 8.5 },
  { game: 'Astros @ Red Sox', ourPrediction: 8.4, actualTotal: 10, sportsBookLine: 9.5 },
  { game: 'Twins @ Guardians', ourPrediction: 8.0, actualTotal: 9, sportsBookLine: 7.5 },
  { game: 'Yankees @ Marlins', ourPrediction: 7.7, actualTotal: 2, sportsBookLine: 8.0 },
  { game: 'Giants @ Mets', ourPrediction: 8.0, actualTotal: 18, sportsBookLine: 8.5 },
  { game: 'Rangers @ Mariners', ourPrediction: 8.6, actualTotal: 10, sportsBookLine: 7.5 },
  { game: 'Diamondbacks @ Athletics', ourPrediction: 7.6, actualTotal: 9, sportsBookLine: 10.0 },
  { game: 'White Sox @ Angels', ourPrediction: 7.5, actualTotal: 1, sportsBookLine: 9.5 },
  { game: 'Cardinals @ Padres', ourPrediction: 8.0, actualTotal: 13, sportsBookLine: 8.5 }
];

function analyzeGame(result: any): GameAnalysis {
  const predictionError = Math.abs(result.actualTotal - result.ourPrediction);
  const lineError = Math.abs(result.actualTotal - result.sportsBookLine);
  
  // Determine bias
  const modelBias = result.ourPrediction > result.actualTotal ? 'Over' : 
                   result.ourPrediction < result.actualTotal ? 'Under' : 'Neutral';
  const lineBias = result.sportsBookLine > result.actualTotal ? 'Over' : 
                  result.sportsBookLine < result.actualTotal ? 'Under' : 'Neutral';
  
  // Error magnitude
  let errorMagnitude: 'Small' | 'Medium' | 'Large' | 'Extreme';
  if (predictionError <= 1.5) errorMagnitude = 'Small';
  else if (predictionError <= 3.0) errorMagnitude = 'Medium';
  else if (predictionError <= 5.0) errorMagnitude = 'Large';
  else errorMagnitude = 'Extreme';
  
  // Game type
  let gameType: 'Low' | 'Average' | 'High' | 'Explosion';
  if (result.actualTotal <= 5) gameType = 'Low';
  else if (result.actualTotal <= 9) gameType = 'Average';
  else if (result.actualTotal <= 12) gameType = 'High';
  else gameType = 'Explosion';
  
  return {
    game: result.game,
    ourPrediction: result.ourPrediction,
    actualTotal: result.actualTotal,
    sportsBookLine: result.sportsBookLine,
    predictionError,
    lineError,
    modelBias,
    lineBias,
    errorMagnitude,
    gameType
  };
}

function analyzeModelPerformance(): void {
  console.log('🔍 DEEP ANALYSIS: AUGUST 3RD MODEL REGRESSION');
  console.log('=============================================');
  console.log('Analyzing systematic issues vs random bad luck\n');
  
  // Analyze August 3rd games
  const aug3Analysis = august3Results.map(analyzeGame);
  const aug2Analysis = august2Results.map(analyzeGame);
  
  console.log('📊 GAME-BY-GAME ERROR ANALYSIS');
  console.log('===============================');
  
  aug3Analysis.forEach((analysis, index) => {
    const errorIcon = analysis.errorMagnitude === 'Extreme' ? '🔥' : 
                     analysis.errorMagnitude === 'Large' ? '❌' : 
                     analysis.errorMagnitude === 'Medium' ? '⚠️' : '✅';
    
    console.log(`${index + 1}. ${errorIcon} ${analysis.game}`);
    console.log(`   🎯 Our: ${analysis.ourPrediction} | Actual: ${analysis.actualTotal} | Line: ${analysis.sportsBookLine}`);
    console.log(`   📐 Error: ${analysis.predictionError.toFixed(1)} runs (${analysis.errorMagnitude})`);
    console.log(`   📈 Model Bias: ${analysis.modelBias} | Game Type: ${analysis.gameType}`);
    console.log('');
  });
  
  // Statistical Analysis
  console.log('📈 STATISTICAL COMPARISON');
  console.log('=========================');
  
  // August 3rd stats
  const aug3AvgError = aug3Analysis.reduce((sum, a) => sum + a.predictionError, 0) / aug3Analysis.length;
  const aug3AvgPrediction = aug3Analysis.reduce((sum, a) => sum + a.ourPrediction, 0) / aug3Analysis.length;
  const aug3AvgActual = aug3Analysis.reduce((sum, a) => sum + a.actualTotal, 0) / aug3Analysis.length;
  const aug3AvgLine = aug3Analysis.reduce((sum, a) => sum + a.sportsBookLine, 0) / aug3Analysis.length;
  
  // August 2nd stats
  const aug2AvgError = aug2Analysis.reduce((sum, a) => sum + a.predictionError, 0) / aug2Analysis.length;
  const aug2AvgPrediction = aug2Analysis.reduce((sum, a) => sum + a.ourPrediction, 0) / aug2Analysis.length;
  const aug2AvgActual = aug2Analysis.reduce((sum, a) => sum + a.actualTotal, 0) / aug2Analysis.length;
  const aug2AvgLine = aug2Analysis.reduce((sum, a) => sum + a.sportsBookLine, 0) / aug2Analysis.length;
  
  console.log('August 3rd vs August 2nd:');
  console.log(`📐 Avg Error: ${aug3AvgError.toFixed(1)} vs ${aug2AvgError.toFixed(1)} (${(aug3AvgError - aug2AvgError >= 0 ? '+' : '')}${(aug3AvgError - aug2AvgError).toFixed(1)})`);
  console.log(`🎯 Avg Prediction: ${aug3AvgPrediction.toFixed(1)} vs ${aug2AvgPrediction.toFixed(1)} (${(aug3AvgPrediction - aug2AvgPrediction >= 0 ? '+' : '')}${(aug3AvgPrediction - aug2AvgPrediction).toFixed(1)})`);
  console.log(`📊 Avg Actual: ${aug3AvgActual.toFixed(1)} vs ${aug2AvgActual.toFixed(1)} (${(aug3AvgActual - aug2AvgActual >= 0 ? '+' : '')}${(aug3AvgActual - aug2AvgActual).toFixed(1)})`);
  console.log(`📈 Avg Sportsbook: ${aug3AvgLine.toFixed(1)} vs ${aug2AvgLine.toFixed(1)} (${(aug3AvgLine - aug2AvgLine >= 0 ? '+' : '')}${(aug3AvgLine - aug2AvgLine).toFixed(1)})`);
  
  // Bias Analysis
  console.log('\n🎯 BIAS ANALYSIS');
  console.log('================');
  
  const aug3UnderBias = aug3Analysis.filter(a => a.modelBias === 'Under').length;
  const aug3OverBias = aug3Analysis.filter(a => a.modelBias === 'Over').length;
  const aug2UnderBias = aug2Analysis.filter(a => a.modelBias === 'Under').length;
  const aug2OverBias = aug2Analysis.filter(a => a.modelBias === 'Over').length;
  
  console.log(`August 3rd Model Bias: ${aug3UnderBias} Under, ${aug3OverBias} Over (${(aug3UnderBias/aug3Analysis.length*100).toFixed(1)}% Under)`);
  console.log(`August 2nd Model Bias: ${aug2UnderBias} Under, ${aug2OverBias} Over (${(aug2UnderBias/aug2Analysis.length*100).toFixed(1)}% Under)`);
  
  // Game Type Distribution
  console.log('\n🎮 GAME TYPE ANALYSIS');
  console.log('=====================');
  
  const aug3GameTypes = {
    Low: aug3Analysis.filter(a => a.gameType === 'Low').length,
    Average: aug3Analysis.filter(a => a.gameType === 'Average').length,
    High: aug3Analysis.filter(a => a.gameType === 'High').length,
    Explosion: aug3Analysis.filter(a => a.gameType === 'Explosion').length
  };
  
  const aug2GameTypes = {
    Low: aug2Analysis.filter(a => a.gameType === 'Low').length,
    Average: aug2Analysis.filter(a => a.gameType === 'Average').length,
    High: aug2Analysis.filter(a => a.gameType === 'High').length,
    Explosion: aug2Analysis.filter(a => a.gameType === 'Explosion').length
  };
  
  console.log('August 3rd Game Distribution:');
  console.log(`  Low (≤5): ${aug3GameTypes.Low} games (${(aug3GameTypes.Low/aug3Analysis.length*100).toFixed(1)}%)`);
  console.log(`  Average (6-9): ${aug3GameTypes.Average} games (${(aug3GameTypes.Average/aug3Analysis.length*100).toFixed(1)}%)`);
  console.log(`  High (10-12): ${aug3GameTypes.High} games (${(aug3GameTypes.High/aug3Analysis.length*100).toFixed(1)}%)`);
  console.log(`  Explosion (13+): ${aug3GameTypes.Explosion} games (${(aug3GameTypes.Explosion/aug3Analysis.length*100).toFixed(1)}%)`);
  
  console.log('\nAugust 2nd Game Distribution:');
  console.log(`  Low (≤5): ${aug2GameTypes.Low} games (${(aug2GameTypes.Low/aug2Analysis.length*100).toFixed(1)}%)`);
  console.log(`  Average (6-9): ${aug2GameTypes.Average} games (${(aug2GameTypes.Average/aug2Analysis.length*100).toFixed(1)}%)`);
  console.log(`  High (10-12): ${aug2GameTypes.High} games (${(aug2GameTypes.High/aug2Analysis.length*100).toFixed(1)}%)`);
  console.log(`  Explosion (13+): ${aug2GameTypes.Explosion} games (${(aug2GameTypes.Explosion/aug2Analysis.length*100).toFixed(1)}%)`);
  
  // Extreme Error Analysis
  console.log('\n🔥 EXTREME ERROR ANALYSIS');
  console.log('=========================');
  
  const aug3ExtremeErrors = aug3Analysis.filter(a => a.errorMagnitude === 'Extreme');
  const aug2ExtremeErrors = aug2Analysis.filter(a => a.errorMagnitude === 'Extreme');
  
  console.log(`August 3rd Extreme Errors: ${aug3ExtremeErrors.length}/${aug3Analysis.length} (${(aug3ExtremeErrors.length/aug3Analysis.length*100).toFixed(1)}%)`);
  aug3ExtremeErrors.forEach(error => {
    console.log(`  🔥 ${error.game}: Predicted ${error.ourPrediction}, Actual ${error.actualTotal} (${error.predictionError.toFixed(1)} error)`);
  });
  
  console.log(`\nAugust 2nd Extreme Errors: ${aug2ExtremeErrors.length}/${aug2Analysis.length} (${(aug2ExtremeErrors.length/aug2Analysis.length*100).toFixed(1)}%)`);
  aug2ExtremeErrors.forEach(error => {
    console.log(`  🔥 ${error.game}: Predicted ${error.ourPrediction}, Actual ${error.actualTotal} (${error.predictionError.toFixed(1)} error)`);
  });
  
  // Sportsbook vs Model Performance
  console.log('\n📊 MODEL vs SPORTSBOOK ACCURACY');
  console.log('================================');
  
  const aug3ModelBetter = aug3Analysis.filter(a => a.predictionError < a.lineError).length;
  const aug3SportsBookBetter = aug3Analysis.filter(a => a.lineError < a.predictionError).length;
  const aug3Tied = aug3Analysis.filter(a => a.lineError === a.predictionError).length;
  
  console.log(`August 3rd: Model Better ${aug3ModelBetter}, Sportsbook Better ${aug3SportsBookBetter}, Tied ${aug3Tied}`);
  console.log(`Model Beat Sportsbooks: ${(aug3ModelBetter/aug3Analysis.length*100).toFixed(1)}% of games`);
  
  // Final Assessment
  console.log('\n🏆 FINAL ASSESSMENT');
  console.log('===================');
  
  const unexpectedExplosions = aug3GameTypes.Explosion - aug2GameTypes.Explosion;
  const modelBiasChange = (aug3UnderBias/aug3Analysis.length) - (aug2UnderBias/aug2Analysis.length);
  
  if (unexpectedExplosions >= 2) {
    console.log('🎰 HIGH VARIANCE NIGHT: Multiple offensive explosions (13+ runs)');
    console.log('💡 This suggests unusual conditions rather than systematic model failure');
  }
  
  if (Math.abs(modelBiasChange) > 0.15) {
    console.log(`📈 BIAS SHIFT: Model bias changed by ${(modelBiasChange*100).toFixed(1)} percentage points`);
    console.log('💡 This suggests our August 2nd adjustments may have over-corrected');
  }
  
  if (aug3AvgError > aug2AvgError + 1.0) {
    console.log('📉 SYSTEMATIC DEGRADATION: Prediction error increased significantly');
    console.log('💡 Model may need recalibration');
  } else {
    console.log('✅ VARIANCE: Error increase within normal fluctuation range');
    console.log('💡 Likely just a tough night rather than systematic failure');
  }
  
  console.log('\n🔄 RECOMMENDED ACTIONS:');
  if (aug3GameTypes.Explosion > 3) {
    console.log('1. Investigate offensive explosion factors (weather, pitcher injuries, etc.)');
  }
  if (modelBiasChange < -0.2) {
    console.log('2. Consider slight upward adjustment to counter excessive Under bias');
  }
  if (aug3AvgError > 4.0) {
    console.log('3. Review model components for August-specific patterns');
  }
  console.log('4. Monitor next 2-3 days before making major adjustments');
  
  console.log('\n💾 Data-driven analysis complete');
}

// Run the analysis
analyzeModelPerformance();