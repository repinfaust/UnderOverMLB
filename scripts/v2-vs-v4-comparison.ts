#!/usr/bin/env node

/**
 * V2 vs V4 Model Comparison for Tonight's Games
 * 
 * Compare our current V2 model (successful with Unders but 100% biased)
 * against new V4 model (explosive detection with bias corrections)
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { validateBeforePrediction } from '../src/lib/data-validation';
import { 
  enhancedDataFetcher
} from '../src/lib/enhanced-data-fetcher';

// V2 Model (Current)
import {
  runModelA_Recalibrated,
  runModelB_Recalibrated,
  runModelC_Recalibrated,
  runModelD_Recalibrated,
  generateRecalibratedEnsemble,
  GameFactors
} from '../src/models/improved/recalibrated-models';

// V4 Model (Explosive Detection)
import {
  runV4ModelA_Pitching,
  runV4ModelB_Offense,
  runV4ModelC_WeatherPark,
  runV4ModelD_Market,
  generateV4Ensemble,
  V4GameFactors
} from '../src/models/v4/explosive-detection-models';

dotenv.config();

interface ComparisonResult {
  game: string;
  venue: string;
  market_line: number;
  bookmaker: string;
  v2_prediction: {
    type: string;
    total: number;
    confidence: number;
    recommendation: string;
  };
  v4_prediction: {
    type: string;
    total: number;
    confidence: number;
    recommendation: string;
    explosion_risk: number;
    key_adjustments: string[];
  };
  key_differences: string[];
  weather: {
    temp: number;
    conditions: string;
  };
}

console.log('⚔️  V2 vs V4 MODEL COMPARISON');
console.log('============================');
console.log('📊 V2: Current model (61.5% accuracy, 100% Under bias)');
console.log('🚀 V4: Explosive detection model (bias corrections + explosion detection)');
console.log('');

async function fetchTonightsGames(): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
    params: {
      sportId: 1,
      date: today,
      hydrate: 'team,venue,probablePitcher',
    },
    timeout: 10000,
  });

  return response.data.dates?.[0]?.games || [];
}

async function fetchOddsData(): Promise<any[]> {
  if (!process.env.ODDS_API_KEY) {
    console.warn('⚠️  No odds API key - using default lines');
    return [];
  }

  try {
    const response = await axios.get('https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/', {
      params: {
        apiKey: process.env.ODDS_API_KEY,
        regions: 'us',
        markets: 'totals',
        oddsFormat: 'american'
      }
    });
    return response.data;
  } catch (error) {
    console.warn('⚠️  Could not fetch odds data');
    return [];
  }
}

function findOddsForGame(game: any, oddsData: any[]) {
  const gameOdds = oddsData.find(odds => {
    const homeTeam = game.teams.home.team.name;
    const awayTeam = game.teams.away.team.name;
    
    return odds.home_team.includes(homeTeam.split(' ').pop()) || 
           odds.away_team.includes(awayTeam.split(' ').pop());
  });

  if (gameOdds && gameOdds.bookmakers && gameOdds.bookmakers.length > 0) {
    const bookmaker = gameOdds.bookmakers[0];
    const totalsMarket = bookmaker.markets.find((m: any) => m.key === 'totals');
    
    if (totalsMarket && totalsMarket.outcomes) {
      const overOutcome = totalsMarket.outcomes.find((o: any) => o.name === 'Over');
      
      return {
        total: overOutcome?.point || 8.5,
        bookmaker: bookmaker.title,
        hasRealLine: true
      };
    }
  }

  return {
    total: 8.5,
    bookmaker: 'Default',
    hasRealLine: false
  };
}

async function runV2Prediction(game: any, oddsData: any[]): Promise<any> {
  // Get weather data
  const weather = await enhancedDataFetcher.getEnhancedWeatherData(game.venue.name);
  
  // Find odds
  const odds = findOddsForGame(game, oddsData);
  
  // Build V2 game factors
  const gameFactors: GameFactors = {
    home_team: game.teams.home.team.name,
    away_team: game.teams.away.team.name,
    venue: game.venue.name,
    date: new Date().toISOString().split('T')[0],
    weather: {
      temp_f: weather.temp_f,
      humidity: weather.humidity,
      wind_speed_mph: weather.wind_speed_mph,
      wind_direction: weather.wind_direction,
      conditions: weather.conditions
    },
    park_factors: {
      runs_factor: getVenueRunsFactor(game.venue.name),
      hr_factor: getVenueHRFactor(game.venue.name),
      altitude: getVenueAltitude(game.venue.name)
    }
  };

  // Run V2 models
  const modelA = runModelA_Recalibrated(gameFactors);
  const modelB = runModelB_Recalibrated(gameFactors);
  const modelC = runModelC_Recalibrated(gameFactors);
  const modelD = runModelD_Recalibrated(gameFactors, odds.total);

  // Generate V2 ensemble
  const ensemble = generateRecalibratedEnsemble(modelA, modelB, modelC, modelD);

  return {
    ensemble,
    odds,
    weather
  };
}

async function runV4Prediction(game: any, oddsData: any[]): Promise<any> {
  // Get weather data
  const weather = await enhancedDataFetcher.getEnhancedWeatherData(game.venue.name);
  
  // Find odds
  const odds = findOddsForGame(game, oddsData);
  
  // Build V4 game factors (enhanced)
  const gameFactors: V4GameFactors = {
    home_team: game.teams.home.team.name,
    away_team: game.teams.away.team.name,
    venue: game.venue.name,
    date: new Date().toISOString().split('T')[0],
    weather: {
      temp_f: weather.temp_f,
      humidity: weather.humidity,
      wind_speed_mph: weather.wind_speed_mph,
      wind_direction: weather.wind_direction,
      conditions: weather.conditions
    },
    park_factors: {
      runs_factor: getVenueRunsFactor(game.venue.name),
      hr_factor: getVenueHRFactor(game.venue.name),
      altitude: getVenueAltitude(game.venue.name)
    },
    starting_pitchers: {
      home: { 
        name: game.teams.home.probablePitcher?.fullName || 'Unknown',
        era: undefined, // Would fetch from API in full implementation
        whip: undefined
      },
      away: { 
        name: game.teams.away.probablePitcher?.fullName || 'Unknown',
        era: undefined,
        whip: undefined
      }
    }
  };

  // Run V4 models
  const modelA = runV4ModelA_Pitching(gameFactors);
  const modelB = runV4ModelB_Offense(gameFactors);
  const modelC = runV4ModelC_WeatherPark(gameFactors);
  const modelD = runV4ModelD_Market(gameFactors, odds.total);

  // Generate V4 ensemble
  const ensemble = generateV4Ensemble(modelA, modelB, modelC, modelD);

  return {
    ensemble,
    odds,
    weather
  };
}

function generateV2Recommendation(ensemble: any, weather: any, hasStaleData: boolean): string {
  if (hasStaleData && ensemble.confidence > 65) {
    return '⚠️ NO PLAY - Stale data detected';
  }

  if (ensemble.confidence < 50) {
    return '❌ NO PLAY - Low confidence';
  }

  const confidenceLevel = ensemble.confidence >= 65 ? '🔥 STRONG' : 
                         ensemble.confidence >= 55 ? '📈 LEAN' : '💡 SLIGHT';

  return `${confidenceLevel} ${ensemble.prediction}`;
}

function generateV4Recommendation(ensemble: any, weather: any): string {
  if (ensemble.confidence < 50) {
    return '❌ NO PLAY - Low confidence';
  }

  let confidenceLevel = ensemble.confidence >= 65 ? '🔥 STRONG' : 
                       ensemble.confidence >= 55 ? '📈 LEAN' : '💡 SLIGHT';

  // Add explosion warning
  if (ensemble.explosion_risk > 0.15) {
    confidenceLevel += ' ⚠️ EXPLOSION RISK';
  }

  return `${confidenceLevel} ${ensemble.prediction}`;
}

function analyzeKeyDifferences(v2: any, v4: any, weather: any): string[] {
  const differences: string[] = [];
  
  // Prediction difference
  if (v2.ensemble.prediction !== v4.ensemble.prediction) {
    differences.push(`🔄 PREDICTION FLIP: V2 ${v2.ensemble.prediction} → V4 ${v4.ensemble.prediction}`);
  }
  
  // Total difference
  const totalDiff = Math.abs(v4.ensemble.total - v2.ensemble.total);
  if (totalDiff > 0.5) {
    differences.push(`📊 TOTAL SHIFT: ${totalDiff.toFixed(2)} runs (V2: ${v2.ensemble.total}, V4: ${v4.ensemble.total})`);
  }
  
  // Hot weather impact
  if (weather.temp_f > 85) {
    differences.push(`🌡️ HOT WEATHER: ${weather.temp_f}°F (V4 gives larger boost)`);
  }
  
  // Explosion risk
  if (v4.ensemble.explosion_risk > 0.10) {
    differences.push(`💥 EXPLOSION RISK: ${(v4.ensemble.explosion_risk * 100).toFixed(1)}% (V4 detects explosive teams)`);
  }
  
  // Confidence difference
  const confDiff = Math.abs(v4.ensemble.confidence - v2.ensemble.confidence);
  if (confDiff > 5) {
    differences.push(`📈 CONFIDENCE: ${confDiff.toFixed(1)}% difference (V2: ${v2.ensemble.confidence}%, V4: ${v4.ensemble.confidence}%)`);
  }
  
  return differences;
}

function getKeyV4Adjustments(v4Result: any): string[] {
  const adjustments: string[] = [];
  
  if (v4Result.ensemble.adjustments_applied.hot_weather > 0.3) {
    adjustments.push(`🌡️ Hot Weather: +${v4Result.ensemble.adjustments_applied.hot_weather.toFixed(2)} runs`);
  }
  
  if (v4Result.ensemble.adjustments_applied.explosive_offense > 0.4) {
    adjustments.push(`💥 Explosive Offense: +${v4Result.ensemble.adjustments_applied.explosive_offense.toFixed(2)} runs`);
  }
  
  if (v4Result.ensemble.adjustments_applied.bullpen_fatigue > 0.1) {
    adjustments.push(`🔥 Bullpen Fatigue: +${v4Result.ensemble.adjustments_applied.bullpen_fatigue.toFixed(2)} runs`);
  }
  
  if (Math.abs(v4Result.ensemble.adjustments_applied.venue_modifier) > 0.2) {
    const sign = v4Result.ensemble.adjustments_applied.venue_modifier > 0 ? '+' : '';
    adjustments.push(`🏟️ Venue Modifier: ${sign}${v4Result.ensemble.adjustments_applied.venue_modifier.toFixed(2)} runs`);
  }
  
  return adjustments;
}

async function compareModels(): Promise<void> {
  try {
    console.log('🔒 Validating data sources...');
    await validateBeforePrediction();
    
    console.log('📡 Fetching tonight\'s games and odds...');
    const [games, oddsData] = await Promise.all([
      fetchTonightsGames(),
      fetchOddsData()
    ]);

    if (games.length === 0) {
      console.log('❌ No games found for tonight');
      return;
    }

    console.log(`🎯 Comparing V2 vs V4 on ${games.length} games\n`);

    const comparisons: ComparisonResult[] = [];
    let v2UnderCount = 0, v4UnderCount = 0;
    let v2OverCount = 0, v4OverCount = 0;

    // Analyze each game
    for (const game of games.slice(0, 8)) { // Limit to first 8 for detailed analysis
      try {
        const homePitcherId = game.teams.home.probablePitcher?.id;
        const awayPitcherId = game.teams.away.probablePitcher?.id;
        
        if (!homePitcherId || !awayPitcherId) {
          console.log(`⚠️  Skipping ${game.teams.away.team.name} @ ${game.teams.home.team.name} - Missing pitcher data`);
          continue;
        }

        console.log(`\n📊 ANALYZING: ${game.teams.away.team.name} @ ${game.teams.home.team.name}`);
        console.log('================================================================');

        // Run both models
        const [v2Result, v4Result] = await Promise.all([
          runV2Prediction(game, oddsData),
          runV4Prediction(game, oddsData)
        ]);

        // Generate recommendations
        const v2Recommendation = generateV2Recommendation(v2Result.ensemble, v2Result.weather, false);
        const v4Recommendation = generateV4Recommendation(v4Result.ensemble, v4Result.weather);

        // Track distribution
        if (v2Result.ensemble.prediction === 'Under') v2UnderCount++;
        else v2OverCount++;
        
        if (v4Result.ensemble.prediction === 'Under') v4UnderCount++;
        else v4OverCount++;

        // Analyze differences
        const keyDifferences = analyzeKeyDifferences(v2Result, v4Result, v2Result.weather);
        const v4Adjustments = getKeyV4Adjustments(v4Result);

        // Display comparison
        console.log(`🏟️  Venue: ${game.venue.name}`);
        console.log(`📊 Market Line: ${v2Result.odds.total} (${v2Result.odds.bookmaker})`);
        console.log(`🌤️  Weather: ${v2Result.weather.temp_f}°F, ${v2Result.weather.conditions}`);
        
        console.log(`\n📈 V2 MODEL (Current):`);
        console.log(`   Prediction: ${v2Result.ensemble.prediction} ${v2Result.ensemble.total}`);
        console.log(`   Confidence: ${v2Result.ensemble.confidence}%`);
        console.log(`   Recommendation: ${v2Recommendation}`);
        
        console.log(`\n🚀 V4 MODEL (Explosive Detection):`);
        console.log(`   Prediction: ${v4Result.ensemble.prediction} ${v4Result.ensemble.total}`);
        console.log(`   Confidence: ${v4Result.ensemble.confidence}%`);
        console.log(`   Explosion Risk: ${(v4Result.ensemble.explosion_risk * 100).toFixed(1)}%`);
        console.log(`   Recommendation: ${v4Recommendation}`);
        
        if (v4Adjustments.length > 0) {
          console.log(`\n🔧 V4 Key Adjustments:`);
          v4Adjustments.forEach(adj => console.log(`   ${adj}`));
        }
        
        if (keyDifferences.length > 0) {
          console.log(`\n⚔️  Key Differences:`);
          keyDifferences.forEach(diff => console.log(`   ${diff}`));
        }

        // Store comparison
        comparisons.push({
          game: `${game.teams.away.team.name} @ ${game.teams.home.team.name}`,
          venue: game.venue.name,
          market_line: v2Result.odds.total,
          bookmaker: v2Result.odds.bookmaker,
          v2_prediction: {
            type: v2Result.ensemble.prediction,
            total: v2Result.ensemble.total,
            confidence: v2Result.ensemble.confidence,
            recommendation: v2Recommendation
          },
          v4_prediction: {
            type: v4Result.ensemble.prediction,
            total: v4Result.ensemble.total,
            confidence: v4Result.ensemble.confidence,
            recommendation: v4Recommendation,
            explosion_risk: v4Result.ensemble.explosion_risk,
            key_adjustments: v4Adjustments
          },
          key_differences: keyDifferences,
          weather: {
            temp: v2Result.weather.temp_f,
            conditions: v2Result.weather.conditions
          }
        });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`❌ Error analyzing ${game.teams.away.team.name} @ ${game.teams.home.team.name}:`, error.message);
      }
    }

    // Summary analysis
    console.log(`\n\n📊 MODEL COMPARISON SUMMARY`);
    console.log('============================');
    
    const totalPredictions = v2UnderCount + v2OverCount;
    console.log(`📈 Games Analyzed: ${totalPredictions}`);
    
    console.log(`\n🔻 UNDER BIAS COMPARISON:`);
    console.log(`   V2 (Current): ${v2UnderCount}/${totalPredictions} Under (${((v2UnderCount/totalPredictions)*100).toFixed(1)}%)`);
    console.log(`   V4 (V4): ${v4UnderCount}/${totalPredictions} Under (${((v4UnderCount/totalPredictions)*100).toFixed(1)}%)`);
    
    console.log(`\n🔺 OVER PREDICTIONS:`);
    console.log(`   V2 (Current): ${v2OverCount}/${totalPredictions} Over (${((v2OverCount/totalPredictions)*100).toFixed(1)}%)`);
    console.log(`   V4 (V4): ${v4OverCount}/${totalPredictions} Over (${((v4OverCount/totalPredictions)*100).toFixed(1)}%)`);

    // Prediction flips
    const flips = comparisons.filter(c => c.v2_prediction.type !== c.v4_prediction.type);
    console.log(`\n🔄 PREDICTION FLIPS: ${flips.length}/${totalPredictions} games`);
    
    if (flips.length > 0) {
      console.log(`   Flipped Games:`);
      flips.forEach(flip => {
        console.log(`   • ${flip.game}: V2 ${flip.v2_prediction.type} → V4 ${flip.v4_prediction.type}`);
      });
    }

    // High explosion risk games
    const explosionRiskGames = comparisons.filter(c => c.v4_prediction.explosion_risk > 0.12);
    console.log(`\n💥 HIGH EXPLOSION RISK GAMES: ${explosionRiskGames.length}`);
    explosionRiskGames.forEach(game => {
      console.log(`   • ${game.game}: ${(game.v4_prediction.explosion_risk * 100).toFixed(1)}% risk`);
    });

    // Hot weather games
    const hotWeatherGames = comparisons.filter(c => c.weather.temp > 85);
    console.log(`\n🌡️  HOT WEATHER GAMES (85°F+): ${hotWeatherGames.length}`);
    hotWeatherGames.forEach(game => {
      console.log(`   • ${game.game}: ${game.weather.temp}°F`);
    });

    console.log(`\n🎯 EXPECTED V4 IMPROVEMENTS:`);
    console.log(`   • Reduced Under Bias: ${((v2UnderCount-v4UnderCount)/totalPredictions*100).toFixed(1)}% fewer Unders`);
    console.log(`   • Explosion Detection: ${explosionRiskGames.length} games flagged for volatility`);
    console.log(`   • Hot Weather Boost: Better calibration for ${hotWeatherGames.length} hot games`);
    console.log(`   • Explosive Team Detection: Enhanced Rangers/Blue Jays/Yankees modeling`);
    
    console.log(`\n⚠️  TONIGHT'S TRACKING:`);
    console.log(`   • Watch V4's explosion risk predictions vs actual results`);
    console.log(`   • Compare V2 vs V4 accuracy on flipped predictions`);
    console.log(`   • Validate hot weather adjustments vs reality`);
    console.log(`   • Monitor if Under bias reduction maintains profitability`);

  } catch (error: any) {
    console.error('❌ Model comparison failed:', error.message);
  }
}

function getVenueRunsFactor(venue: string): number {
  const factors: Record<string, number> = {
    'Coors Field': 1.15,
    'Fenway Park': 1.05,
    'Yankee Stadium': 1.03,
    'Tropicana Field': 0.94,
    'Marlins Park': 0.92,
    'Petco Park': 0.90,
    'Oracle Park': 0.88
  };
  return factors[venue] || 1.0;
}

function getVenueHRFactor(venue: string): number {
  const factors: Record<string, number> = {
    'Coors Field': 1.20,
    'Yankee Stadium': 1.10,
    'Fenway Park': 1.05,
    'Marlins Park': 0.85,
    'Petco Park': 0.80
  };
  return factors[venue] || 1.0;
}

function getVenueAltitude(venue: string): number {
  const altitudes: Record<string, number> = {
    'Coors Field': 5200,
    'Chase Field': 1100,
    'Truist Park': 1050,
    'Kauffman Stadium': 750,
    'PNC Park': 730
  };
  return altitudes[venue] || 500;
}

if (require.main === module) {
  compareModels().catch(console.error);
}