#!/usr/bin/env node

/**
 * Check July 29th ALL Games Accuracy
 * 
 * Get ALL July 29th completed games and run predictions against actual results
 */

import axios from 'axios';
import { predictGameTotal, GameData } from '../src/models/improved/component-additive-model';

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
 * Fetch ALL actual game results for July 29th
 */
async function fetchJuly29Results(): Promise<any[]> {
  try {
    console.log('📅 Fetching ALL actual results for July 29th, 2025...');
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

/**
 * Convert API game data to our GameData format with weather simulation
 */
function convertToGameData(game: any, date: string): GameData {
  // Simulate realistic weather data based on date/venue
  const baseTemp = getBaseTemperatureForDate(date, game.venue.name);
  const weather = {
    temp_f: baseTemp + (Math.random() * 10 - 5), // ±5°F variation
    humidity: 45 + Math.random() * 30, // 45-75%
    wind_speed_mph: Math.random() * 15, // 0-15mph
    wind_direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
    conditions: Math.random() > 0.3 ? 'clear sky' : 'scattered clouds'
  };

  return {
    home_team: game.teams.home.team.name,
    away_team: game.teams.away.team.name,
    venue: game.venue.name,
    date: date,
    weather: weather,
    starting_pitchers: {
      home: game.teams.home.probablePitcher?.fullName || 'Unknown',
      away: game.teams.away.probablePitcher?.fullName || 'Unknown'
    },
    market_line: 8.5 // Standard O/U line
  };
}

function getBaseTemperatureForDate(date: string, venue: string): number {
  const month = new Date(date).getMonth() + 1; // 1-12
  
  // Base temperatures by month (July should be hot)
  const monthlyTemps: { [key: number]: number } = {
    7: 90, // July - hot weather
  };
  
  // Venue adjustments
  const venueAdjustments: { [key: string]: number } = {
    'Fenway Park': -3,           // Boston (cooler)
    'Coors Field': 5,            // Denver (altitude, hot days)
    'Minute Maid Park': 8,       // Houston (very hot)
    'Globe Life Field': 8,       // Texas (very hot)
    'Marlins Park': 6,           // Miami (hot, humid)
    'Oracle Park': -10,          // San Francisco (cool)
    'Petco Park': 2,             // San Diego (mild)
    'Safeco Field': -5,          // Seattle (cooler)
    'Tropicana Field': 0,        // Tampa (dome)
  };
  
  let baseTemp = monthlyTemps[month] || 85;
  
  // Apply venue adjustment
  for (const [park, adjustment] of Object.entries(venueAdjustments)) {
    if (venue.includes(park.split(' ')[0])) {
      baseTemp += adjustment;
      break;
    }
  }
  
  return baseTemp;
}

async function checkAllJuly29Games(): Promise<void> {
  console.log('🎯 JULY 29TH ALL GAMES ACCURACY CHECK');
  console.log('=====================================');
  console.log('Fetching ALL July 29th games and running predictions\n');

  // Get actual results
  const actualGames = await fetchJuly29Results();
  
  if (actualGames.length === 0) {
    console.log('❌ No completed games found for July 29th');
    return;
  }

  console.log(`📊 Found ${actualGames.length} completed games\n`);

  const results: GameResult[] = [];

  // Generate predictions for each actual game
  for (const actualGame of actualGames) {
    try {
      const gameData = convertToGameData(actualGame, '2025-07-29');
      const prediction = predictGameTotal(gameData);
      
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
      
    } catch (error) {
      console.error(`⚠️ Error processing game: ${actualGame.teams.away.team.name} @ ${actualGame.teams.home.team.name}`);
    }
  }

  if (results.length === 0) {
    console.log('❌ Could not process any games');
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

  console.log('📊 PREDICTION DISTRIBUTION');
  console.log('===========================');
  console.log(`📈 Over Predictions: ${overPredictions.length} (${(overPredictions.length/results.length*100).toFixed(1)}%)`);
  console.log(`📉 Under Predictions: ${underPredictions.length} (${(underPredictions.length/results.length*100).toFixed(1)}%)\n`);

  console.log('📏 TOTAL RUNS COMPARISON');
  console.log('========================');
  console.log(`🎯 Average Predicted: ${avgPredictedTotal.toFixed(1)} runs`);
  console.log(`📊 Average Actual: ${avgActualTotal.toFixed(1)} runs`);
  console.log(`📐 Prediction Bias: ${(avgPredictedTotal - avgActualTotal).toFixed(1)} runs\n`);

  // Show best and worst predictions
  const sortedByError = [...results].sort((a, b) => a.totalError - b.totalError);
  
  console.log('🎯 MOST ACCURATE PREDICTIONS');
  console.log('=============================');
  sortedByError.slice(0, 5).forEach((result, i) => {
    const correctIcon = result.correct ? '✅' : '❌';
    console.log(`${i+1}. ${correctIcon} ${result.game}: Predicted ${result.predictedTotal.toFixed(1)}, Actual ${result.actualTotal} (Error: ${result.totalError.toFixed(1)})`);
  });

  console.log('\n❌ LARGEST ERRORS');
  console.log('==================');
  sortedByError.slice(-5).reverse().forEach((result, i) => {
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

  console.log(`\n💾 Analysis completed on ${results.length} games from July 29th, 2025`);
}

// Run the accuracy check
checkAllJuly29Games().catch(console.error);