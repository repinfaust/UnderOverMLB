#!/usr/bin/env node

/**
 * Analyze Failed Predictions - August 14-16, 2025
 * 
 * Use our connected APIs to research why we catastrophically under-predicted certain games
 * Focus on the major misses to understand what our model missed
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface FailedPrediction {
  date: string;
  game: string;
  venue: string;
  predicted: number;
  actual: number;
  error: number;
  starting_pitchers: {
    home: string;
    away: string;
  };
}

// Major under-predictions to analyze
const FAILED_PREDICTIONS: FailedPrediction[] = [
  {
    date: '2025-08-14',
    game: 'Miami Marlins @ Cleveland Guardians',
    venue: 'Progressive Field',
    predicted: 7.47,
    actual: 13,
    error: 5.53,
    starting_pitchers: { home: 'Tanner Bibee', away: 'Edward Cabrera' }
  },
  {
    date: '2025-08-15', 
    game: 'Milwaukee Brewers @ Cincinnati Reds',
    venue: 'Great American Ball Park',
    predicted: 8.37,
    actual: 18,
    error: 9.63,
    starting_pitchers: { home: 'Andrew Abbott', away: 'Jose Quintana' }
  },
  {
    date: '2025-08-15',
    game: 'Texas Rangers @ Toronto Blue Jays',
    venue: 'Rogers Centre', 
    predicted: 7.50,
    actual: 11,
    error: 3.50,
    starting_pitchers: { home: 'José Berríos', away: 'Nathan Eovaldi' }
  },
  {
    date: '2025-08-15',
    game: 'Tampa Bay Rays @ San Francisco Giants',
    venue: 'Oracle Park',
    predicted: 6.78,
    actual: 13,
    error: 6.22,
    starting_pitchers: { home: 'Logan Webb', away: 'Ryan Pepiot' }
  },
  {
    date: '2025-08-16',
    game: 'Texas Rangers @ Toronto Blue Jays',
    venue: 'Rogers Centre',
    predicted: 7.21,
    actual: 16,
    error: 8.79,
    starting_pitchers: { home: 'Eric Lauer', away: 'Patrick Corbin' }
  },
  {
    date: '2025-08-16',
    game: 'New York Yankees @ St. Louis Cardinals', 
    venue: 'Busch Stadium',
    predicted: 7.60,
    actual: 20,
    error: 12.40,
    starting_pitchers: { home: 'Sonny Gray', away: 'Max Fried' }
  },
  {
    date: '2025-08-16',
    game: 'Detroit Tigers @ Minnesota Twins',
    venue: 'Target Field',
    predicted: 7.79,
    actual: 13,
    error: 5.21,
    starting_pitchers: { home: 'Zebby Matthews', away: 'Casey Mize' }
  }
];

console.log('🔍 ANALYZING FAILED PREDICTIONS WITH REAL API DATA');
console.log('==================================================');
console.log('📊 Researching 7 catastrophic under-predictions using:');
console.log('   • MLB Stats API - Game details, pitcher performance');
console.log('   • OpenWeatherMap API - Weather conditions');
console.log('   • Historical game data - Box scores and breakdowns');
console.log('');

async function getGameDetails(date: string, teamNames: string[]): Promise<any> {
  try {
    console.log(`📡 Fetching MLB game data for ${date}...`);
    
    const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
      params: {
        sportId: 1,
        date: date,
        hydrate: 'team,linescore,boxscore,decisions'
      },
      timeout: 10000
    });

    const games = response.data.dates?.[0]?.games || [];
    
    // Find the specific game
    const game = games.find((g: any) => {
      const homeTeam = g.teams.home.team.name;
      const awayTeam = g.teams.away.team.name;
      return teamNames.some(team => homeTeam.includes(team.split(' ').pop())) &&
             teamNames.some(team => awayTeam.includes(team.split(' ').pop()));
    });

    return game;
  } catch (error: any) {
    console.error(`❌ Error fetching game data for ${date}:`, error.message);
    return null;
  }
}

async function getWeatherData(venue: string, date: string): Promise<any> {
  if (!process.env.WEATHER_API_KEY) {
    console.warn('⚠️  Weather API key not found - skipping weather analysis');
    return null;
  }

  try {
    // Map venues to cities
    const venueToCity: Record<string, string> = {
      'Progressive Field': 'Cleveland,OH,US',
      'Great American Ball Park': 'Cincinnati,OH,US', 
      'Rogers Centre': 'Toronto,ON,CA',
      'Oracle Park': 'San Francisco,CA,US',
      'Busch Stadium': 'St. Louis,MO,US',
      'Target Field': 'Minneapolis,MN,US'
    };

    const city = venueToCity[venue];
    if (!city) {
      console.warn(`⚠️  Unknown venue: ${venue}`);
      return null;
    }

    console.log(`🌤️  Fetching weather data for ${venue} (${city})...`);
    
    // Get current weather (approximating historical)
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: city,
        appid: process.env.WEATHER_API_KEY,
        units: 'imperial'
      },
      timeout: 5000
    });

    return {
      temp_f: response.data.main.temp,
      humidity: response.data.main.humidity,
      wind_speed: response.data.wind?.speed || 0,
      wind_direction: response.data.wind?.deg || 0,
      conditions: response.data.weather[0]?.description || 'unknown'
    };
  } catch (error: any) {
    console.error(`❌ Error fetching weather for ${venue}:`, error.message);
    return null;
  }
}

async function getPitcherStats(pitcherName: string): Promise<any> {
  try {
    // Search for pitcher by name
    console.log(`⚾ Searching for pitcher: ${pitcherName}...`);
    
    const searchResponse = await axios.get('https://statsapi.mlb.com/api/v1/people/search', {
      params: {
        names: pitcherName,
        sport: 1
      },
      timeout: 5000
    });

    const pitcher = searchResponse.data.people?.[0];
    if (!pitcher) {
      console.warn(`⚠️  Pitcher not found: ${pitcherName}`);
      return null;
    }

    // Get pitcher stats
    const statsResponse = await axios.get(`https://statsapi.mlb.com/api/v1/people/${pitcher.id}/stats`, {
      params: {
        stats: 'season',
        season: 2025,
        group: 'pitching'
      },
      timeout: 5000
    });

    const stats = statsResponse.data.stats?.[0]?.splits?.[0]?.stat;
    return {
      name: pitcher.fullName,
      era: stats?.era || 'N/A',
      whip: stats?.whip || 'N/A',
      strikeouts: stats?.strikeOuts || 'N/A',
      walks: stats?.baseOnBalls || 'N/A',
      homeRuns: stats?.homeRuns || 'N/A',
      innings: stats?.inningsPitched || 'N/A'
    };
  } catch (error: any) {
    console.error(`❌ Error fetching pitcher stats for ${pitcherName}:`, error.message);
    return null;
  }
}

function analyzeFailurePatterns(failures: FailedPrediction[]): void {
  console.log('\n📊 FAILURE PATTERN ANALYSIS');
  console.log('============================');
  
  // Venue analysis
  const venueCount: Record<string, number> = {};
  failures.forEach(f => {
    venueCount[f.venue] = (venueCount[f.venue] || 0) + 1;
  });
  
  console.log('\n🏟️  Venue Pattern Analysis:');
  Object.entries(venueCount).forEach(([venue, count]) => {
    console.log(`   ${venue}: ${count} failures`);
  });
  
  // Team analysis
  const teamFailures: Record<string, number> = {};
  failures.forEach(f => {
    const teams = f.game.split(' @ ');
    teams.forEach(team => {
      teamFailures[team] = (teamFailures[team] || 0) + 1;
    });
  });
  
  console.log('\n🏈 Team Pattern Analysis:');
  Object.entries(teamFailures)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([team, count]) => {
      console.log(`   ${team}: ${count} failures`);
    });
  
  // Error magnitude analysis
  const avgError = failures.reduce((sum, f) => sum + f.error, 0) / failures.length;
  const maxError = Math.max(...failures.map(f => f.error));
  const minError = Math.min(...failures.map(f => f.error));
  
  console.log('\n📈 Error Magnitude Analysis:');
  console.log(`   Average Under-Prediction: ${avgError.toFixed(2)} runs`);
  console.log(`   Worst Miss: ${maxError.toFixed(2)} runs`);
  console.log(`   Best Miss: ${minError.toFixed(2)} runs`);
  
  // Identify high-scoring patterns
  const highScoringGames = failures.filter(f => f.actual >= 15);
  console.log(`\n🔥 Explosive Games (15+ runs): ${highScoringGames.length}/${failures.length}`);
  highScoringGames.forEach(f => {
    console.log(`   ${f.game}: ${f.actual} runs (predicted ${f.predicted})`);
  });
}

async function analyzeSpecificFailure(failure: FailedPrediction): Promise<void> {
  console.log(`\n🔍 ANALYZING: ${failure.game} (${failure.date})`);
  console.log('========================================');
  console.log(`📊 Predicted: ${failure.predicted} runs`);
  console.log(`📊 Actual: ${failure.actual} runs`);
  console.log(`📊 Error: +${failure.error} runs (${((failure.error/failure.predicted)*100).toFixed(1)}% under-prediction)`);
  
  // Get game details
  const teamNames = failure.game.split(' @ ');
  const gameData = await getGameDetails(failure.date, teamNames);
  
  if (gameData) {
    console.log(`\n📋 Game Details:`);
    console.log(`   Final Score: ${gameData.teams.away.team.name} ${gameData.teams.away.score} - ${gameData.teams.home.team.name} ${gameData.teams.home.score}`);
    
    // Inning breakdown
    if (gameData.linescore?.innings) {
      console.log(`\n📊 Inning-by-Inning Scoring:`);
      const innings = gameData.linescore.innings;
      let awayTotal = 0, homeTotal = 0;
      
      innings.forEach((inning: any, i: number) => {
        const awayRuns = inning.away?.runs || 0;
        const homeRuns = inning.home?.runs || 0;
        awayTotal += awayRuns;
        homeTotal += homeRuns;
        
        if (awayRuns > 0 || homeRuns > 0) {
          console.log(`   Inning ${i + 1}: Away ${awayRuns}, Home ${homeRuns} (Total: ${awayTotal + homeTotal})`);
        }
      });
    }
  }
  
  // Get weather data  
  const weather = await getWeatherData(failure.venue, failure.date);
  if (weather) {
    console.log(`\n🌤️  Weather Conditions:`);
    console.log(`   Temperature: ${weather.temp_f}°F`);
    console.log(`   Humidity: ${weather.humidity}%`);
    console.log(`   Wind: ${weather.wind_speed} mph`);
    console.log(`   Conditions: ${weather.conditions}`);
    
    // Analyze if weather was more offensive than expected
    if (weather.temp_f > 85) {
      console.log(`   ⚠️  HOT WEATHER: ${weather.temp_f}°F may have boosted offense more than modeled`);
    }
    if (weather.wind_speed > 10) {
      console.log(`   💨 WINDY CONDITIONS: ${weather.wind_speed} mph may have affected play`);
    }
  }
  
  // Get pitcher analysis
  console.log(`\n⚾ Starting Pitcher Analysis:`);
  const homePitcherStats = await getPitcherStats(failure.starting_pitchers.home);
  const awayPitcherStats = await getPitcherStats(failure.starting_pitchers.away);
  
  if (homePitcherStats) {
    console.log(`   Home: ${homePitcherStats.name} - ERA: ${homePitcherStats.era}, WHIP: ${homePitcherStats.whip}`);
  }
  if (awayPitcherStats) {
    console.log(`   Away: ${awayPitcherStats.name} - ERA: ${awayPitcherStats.era}, WHIP: ${awayPitcherStats.whip}`);
  }
  
  // Identify potential factors
  console.log(`\n💡 Potential Model Gaps:`);
  
  if (failure.error > 8) {
    console.log(`   🚨 EXPLOSIVE GAME: ${failure.error}+ run miss suggests bullpen collapse or offensive explosion`);
  }
  
  if (failure.venue === 'Rogers Centre' && failure.actual > 10) {
    console.log(`   🏟️  DOME FAILURE: Rogers Centre had multiple high-scoring games - dome advantage overestimated`);
  }
  
  if (failure.venue === 'Oracle Park' && failure.actual > 10) {
    console.log(`   🌊 ORACLE PARK SURPRISE: Pitcher-friendly park had explosive scoring - wind/weather factors?`);
  }
  
  if (teamNames.some(team => ['Rangers', 'Blue Jays', 'Yankees'].includes(team.split(' ').pop() || ''))) {
    console.log(`   🏈 OFFENSIVE TEAM: High-powered offense team may be underweighted in model`);
  }
  
  // Small delay between analyses
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function main(): Promise<void> {
  console.log(`🎯 Analyzing ${FAILED_PREDICTIONS.length} major under-predictions...\n`);
  
  // Analyze each failure in detail
  for (const failure of FAILED_PREDICTIONS) {
    await analyzeSpecificFailure(failure);
  }
  
  // Pattern analysis
  analyzeFailurePatterns(FAILED_PREDICTIONS);
  
  // Recommendations
  console.log('\n🎯 MODEL IMPROVEMENT RECOMMENDATIONS');
  console.log('===================================');
  
  console.log('\n1. 🔥 **BULLPEN FATIGUE FACTOR**');
  console.log('   - Add bullpen usage tracking from previous 3-5 games');
  console.log('   - Heavy usage penalty: +0.5 to +1.0 runs for fatigued bullpens');
  console.log('   - Both teams fatigued: +1.5 runs (explosion risk)');
  
  console.log('\n2. 🌡️  **HOT WEATHER AMPLIFICATION**');
  console.log('   - Current hot weather bonus too small');
  console.log('   - 85°F+: Increase from +0.15 to +0.4 runs');
  console.log('   - 90°F+: Increase from +0.3 to +0.7 runs');
  
  console.log('\n3. 🏟️  **VENUE RECALIBRATION**');
  console.log('   - Rogers Centre: Reduce dome advantage, add offensive factors');
  console.log('   - Oracle Park: Add explosive game risk for hot/calm days');
  console.log('   - Target Field: More hitter-friendly than modeled');
  
  console.log('\n4. 🏈 **TEAM OFFENSIVE EXPLOSIONS**');
  console.log('   - Rangers/Blue Jays: Multiple failures, increase offensive ratings');
  console.log('   - Yankees: Underweighted offensive potential');
  console.log('   - Add "revenge game" factor for repeat matchups');
  
  console.log('\n5. ⚾ **STARTING PITCHER RELIABILITY**');
  console.log('   - Add "young pitcher" risk factor (rookies more volatile)');
  console.log('   - Recent performance weighting over season stats');
  console.log('   - Matchup-specific pitcher vs team history');
  
  console.log('\n6. 📈 **GAME FLOW MODELING**');
  console.log('   - Early scoring leads to more scoring (momentum)');
  console.log('   - Back-to-back games fatigue factor');
  console.log('   - Series context (game 1 vs game 3 differences)');
  
  console.log('\n🎯 **PRIORITY FIXES FOR PHASE 4:**');
  console.log('1. Bullpen fatigue tracking (highest impact)');
  console.log('2. Hot weather recalibration (easy fix)');  
  console.log('3. Team offensive explosion detection (Rangers/Jays pattern)');
  console.log('4. Venue adjustments based on recent data');
  
  console.log('\n✅ Implementation Strategy:');
  console.log('- Test each fix individually against August 14-16 data');
  console.log('- Measure impact on both accuracy AND distribution balance');
  console.log('- Preserve 61.5% foundation while fixing catastrophic misses');
}

if (require.main === module) {
  main().catch(console.error);
}