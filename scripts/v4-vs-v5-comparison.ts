#!/usr/bin/env node

/**
 * V4 vs V5 Model Comparison for Tonight's Games
 * August 18, 2025
 * 
 * Compare the deployed V4 model against the new V5 design
 * to validate improvements and test V5 readiness for deployment
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { predictV4GameTotal, getV4Recommendation, formatV4Breakdown } from '../src/models/improved/v4-component-model';
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

console.log('🚀 V4 vs V5 MODEL COMPARISON - Tonight\'s Games');
console.log('=================================================');
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
  // Venue coordinates mapping
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
    'Oracle Park': { lat: 37.7786, lon: -122.3893 }
  };

  const coords = venueCoords[venue] || { lat: 40.7128, lon: -74.0060 }; // Default to NYC

  try {
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
      wind_speed_mph: weather.wind?.speed * 2.237 || 0, // Convert m/s to mph
      wind_direction: getWindDirection(weather.wind?.deg || 0),
      conditions: weather.weather[0]?.description || 'clear'
    };
  } catch (error: any) {
    console.warn(`⚠️  Weather API error for ${venue}: ${error.message}`);
    // Return default weather to allow prediction comparison
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

async function getMarketLine(homeTeam: string, awayTeam: string): Promise<number> {
  try {
    if (!process.env.ODDS_API_KEY) {
      console.warn('⚠️  No Odds API key - using default line 8.5');
      return 8.5;
    }

    const response = await axios.get('https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/', {
      params: {
        apiKey: process.env.ODDS_API_KEY,
        regions: 'us',
        markets: 'totals',
        oddsFormat: 'american'
      },
      timeout: 10000
    });

    // Find matching game (simplified matching)
    const game = response.data.find((g: any) => 
      g.home_team.includes(homeTeam.split(' ').pop()) && 
      g.away_team.includes(awayTeam.split(' ').pop())
    );

    if (game?.bookmakers?.[0]?.markets?.[0]?.outcomes?.[0]?.point) {
      return parseFloat(game.bookmakers[0].markets[0].outcomes[0].point);
    }
  } catch (error: any) {
    console.warn(`⚠️  Odds API error: ${error.message}`);
  }
  
  return 8.5; // Default line
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

      // Fetch weather and market data
      const weather = await fetchWeatherData(venue);
      const marketLine = await getMarketLine(homeTeam, awayTeam);

      console.log(`🌤️  Weather: ${weather.temp_f.toFixed(1)}°F, ${weather.conditions}`);
      console.log(`💰 Market Line: ${marketLine}`);

      // Prepare game data for both models
      const gameData = {
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

      // Run V4 Model
      console.log('\n🚀 V4 MODEL PREDICTION:');
      const v4Result = predictV4GameTotal(gameData);
      const v4Recommendation = getV4Recommendation(v4Result, marketLine);
      
      console.log(`   Prediction: ${v4Result.prediction} ${v4Result.total}`);
      console.log(`   Confidence: ${v4Result.confidence}%`);
      console.log(`   Explosion Risk: ${(v4Result.explosion_risk * 100).toFixed(1)}%`);
      console.log(`   Recommendation: ${v4Recommendation}`);

      // Run V5 Model
      console.log('\n🔬 V5 MODEL PREDICTION:');
      const v5Result = runV5AdvancedModel(gameData);
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
      } else {
        tieCount++;
      }

      console.log('\n⚔️  MODEL COMPARISON:');
      console.log(`   Direction: ${predictionFlip ? '🔄 FLIP' : '✓ Same'} (${v4Result.prediction} → ${v5Result.prediction})`);
      console.log(`   V4 Edge: ${v4Edge.toFixed(2)} runs vs market`);
      console.log(`   V5 Edge: ${v5Edge.toFixed(2)} runs vs market`);
      console.log(`   Better Model: ${betterModel}`);

      // Key differences
      const keyDifferences: string[] = [];
      
      if (Math.abs(v4Result.total - v5Result.total) > 0.5) {
        keyDifferences.push(`Total difference: ${(v5Result.total - v4Result.total).toFixed(2)} runs`);
      }
      
      if (Math.abs(v4Result.explosion_risk - v5Result.explosion_risk) > 0.05) {
        keyDifferences.push(`Explosion risk: V4 ${(v4Result.explosion_risk * 100).toFixed(1)}% → V5 ${(v5Result.explosion_risk * 100).toFixed(1)}%`);
      }
      
      if (v5Result.risk_level !== 'LOW') {
        keyDifferences.push(`V5 risk level: ${v5Result.risk_level}`);
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
          key_differences: keyDifferences
        }
      });

      console.log('   ─'.repeat(60));
    }

    // Generate summary
    console.log('\n\n📊 V4 vs V5 COMPARISON SUMMARY');
    console.log('==============================');
    console.log(`Total Games Analyzed: ${results.length}`);
    console.log(`V4 Better: ${v4BetterCount} (${((v4BetterCount/results.length)*100).toFixed(1)}%)`);
    console.log(`V5 Better: ${v5BetterCount} (${((v5BetterCount/results.length)*100).toFixed(1)}%)`);
    console.log(`Ties: ${tieCount} (${((tieCount/results.length)*100).toFixed(1)}%)`);

    // Prediction flips analysis
    const flips = results.filter(r => r.comparison.flip);
    console.log(`\nPrediction Flips: ${flips.length}/${results.length} (${((flips.length/results.length)*100).toFixed(1)}%)`);

    // Risk level distribution
    const riskLevels = results.reduce((acc: any, r) => {
      acc[r.v5.risk_level] = (acc[r.v5.risk_level] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nV5 Risk Level Distribution:');
    Object.entries(riskLevels).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} games`);
    });

    // Hot weather analysis
    const hotGames = results.filter(r => parseFloat(r.weather) > 85);
    if (hotGames.length > 0) {
      console.log(`\n🌡️  Hot Weather Games (85°F+): ${hotGames.length}`);
      hotGames.forEach(game => {
        const v4Total = parseFloat(game.v4.prediction.split(' ')[1]);
        const v5Total = parseFloat(game.v5.prediction.split(' ')[1]);
        const difference = v5Total - v4Total;
        console.log(`   ${game.game}: V4 ${v4Total} → V5 ${v5Total} (${difference > 0 ? '+' : ''}${difference.toFixed(2)})`);
      });
    }

    // Generate table
    console.log('\n\n📋 COMPLETE COMPARISON TABLE');
    console.log('============================');
    console.log('| Game | Venue | Weather | Market | V4 Pred | V4 Conf | V5 Pred | V5 Conf | V5 Risk | Better |');
    console.log('|------|-------|---------|--------|---------|---------|---------|---------|---------|--------|');
    
    results.forEach(result => {
      const gameShort = result.game.split(' @ ').map((team: string) => team.split(' ').pop()).join(' @ ');
      const venueShort = result.venue.split(' ')[0];
      console.log(`| ${gameShort} | ${venueShort} | ${result.weather} | ${result.marketLine} | ${result.v4.prediction} | ${result.v4.confidence}% | ${result.v5.prediction} | ${result.v5.confidence}% | ${result.v5.risk_level} | ${result.comparison.better_model} |`);
    });

    console.log('\n🎯 V5 MODEL VALIDATION COMPLETE');
    console.log('Ready for deployment testing based on these results.');

  } catch (error: any) {
    console.error('❌ Model comparison failed:', error.message);
  }
}

if (require.main === module) {
  runModelComparison().catch(console.error);
}