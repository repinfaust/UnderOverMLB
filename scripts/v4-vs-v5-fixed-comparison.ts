#!/usr/bin/env node

/**
 * V4 vs V5 Model Comparison - FIXED VERSION
 * August 18, 2025
 * 
 * Fixed comparison using the explosive detection models directly
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { runV4ModelA_Pitching, runV4ModelB_Offense, runV4ModelC_WeatherPark, runV4ModelD_Market, generateV4Ensemble } from '../src/models/v4/explosive-detection-models';
import { runV5AdvancedModel, getV5Recommendation } from '../src/models/v5/advanced-explosion-models';

dotenv.config();

interface MLBGame {
  gamePk: number;
  teams: {
    home: { team: { name: string } };
    away: { team: { name: string } };
  };
  venue: { name: string };
  gameDate: string;
  status: { statusCode: string };
}

interface WeatherData {
  temp_f: number;
  humidity: number;
  wind_speed_mph: number;
  wind_direction: string;
  conditions: string;
}

interface V4GameFactors {
  home_team: string;
  away_team: string;
  venue: string;
  date: string;
  weather: WeatherData;
  park_factors: {
    runs_factor: number;
    hr_factor: number;
    altitude: number;
  };
  starting_pitchers?: {
    home: { name: string; era?: number; whip?: number };
    away: { name: string; era?: number; whip?: number };
  };
}

console.log('🚀 V4 vs V5 MODEL COMPARISON - FIXED VERSION');
console.log('============================================');
console.log('📅 Date: August 18, 2025');
console.log('🎯 Testing V5 improvements against deployed V4 model');
console.log('');

async function fetchTodaysGames(): Promise<MLBGame[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📡 Fetching MLB games for ${today}...`);
    
    const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
      params: {
        sportId: 1,
        date: today,
        hydrate: 'team,venue'
      },
      timeout: 10000
    });

    const games = response.data.dates?.[0]?.games || [];
    console.log(`✅ Found ${games.length} games scheduled`);
    
    return games.filter((game: MLBGame) => 
      game.status.statusCode === 'S' || // Scheduled
      game.status.statusCode === 'P'    // Pre-game
    );
  } catch (error: any) {
    console.error(`❌ Error fetching games: ${error.message}`);
    return [];
  }
}

async function fetchWeatherData(venue: string): Promise<WeatherData> {
  const venueCoords: Record<string, { lat: number; lon: number }> = {
    'Yankee Stadium': { lat: 40.8296, lon: -73.9262 },
    'Fenway Park': { lat: 42.3467, lon: -71.0972 },
    'Rogers Centre': { lat: 43.6414, lon: -79.3894 },
    'Progressive Field': { lat: 41.4962, lon: -81.6852 },
    'Great American Ball Park': { lat: 39.0974, lon: -84.5081 },
    'Daikin Park': { lat: 29.7571, lon: -95.3555 },
    'Kauffman Stadium': { lat: 39.0517, lon: -94.4803 },
    'Nationals Park': { lat: 38.8730, lon: -77.0074 },
    'Citizens Bank Park': { lat: 39.9061, lon: -75.1665 },
    'Coors Field': { lat: 39.7559, lon: -104.9942 },
    'Oracle Park': { lat: 37.7786, lon: -122.3893 },
    'Wrigley Field': { lat: 41.9484, lon: -87.6553 },
    'Comerica Park': { lat: 42.3390, lon: -83.0485 },
    'PNC Park': { lat: 40.4469, lon: -80.0057 },
    'loanDepot park': { lat: 25.7781, lon: -80.2197 },
    'Truist Park': { lat: 33.8906, lon: -84.4677 },
    'Angel Stadium': { lat: 33.8003, lon: -117.8827 },
    'Chase Field': { lat: 33.4453, lon: -112.0667 },
    'Petco Park': { lat: 32.7073, lon: -117.1566 }
  };

  const coords = venueCoords[venue] || { lat: 40.7128, lon: -74.0060 };

  try {
    if (!process.env.WEATHER_API_KEY) {
      console.warn(`⚠️  No Weather API key - using default weather`);
      return {
        temp_f: 75,
        humidity: 60,
        wind_speed_mph: 5,
        wind_direction: 'variable',
        conditions: 'clear'
      };
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: coords.lat,
        lon: coords.lon,
        appid: process.env.WEATHER_API_KEY,
        units: 'imperial'
      },
      timeout: 5000
    });

    const weather = response.data;
    return {
      temp_f: weather.main.temp,
      humidity: weather.main.humidity,
      wind_speed_mph: weather.wind?.speed * 2.237 || 0,
      wind_direction: getWindDirection(weather.wind?.deg || 0),
      conditions: weather.weather[0]?.description || 'clear'
    };
  } catch (error: any) {
    console.warn(`⚠️  Weather API error for ${venue}: ${error.message}`);
    return {
      temp_f: 75,
      humidity: 60,
      wind_speed_mph: 5,
      wind_direction: 'variable',
      conditions: 'clear'
    };
  }
}

function getWindDirection(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
}

function getV4Recommendation(v4Result: any, marketLine: number): string {
  if (v4Result.confidence < 50) {
    return 'NO PLAY - Low confidence';
  }
  
  if (v4Result.explosion_risk > 0.15) {
    return 'NO PLAY - High explosion risk';
  }
  
  const edge = Math.abs(v4Result.total - marketLine);
  
  if (edge < 0.3) {
    return 'NO PLAY - No edge';
  } else if (edge < 0.6) {
    return `SLIGHT ${v4Result.prediction}`;
  } else {
    return `STRONG ${v4Result.prediction}`;
  }
}

async function runModelComparison(): Promise<void> {
  try {
    const games = await fetchTodaysGames();
    
    if (games.length === 0) {
      console.log('❌ No games found for today');
      return;
    }

    console.log(`\n🎯 ANALYZING ${games.length} GAMES\n`);

    const results: any[] = [];
    let v4BetterCount = 0;
    let v5BetterCount = 0;
    let tieCount = 0;

    for (const game of games) {
      const homeTeam = game.teams.home.team.name;
      const awayTeam = game.teams.away.team.name;
      const venue = game.venue.name;
      const gameDate = game.gameDate.split('T')[0];

      console.log(`\n📊 ${awayTeam} @ ${homeTeam}`);
      console.log(`🏟️  ${venue}`);

      // Fetch weather data
      const weather = await fetchWeatherData(venue);
      const marketLine = 8.5; // Default market line

      console.log(`🌤️  Weather: ${weather.temp_f.toFixed(1)}°F, ${weather.conditions}`);
      console.log(`💰 Market Line: ${marketLine}`);

      // Prepare game data for V4
      const v4GameData: V4GameFactors = {
        home_team: homeTeam,
        away_team: awayTeam,
        venue: venue,
        date: gameDate,
        weather: weather,
        park_factors: {
          runs_factor: 1.0,
          hr_factor: 1.0,
          altitude: venue === 'Coors Field' ? 5200 : 0
        }
      };

      // Prepare game data for V5
      const v5GameData = {
        home_team: homeTeam,
        away_team: awayTeam,
        venue: venue,
        date: gameDate,
        weather: weather,
        park_factors: {
          runs_factor: 1.0,
          hr_factor: 1.0,
          altitude: venue === 'Coors Field' ? 5200 : 0
        }
      };

      // Run V4 Model (using ensemble)
      console.log('\n🚀 V4 MODEL PREDICTION:');
      const v4ModelA = runV4ModelA_Pitching(v4GameData);
      const v4ModelB = runV4ModelB_Offense(v4GameData);
      const v4ModelC = runV4ModelC_WeatherPark(v4GameData);
      const v4ModelD = runV4ModelD_Market(v4GameData, marketLine);
      const v4Result = generateV4Ensemble(v4ModelA, v4ModelB, v4ModelC, v4ModelD);
      const v4Recommendation = getV4Recommendation(v4Result, marketLine);
      
      console.log(`   Prediction: ${v4Result.prediction} ${v4Result.total}`);
      console.log(`   Confidence: ${v4Result.confidence}%`);
      console.log(`   Explosion Risk: ${(v4Result.explosion_risk * 100).toFixed(1)}%`);
      console.log(`   Recommendation: ${v4Recommendation}`);

      // Run V5 Model
      console.log('\n🔬 V5 MODEL PREDICTION:');
      const v5Result = runV5AdvancedModel(v5GameData);
      const v5Recommendation = getV5Recommendation(v5Result, marketLine);
      
      console.log(`   Prediction: ${v5Result.prediction} ${v5Result.total}`);
      console.log(`   Confidence: ${v5Result.confidence}%`);
      console.log(`   Explosion Risk: ${(v5Result.explosion_risk * 100).toFixed(1)}%`);
      console.log(`   Risk Level: ${v5Result.risk_level}`);
      console.log(`   Recommendation: ${v5Recommendation}`);

      // Compare models
      const v4Edge = Math.abs(v4Result.total - marketLine);
      const v5Edge = Math.abs(v5Result.total - marketLine);
      const predictionFlip = v4Result.prediction !== v5Result.prediction;
      
      let betterModel = 'TIE';
      if (v4Result.confidence > v5Result.confidence && v4Edge > v5Edge) {
        betterModel = 'V4';
        v4BetterCount++;
      } else if (v5Result.confidence > v4Result.confidence && v5Edge > v4Edge) {
        betterModel = 'V5';
        v5BetterCount++;
      } else if (v4Edge > v5Edge && Math.abs(v4Result.confidence - v5Result.confidence) < 5) {
        betterModel = 'V4';
        v4BetterCount++;
      } else if (v5Edge > v4Edge && Math.abs(v4Result.confidence - v5Result.confidence) < 5) {
        betterModel = 'V5';
        v5BetterCount++;
      } else {
        tieCount++;
      }

      console.log('\n⚔️  MODEL COMPARISON:');
      console.log(`   Direction: ${predictionFlip ? '🔄 FLIP' : '✓ Same'} (${v4Result.prediction} → ${v5Result.prediction})`);
      console.log(`   V4 Total: ${v4Result.total} (edge: ${v4Edge.toFixed(2)})`);
      console.log(`   V5 Total: ${v5Result.total} (edge: ${v5Edge.toFixed(2)})`);
      console.log(`   Total Difference: ${(v5Result.total - v4Result.total).toFixed(2)} runs`);
      console.log(`   Better Model: ${betterModel}`);

      // Key differences analysis
      const keyDifferences: string[] = [];
      
      if (Math.abs(v4Result.total - v5Result.total) > 0.5) {
        keyDifferences.push(`${Math.abs(v4Result.total - v5Result.total).toFixed(2)} run difference`);
      }
      
      if (Math.abs(v4Result.explosion_risk - v5Result.explosion_risk) > 0.05) {
        keyDifferences.push(`Explosion risk: V4 ${(v4Result.explosion_risk * 100).toFixed(1)}% → V5 ${(v5Result.explosion_risk * 100).toFixed(1)}%`);
      }
      
      if (v5Result.risk_level !== 'LOW') {
        keyDifferences.push(`V5 risk level: ${v5Result.risk_level}`);
      }

      if (weather.temp_f > 85) {
        keyDifferences.push(`🌡️ Hot weather: ${weather.temp_f.toFixed(1)}°F`);
      }

      if (keyDifferences.length > 0) {
        console.log(`   Key Differences: ${keyDifferences.join(', ')}`);
      }

      // Store result
      results.push({
        game: `${awayTeam} @ ${homeTeam}`,
        venue,
        weather: `${weather.temp_f.toFixed(1)}°F`,
        marketLine,
        v4: {
          prediction: `${v4Result.prediction} ${v4Result.total}`,
          confidence: v4Result.confidence,
          explosion_risk: v4Result.explosion_risk * 100,
          recommendation: v4Recommendation,
          edge: v4Edge
        },
        v5: {
          prediction: `${v5Result.prediction} ${v5Result.total}`,
          confidence: v5Result.confidence,
          explosion_risk: v5Result.explosion_risk * 100,
          risk_level: v5Result.risk_level,
          recommendation: v5Recommendation,
          edge: v5Edge
        },
        comparison: {
          flip: predictionFlip,
          better_model: betterModel,
          total_difference: v5Result.total - v4Result.total,
          key_differences: keyDifferences
        }
      });

      console.log('   ─'.repeat(60));
    }

    // Generate comprehensive summary
    console.log('\n\n📊 V4 vs V5 COMPREHENSIVE ANALYSIS');
    console.log('==================================');
    console.log(`Total Games Analyzed: ${results.length}`);
    console.log(`V4 Better: ${v4BetterCount} (${((v4BetterCount/results.length)*100).toFixed(1)}%)`);
    console.log(`V5 Better: ${v5BetterCount} (${((v5BetterCount/results.length)*100).toFixed(1)}%)`);
    console.log(`Ties: ${tieCount} (${((tieCount/results.length)*100).toFixed(1)}%)`);

    // Prediction distribution analysis
    const v4Overs = results.filter(r => r.v4.prediction.includes('Over')).length;
    const v5Overs = results.filter(r => r.v5.prediction.includes('Over')).length;
    
    console.log(`\n📈 PREDICTION DISTRIBUTION:`);
    console.log(`V4: ${v4Overs} Over, ${results.length - v4Overs} Under (${((v4Overs/results.length)*100).toFixed(1)}% Over)`);
    console.log(`V5: ${v5Overs} Over, ${results.length - v5Overs} Under (${((v5Overs/results.length)*100).toFixed(1)}% Over)`);

    // Prediction flips analysis
    const flips = results.filter(r => r.comparison.flip);
    console.log(`\n🔄 PREDICTION FLIPS: ${flips.length}/${results.length} (${((flips.length/results.length)*100).toFixed(1)}%)`);
    
    if (flips.length > 0) {
      console.log('   Flip Details:');
      flips.forEach(flip => {
        console.log(`   - ${flip.game}: ${flip.comparison.total_difference.toFixed(2)} run difference`);
      });
    }

    // Risk level distribution
    const riskLevels = results.reduce((acc: any, r) => {
      acc[r.v5.risk_level] = (acc[r.v5.risk_level] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n⚠️  V5 RISK LEVEL DISTRIBUTION:');
    Object.entries(riskLevels).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} games (${((count as number/results.length)*100).toFixed(1)}%)`);
    });

    // Hot weather analysis
    const hotGames = results.filter(r => parseFloat(r.weather) > 85);
    if (hotGames.length > 0) {
      console.log(`\n🌡️  HOT WEATHER GAMES (85°F+): ${hotGames.length}`);
      hotGames.forEach(game => {
        const v4Total = parseFloat(game.v4.prediction.split(' ')[1]);
        const v5Total = parseFloat(game.v5.prediction.split(' ')[1]);
        const difference = v5Total - v4Total;
        console.log(`   ${game.game}: V4 ${v4Total} → V5 ${v5Total} (${difference > 0 ? '+' : ''}${difference.toFixed(2)})`);
      });
    }

    // Average total comparison
    const v4AvgTotal = results.reduce((sum, r) => sum + parseFloat(r.v4.prediction.split(' ')[1]), 0) / results.length;
    const v5AvgTotal = results.reduce((sum, r) => sum + parseFloat(r.v5.prediction.split(' ')[1]), 0) / results.length;
    
    console.log(`\n📊 AVERAGE TOTALS:`);
    console.log(`   V4 Average: ${v4AvgTotal.toFixed(2)} runs`);
    console.log(`   V5 Average: ${v5AvgTotal.toFixed(2)} runs`);
    console.log(`   Difference: ${(v5AvgTotal - v4AvgTotal).toFixed(2)} runs (V5 ${v5AvgTotal > v4AvgTotal ? 'higher' : 'lower'})`);

    // Generate final table
    console.log('\n\n📋 COMPLETE COMPARISON TABLE');
    console.log('============================');
    console.log('| Game | Venue | Weather | V4 Pred | V4 Conf | V5 Pred | V5 Conf | V5 Risk | Flip | Better |');
    console.log('|------|-------|---------|---------|---------|---------|---------|---------|------|--------|');
    
    results.forEach(result => {
      const gameShort = result.game.split(' @ ').map((team: string) => team.split(' ').pop()).join(' @ ');
      const venueShort = result.venue.split(' ')[0];
      const flipIcon = result.comparison.flip ? '🔄' : '✓';
      console.log(`| ${gameShort} | ${venueShort} | ${result.weather} | ${result.v4.prediction} | ${result.v4.confidence}% | ${result.v5.prediction} | ${result.v5.confidence}% | ${result.v5.risk_level} | ${flipIcon} | ${result.comparison.better_model} |`);
    });

    console.log('\n🎯 V5 MODEL ANALYSIS COMPLETE');
    
    // Final recommendation
    if (v5BetterCount > v4BetterCount) {
      console.log('✅ RECOMMENDATION: V5 shows improvements - proceed with testing deployment');
    } else if (v4BetterCount > v5BetterCount) {
      console.log('⚠️  RECOMMENDATION: V4 still superior - refine V5 before deployment');
    } else {
      console.log('🤝 RECOMMENDATION: Models perform similarly - additional validation needed');
    }

  } catch (error: any) {
    console.error('❌ Model comparison failed:', error.message);
  }
}

if (require.main === module) {
  runModelComparison().catch(console.error);
}