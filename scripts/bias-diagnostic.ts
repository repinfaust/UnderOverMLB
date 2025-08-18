#!/usr/bin/env node

/**
 * Bias Diagnostic Tool
 * 
 * Analyzes the component-additive model to identify what's causing
 * the Under prediction bias on specific days like July 30th.
 */

import { predictGameTotal, GameData } from '../src/models/improved/component-additive-model';

// Tonight's game data (July 30th) showing 86.7% Under bias
const tonightsGames: GameData[] = [
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

// July 29th games for comparison (40% Over, 60% Under - more balanced)
const july29Games: GameData[] = [
  {
    home_team: 'Baltimore Orioles',
    away_team: 'Toronto Blue Jays',
    venue: 'Oriole Park at Camden Yards',
    date: '2025-07-29',
    weather: { temp_f: 95, humidity: 55, wind_speed_mph: 6, wind_direction: 'W', conditions: 'scattered clouds' }
  },
  {
    home_team: 'New York Yankees',
    away_team: 'Tampa Bay Rays',
    venue: 'Yankee Stadium',
    date: '2025-07-29',
    weather: { temp_f: 99, humidity: 40, wind_speed_mph: 12, wind_direction: 'W', conditions: 'clear sky' }
  },
  // Add a few more for comparison...
  {
    home_team: 'Houston Astros',
    away_team: 'Washington Nationals',
    venue: 'Daikin Park',
    date: '2025-07-29',
    weather: { temp_f: 98, humidity: 43, wind_speed_mph: 6, wind_direction: 'N', conditions: 'clear sky' }
  }
];

interface BiasAnalysis {
  game: string;
  prediction: 'Over' | 'Under';
  total: number;
  components: {
    baseline: number;
    pitching: number;
    offense: number;
    weather: number;
    venue: number;
    market: number;
  };
  biasDrivers: string[];
}

function analyzeBias(games: GameData[], label: string): void {
  console.log(`\n🔍 BIAS ANALYSIS: ${label}`);
  console.log('='.repeat(50));
  
  const results: BiasAnalysis[] = [];
  let overCount = 0;
  let underCount = 0;
  
  // Component totals for analysis
  let totalPitchingAdjustment = 0;
  let totalOffenseAdjustment = 0;
  let totalWeatherAdjustment = 0;
  let totalVenueAdjustment = 0;
  let totalMarketAdjustment = 0;
  
  games.forEach(game => {
    const prediction = predictGameTotal(game);
    
    if (prediction.prediction === 'Over') overCount++;
    else underCount++;
    
    // Track component contributions
    totalPitchingAdjustment += prediction.pitching_adjustment;
    totalOffenseAdjustment += prediction.offense_adjustment;
    totalWeatherAdjustment += prediction.weather_adjustment;
    totalVenueAdjustment += prediction.venue_adjustment;
    totalMarketAdjustment += prediction.market_correction;
    
    // Identify bias drivers
    const biasDrivers: string[] = [];
    if (prediction.pitching_adjustment < -0.5) biasDrivers.push('Strong pitching suppression');
    if (prediction.offense_adjustment < -0.3) biasDrivers.push('Weak offense penalty');
    if (prediction.weather_adjustment < -0.2) biasDrivers.push('Weather suppression');
    if (prediction.venue_adjustment < -0.3) biasDrivers.push('Pitcher-friendly venue');
    if (prediction.venue_adjustment > 0.3) biasDrivers.push('Hitter-friendly venue');
    
    results.push({
      game: `${game.away_team} @ ${game.home_team}`,
      prediction: prediction.prediction,
      total: prediction.final_total,
      components: {
        baseline: prediction.league_baseline,
        pitching: prediction.pitching_adjustment,
        offense: prediction.offense_adjustment,
        weather: prediction.weather_adjustment,
        venue: prediction.venue_adjustment,
        market: prediction.market_correction
      },
      biasDrivers
    });
  });
  
  console.log(`📊 Distribution: ${overCount} Over (${(overCount/games.length*100).toFixed(1)}%), ${underCount} Under (${(underCount/games.length*100).toFixed(1)}%)`);
  console.log(`📏 Average Total: ${(results.reduce((sum, r) => sum + r.total, 0) / results.length).toFixed(2)} runs`);
  
  // Component analysis
  console.log('\n🔬 COMPONENT IMPACT ANALYSIS:');
  console.log(`⚾ Average Pitching Adjustment: ${(totalPitchingAdjustment/games.length).toFixed(3)}`);
  console.log(`🏃 Average Offense Adjustment: ${(totalOffenseAdjustment/games.length).toFixed(3)}`);
  console.log(`🌤️  Average Weather Adjustment: ${(totalWeatherAdjustment/games.length).toFixed(3)}`);
  console.log(`🏟️  Average Venue Adjustment: ${(totalVenueAdjustment/games.length).toFixed(3)}`);
  console.log(`💰 Average Market Adjustment: ${(totalMarketAdjustment/games.length).toFixed(3)}`);
  
  // Identify bias drivers
  const commonDrivers: { [key: string]: number } = {};
  results.forEach(r => {
    r.biasDrivers.forEach(driver => {
      commonDrivers[driver] = (commonDrivers[driver] || 0) + 1;
    });
  });
  
  console.log('\n🎯 COMMON BIAS DRIVERS:');
  Object.entries(commonDrivers)
    .sort(([,a], [,b]) => b - a)
    .forEach(([driver, count]) => {
      console.log(`   ${driver}: ${count}/${games.length} games (${(count/games.length*100).toFixed(1)}%)`);
    });
  
  // Show most extreme Under predictions
  const underPredictions = results.filter(r => r.prediction === 'Under').sort((a, b) => a.total - b.total);
  console.log('\n📉 MOST EXTREME UNDER PREDICTIONS:');
  underPredictions.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. ${r.game}: ${r.total.toFixed(1)} runs`);
    console.log(`   Components: P${r.components.pitching.toFixed(1)} O${r.components.offense.toFixed(1)} W${r.components.weather.toFixed(1)} V${r.components.venue.toFixed(1)}`);
    console.log(`   Drivers: ${r.biasDrivers.join(', ') || 'None identified'}`);
  });
}

function identifySpecificBiasFactors(): void {
  console.log('\n🔍 SPECIFIC BIAS FACTOR ANALYSIS');
  console.log('='.repeat(50));
  
  // Analyze temperature distribution
  const temps = tonightsGames.map(g => g.weather.temp_f);
  const avgTemp = temps.reduce((sum, t) => sum + t, 0) / temps.length;
  const coolGames = temps.filter(t => t < 75).length;
  const hotGames = temps.filter(t => t > 90).length;
  
  console.log('🌡️  TEMPERATURE ANALYSIS:');
  console.log(`   Average Temperature: ${avgTemp.toFixed(1)}°F`);
  console.log(`   Cool Games (<75°F): ${coolGames}/${temps.length} (${(coolGames/temps.length*100).toFixed(1)}%)`);
  console.log(`   Hot Games (>90°F): ${hotGames}/${temps.length} (${(hotGames/temps.length*100).toFixed(1)}%)`);
  
  // Analyze humidity
  const humidity = tonightsGames.map(g => g.weather.humidity);
  const avgHumidity = humidity.reduce((sum, h) => sum + h, 0) / humidity.length;
  const highHumidity = humidity.filter(h => h > 70).length;
  
  console.log('\n💧 HUMIDITY ANALYSIS:');
  console.log(`   Average Humidity: ${avgHumidity.toFixed(1)}%`);
  console.log(`   High Humidity (>70%): ${highHumidity}/${humidity.length} (${(highHumidity/humidity.length*100).toFixed(1)}%)`);
  
  // Analyze wind
  const winds = tonightsGames.map(g => g.weather.wind_speed_mph);
  const avgWind = winds.reduce((sum, w) => sum + w, 0) / winds.length;
  const strongWind = winds.filter(w => w > 12).length;
  
  console.log('\n💨 WIND ANALYSIS:');
  console.log(`   Average Wind Speed: ${avgWind.toFixed(1)} mph`);
  console.log(`   Strong Wind (>12mph): ${strongWind}/${winds.length} (${(strongWind/winds.length*100).toFixed(1)}%)`);
  
  // Analyze venues
  const venues = tonightsGames.map(g => g.venue);
  const pitcherFriendlyVenues = [
    'Oracle Park', 'Petco Park', 'Marlins Park', 'Kauffman Stadium', 
    'Comerica Park', 'Progressive Field', 'Tropicana Field'
  ];
  const pitcherFriendlyCount = venues.filter(v => 
    pitcherFriendlyVenues.some(pfv => v.includes(pfv.split(' ')[0]))
  ).length;
  
  console.log('\n🏟️  VENUE ANALYSIS:');
  console.log(`   Pitcher-Friendly Venues: ${pitcherFriendlyCount}/${venues.length} (${(pitcherFriendlyCount/venues.length*100).toFixed(1)}%)`);
  console.log(`   Venues: ${venues.map(v => v.split(' ')[0]).join(', ')}`);
  
  // Analyze weather conditions
  const rainGames = tonightsGames.filter(g => g.weather.conditions.includes('rain')).length;
  const clearGames = tonightsGames.filter(g => g.weather.conditions.includes('clear')).length;
  
  console.log('\n🌦️  WEATHER CONDITIONS:');
  console.log(`   Rain Games: ${rainGames}/${tonightsGames.length} (${(rainGames/tonightsGames.length*100).toFixed(1)}%)`);
  console.log(`   Clear Games: ${clearGames}/${tonightsGames.length} (${(clearGames/tonightsGames.length*100).toFixed(1)}%)`);
}

function compareDateFactors(): void {
  console.log('\n📊 COMPARATIVE ANALYSIS: July 29th vs July 30th');
  console.log('='.repeat(60));
  
  // Quick comparison of key factors
  const july29Avg = july29Games.reduce((sum, g) => sum + g.weather.temp_f, 0) / july29Games.length;
  const july30Avg = tonightsGames.reduce((sum, g) => sum + g.weather.temp_f, 0) / tonightsGames.length;
  
  console.log(`🌡️  Average Temperature:`);
  console.log(`   July 29th: ${july29Avg.toFixed(1)}°F (40% Over predictions)`);
  console.log(`   July 30th: ${july30Avg.toFixed(1)}°F (13% Over predictions)`);
  
  const july30Rain = tonightsGames.filter(g => g.weather.conditions.includes('rain')).length;
  console.log(`\n🌧️  Rain Impact:`);
  console.log(`   July 29th: 0 rain games`);
  console.log(`   July 30th: ${july30Rain} rain games`);
  
  const july30PitcherVenues = tonightsGames.filter(g => 
    ['Oracle', 'Petco', 'Kauffman', 'Comerica', 'Progressive'].some(venue => g.venue.includes(venue))
  ).length;
  console.log(`\n🏟️  Pitcher-Friendly Venues:`);
  console.log(`   July 30th: ${july30PitcherVenues}/${tonightsGames.length} games`);
}

// Run the analysis
console.log('🚨 BIAS DIAGNOSTIC TOOL');
console.log('========================');
console.log('Analyzing what\'s causing the Under prediction bias...\n');

analyzeBias(tonightsGames, 'JULY 30TH (86.7% Under Bias)');
analyzeBias(july29Games, 'JULY 29TH (60% Under - More Balanced)');

identifySpecificBiasFactors();
compareDateFactors();

console.log('\n💡 SUMMARY & RECOMMENDATIONS:');
console.log('==============================');
console.log('1. Identify which component(s) are systematically pushing predictions Under');
console.log('2. Check if weather/venue factors are being over-weighted');
console.log('3. Examine if baseline (8.0) is too high for current conditions');
console.log('4. Consider if model needs dynamic calibration based on environmental factors');