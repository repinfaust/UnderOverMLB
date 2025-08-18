#!/usr/bin/env node

/**
 * Estimate July 30th Betting Lines
 * 
 * Since historical betting lines aren't accessible, estimate likely over/under totals
 * based on team patterns, venue factors, and typical MLB line ranges to evaluate our predictions
 */

interface GameAnalysis {
  game: string;
  actualScore: string;
  actualTotal: number;
  estimatedLine: number;
  estimatedReasoning: string;
  actualResult: 'Over' | 'Under' | 'Push';
  ourPrediction: 'Over' | 'Under';
  ourTotal: number;
  ourConfidence: number;
  correct: boolean;
}

// Our predictions from earlier
const ourPredictions = [
  { game: 'Blue Jays @ Orioles', prediction: 'Over', total: 9.5, confidence: 77 },
  { game: 'Diamondbacks @ Tigers', prediction: 'Under', total: 8.4, confidence: 75 },
  { game: 'Red Sox @ Twins', prediction: 'Over', total: 8.9, confidence: 75 },
  { game: 'Nationals @ Astros', prediction: 'Over', total: 9.4, confidence: 77 },
  { game: 'Braves @ Royals', prediction: 'Over', total: 9.1, confidence: 77 },
  { game: 'Phillies @ White Sox', prediction: 'Under', total: 8.4, confidence: 75 },
  { game: 'Cubs @ Brewers', prediction: 'Over', total: 8.6, confidence: 75 },
  { game: 'Pirates @ Giants', prediction: 'Under', total: 7.7, confidence: 67 },
  { game: 'Mets @ Padres', prediction: 'Under', total: 8.1, confidence: 67 },
  { game: 'Rockies @ Guardians', prediction: 'Under', total: 8.4, confidence: 75 },
  { game: 'Rays @ Yankees', prediction: 'Over', total: 10.0, confidence: 80 },
  { game: 'Dodgers @ Reds', prediction: 'Over', total: 9.5, confidence: 77 },
  { game: 'Marlins @ Cardinals', prediction: 'Over', total: 8.7, confidence: 67 },
  { game: 'Rangers @ Angels', prediction: 'Over', total: 9.2, confidence: 75 },
  { game: 'Mariners @ Athletics', prediction: 'Under', total: 8.0, confidence: 75 }
];

// Actual results from July 30th
const actualResults = [
  { game: 'Blue Jays @ Orioles', score: '9-8', total: 17 },
  { game: 'Diamondbacks @ Tigers', score: '2-7', total: 9 },
  { game: 'Red Sox @ Twins', score: '13-1', total: 14 },
  { game: 'Nationals @ Astros', score: '1-9', total: 10 },
  { game: 'Braves @ Royals', score: '0-1', total: 1 },
  { game: 'Phillies @ White Sox', score: '3-9', total: 12 },
  { game: 'Cubs @ Brewers', score: '10-3', total: 13 },
  { game: 'Pirates @ Giants', score: '2-1', total: 3 },
  { game: 'Mets @ Padres', score: '0-5', total: 5 },
  { game: 'Rockies @ Guardians', score: '0-5', total: 5 },
  { game: 'Rays @ Yankees', score: '4-5', total: 9 }, // We know this line was 9.0
  { game: 'Dodgers @ Reds', score: '2-5', total: 7 },
  { game: 'Marlins @ Cardinals', score: '2-0', total: 2 },
  { game: 'Rangers @ Angels', score: '6-3', total: 9 },
  { game: 'Mariners @ Athletics', score: '4-5', total: 9 }
];

function estimateBettingLine(game: string, actualTotal: number): { line: number; reasoning: string } {
  // Known line
  if (game.includes('Yankees')) {
    return { line: 9.0, reasoning: 'Confirmed line from search results' };
  }
  
  // Pitcher-friendly parks typically have lower lines
  if (game.includes('Giants')) {
    return { line: 7.5, reasoning: 'Oracle Park - pitcher friendly, typically 7.5-8.0' };
  }
  
  if (game.includes('Padres')) {
    return { line: 8.0, reasoning: 'Petco Park - pitcher friendly, typically 8.0-8.5' };
  }
  
  // High-offense teams typically have higher lines
  if (game.includes('Dodgers') || game.includes('Braves') || game.includes('Astros')) {
    return { line: 9.5, reasoning: 'Strong offensive teams, typically 9.0-10.0' };
  }
  
  // Hitter-friendly parks
  if (game.includes('Orioles')) {
    return { line: 9.5, reasoning: 'Camden Yards - hitter friendly in summer heat' };
  }
  
  if (game.includes('Red Sox') || game.includes('Twins')) {
    return { line: 9.0, reasoning: 'Target Field/Fenway - moderate hitter friendly' };
  }
  
  // Weak offense teams get lower lines
  if (game.includes('Marlins') || game.includes('White Sox') || game.includes('Athletics')) {
    return { line: 8.0, reasoning: 'Weak offensive teams, typically 8.0-8.5' };
  }
  
  // Default MLB line range based on actual total
  if (actualTotal <= 5) {
    return { line: 8.0, reasoning: 'Low-scoring game suggests line was around 8.0' };
  } else if (actualTotal >= 12) {
    return { line: 9.5, reasoning: 'High-scoring game suggests line was 9.5+' };
  } else {
    return { line: 8.5, reasoning: 'Standard MLB line, moderate matchup' };
  }
}

function analyzePerformance(): void {
  console.log('📊 JULY 30TH MODEL PERFORMANCE ANALYSIS');
  console.log('=======================================');
  console.log('Estimating betting lines to evaluate our predictions\n');
  
  const analysis: GameAnalysis[] = [];
  
  // Combine our predictions with actual results
  actualResults.forEach(result => {
    const prediction = ourPredictions.find(p => 
      p.game.toLowerCase().includes(result.game.split(' @ ')[0].split(' ')[0].toLowerCase()) ||
      p.game.toLowerCase().includes(result.game.split(' @ ')[1].split(' ')[0].toLowerCase())
    );
    
    if (prediction) {
      const lineEstimate = estimateBettingLine(result.game, result.total);
      const actualResult = result.total > lineEstimate.line ? 'Over' : 
                          result.total < lineEstimate.line ? 'Under' : 'Push';
      
      analysis.push({
        game: result.game,
        actualScore: result.score,
        actualTotal: result.total,
        estimatedLine: lineEstimate.line,
        estimatedReasoning: lineEstimate.reasoning,
        actualResult,
        ourPrediction: prediction.prediction,
        ourTotal: prediction.total,
        ourConfidence: prediction.confidence,
        correct: prediction.prediction === actualResult
      });
    }
  });
  
  // Display results
  console.log('🎯 GAME-BY-GAME ANALYSIS');
  console.log('=========================');
  
  analysis.forEach((game, index) => {
    const correctIcon = game.correct ? '✅' : '❌';
    const pushIcon = game.actualResult === 'Push' ? '🔄' : '';
    
    console.log(`${index + 1}. ${correctIcon}${pushIcon} ${game.game}`);
    console.log(`   Score: ${game.actualScore} = ${game.actualTotal} runs`);
    console.log(`   Est. Line: ${game.estimatedLine} (${game.estimatedReasoning})`);
    console.log(`   Actual Result: ${game.actualResult}`);
    console.log(`   Our Prediction: ${game.ourPrediction} ${game.ourTotal.toFixed(1)} (${game.confidence}%)`);
    console.log('');
  });
  
  // Calculate accuracy
  const totalGames = analysis.length;
  const correctPredictions = analysis.filter(g => g.correct).length;
  const pushes = analysis.filter(g => g.actualResult === 'Push').length;
  const accuracy = (correctPredictions / totalGames) * 100;
  
  console.log('📊 PERFORMANCE SUMMARY');
  console.log('======================');
  console.log(`🎯 Total Games: ${totalGames}`);
  console.log(`✅ Correct Predictions: ${correctPredictions}`);
  console.log(`🔄 Pushes: ${pushes}`);
  console.log(`📈 Accuracy: ${correctPredictions}/${totalGames} = ${accuracy.toFixed(1)}%`);
  console.log(`🎲 vs Random (50%): ${(accuracy - 50).toFixed(1)} percentage points`);
  
  // Breakdown by prediction type
  const overPredictions = analysis.filter(g => g.ourPrediction === 'Over');
  const underPredictions = analysis.filter(g => g.ourPrediction === 'Under');
  const overCorrect = overPredictions.filter(g => g.correct).length;
  const underCorrect = underPredictions.filter(g => g.correct).length;
  
  console.log('\n🔍 PREDICTION TYPE BREAKDOWN');
  console.log('=============================');
  console.log(`📈 Over Predictions: ${overCorrect}/${overPredictions.length} correct (${overPredictions.length > 0 ? (overCorrect/overPredictions.length*100).toFixed(1) : 0}%)`);
  console.log(`📉 Under Predictions: ${underCorrect}/${underPredictions.length} correct (${underPredictions.length > 0 ? (underCorrect/underPredictions.length*100).toFixed(1) : 0}%)`);
  
  // High confidence analysis
  const highConfidenceGames = analysis.filter(g => g.ourConfidence >= 75);
  const highConfidenceCorrect = highConfidenceGames.filter(g => g.correct).length;
  
  console.log('\n🎯 HIGH CONFIDENCE ANALYSIS');
  console.log('============================');
  console.log(`🔥 High Confidence Games (≥75%): ${highConfidenceGames.length}`);
  console.log(`✅ High Confidence Accuracy: ${highConfidenceGames.length > 0 ? (highConfidenceCorrect/highConfidenceGames.length*100).toFixed(1) : 0}%`);
  
  // Show biggest misses
  const biggestMisses = analysis
    .filter(g => !g.correct)
    .sort((a, b) => Math.abs(b.actualTotal - b.ourTotal) - Math.abs(a.actualTotal - a.ourTotal))
    .slice(0, 3);
  
  console.log('\n❌ BIGGEST MISSES');
  console.log('==================');
  biggestMisses.forEach((miss, i) => {
    const totalError = Math.abs(miss.actualTotal - miss.ourTotal);
    console.log(`${i+1}. ${miss.game}: Predicted ${miss.ourPrediction} ${miss.ourTotal.toFixed(1)}, Actual ${miss.actualResult} ${miss.actualTotal} (${miss.ourConfidence}% conf, ${totalError.toFixed(1)} run error)`);
  });
  
  console.log('\n💡 ASSESSMENT');
  console.log('==============');
  if (accuracy >= 60) {
    console.log('🌟 GOOD: Model showing solid edge over random');
  } else if (accuracy >= 55) {
    console.log('📈 ACCEPTABLE: Model showing slight edge');
  } else if (accuracy >= 45) {
    console.log('📊 NEUTRAL: Model performing near random chance');
  } else {
    console.log('❌ POOR: Model underperforming random chance');
  }
  
  console.log('\n⚠️ IMPORTANT CAVEATS:');
  console.log('- Betting lines are estimated, not actual');
  console.log('- Yankees line (9.0) is confirmed, others are estimates');
  console.log('- Real accuracy may differ with actual sportsbook lines');
}

// Run the analysis
analyzePerformance();