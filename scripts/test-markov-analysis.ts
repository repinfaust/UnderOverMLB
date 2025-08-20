/**
 * Test script for MLB Markov Chain Analysis
 * 
 * Fetches 3+ months of historical data and runs comprehensive analysis
 * Tests prediction accuracy on recent games
 */

import { MLBMarkovChain } from '../src/models/markov/mlb-markov-chain';

async function runMarkovAnalysis() {
  console.log('🔗 TESTING MLB MARKOV CHAIN ANALYSIS');
  console.log('=====================================\n');

  const markov = new MLBMarkovChain();

  // Analyze significant historical period (June-August 2025)
  const startDate = '2025-06-01';
  const endDate = '2025-08-15';
  
  console.log(`📅 Analyzing period: ${startDate} to ${endDate}`);
  console.log('⏳ This may take several minutes due to API rate limiting...\n');

  try {
    // Run full analysis
    await markov.runFullAnalysis(startDate, endDate);

    console.log('\n🎯 TESTING PREDICTIONS ON RECENT GAMES');
    console.log('======================================\n');

    // Test predictions on games we know results for
    const testCases = [
      {
        homeTeam: 'Philadelphia Phillies',
        awayTeam: 'Seattle Mariners', 
        venue: 'Citizens Bank Park',
        weather: 'hot',
        actualResult: 19,
        notes: 'Explosion game both V4/V5 missed'
      },
      {
        homeTeam: 'Atlanta Braves',
        awayTeam: 'Chicago White Sox',
        venue: 'Truist Park',
        weather: 'hot', 
        actualResult: 21,
        notes: 'Another explosion game'
      },
      {
        homeTeam: 'Colorado Rockies',
        awayTeam: 'Los Angeles Dodgers',
        venue: 'Coors Field',
        weather: 'hot',
        actualResult: 15,
        notes: 'Coors Field high-scoring game'
      },
      {
        homeTeam: 'Detroit Tigers',
        awayTeam: 'Houston Astros',
        venue: 'Comerica Park',
        weather: 'mild',
        actualResult: 1,
        notes: 'Rare very low-scoring game'
      },
      {
        homeTeam: 'Boston Red Sox',
        awayTeam: 'Baltimore Orioles', 
        venue: 'Fenway Park',
        weather: 'mild',
        actualResult: 7,
        notes: 'Moderate scoring game'
      },
      {
        homeTeam: 'San Diego Padres',
        awayTeam: 'San Francisco Giants',
        venue: 'Petco Park',
        weather: 'mild',
        actualResult: 6,
        notes: 'Pitcher-friendly park'
      }
    ];

    let totalError = 0;
    let correctDirections = 0;
    const predictions = [];

    for (const testCase of testCases) {
      const prediction = markov.predictGameTotal(
        testCase.homeTeam,
        testCase.awayTeam, 
        testCase.venue,
        testCase.weather
      );

      const error = Math.abs(prediction.predicted_total - testCase.actualResult);
      const correctDirection = (prediction.predicted_total > 8.5 && testCase.actualResult > 8.5) ||
                               (prediction.predicted_total < 8.5 && testCase.actualResult < 8.5);
      
      if (correctDirection) correctDirections++;
      totalError += error;

      predictions.push({
        ...testCase,
        ...prediction,
        error: error,
        correct_direction: correctDirection
      });

      console.log(`📊 ${testCase.awayTeam} @ ${testCase.homeTeam}`);
      console.log(`   🏟️  ${testCase.venue} (${testCase.weather})`);
      console.log(`   🎯 Markov Prediction: ${prediction.predicted_total}`);
      console.log(`   📈 Actual Result: ${testCase.actualResult}`);
      console.log(`   📊 Error: ${error.toFixed(2)} runs`);
      console.log(`   ✅ Direction: ${correctDirection ? 'CORRECT' : 'WRONG'}`);
      console.log(`   🎲 Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
      console.log(`   📝 ${testCase.notes}`);
      
      // Show breakdown
      if (prediction.breakdown && !prediction.breakdown.error) {
        console.log(`   🔍 Breakdown:`);
        console.log(`      Team totals: ${prediction.breakdown.team_based_total.toFixed(2)}`);
        console.log(`      Venue adj: ${prediction.breakdown.venue_adjustment.toFixed(2)}`);
        console.log(`      Weather mult: ${prediction.breakdown.weather_multiplier.toFixed(2)}`);
        console.log(`      Home pattern: ${prediction.breakdown.home_pattern.early.toFixed(1)} | ${prediction.breakdown.home_pattern.middle.toFixed(1)} | ${prediction.breakdown.home_pattern.late.toFixed(1)}`);
        console.log(`      Away pattern: ${prediction.breakdown.away_pattern.early.toFixed(1)} | ${prediction.breakdown.away_pattern.middle.toFixed(1)} | ${prediction.breakdown.away_pattern.late.toFixed(1)}`);
      }
      console.log('   ─'.repeat(50));
    }

    // Analysis summary
    const avgError = totalError / testCases.length;
    const directionAccuracy = (correctDirections / testCases.length) * 100;
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

    console.log('\n📈 MARKOV CHAIN PERFORMANCE ANALYSIS');
    console.log('====================================');
    console.log(`📊 Test Cases: ${testCases.length}`);
    console.log(`📉 Average Error: ${avgError.toFixed(2)} runs`);
    console.log(`🎯 Direction Accuracy: ${directionAccuracy.toFixed(1)}%`);
    console.log(`🎲 Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    // Compare with baseline (always predict 8.5)
    const baselineError = testCases.reduce((sum, tc) => sum + Math.abs(8.5 - tc.actualResult), 0) / testCases.length;
    const improvement = ((baselineError - avgError) / baselineError) * 100;
    
    console.log(`\n🆚 vs BASELINE (always 8.5):`);
    console.log(`   Baseline Error: ${baselineError.toFixed(2)} runs`);
    console.log(`   Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);

    // Identify patterns
    console.log('\n🔍 PATTERN ANALYSIS:');
    console.log('====================');
    
    const explosionGames = predictions.filter(p => p.actualResult >= 15);
    const lowScoringGames = predictions.filter(p => p.actualResult <= 7);
    
    console.log(`💥 Explosion Games (15+ runs): ${explosionGames.length}/${testCases.length}`);
    if (explosionGames.length > 0) {
      const explosionAvgError = explosionGames.reduce((sum, g) => sum + g.error, 0) / explosionGames.length;
      console.log(`   Average error on explosions: ${explosionAvgError.toFixed(2)} runs`);
    }

    console.log(`🔽 Low-Scoring Games (≤7 runs): ${lowScoringGames.length}/${testCases.length}`);
    if (lowScoringGames.length > 0) {
      const lowAvgError = lowScoringGames.reduce((sum, g) => sum + g.error, 0) / lowScoringGames.length;
      console.log(`   Average error on low-scoring: ${lowAvgError.toFixed(2)} runs`);
    }

    // Hot weather performance
    const hotWeatherGames = predictions.filter(p => p.weather === 'hot');
    console.log(`🌡️  Hot Weather Games: ${hotWeatherGames.length}/${testCases.length}`);
    if (hotWeatherGames.length > 0) {
      const hotAvgError = hotWeatherGames.reduce((sum, g) => sum + g.error, 0) / hotWeatherGames.length;
      const hotCorrectDir = hotWeatherGames.filter(g => g.correct_direction).length;
      console.log(`   Hot weather error: ${hotAvgError.toFixed(2)} runs`);
      console.log(`   Hot weather direction: ${(hotCorrectDir/hotWeatherGames.length*100).toFixed(1)}%`);
    }

    console.log('\n🎯 MARKOV CHAIN ANALYSIS COMPLETE');
    console.log(`📁 Patterns saved to: data/markov-patterns.json`);
    console.log(`🔄 Ready for integration with V4/V5/V6 models`);

  } catch (error) {
    console.error('❌ Error in Markov analysis:', error);
  }
}

// Run the analysis
runMarkovAnalysis().catch(console.error);

export { runMarkovAnalysis };