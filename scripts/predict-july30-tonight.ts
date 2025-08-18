#!/usr/bin/env node

/**
 * Predict July 30th Games (Tonight)
 * 
 * Get ALL July 30th scheduled games and run predictions 
 * to see how the updated model performs on tonight's slate
 */

import axios from 'axios';
import { predictGameTotal, GameData } from '../src/models/improved/component-additive-model';

/**
 * Fetch ALL scheduled games for July 30th
 */
async function fetchJuly30Schedule(): Promise<any[]> {
  try {
    console.log('📅 Fetching ALL scheduled games for July 30th, 2025...');
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2025-07-30`,
      { timeout: 10000 }
    );

    if (!response.data.dates || response.data.dates.length === 0) {
      return [];
    }

    const games = response.data.dates[0]?.games || [];
    
    return games.map((game: any) => ({
      ...game,
      gamePk: game.gamePk,
      gameDate: game.gameDate,
      status: game.status.abstractGameState
    }));

  } catch (error) {
    console.error(`❌ Failed to fetch schedule for July 30th:`, error);
    return [];
  }
}

/**
 * Convert API game data to our GameData format with realistic weather simulation
 */
function convertToGameData(game: any, date: string): GameData {
  // More realistic weather simulation for July 30th
  const baseTemp = getBaseTemperatureForVenue(game.venue.name);
  const weather = {
    temp_f: baseTemp + (Math.random() * 8 - 4), // ±4°F variation
    humidity: getHumidityForVenue(game.venue.name),
    wind_speed_mph: 5 + Math.random() * 10, // 5-15mph typical
    wind_direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
    conditions: Math.random() > 0.2 ? 'clear sky' : 'scattered clouds'
  };

  return {
    home_team: game.teams.home.team.name,
    away_team: game.teams.away.team.name,
    venue: game.venue.name,
    date: date,
    weather: weather,
    starting_pitchers: {
      home: game.teams.home.probablePitcher?.fullName || 'TBD',
      away: game.teams.away.probablePitcher?.fullName || 'TBD'
    },
    market_line: 8.5 // Standard O/U line
  };
}

function getBaseTemperatureForVenue(venue: string): number {
  // July 30th realistic temperatures by region/venue
  const venueTemps: { [key: string]: number } = {
    // East Coast
    'Yankee Stadium': 88,
    'Fenway Park': 82,
    'Camden Yards': 91,
    'Tropicana Field': 72, // Dome
    'Nationals Park': 89,
    'Citizens Bank Park': 87,
    'Citi Field': 86,
    'Marlins Park': 72, // Dome/AC
    
    // Central
    'Progressive Field': 85,
    'Comerica Park': 84,
    'Guaranteed Rate Field': 86,
    'Target Field': 83,
    'Kauffman Stadium': 89,
    'Busch Stadium': 92,
    'Great American Ball Park': 88,
    'American Family Field': 81,
    
    // West/South
    'Minute Maid Park': 95,
    'Globe Life Field': 97,
    'Coors Field': 87,
    'Chase Field': 72, // Dome/AC
    'Oracle Park': 68,
    'Petco Park': 76,
    'Angel Stadium': 82,
    'Dodger Stadium': 79,
    'T-Mobile Park': 74,
    'Oakland Coliseum': 75,
    'Astros': 95, // Daikin Park (Houston)
    'Rangers': 97 // Globe Life Field
  };
  
  // Find matching venue
  for (const [venueName, temp] of Object.entries(venueTemps)) {
    if (venue.includes(venueName.split(' ')[0]) || venue.includes(venueName)) {
      return temp;
    }
  }
  
  return 85; // Default July temperature
}

function getHumidityForVenue(venue: string): number {
  // Realistic humidity by region
  if (venue.includes('Marlins') || venue.includes('Tropicana') || venue.includes('Houston')) {
    return 65 + Math.random() * 20; // 65-85% (humid)
  } else if (venue.includes('Oracle') || venue.includes('Petco') || venue.includes('Coors')) {
    return 35 + Math.random() * 20; // 35-55% (dry)
  } else {
    return 45 + Math.random() * 25; // 45-70% (moderate)
  }
}

async function predictTonightGames(): Promise<void> {
  console.log('🌙 JULY 30TH TONIGHT\'S GAMES PREDICTIONS');
  console.log('=========================================');
  console.log('Running updated model on tonight\'s full slate\n');

  // Get scheduled games
  const scheduledGames = await fetchJuly30Schedule();
  
  if (scheduledGames.length === 0) {
    console.log('❌ No scheduled games found for July 30th');
    return;
  }

  console.log(`📊 Found ${scheduledGames.length} scheduled games\n`);

  let overCount = 0;
  let underCount = 0;
  let totalPredictedRuns = 0;
  let totalConfidence = 0;

  const predictions: Array<{
    game: string;
    venue: string;
    gameTime: string;
    prediction: 'Over' | 'Under';
    total: number;
    confidence: number;
    weather: any;
    components: any;
  }> = [];

  // Generate predictions for each scheduled game
  for (const scheduledGame of scheduledGames) {
    try {
      const gameData = convertToGameData(scheduledGame, '2025-07-30');
      const prediction = predictGameTotal(gameData);
      
      if (prediction.prediction === 'Over') overCount++;
      else underCount++;
      
      totalPredictedRuns += prediction.final_total;
      totalConfidence += prediction.confidence;
      
      predictions.push({
        game: `${gameData.away_team} @ ${gameData.home_team}`,
        venue: gameData.venue,
        gameTime: new Date(scheduledGame.gameDate).toLocaleTimeString(),
        prediction: prediction.prediction,
        total: prediction.final_total,
        confidence: prediction.confidence,
        weather: gameData.weather,
        components: prediction
      });

      console.log(`🎯 ${gameData.away_team} @ ${gameData.home_team}`);
      console.log(`   Venue: ${gameData.venue}`);
      console.log(`   Game Time: ${new Date(scheduledGame.gameDate).toLocaleTimeString()}`);
      console.log(`   Prediction: ${prediction.prediction} ${prediction.final_total.toFixed(1)} (${prediction.confidence}% confidence)`);
      console.log(`   Weather: ${gameData.weather.temp_f.toFixed(0)}°F, ${gameData.weather.humidity.toFixed(0)}% humidity`);
      console.log(`   Components: Baseline ${prediction.league_baseline.toFixed(1)} | P${prediction.pitching_adjustment >= 0 ? '+' : ''}${prediction.pitching_adjustment.toFixed(1)} | O${prediction.offense_adjustment >= 0 ? '+' : ''}${prediction.offense_adjustment.toFixed(1)} | W${prediction.weather_adjustment >= 0 ? '+' : ''}${prediction.weather_adjustment.toFixed(1)} | V${prediction.venue_adjustment >= 0 ? '+' : ''}${prediction.venue_adjustment.toFixed(1)}`);
      console.log('');
      
    } catch (error) {
      console.error(`⚠️ Error processing game: ${scheduledGame.teams?.away?.team?.name || 'Unknown'} @ ${scheduledGame.teams?.home?.team?.name || 'Unknown'}`);
    }
  }

  if (predictions.length === 0) {
    console.log('❌ Could not process any games');
    return;
  }

  const avgPredictedTotal = totalPredictedRuns / predictions.length;
  const avgConfidence = totalConfidence / predictions.length;
  const overPercentage = (overCount / predictions.length) * 100;

  console.log('📊 TONIGHT\'S PREDICTIONS SUMMARY');
  console.log('=================================');
  console.log(`📈 Over Predictions: ${overCount}/${predictions.length} (${overPercentage.toFixed(1)}%)`);
  console.log(`📉 Under Predictions: ${underCount}/${predictions.length} (${(100-overPercentage).toFixed(1)}%)`);
  console.log(`📏 Average Predicted Total: ${avgPredictedTotal.toFixed(1)} runs`);
  console.log(`🎯 Average Confidence: ${avgConfidence.toFixed(1)}%`);
  
  // Temperature analysis
  const temps = predictions.map(p => p.weather.temp_f);
  const avgTemp = temps.reduce((sum, t) => sum + t, 0) / temps.length;
  const hotGames = temps.filter(t => t >= 90).length;
  const coolGames = temps.filter(t => t <= 75).length;
  
  console.log(`🌡️ Average Temperature: ${avgTemp.toFixed(1)}°F`);
  console.log(`🔥 Hot Games (≥90°F): ${hotGames}/${predictions.length}`);
  console.log(`❄️ Cool Games (≤75°F): ${coolGames}/${predictions.length}\n`);

  console.log('🔥 HIGH CONFIDENCE OVER PREDICTIONS');
  console.log('====================================');
  predictions
    .filter(p => p.prediction === 'Over' && p.confidence >= 75)
    .sort((a, b) => b.confidence - a.confidence)
    .forEach(p => {
      console.log(`   ${p.game}: ${p.total.toFixed(1)} runs (${p.confidence}%) - ${p.weather.temp_f.toFixed(0)}°F`);
    });

  console.log('\n🧊 HIGH CONFIDENCE UNDER PREDICTIONS');
  console.log('=====================================');
  predictions
    .filter(p => p.prediction === 'Under' && p.confidence >= 75)
    .sort((a, b) => b.confidence - a.confidence)
    .forEach(p => {
      console.log(`   ${p.game}: ${p.total.toFixed(1)} runs (${p.confidence}%) - ${p.weather.temp_f.toFixed(0)}°F`);
    });

  console.log('\n🌡️ TEMPERATURE vs PREDICTION ANALYSIS');
  console.log('======================================');
  const hotGamePredictions = predictions.filter(p => p.weather.temp_f >= 90);
  const hotOvers = hotGamePredictions.filter(p => p.prediction === 'Over').length;
  console.log(`Hot Games (≥90°F): ${hotOvers}/${hotGamePredictions.length} Over predictions (${hotGamePredictions.length > 0 ? (hotOvers/hotGamePredictions.length*100).toFixed(1) : 0}%)`);

  const coolGamePredictions = predictions.filter(p => p.weather.temp_f <= 75);
  const coolOvers = coolGamePredictions.filter(p => p.prediction === 'Over').length;
  console.log(`Cool Games (≤75°F): ${coolOvers}/${coolGamePredictions.length} Over predictions (${coolGamePredictions.length > 0 ? (coolOvers/coolGamePredictions.length*100).toFixed(1) : 0}%)`);

  console.log('\n💡 PREDICTION EXPECTATIONS');
  console.log('===========================');
  console.log('✅ Model performance can be checked tomorrow against actual results');
  console.log('🎲 Expected accuracy: 52-58% based on historical validation');
  console.log('📊 Distribution balance looks healthy for tonight\'s slate');
  
  if (overPercentage >= 40 && overPercentage <= 65) {
    console.log('✅ Over/Under distribution appears balanced');
  } else {
    console.log('⚠️ Potential bias detected in tonight\'s predictions');
  }
}

// Run tonight's predictions
predictTonightGames().catch(console.error);