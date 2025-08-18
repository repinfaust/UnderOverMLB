#!/usr/bin/env node

/**
 * Simple prediction script to test the system
 */

console.log('🏈 MLB Prediction System - Simple Test');
console.log('====================================');

async function runSimplePrediction() {
  try {
    // Simulate fetching today's games
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Getting predictions for ${today}`);

    // Mock today's games (in a real system, this would come from MLB API)
    const mockGames = [
      {
        gameId: `${today}_LAA@OAK`,
        homeTeam: 'Oakland Athletics',
        awayTeam: 'Los Angeles Angels',
        venue: 'Oakland Coliseum',
        gameTime: '19:07'
      },
      {
        gameId: `${today}_NYY@BOS`,
        homeTeam: 'Boston Red Sox', 
        awayTeam: 'New York Yankees',
        venue: 'Fenway Park',
        gameTime: '19:10'
      },
      {
        gameId: `${today}_LAD@SF`,
        homeTeam: 'San Francisco Giants',
        awayTeam: 'Los Angeles Dodgers', 
        venue: 'Oracle Park',
        gameTime: '22:05'
      }
    ];

    console.log(`\n🎯 Found ${mockGames.length} games for today:`);

    // Simulate predictions for each game
    for (let i = 0; i < mockGames.length; i++) {
      const game = mockGames[i];
      console.log(`\n📊 Game ${i + 1}: ${game.awayTeam} @ ${game.homeTeam}`);
      console.log('══════════════════════════════════════════════════════════════');
      
      // Simulate processing time
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      const processingTime = Date.now() - startTime;

      // Mock prediction results
      const mockPrediction = generateMockPrediction(game);
      
      console.log(`🎲 Ensemble Prediction: ${mockPrediction.prediction}`);
      console.log(`🎯 Calculated Total: ${mockPrediction.calculatedTotal}`);
      console.log(`📈 Confidence: ${(mockPrediction.confidence * 100).toFixed(1)}%`);
      console.log(`⚡ Processing Time: ${processingTime}ms`);
      console.log(`💡 Recommendation: ${mockPrediction.recommendation}`);
      
      if (mockPrediction.keyInsights.length > 0) {
        console.log(`🔍 Key Insights:`);
        mockPrediction.keyInsights.forEach(insight => {
          console.log(`   • ${insight}`);
        });
      }
    }

    console.log('\n✅ Prediction run completed successfully!');
    console.log('\n📝 Note: This is a test run with mock data.');
    console.log('   To configure real API connections, update your .env file with:');
    console.log('   - ODDS_API_KEY (from the-odds-api.com)');
    console.log('   - WEATHER_API_KEY (from weatherapi.com)');

  } catch (error) {
    console.error('❌ Prediction failed:', error);
    process.exit(1);
  }
}

function generateMockPrediction(game: any) {
  // Generate realistic mock prediction
  const baseTotal = 8.5;
  const variation = (Math.random() - 0.5) * 3; // ±1.5 runs variation
  const calculatedTotal = Number((baseTotal + variation).toFixed(1));
  
  const prediction = calculatedTotal > 8.5 ? 'Over' : 'Under';
  const confidence = 0.55 + Math.random() * 0.35; // 55-90% confidence
  
  let recommendation = 'No Play';
  const edge = Math.abs(calculatedTotal - 8.5);
  
  if (edge > 0.5 && confidence > 0.75) {
    recommendation = `Strong ${prediction}`;
  } else if (edge > 0.3 && confidence > 0.65) {
    recommendation = `Lean ${prediction}`;
  } else if (edge > 0.2 && confidence > 0.60) {
    recommendation = `Slight ${prediction}`;
  }

  const keyInsights = [];
  
  if (confidence > 0.80) {
    keyInsights.push('High confidence prediction based on strong model agreement');
  }
  
  if (edge > 0.8) {
    keyInsights.push('Significant edge detected vs market expectations');
  }
  
  if (calculatedTotal > 10.0) {
    keyInsights.push('High-scoring game anticipated');
  } else if (calculatedTotal < 7.0) {
    keyInsights.push('Low-scoring pitchers\' duel expected');
  }

  // Add game-specific insights
  if (game.venue === 'Oakland Coliseum') {
    keyInsights.push('Pitcher-friendly ballpark historically suppresses offense');
  } else if (game.venue === 'Fenway Park') {
    keyInsights.push('Unique ballpark dimensions may favor certain hitting approaches');
  } else if (game.venue === 'Oracle Park') {
    keyInsights.push('Weather and wind patterns typically impact ball flight');
  }

  return {
    prediction,
    calculatedTotal,
    confidence: Number(confidence.toFixed(3)),
    recommendation,
    keyInsights,
    modelBreakdown: {
      Model_A_Pitching: { prediction: Math.random() > 0.5 ? 'Over' : 'Under', confidence: 0.6 + Math.random() * 0.3 },
      Model_B_Offense: { prediction: Math.random() > 0.5 ? 'Over' : 'Under', confidence: 0.6 + Math.random() * 0.3 },
      Model_C_Weather_Park: { prediction: Math.random() > 0.5 ? 'Over' : 'Under', confidence: 0.6 + Math.random() * 0.3 },
      Model_D_Market_Sentiment: { prediction: Math.random() > 0.5 ? 'Over' : 'Under', confidence: 0.6 + Math.random() * 0.3 },
    }
  };
}

// Run the prediction
runSimplePrediction();