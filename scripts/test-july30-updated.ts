#!/usr/bin/env node

/**
 * Test Updated Component Model on July 30th Games
 * 
 * Runs the updated model against July 30th games WITHOUT looking at actual results
 * to see if the tweaks improved the prediction distribution and accuracy.
 */

import { predictGameTotal, GameData, formatBreakdown } from '../src/models/improved/component-additive-model';

// July 30th game data (same as used in bias diagnostic)
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

function testUpdatedModel(): void {
  console.log('🧪 TESTING UPDATED COMPONENT MODEL - JULY 30TH');
  console.log('==============================================');
  console.log('Running updated model against July 30th games (blind test)\n');
  
  let overCount = 0;
  let underCount = 0;
  let totalRuns = 0;
  let totalConfidence = 0;
  
  const predictions: Array<{
    game: string;
    prediction: 'Over' | 'Under';
    total: number;
    confidence: number;
    factors: string[];
  }> = [];
  
  july30Games.forEach((game, index) => {
    const result = predictGameTotal(game);
    
    if (result.prediction === 'Over') overCount++;
    else underCount++;
    
    totalRuns += result.final_total;
    totalConfidence += result.confidence;
    
    predictions.push({
      game: `${game.away_team} @ ${game.home_team}`,
      prediction: result.prediction,
      total: result.final_total,
      confidence: result.confidence,
      factors: result.components_contributing
    });
    
    console.log(`${index + 1}. ${game.away_team} @ ${game.home_team}`);
    console.log(`   🎯 Prediction: ${result.prediction} ${result.final_total.toFixed(1)} (${result.confidence}% confidence)`);
    console.log(`   🏟️  Venue: ${game.venue}`);
    console.log(`   🌡️  Weather: ${game.weather.temp_f}°F, ${game.weather.humidity}% humidity, ${game.weather.wind_speed_mph}mph ${game.weather.wind_direction}`);
    console.log(`   📊 Components: Baseline ${result.league_baseline.toFixed(1)} | Pitching ${result.pitching_adjustment >= 0 ? '+' : ''}${result.pitching_adjustment.toFixed(1)} | Offense ${result.offense_adjustment >= 0 ? '+' : ''}${result.offense_adjustment.toFixed(1)} | Weather ${result.weather_adjustment >= 0 ? '+' : ''}${result.weather_adjustment.toFixed(1)} | Venue ${result.venue_adjustment >= 0 ? '+' : ''}${result.venue_adjustment.toFixed(1)}`);
    console.log('');
  });
  
  const avgTotal = totalRuns / july30Games.length;
  const avgConfidence = totalConfidence / july30Games.length;
  const overPercentage = (overCount / july30Games.length) * 100;
  const underPercentage = (underCount / july30Games.length) * 100;
  
  console.log('📊 UPDATED MODEL SUMMARY');
  console.log('========================');
  console.log(`📈 Over Predictions: ${overCount}/${july30Games.length} (${overPercentage.toFixed(1)}%)`);
  console.log(`📉 Under Predictions: ${underCount}/${july30Games.length} (${underPercentage.toFixed(1)}%)`);
  console.log(`📏 Average Predicted Total: ${avgTotal.toFixed(1)} runs`);
  console.log(`🎯 Average Confidence: ${avgConfidence.toFixed(1)}%`);
  console.log(`🌡️  Temperature Range: ${Math.min(...july30Games.map(g => g.weather.temp_f))}°F - ${Math.max(...july30Games.map(g => g.weather.temp_f))}°F`);
  
  console.log('\n🔥 HIGH CONFIDENCE OVER PREDICTIONS:');
  predictions
    .filter(p => p.prediction === 'Over' && p.confidence >= 75)
    .forEach(p => console.log(`   ${p.game}: ${p.total.toFixed(1)} runs (${p.confidence}%)`));
  
  console.log('\n🧊 HIGH CONFIDENCE UNDER PREDICTIONS:');
  predictions
    .filter(p => p.prediction === 'Under' && p.confidence >= 75)
    .forEach(p => console.log(`   ${p.game}: ${p.total.toFixed(1)} runs (${p.confidence}%)`));
  
  console.log('\n🌡️  HOT WEATHER GAMES (90°F+):');
  july30Games
    .filter(g => g.weather.temp_f >= 90)
    .forEach(g => {
      const pred = predictions.find(p => p.game.includes(g.home_team));
      console.log(`   ${g.away_team} @ ${g.home_team}: ${g.weather.temp_f}°F → ${pred?.prediction} ${pred?.total.toFixed(1)}`);
    });
  
  console.log('\n💡 MODEL PERFORMANCE EXPECTATIONS:');
  console.log('==================================');
  if (overPercentage >= 45 && overPercentage <= 65) {
    console.log('✅ Distribution Balance: GOOD (within 45-65% range)');
  } else if (overPercentage < 30 || overPercentage > 75) {
    console.log('❌ Distribution Balance: POOR (extreme bias detected)');
  } else {
    console.log('⚠️ Distribution Balance: MODERATE (some bias present)');
  }
  
  if (avgTotal >= 8.3 && avgTotal <= 9.0) {
    console.log('✅ Average Total: REALISTIC (8.3-9.0 runs expected for July)');
  } else {
    console.log('⚠️ Average Total: May need calibration');
  }
  
  console.log('\n🎲 Next Step: Compare against actual results to measure accuracy');
}

// Run the test
testUpdatedModel();