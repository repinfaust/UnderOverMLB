#!/usr/bin/env node

/**
 * Check August 5th Prediction Logic
 * 
 * Verify that recommendations match the mathematical logic
 */

interface GamePrediction {
  game: string;
  ourPrediction: number;
  marketLine: number;
  ourRecommendation: string;
  confidence: number;
  mathematicallyCorrect: string;
  logicError: boolean;
}

function checkPredictionLogic(): void {
  console.log('🔍 AUGUST 5TH PREDICTION LOGIC CHECK');
  console.log('====================================');
  console.log('Verifying recommendations match mathematical logic\n');

  // Data from the prediction output
  const predictions: GamePrediction[] = [
    {
      game: 'Giants @ Pirates',
      ourPrediction: 8.5,
      marketLine: 7.5,
      ourRecommendation: 'LEAN Under',
      confidence: 78.4,
      mathematicallyCorrect: 'OVER (8.5 > 7.5)',
      logicError: true
    },
    {
      game: 'Twins @ Tigers',
      ourPrediction: 8.5,
      marketLine: 8.5,
      ourRecommendation: 'No Play',
      confidence: 74.5,
      mathematicallyCorrect: 'PUSH (8.5 = 8.5)',
      logicError: false
    },
    {
      game: 'Astros @ Marlins',
      ourPrediction: 8.8,
      marketLine: 8.5,
      ourRecommendation: 'SLIGHT Over',
      confidence: 78.1,
      mathematicallyCorrect: 'OVER (8.8 > 8.5)',
      logicError: false
    },
    {
      game: 'Athletics @ Nationals',
      ourPrediction: 8.5,
      marketLine: 8.5,
      ourRecommendation: 'SLIGHT Over',
      confidence: 76.7,
      mathematicallyCorrect: 'PUSH (8.5 = 8.5)',
      logicError: true
    },
    {
      game: 'Orioles @ Phillies',
      ourPrediction: 8.8,
      marketLine: 9.5,
      ourRecommendation: 'STRONG Over',
      confidence: 81.9,
      mathematicallyCorrect: 'UNDER (8.8 < 9.5)',
      logicError: true
    },
    {
      game: 'Royals @ Red Sox',
      ourPrediction: 8.3,
      marketLine: 7.5,
      ourRecommendation: 'No Play',
      confidence: 72.1,
      mathematicallyCorrect: 'OVER (8.3 > 7.5)',
      logicError: false // No Play is neutral
    },
    {
      game: 'Guardians @ Mets',
      ourPrediction: 8.8,
      marketLine: 8.5,
      ourRecommendation: 'LEAN Over',
      confidence: 78.7,
      mathematicallyCorrect: 'OVER (8.8 > 8.5)',
      logicError: false
    },
    {
      game: 'Brewers @ Braves',
      ourPrediction: 8.2,
      marketLine: 7.5,
      ourRecommendation: 'STRONG Under',
      confidence: 83.0,
      mathematicallyCorrect: 'OVER (8.2 > 7.5)',
      logicError: true
    },
    {
      game: 'Reds @ Cubs',
      ourPrediction: 8.5,
      marketLine: 7.5,
      ourRecommendation: 'STRONG Under',
      confidence: 91.6,
      mathematicallyCorrect: 'OVER (8.5 > 7.5)',
      logicError: true
    },
    {
      game: 'Yankees @ Rangers',
      ourPrediction: 8.2,
      marketLine: 8.5,
      ourRecommendation: 'SLIGHT Under',
      confidence: 77.8,
      mathematicallyCorrect: 'UNDER (8.2 < 8.5)',
      logicError: false
    },
    {
      game: 'Blue Jays @ Rockies',
      ourPrediction: 9.0,
      marketLine: 11.5,
      ourRecommendation: 'STRONG Over',
      confidence: 89.2,
      mathematicallyCorrect: 'UNDER (9.0 < 11.5)',
      logicError: true
    },
    {
      game: 'Rays @ Angels',
      ourPrediction: 8.3,
      marketLine: 8.0,
      ourRecommendation: 'LEAN Under',
      confidence: 86.0,
      mathematicallyCorrect: 'OVER (8.3 > 8.0)',
      logicError: true
    },
    {
      game: 'Padres @ Diamondbacks',
      ourPrediction: 9.1,
      marketLine: 9.0,
      ourRecommendation: 'SLIGHT Over',
      confidence: 78.6,
      mathematicallyCorrect: 'OVER (9.1 > 9.0)',
      logicError: false
    },
    {
      game: 'White Sox @ Mariners',
      ourPrediction: 8.2,
      marketLine: 7.5,
      ourRecommendation: 'STRONG Under',
      confidence: 83.2,
      mathematicallyCorrect: 'OVER (8.2 > 7.5)',
      logicError: true
    },
    {
      game: 'Cardinals @ Dodgers',
      ourPrediction: 8.6,
      marketLine: 9.0,
      ourRecommendation: 'LEAN Over',
      confidence: 84.8,
      mathematicallyCorrect: 'UNDER (8.6 < 9.0)',
      logicError: true
    }
  ];

  console.log('📋 GAME-BY-GAME LOGIC CHECK');
  console.log('============================');

  let correctRecommendations = 0;
  let logicErrors = 0;

  predictions.forEach((pred, index) => {
    const status = pred.logicError ? '❌ LOGIC ERROR' : '✅ CORRECT';
    
    console.log(`${index + 1}. ${pred.game}`);
    console.log(`   Our Prediction: ${pred.ourPrediction.toFixed(1)} runs`);
    console.log(`   Market Line: ${pred.marketLine.toFixed(1)} runs`);
    console.log(`   Our Recommendation: ${pred.ourRecommendation}`);
    console.log(`   Mathematically Should Be: ${pred.mathematicallyCorrect}`);
    console.log(`   Status: ${status}`);
    console.log('');
    
    if (!pred.logicError) correctRecommendations++;
    if (pred.logicError) logicErrors++;
  });

  console.log('📊 SUMMARY STATISTICS');
  console.log('=====================');
  
  const totalGames = predictions.length;
  const correctPercentage = (correctRecommendations / totalGames) * 100;
  const errorPercentage = (logicErrors / totalGames) * 100;

  console.log(`Total Games: ${totalGames}`);
  console.log(`Correct Logic: ${correctRecommendations}/${totalGames} (${correctPercentage.toFixed(1)}%)`);
  console.log(`Logic Errors: ${logicErrors}/${totalGames} (${errorPercentage.toFixed(1)}%)`);

  console.log('\n❌ MAJOR LOGIC ERRORS:');
  console.log('=====================');
  
  const majorErrors = predictions.filter(p => p.logicError);
  majorErrors.forEach((error, index) => {
    const edge = Math.abs(error.ourPrediction - error.marketLine);
    console.log(`${index + 1}. ${error.game}`);
    console.log(`   Predicting ${error.ourPrediction} but recommending ${error.ourRecommendation}`);
    console.log(`   Edge: ${edge.toFixed(1)} runs (${error.ourPrediction > error.marketLine ? 'Over' : 'Under'} should be obvious)`);
  });

  console.log('\n🎯 SYSTEM ISSUES IDENTIFIED:');
  console.log('============================');
  console.log('• Predictions higher than market lines recommending Under bets');
  console.log('• Predictions lower than market lines recommending Over bets');
  console.log('• Logic inversion affecting majority of recommendations');
  console.log('• High confidence on mathematically incorrect recommendations');
  
  console.log('\n⚠️ BETTING IMPACT:');
  console.log('==================');
  console.log('Following these recommendations would bet against our own predictions');
  console.log('This would lose money if our prediction model has any accuracy');
  console.log('System needs immediate logic correction before placing any bets');
}

// Run the check
if (require.main === module) {
  checkPredictionLogic();
}

export { checkPredictionLogic };