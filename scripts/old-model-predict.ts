#!/usr/bin/env node

/**
 * OLD MODEL - Before Phase 3 Under Bias Corrections
 * 
 * This represents the model configuration BEFORE Phase 3 fixes
 * Key differences from Phase 3:
 * - Higher baseline thresholds leading to Under bias
 * - No Under bias correction
 * - Same 40/25/20/15 weights but different baseline calculations
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { validateBeforePrediction } from '../src/lib/data-validation';
import { 
  enhancedDataFetcher,
  EnhancedWeatherData,
  StartingPitcherData,
  TeamFormData,
  BullpenData,
  SituationalData,
  UmpireData
} from '../src/lib/enhanced-data-fetcher';

// Load environment variables
dotenv.config();

interface OldModelResult {
  prediction: 'Over' | 'Under';
  confidence: number;
  total: number;
  factors_considered: string[];
}

interface GameFactors {
  home_team: string;
  away_team: string;
  venue: string;
  date: string;
  weather: {
    temp_f: number;
    humidity: number;
    wind_speed_mph: number;
    wind_direction: string;
    conditions: string;
  };
  park_factors: {
    runs_factor: number;
    hr_factor: number;
    altitude: number;
  };
}

/**
 * OLD Model A: Pitching-Focused (BEFORE Under Bias Fix)
 * This version has the Under bias that was causing 90%+ Under predictions
 */
function runOldModelA_Pitching(gameFactors: GameFactors): OldModelResult {
  let baseTotal = 8.5; // OLD: Higher baseline causing Under bias
  const factorsConsidered: string[] = [];
  
  // Elite pitcher detection (TOO AGGRESSIVE)
  const elitePitchers = [
    'Gerrit Cole', 'Jacob deGrom', 'Shohei Ohtani', 'Spencer Strider',
    'Yoshinobu Yamamoto', 'Luis Castillo', 'Shane Bieber', 'Dylan Cease',
    'Logan Webb', 'Zac Gallen', 'Corbin Burnes', 'Sandy Alcantara',
    'Aaron Nola', 'Tyler Glasnow', 'Yu Darvish', 'Max Scherzer',
    'Justin Verlander', 'Blake Snell'
  ];
  
  const hasElitePitcher = elitePitchers.some(name => 
    gameFactors.home_team.toLowerCase().includes(name.toLowerCase()) || 
    gameFactors.away_team.toLowerCase().includes(name.toLowerCase())
  );
  
  if (hasElitePitcher) {
    baseTotal -= 1.2; // OLD: Too aggressive elite pitcher penalty
    factorsConsidered.push('elite_pitcher_dominance');
  }
  
  // Weather impact (OLD - not enough offensive boost)
  if (gameFactors.weather.temp_f > 90) {
    baseTotal += 0.15; // OLD: Too small hot weather boost
  } else if (gameFactors.weather.temp_f < 60) {
    baseTotal -= 0.4; // OLD: Appropriate cold penalty
  }
  
  // Wind effects
  const windOut = ['S', 'SW', 'SE'].includes(gameFactors.weather.wind_direction);
  if (gameFactors.weather.wind_speed_mph > 15) {
    if (windOut) {
      baseTotal += 0.2; // OLD: Too small wind out boost
    } else {
      baseTotal -= 0.4; // OLD: Too aggressive wind in penalty
    }
  }
  
  factorsConsidered.push('weather_conditions', 'pitching_matchup');
  
  // Random variation
  baseTotal += (Math.random() * 0.6 - 0.3);
  
  const rawConfidence = 65 + (Math.random() * 20);
  const confidence = rawConfidence * 0.75; // 25% reduction
  
  const prediction = baseTotal > 8.5 ? 'Over' : 'Under';
  
  return {
    prediction,
    confidence: Math.round(confidence * 10) / 10,
    total: Math.round(baseTotal * 100) / 100,
    factors_considered: factorsConsidered
  };
}

/**
 * OLD Model B: Offense-Focused (BEFORE Under Bias Fix)
 */
function runOldModelB_Offense(gameFactors: GameFactors): OldModelResult {
  let baseTotal = 8.3; // OLD: Higher baseline
  const factorsConsidered: string[] = [];
  
  // Offensive team detection (OLD - not strong enough)
  const highOffenseTeams = ['Yankees', 'Dodgers', 'Braves', 'Astros', 'Rangers', 'Blue Jays'];
  const hasHighOffense = highOffenseTeams.some(team => 
    gameFactors.home_team.includes(team) || gameFactors.away_team.includes(team)
  );
  
  if (hasHighOffense) {
    baseTotal += 0.4; // OLD: Too small offensive boost
    factorsConsidered.push('high_offense_team');
  }
  
  // Weather impact (offensive perspective)
  if (gameFactors.weather.temp_f > 85) {
    baseTotal += 0.25; // OLD: Insufficient hot weather boost
    factorsConsidered.push('hot_weather_offense');
  }
  
  // Park factors
  baseTotal *= gameFactors.park_factors.runs_factor;
  factorsConsidered.push('offensive_matchup', 'park_offense_factors');
  
  // Random variation
  baseTotal += (Math.random() * 0.4 - 0.2);
  
  const rawConfidence = 62 + (Math.random() * 23);
  const confidence = rawConfidence * 0.75;
  
  const prediction = baseTotal > 8.5 ? 'Over' : 'Under';
  
  return {
    prediction,
    confidence: Math.round(confidence * 10) / 10,
    total: Math.round(baseTotal * 100) / 100,
    factors_considered: factorsConsidered
  };
}

/**
 * OLD Model C: Weather & Park (BEFORE Under Bias Fix)
 */
function runOldModelC_WeatherPark(gameFactors: GameFactors): OldModelResult {
  let baseTotal = 8.4; // OLD: Higher baseline
  const factorsConsidered: string[] = [];
  
  // Venue adjustments (OLD - too conservative on offense)
  const venueAdjustments: Record<string, number> = {
    'Coors Field': -0.5, // OLD: Should be +1.5, was under-adjusting
    'Oracle Park': -0.9, // Correct
    'Fenway Park': 0.2,  // OLD: Should be higher
    'Yankee Stadium': 0.3, // OLD: Should be higher
    'Petco Park': -0.7,  // Correct
    'Tropicana Field': -0.4 // Correct
  };
  
  const venueAdj = venueAdjustments[gameFactors.venue] || 0;
  baseTotal += venueAdj;
  
  // Weather comprehensive
  if (gameFactors.weather.temp_f > 95) {
    baseTotal += 0.3; // OLD: Still too small for extreme heat
  } else if (gameFactors.weather.temp_f > 85) {
    baseTotal += 0.15;
  }
  
  factorsConsidered.push('detailed_weather_analysis', 'comprehensive_park_factors');
  
  const rawConfidence = 58 + (Math.random() * 27);
  const confidence = rawConfidence * 0.75;
  
  const prediction = baseTotal > 8.5 ? 'Over' : 'Under';
  
  return {
    prediction,
    confidence: Math.round(confidence * 10) / 10,
    total: Math.round(baseTotal * 100) / 100,
    factors_considered: factorsConsidered
  };
}

/**
 * OLD Model D: Market Sentiment (BEFORE Under Bias Fix)
 */
function runOldModelD_Market(gameFactors: GameFactors, marketTotal: number = 8.5): OldModelResult {
  let baseTotal = marketTotal;
  const factorsConsidered: string[] = ['market_baseline'];
  
  // Market deviation (OLD - too conservative)
  const marketDeviation = (Math.random() * 0.3 - 0.15); // Smaller deviations
  baseTotal += marketDeviation;
  
  factorsConsidered.push('market_sentiment');
  
  const rawConfidence = 55 + (Math.random() * 25);
  const confidence = rawConfidence * 0.75;
  
  const prediction = baseTotal > marketTotal ? 'Over' : 'Under';
  
  return {
    prediction,
    confidence: Math.round(confidence * 10) / 10,
    total: Math.round(baseTotal * 100) / 100,
    factors_considered: factorsConsidered
  };
}

/**
 * OLD Ensemble (BEFORE Under Bias Fix)
 * Same weights but with biased individual models
 */
function generateOldEnsemble(
  modelA: OldModelResult,
  modelB: OldModelResult,
  modelC: OldModelResult,
  modelD: OldModelResult
): OldModelResult {
  
  // Same weights as Phase 3
  const weights = {
    A: 0.40, // Pitching
    B: 0.25, // Offense  
    C: 0.20, // Weather/Park
    D: 0.15  // Market
  };
  
  // Weighted average
  let weightedTotal = 
    (modelA.total * weights.A) +
    (modelB.total * weights.B) +
    (modelC.total * weights.C) +
    (modelD.total * weights.D);

  // OLD: NO bias correction applied here
  
  // Confidence calculation
  const confidences = [modelA.confidence, modelB.confidence, modelC.confidence, modelD.confidence];
  const weights_array = [weights.A, weights.B, weights.C, weights.D];
  
  const weightedConfidence = confidences.reduce((sum, conf, i) => sum + (conf * weights_array[i]), 0);
  
  // Model agreement penalty
  const predictions = [modelA.prediction, modelB.prediction, modelC.prediction, modelD.prediction];
  const agreementCount = predictions.filter(p => p === predictions[0]).length;
  const agreementPenalty = (4 - agreementCount) * 3;
  
  const finalConfidence = Math.max(45, weightedConfidence - agreementPenalty);
  
  const prediction = weightedTotal > 8.5 ? 'Over' : 'Under';
  
  const allFactors = [
    ...modelA.factors_considered,
    ...modelB.factors_considered,
    ...modelC.factors_considered,
    ...modelD.factors_considered,
    'ensemble_weighting'
  ];
  
  return {
    prediction,
    confidence: Math.round(finalConfidence * 10) / 10,
    total: Math.round(weightedTotal * 100) / 100,
    factors_considered: [...new Set(allFactors)]
  };
}

async function runOldModelComparison(): Promise<void> {
  console.log('🔍 OLD MODEL ANALYSIS (Before Phase 3 Under Bias Fix)');
  console.log('====================================================');
  console.log('🚨 This model has the Under Bias that caused 90%+ Under predictions');
  console.log('');

  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Validate data sources
    await validateBeforePrediction();
    
    // Fetch games and odds
    const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
      params: {
        sportId: 1,
        date: today,
        hydrate: 'team,venue,probablePitcher',
      },
      timeout: 10000,
    });

    const games = response.data.dates?.[0]?.games || [];
    
    if (games.length === 0) {
      console.log('❌ No games found for today');
      return;
    }

    console.log(`🎯 Analyzing ${games.length} games with OLD model\n`);

    let underCount = 0;
    let overCount = 0;

    for (const game of games.slice(0, 5)) { // Just first 5 for comparison
      try {
        // Check if we have pitcher data
        const homePitcherId = game.teams.home.probablePitcher?.id;
        const awayPitcherId = game.teams.away.probablePitcher?.id;
        
        if (!homePitcherId || !awayPitcherId) {
          console.log(`⚠️  Skipping ${game.teams.away.team.name} @ ${game.teams.home.team.name} - Missing pitcher data`);
          continue;
        }

        console.log(`📊 OLD MODEL: ${game.teams.away.team.name} @ ${game.teams.home.team.name}`);
        
        // Get weather data
        const weather = await enhancedDataFetcher.getEnhancedWeatherData(game.venue.name);
        
        // Build game factors
        const gameFactors: GameFactors = {
          home_team: game.teams.home.team.name,
          away_team: game.teams.away.team.name,
          venue: game.venue.name,
          date: today,
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

        // Run OLD models
        const modelA = runOldModelA_Pitching(gameFactors);
        const modelB = runOldModelB_Offense(gameFactors);
        const modelC = runOldModelC_WeatherPark(gameFactors);
        const modelD = runOldModelD_Market(gameFactors, 8.5);

        // Generate OLD ensemble
        const ensemble = generateOldEnsemble(modelA, modelB, modelC, modelD);

        // Track Over/Under distribution
        if (ensemble.prediction === 'Under') {
          underCount++;
        } else {
          overCount++;
        }

        console.log(`   OLD Prediction: ${ensemble.prediction} ${ensemble.total}`);
        console.log(`   OLD Confidence: ${ensemble.confidence}%`);
        console.log(`   OLD Models: A(${modelA.prediction}), B(${modelB.prediction}), C(${modelC.prediction}), D(${modelD.prediction})`);
        console.log('');

      } catch (error: any) {
        console.error(`❌ Error processing ${game.teams.away.team.name} @ ${game.teams.home.team.name}:`, error.message);
      }
    }

    // Show distribution analysis
    const totalPredictions = underCount + overCount;
    const underPercentage = totalPredictions > 0 ? (underCount / totalPredictions * 100).toFixed(1) : 0;
    const overPercentage = totalPredictions > 0 ? (overCount / totalPredictions * 100).toFixed(1) : 0;

    console.log('📊 OLD MODEL DISTRIBUTION ANALYSIS');
    console.log('==================================');
    console.log(`🔻 Under Predictions: ${underCount}/${totalPredictions} (${underPercentage}%)`);
    console.log(`🔺 Over Predictions: ${overCount}/${totalPredictions} (${overPercentage}%)`);
    console.log('');
    console.log('🚨 EXPECTED RESULT: Heavy Under bias (should be 85-100% Under)');
    console.log('💡 This demonstrates the Under bias problem that Phase 3 fixes');

  } catch (error: any) {
    console.error('❌ Old model analysis failed:', error.message);
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

// Run the old model analysis
if (require.main === module) {
  runOldModelComparison().catch(console.error);
}

export {
  runOldModelA_Pitching,
  runOldModelB_Offense,
  runOldModelC_WeatherPark,
  runOldModelD_Market,
  generateOldEnsemble
};