#!/usr/bin/env node

/**
 * Test Component-Additive Model
 * 
 * Tests the new component-additive approach against July 29th games
 * to validate it produces more balanced predictions than weighted ensemble
 */

import { predictGameTotal, formatBreakdown, GameData } from '../src/models/improved/component-additive-model';

// Sample game data for July 29th, 2025 (from our previous run)
const july29Games: GameData[] = [
  {
    home_team: 'Baltimore Orioles',
    away_team: 'Toronto Blue Jays', 
    venue: 'Oriole Park at Camden Yards',
    date: '2025-07-29',
    weather: {
      temp_f: 95,
      humidity: 55,
      wind_speed_mph: 6,
      wind_direction: 'W',
      conditions: 'scattered clouds'
    },
    starting_pitchers: {
      home: 'Zach Eflin',
      away: 'Chris Bassitt'
    }
  },
  {
    home_team: 'Cleveland Guardians',
    away_team: 'Colorado Rockies',
    venue: 'Progressive Field', 
    date: '2025-07-29',
    weather: {
      temp_f: 87,
      humidity: 71,
      wind_speed_mph: 7,
      wind_direction: 'N',
      conditions: 'scattered clouds'
    }
  },
  {
    home_team: 'Detroit Tigers',
    away_team: 'Arizona Diamondbacks',
    venue: 'Comerica Park',
    date: '2025-07-29',
    weather: {
      temp_f: 89,
      humidity: 58,
      wind_speed_mph: 5,
      wind_direction: 'SE', 
      conditions: 'clear sky'
    }
  },
  {
    home_team: 'New York Yankees',
    away_team: 'Tampa Bay Rays',
    venue: 'Yankee Stadium',
    date: '2025-07-29',
    weather: {
      temp_f: 99,
      humidity: 40,
      wind_speed_mph: 12,
      wind_direction: 'W',
      conditions: 'clear sky'
    }
  },
  {
    home_team: 'Cincinnati Reds',
    away_team: 'Los Angeles Dodgers',
    venue: 'Great American Ball Park',
    date: '2025-07-29',
    weather: {
      temp_f: 93,
      humidity: 60,
      wind_speed_mph: 5,
      wind_direction: 'E',
      conditions: 'scattered clouds'
    },
    starting_pitchers: {
      home: 'Chase Burns',
      away: 'Yoshinobu Yamamoto' // Elite pitcher
    }
  },
  {
    home_team: 'Minnesota Twins',
    away_team: 'Boston Red Sox',
    venue: 'Target Field',
    date: '2025-07-29',
    weather: {
      temp_f: 86,
      humidity: 63,
      wind_speed_mph: 6,
      wind_direction: 'NE',
      conditions: 'few clouds'
    }
  },
  {
    home_team: 'Kansas City Royals',
    away_team: 'Atlanta Braves',
    venue: 'Kauffman Stadium',
    date: '2025-07-29',
    weather: {
      temp_f: 96,
      humidity: 48,
      wind_speed_mph: 1,
      wind_direction: 'SSW',
      conditions: 'clear sky'
    }
  },
  {
    home_team: 'Chicago White Sox',
    away_team: 'Philadelphia Phillies',
    venue: 'Rate Field',
    date: '2025-07-29',
    weather: {
      temp_f: 93,
      humidity: 50,
      wind_speed_mph: 10,
      wind_direction: 'SW',
      conditions: 'broken clouds'
    }
  },
  {
    home_team: 'Milwaukee Brewers',  
    away_team: 'Chicago Cubs',
    venue: 'American Family Field',
    date: '2025-07-29',
    weather: {
      temp_f: 88,
      humidity: 61,
      wind_speed_mph: 4,
      wind_direction: 'E',
      conditions: 'clear sky'
    }
  },
  {
    home_team: 'St. Louis Cardinals',
    away_team: 'Miami Marlins',
    venue: 'Busch Stadium',
    date: '2025-07-29',
    weather: {
      temp_f: 98,
      humidity: 58,
      wind_speed_mph: 2,
      wind_direction: 'WNW',
      conditions: 'clear sky'
    }
  },
  {
    home_team: 'Houston Astros',
    away_team: 'Washington Nationals',
    venue: 'Daikin Park',
    date: '2025-07-29',
    weather: {
      temp_f: 98,
      humidity: 43,
      wind_speed_mph: 6,
      wind_direction: 'N',
      conditions: 'clear sky'
    }
  },
  {
    home_team: 'Los Angeles Angels',
    away_team: 'Texas Rangers',
    venue: 'Angel Stadium',
    date: '2025-07-29',
    weather: {
      temp_f: 81,
      humidity: 57,
      wind_speed_mph: 8,
      wind_direction: 'S',
      conditions: 'clear sky'
    }
  },
  {
    home_team: 'San Diego Padres',
    away_team: 'New York Mets',
    venue: 'Petco Park',
    date: '2025-07-29',
    weather: {
      temp_f: 78,
      humidity: 64,
      wind_speed_mph: 7,
      wind_direction: 'W',
      conditions: 'clear sky'
    }
  },
  {
    home_team: 'San Francisco Giants',
    away_team: 'Pittsburgh Pirates',
    venue: 'Oracle Park',
    date: '2025-07-29',
    weather: {
      temp_f: 68,
      humidity: 72,
      wind_speed_mph: 18,
      wind_direction: 'NW',
      conditions: 'few clouds'
    }
  },
  {
    home_team: 'Athletics',
    away_team: 'Seattle Mariners',
    venue: 'Sutter Health Park',
    date: '2025-07-29',
    weather: {
      temp_f: 89,
      humidity: 35,
      wind_speed_mph: 6,
      wind_direction: 'N',
      conditions: 'clear sky'
    },
    starting_pitchers: {
      home: 'JP Sears',
      away: 'Luis Castillo' // Elite pitcher
    }
  }
];

console.log('🚀 Component-Additive Model Test');
console.log('=================================');
console.log('Testing new approach vs weighted ensemble on July 29th games\n');

let overCount = 0;
let underCount = 0;
const results: any[] = [];

july29Games.forEach((game, index) => {
  console.log(`📊 Game ${index + 1}: ${game.away_team} @ ${game.home_team}`);
  console.log('══════════════════════════════════════════════════════════════');
  
  const prediction = predictGameTotal(game);
  
  if (prediction.prediction === 'Over') overCount++;
  else underCount++;
  
  results.push({
    game: `${game.away_team} @ ${game.home_team}`,
    prediction: prediction.prediction,
    total: prediction.final_total,
    confidence: prediction.confidence,
    breakdown: prediction
  });
  
  console.log(`🎲 Prediction: ${prediction.prediction} (${prediction.final_total.toFixed(1)} runs)`);
  console.log(`📈 Confidence: ${prediction.confidence}%`);
  console.log(`🌤️  Weather: ${game.weather.temp_f}°F, ${game.weather.wind_speed_mph}mph ${game.weather.wind_direction}`);
  
  console.log(formatBreakdown(prediction));
  console.log('\n');
});

console.log('📊 COMPONENT-ADDITIVE MODEL SUMMARY');
console.log('====================================');
console.log(`📊 Total Games: ${july29Games.length}`);
console.log(`📈 Over Predictions: ${overCount} (${((overCount/july29Games.length)*100).toFixed(1)}%)`);
console.log(`📉 Under Predictions: ${underCount} (${((underCount/july29Games.length)*100).toFixed(1)}%)`);
console.log(`🎯 Target Distribution: ~51% Over, 49% Under`);
console.log(`📏 Average Predicted Total: ${(results.reduce((sum, r) => sum + r.total, 0) / results.length).toFixed(1)} runs`);
console.log(`📊 Average Confidence: ${(results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(1)}%`);

// Compare with previous approach
console.log('\n🔄 COMPARISON WITH PREVIOUS APPROACHES:');
console.log('======================================');
console.log('❌ Original Weighted Ensemble: 87% Over (14/16) - Extreme bias');
console.log('❌ Overcorrected Ensemble: 100% Under (16/16) - Opposite extreme');
console.log(`✨ Component-Additive Model: ${((overCount/july29Games.length)*100).toFixed(1)}% Over (${overCount}/${july29Games.length}) - ${Math.abs(((overCount/july29Games.length)*100) - 51) < 15 ? 'BALANCED' : 'NEEDS TUNING'}`);

// Show most confident predictions
console.log('\n🎯 HIGHEST CONFIDENCE PREDICTIONS:');
console.log('==================================');
const sortedResults = results.sort((a, b) => b.confidence - a.confidence);
sortedResults.slice(0, 5).forEach((result, i) => {
  console.log(`${i+1}. ${result.game}: ${result.prediction} ${result.total.toFixed(1)} (${result.confidence}%)`);
});

// Show component impact analysis
console.log('\n🔬 COMPONENT IMPACT ANALYSIS:');
console.log('=============================');
const componentImpacts = {
  pitching: results.reduce((sum, r) => sum + Math.abs(r.breakdown.pitching_adjustment), 0) / results.length,
  offense: results.reduce((sum, r) => sum + Math.abs(r.breakdown.offense_adjustment), 0) / results.length,
  weather: results.reduce((sum, r) => sum + Math.abs(r.breakdown.weather_adjustment), 0) / results.length,
  venue: results.reduce((sum, r) => sum + Math.abs(r.breakdown.venue_adjustment), 0) / results.length,
  market: results.reduce((sum, r) => sum + Math.abs(r.breakdown.market_correction), 0) / results.length
};

console.log(`🥎 Average Pitching Impact: ±${componentImpacts.pitching.toFixed(2)} runs`);
console.log(`⚾ Average Offense Impact: ±${componentImpacts.offense.toFixed(2)} runs`);
console.log(`🌤️  Average Weather Impact: ±${componentImpacts.weather.toFixed(2)} runs`);
console.log(`🏟️  Average Venue Impact: ±${componentImpacts.venue.toFixed(2)} runs`);
console.log(`💰 Average Market Impact: ±${componentImpacts.market.toFixed(2)} runs`);