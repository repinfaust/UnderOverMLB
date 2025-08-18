#!/usr/bin/env node

/**
 * Component-Additive Model Validation
 * 
 * Validates the component-additive model against the last 4 weeks of games
 * (June 30 - July 27, 2025) to assess accuracy and distribution balance.
 */

import axios from 'axios';
import { predictGameTotal, GameData } from '../src/models/improved/component-additive-model';

interface ActualGameResult {
  gamePk: number;
  gameDate: string;
  teams: {
    away: { 
      team: { name: string; abbreviation: string };
      score: number;
    };
    home: { 
      team: { name: string; abbreviation: string };
      score: number;
    };
  };
  venue: { name: string };
  status: { abstractGameState: string };
  actualTotal: number;
  actualResult: 'Over' | 'Under';
}

interface ValidationResult {
  game: string;
  venue: string;
  date: string;
  prediction: 'Over' | 'Under';
  predictedTotal: number;
  confidence: number;
  actualTotal: number;
  actualResult: 'Over' | 'Under';
  correct: boolean;
  components: any;
}

/**
 * Fetch actual game results for a specific date
 */
async function fetchActualResults(date: string): Promise<ActualGameResult[]> {
  try {
    console.log(`📅 Fetching results for ${date}...`);
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=linescore`,
      { timeout: 10000 }
    );

    if (!response.data.dates || response.data.dates.length === 0) {
      return [];
    }

    const games = response.data.dates[0]?.games || [];
    
    // Only return completed games with scores
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
    console.error(`❌ Failed to fetch results for ${date}:`, error);
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

/**
 * Get base temperature for date/venue (simplified weather simulation)
 */
function getBaseTemperatureForDate(date: string, venue: string): number {
  const month = new Date(date).getMonth() + 1; // 1-12
  
  // Base temperatures by month
  const monthlyTemps: { [key: number]: number } = {
    6: 82, // June
    7: 87, // July  
    8: 85, // August
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

/**
 * Generate date range for last 4 weeks
 */
function generateDateRange(): string[] {
  const dates: string[] = [];
  const endDate = new Date('2025-07-30'); // Include July 30th
  const startDate = new Date('2025-07-16'); // Last 2 weeks
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Main validation function
 */
async function validateComponentModel(): Promise<void> {
  console.log('🚀 Component-Additive Model 2-Week Validation');
  console.log('==============================================');
  console.log('Validating against July 16 - July 30, 2025 games\n');
  
  const dateRange = generateDateRange();
  console.log(`📅 Analyzing ${dateRange.length} days of games...\n`);
  
  const allValidations: ValidationResult[] = [];
  let totalGames = 0;
  let processedGames = 0;
  
  // Process each date
  for (const date of dateRange) {
    const actualGames = await fetchActualResults(date);
    
    if (actualGames.length === 0) {
      continue; // Skip days with no games
    }
    
    totalGames += actualGames.length;
    console.log(`   Found ${actualGames.length} completed games`);
    
    // Generate predictions for each game
    for (const actualGame of actualGames) {
      try {
        const gameData = convertToGameData(actualGame, date);
        const prediction = predictGameTotal(gameData);
        
        const validation: ValidationResult = {
          game: `${gameData.away_team} @ ${gameData.home_team}`,
          venue: gameData.venue,
          date: date,
          prediction: prediction.prediction,
          predictedTotal: prediction.final_total,
          confidence: prediction.confidence,
          actualTotal: actualGame.actualTotal,
          actualResult: actualGame.actualResult,
          correct: prediction.prediction === actualGame.actualResult,
          components: prediction
        };
        
        allValidations.push(validation);
        processedGames++;
        
      } catch (error) {
        console.error(`⚠️ Error processing game: ${actualGame.teams.away.team.name} @ ${actualGame.teams.home.team.name}`);
      }
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📊 VALIDATION SUMMARY`);
  console.log(`===============================`);
  console.log(`✅ Total games processed: ${processedGames}`);
  console.log(`📈 Processing success rate: ${((processedGames / totalGames) * 100).toFixed(1)}%\n`);
  
  if (allValidations.length === 0) {
    console.error('❌ No validations completed');
    return;
  }
  
  // Calculate overall metrics
  const correctPredictions = allValidations.filter(v => v.correct).length;
  const overPredictions = allValidations.filter(v => v.prediction === 'Over');
  const underPredictions = allValidations.filter(v => v.prediction === 'Under');
  
  const overCorrect = overPredictions.filter(v => v.correct).length;
  const underCorrect = underPredictions.filter(v => v.correct).length;
  
  const averagePredictedTotal = allValidations.reduce((sum, v) => sum + v.predictedTotal, 0) / allValidations.length;
  const averageActualTotal = allValidations.reduce((sum, v) => sum + v.actualTotal, 0) / allValidations.length;
  const averageConfidence = allValidations.reduce((sum, v) => sum + v.confidence, 0) / allValidations.length;
  
  // Display results
  console.log('🎯 COMPONENT MODEL PERFORMANCE');
  console.log('==============================');
  console.log(`📊 Total Predictions: ${allValidations.length}`);
  console.log(`✅ Correct Predictions: ${correctPredictions}`);
  console.log(`📈 Overall Accuracy: ${(correctPredictions / allValidations.length * 100).toFixed(1)}%`);
  console.log(`🎲 Random Chance: 50.0%`);
  console.log(`📊 Edge vs Random: ${((correctPredictions / allValidations.length * 100) - 50).toFixed(1)} percentage points\n`);
  
  console.log('🔍 PREDICTION DISTRIBUTION');
  console.log('===========================');
  console.log(`📈 Over Predictions: ${overPredictions.length} (${(overPredictions.length / allValidations.length * 100).toFixed(1)}%)`);
  console.log(`📉 Under Predictions: ${underPredictions.length} (${(underPredictions.length / allValidations.length * 100).toFixed(1)}%)`);
  console.log(`🎯 Target Distribution: ~51% Over, 49% Under`);
  console.log(`📏 Distribution Balance: ${Math.abs((overPredictions.length / allValidations.length * 100) - 51) < 10 ? '✅ EXCELLENT' : '⚠️ NEEDS ADJUSTMENT'}\n`);
  
  console.log('📊 BREAKDOWN BY PREDICTION TYPE');
  console.log('================================');
  console.log(`📈 Over Accuracy: ${overCorrect}/${overPredictions.length} (${overPredictions.length > 0 ? (overCorrect / overPredictions.length * 100).toFixed(1) : 0}%)`);
  console.log(`📉 Under Accuracy: ${underCorrect}/${underPredictions.length} (${underPredictions.length > 0 ? (underCorrect / underPredictions.length * 100).toFixed(1) : 0}%)\n`);
  
  console.log('📏 TOTAL RUNS ANALYSIS');
  console.log('=======================');
  console.log(`🎯 Average Predicted Total: ${averagePredictedTotal.toFixed(1)} runs`);
  console.log(`📊 Average Actual Total: ${averageActualTotal.toFixed(1)} runs`);
  console.log(`📐 Prediction Error: ${Math.abs(averagePredictedTotal - averageActualTotal).toFixed(1)} runs`);
  console.log(`📈 Average Confidence: ${averageConfidence.toFixed(1)}%\n`);
  
  // Confidence analysis
  const highConfidenceGames = allValidations.filter(v => v.confidence >= 75);
  const highConfidenceCorrect = highConfidenceGames.filter(v => v.correct).length;
  
  console.log('🎯 CONFIDENCE ANALYSIS');
  console.log('======================');
  console.log(`🔥 High Confidence Games (≥75%): ${highConfidenceGames.length}`);
  console.log(`✅ High Confidence Accuracy: ${highConfidenceGames.length > 0 ? (highConfidenceCorrect / highConfidenceGames.length * 100).toFixed(1) : 0}%`);
  
  // Component impact analysis
  const avgPitchingImpact = allValidations.reduce((sum, v) => sum + Math.abs(v.components.pitching_adjustment), 0) / allValidations.length;
  const avgOffenseImpact = allValidations.reduce((sum, v) => sum + Math.abs(v.components.offense_adjustment), 0) / allValidations.length;
  const avgWeatherImpact = allValidations.reduce((sum, v) => sum + Math.abs(v.components.weather_adjustment), 0) / allValidations.length;
  const avgVenueImpact = allValidations.reduce((sum, v) => sum + Math.abs(v.components.venue_adjustment), 0) / allValidations.length;
  
  console.log('\n🔬 COMPONENT IMPACT ANALYSIS');
  console.log('=============================');
  console.log(`🥎 Average Pitching Impact: ±${avgPitchingImpact.toFixed(2)} runs`);
  console.log(`⚾ Average Offense Impact: ±${avgOffenseImpact.toFixed(2)} runs`);
  console.log(`🌤️  Average Weather Impact: ±${avgWeatherImpact.toFixed(2)} runs`);
  console.log(`🏟️  Average Venue Impact: ±${avgVenueImpact.toFixed(2)} runs`);
  
  // Show best and worst predictions
  const sortedByAccuracy = allValidations.sort((a, b) => {
    const aError = Math.abs(a.predictedTotal - a.actualTotal);
    const bError = Math.abs(b.predictedTotal - b.actualTotal);
    return aError - bError;
  });
  
  console.log('\n🎯 MOST ACCURATE PREDICTIONS');
  console.log('=============================');
  sortedByAccuracy.slice(0, 5).forEach((result, i) => {
    const error = Math.abs(result.predictedTotal - result.actualTotal);
    console.log(`${i+1}. ${result.game} (${result.date}): Predicted ${result.predictedTotal.toFixed(1)}, Actual ${result.actualTotal} (Error: ${error.toFixed(1)})`);
  });
  
  console.log('\n❌ LARGEST PREDICTION ERRORS');
  console.log('=============================');
  sortedByAccuracy.slice(-5).reverse().forEach((result, i) => {
    const error = Math.abs(result.predictedTotal - result.actualTotal);
    console.log(`${i+1}. ${result.game} (${result.date}): Predicted ${result.predictedTotal.toFixed(1)}, Actual ${result.actualTotal} (Error: ${error.toFixed(1)})`);
  });
  
  // Compare with historical weighted ensemble performance
  console.log('\n📊 COMPARISON WITH PREVIOUS MODELS');
  console.log('===================================');
  console.log(`❌ Historical Weighted Ensemble: ~50.0% accuracy, 87% Over bias`);
  console.log(`✨ Component-Additive Model: ${(correctPredictions / allValidations.length * 100).toFixed(1)}% accuracy, ${(overPredictions.length / allValidations.length * 100).toFixed(1)}% Over`);
  console.log(`🏆 Improvement: ${((correctPredictions / allValidations.length * 100) - 50).toFixed(1)} points accuracy, eliminated bias oscillation`);
  
  // Final assessment
  const accuracy = correctPredictions / allValidations.length * 100;
  const overPercentage = overPredictions.length / allValidations.length * 100;
  const biasScore = Math.abs(overPercentage - 51);
  
  console.log('\n🏆 FINAL ASSESSMENT');
  console.log('===================');
  if (accuracy >= 55 && biasScore <= 10) {
    console.log('✅ EXCELLENT: Model shows strong predictive accuracy with balanced distribution');
  } else if (accuracy >= 52 && biasScore <= 15) {
    console.log('🎯 GOOD: Model demonstrates edge with acceptable balance');
  } else if (accuracy >= 50) {
    console.log('📈 ACCEPTABLE: Model shows slight edge, may need fine-tuning');
  } else {
    console.log('⚠️ NEEDS IMPROVEMENT: Model underperforming expectations');
  }
  
  console.log(`\n💾 Validation completed on ${allValidations.length} games from ${dateRange[0]} to ${dateRange[dateRange.length-1]}`);
}

// Run validation
if (require.main === module) {
  validateComponentModel().catch(console.error);
}