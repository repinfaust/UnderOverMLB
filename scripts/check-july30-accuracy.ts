#!/usr/bin/env node

/**
 * Check July 30th Accuracy
 * 
 * Compare the updated model's predictions against actual July 30th results
 * to measure real accuracy improvement.
 */

import axios from 'axios';
import { predictGameTotal, GameData } from '../src/models/improved/component-additive-model';

// July 30th game data with predictions
const july30Games: GameData[] = [
  {
    home_team: 'Baltimore Orioles',
    away_team: 'Toronto Blue Jays',
    venue: 'Oriole Park at Camden Yards',
    date: '2025-07-30',
    weather: { temp_f: 94, humidity: 56, wind_speed_mph: 6, wind_direction: 'N', conditions: 'scattered clouds' }
  },
  {
    home_team: 'Detroit Tigers',
    away_team: 'Arizona Diamondbacks',
    venue: 'Comerica Park',
    date: '2025-07-30',
    weather: { temp_f: 86, humidity: 70, wind_speed_mph: 11, wind_direction: 'ENE', conditions: 'clear sky' }
  },
  {
    home_team: 'Minnesota Twins',
    away_team: 'Boston Red Sox',
    venue: 'Target Field',
    date: '2025-07-30',
    weather: { temp_f: 80, humidity: 54, wind_speed_mph: 15, wind_direction: 'NE', conditions: 'haze' }
  },
  {
    home_team: 'Houston Astros',
    away_team: 'Washington Nationals',
    venue: 'Daikin Park',
    date: '2025-07-30',
    weather: { temp_f: 98, humidity: 43, wind_speed_mph: 5, wind_direction: 'N', conditions: 'clear sky' }
  },
  {
    home_team: 'Kansas City Royals',
    away_team: 'Atlanta Braves',
    venue: 'Kauffman Stadium',
    date: '2025-07-30',
    weather: { temp_f: 86, humidity: 69, wind_speed_mph: 1, wind_direction: 'NE', conditions: 'scattered clouds' }
  },
  {
    home_team: 'Chicago White Sox',
    away_team: 'Philadelphia Phillies',
    venue: 'Rate Field',
    date: '2025-07-30',
    weather: { temp_f: 74, humidity: 92, wind_speed_mph: 1, wind_direction: 'ENE', conditions: 'moderate rain' }
  },
  {
    home_team: 'Milwaukee Brewers',
    away_team: 'Chicago Cubs',
    venue: 'American Family Field',
    date: '2025-07-30',
    weather: { temp_f: 66, humidity: 88, wind_speed_mph: 14, wind_direction: 'NE', conditions: 'moderate rain' }
  },
  {
    home_team: 'San Francisco Giants',
    away_team: 'Pittsburgh Pirates',
    venue: 'Oracle Park',
    date: '2025-07-30',
    weather: { temp_f: 63, humidity: 78, wind_speed_mph: 15, wind_direction: 'WSW', conditions: 'broken clouds' }
  },
  {
    home_team: 'San Diego Padres',
    away_team: 'New York Mets',
    venue: 'Petco Park',
    date: '2025-07-30',
    weather: { temp_f: 78, humidity: 64, wind_speed_mph: 9, wind_direction: 'W', conditions: 'clear sky' }
  },
  {
    home_team: 'Cleveland Guardians',
    away_team: 'Colorado Rockies',
    venue: 'Progressive Field',
    date: '2025-07-30',
    weather: { temp_f: 87, humidity: 67, wind_speed_mph: 5, wind_direction: 'N', conditions: 'broken clouds' }
  },
  {
    home_team: 'New York Yankees',
    away_team: 'Tampa Bay Rays',
    venue: 'Yankee Stadium',
    date: '2025-07-30',
    weather: { temp_f: 96, humidity: 42, wind_speed_mph: 16, wind_direction: 'S', conditions: 'clear sky' }
  },
  {
    home_team: 'Cincinnati Reds',
    away_team: 'Los Angeles Dodgers',
    venue: 'Great American Ball Park',
    date: '2025-07-30',
    weather: { temp_f: 93, humidity: 54, wind_speed_mph: 6, wind_direction: 'N', conditions: 'few clouds' }
  },
  {
    home_team: 'St. Louis Cardinals',
    away_team: 'Miami Marlins',
    venue: 'Busch Stadium',
    date: '2025-07-30',
    weather: { temp_f: 92, humidity: 64, wind_speed_mph: 2, wind_direction: 'WNW', conditions: 'broken clouds' }
  },
  {
    home_team: 'Los Angeles Angels',
    away_team: 'Texas Rangers',
    venue: 'Angel Stadium',
    date: '2025-07-30',
    weather: { temp_f: 80, humidity: 58, wind_speed_mph: 10, wind_direction: 'SSW', conditions: 'clear sky' }
  },
  {
    home_team: 'Athletics',
    away_team: 'Seattle Mariners',
    venue: 'Sutter Health Park',
    date: '2025-07-30',
    weather: { temp_f: 82, humidity: 42, wind_speed_mph: 9, wind_direction: 'SW', conditions: 'clear sky' }
  }
];

interface GameResult {
  game: string;
  predicted: 'Over' | 'Under';
  predictedTotal: number;
  confidence: number;
  actualTotal: number;
  actualResult: 'Over' | 'Under';
  correct: boolean;
  totalError: number;
}

/**
 * Fetch actual game results for July 30th
 */
async function fetchJuly30Results(): Promise<any[]> {
  try {
    console.log('📅 Fetching actual results for July 29th, 2025 (yesterday\'s games)...');
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2025-07-29&hydrate=linescore`,
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
        ...game,
        actualTotal: game.teams.home.score + game.teams.away.score,
        actualResult: (game.teams.home.score + game.teams.away.score) > 8.5 ? 'Over' : 'Under'
      }));

  } catch (error) {
    console.error(`❌ Failed to fetch results for July 29th:`, error);
    return [];
  }
}

async function checkAccuracy(): Promise<void> {
  console.log('🎯 JULY 29TH ACCURACY CHECK (Yesterday\'s Games)');
  console.log('===============================================');
  console.log('Comparing updated model predictions vs actual July 29th results\n');

  // Get actual results
  const actualGames = await fetchJuly30Results();
  
  if (actualGames.length === 0) {
    console.log('❌ No completed games found for July 30th');
    return;
  }

  console.log(`📊 Found ${actualGames.length} completed games\n`);

  const results: GameResult[] = [];

  // Generate predictions and compare
  for (const gameData of july30Games) {
    const prediction = predictGameTotal(gameData);
    
    // Find matching actual game
    const actualGame = actualGames.find(ag => 
      ag.teams.home.team.name.includes(gameData.home_team.split(' ')[0]) ||
      ag.teams.away.team.name.includes(gameData.away_team.split(' ')[0])
    );

    if (actualGame) {
      const result: GameResult = {
        game: `${gameData.away_team} @ ${gameData.home_team}`,
        predicted: prediction.prediction,
        predictedTotal: prediction.final_total,
        confidence: prediction.confidence,
        actualTotal: actualGame.actualTotal,
        actualResult: actualGame.actualResult,
        correct: prediction.prediction === actualGame.actualResult,
        totalError: Math.abs(prediction.final_total - actualGame.actualTotal)
      };

      results.push(result);

      const correctIcon = result.correct ? '✅' : '❌';
      console.log(`${correctIcon} ${result.game}`);
      console.log(`   Predicted: ${result.predicted} ${result.predictedTotal.toFixed(1)} (${result.confidence}%)`);
      console.log(`   Actual: ${result.actualResult} ${result.actualTotal} runs`);
      console.log(`   Error: ${result.totalError.toFixed(1)} runs\n`);
    }
  }

  if (results.length === 0) {
    console.log('❌ Could not match any predictions with actual results');
    return;
  }

  // Calculate overall accuracy metrics
  const correctPredictions = results.filter(r => r.correct).length;
  const accuracy = (correctPredictions / results.length) * 100;
  const avgTotalError = results.reduce((sum, r) => sum + r.totalError, 0) / results.length;
  
  const overPredictions = results.filter(r => r.predicted === 'Over');
  const underPredictions = results.filter(r => r.predicted === 'Under');
  const overCorrect = overPredictions.filter(r => r.correct).length;
  const underCorrect = underPredictions.filter(r => r.correct).length;

  const avgPredictedTotal = results.reduce((sum, r) => sum + r.predictedTotal, 0) / results.length;
  const avgActualTotal = results.reduce((sum, r) => sum + r.actualTotal, 0) / results.length;

  console.log('📊 ACCURACY SUMMARY');
  console.log('===================');
  console.log(`🎯 Overall Accuracy: ${correctPredictions}/${results.length} (${accuracy.toFixed(1)}%)`);
  console.log(`🎲 Random Chance: 50.0%`);
  console.log(`📈 Edge vs Random: ${(accuracy - 50).toFixed(1)} percentage points`);
  console.log(`📏 Average Total Error: ${avgTotalError.toFixed(1)} runs\n`);

  console.log('🔍 BREAKDOWN BY PREDICTION TYPE');
  console.log('================================');
  console.log(`📈 Over Predictions: ${overCorrect}/${overPredictions.length} correct (${overPredictions.length > 0 ? (overCorrect/overPredictions.length*100).toFixed(1) : 0}%)`);
  console.log(`📉 Under Predictions: ${underCorrect}/${underPredictions.length} correct (${underPredictions.length > 0 ? (underCorrect/underPredictions.length*100).toFixed(1) : 0}%)\n`);

  console.log('📏 TOTAL RUNS COMPARISON');
  console.log('========================');
  console.log(`🎯 Average Predicted: ${avgPredictedTotal.toFixed(1)} runs`);
  console.log(`📊 Average Actual: ${avgActualTotal.toFixed(1)} runs`);
  console.log(`📐 Prediction Bias: ${(avgPredictedTotal - avgActualTotal).toFixed(1)} runs\n`);

  // Show best and worst predictions
  const sortedByError = [...results].sort((a, b) => a.totalError - b.totalError);
  
  console.log('🎯 MOST ACCURATE PREDICTIONS');
  console.log('=============================');
  sortedByError.slice(0, 3).forEach((result, i) => {
    const correctIcon = result.correct ? '✅' : '❌';
    console.log(`${i+1}. ${correctIcon} ${result.game}: Predicted ${result.predictedTotal.toFixed(1)}, Actual ${result.actualTotal} (Error: ${result.totalError.toFixed(1)})`);
  });

  console.log('\n❌ LARGEST ERRORS');
  console.log('==================');
  sortedByError.slice(-3).reverse().forEach((result, i) => {
    const correctIcon = result.correct ? '✅' : '❌';
    console.log(`${i+1}. ${correctIcon} ${result.game}: Predicted ${result.predictedTotal.toFixed(1)}, Actual ${result.actualTotal} (Error: ${result.totalError.toFixed(1)})`);
  });

  // High confidence analysis
  const highConfidenceGames = results.filter(r => r.confidence >= 75);
  const highConfidenceCorrect = highConfidenceGames.filter(r => r.correct).length;
  
  console.log('\n🎯 HIGH CONFIDENCE ANALYSIS');
  console.log('============================');
  console.log(`🔥 High Confidence Games (≥75%): ${highConfidenceGames.length}`);
  console.log(`✅ High Confidence Accuracy: ${highConfidenceGames.length > 0 ? (highConfidenceCorrect/highConfidenceGames.length*100).toFixed(1) : 0}%`);

  // Performance assessment
  console.log('\n🏆 PERFORMANCE ASSESSMENT');
  console.log('=========================');
  if (accuracy >= 60) {
    console.log('🌟 EXCELLENT: Model showing strong predictive edge');
  } else if (accuracy >= 55) {
    console.log('✅ GOOD: Model demonstrating solid accuracy');
  } else if (accuracy >= 50) {
    console.log('📈 ACCEPTABLE: Model showing slight edge');
  } else {
    console.log('❌ POOR: Model underperforming random chance');
  }

  if (avgTotalError <= 1.5) {
    console.log('🎯 Total predictions are well-calibrated');
  } else if (avgTotalError <= 2.5) {
    console.log('📏 Total predictions are reasonably accurate');
  } else {
    console.log('⚠️ Total predictions may need recalibration');
  }
}

// Run the accuracy check
checkAccuracy().catch(console.error);