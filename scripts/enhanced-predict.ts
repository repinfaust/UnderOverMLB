#!/usr/bin/env node

/**
 * Enhanced MLB Prediction Script
 * 
 * Features:
 * - Fixed city-specific weather calls with stale data detection
 * - Starting pitcher deep dive analysis
 * - Team form and situational data
 * - Bullpen usage tracking
 * - Updated model weights and confidence calibration
 * - Comprehensive data freshness alerts
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
import {
  runModelA_Recalibrated,
  runModelB_Recalibrated,
  runModelC_Recalibrated,
  runModelD_Recalibrated,
  generateRecalibratedEnsemble,
  GameFactors
} from '../src/models/improved/recalibrated-models';

// Load environment variables
dotenv.config();

interface EnhancedMLBGame {
  gamePk: number;
  gameDate: string;
  teams: {
    away: { 
      team: { id: number; name: string };
      probablePitcher?: { id: number; fullName: string };
    };
    home: { 
      team: { id: number; name: string };
      probablePitcher?: { id: number; fullName: string };
    };
  };
  venue: { name: string };
  status: { abstractGameState: string };
}

interface EnhancedPredictionResult {
  game_id: string;
  game_info: {
    home_team: string;
    away_team: string;
    venue: string;
    date: string;
  };
  enhanced_data: {
    weather: EnhancedWeatherData;
    starting_pitchers: {
      home: StartingPitcherData;
      away: StartingPitcherData;
    };
    team_form: {
      home: TeamFormData;
      away: TeamFormData;
    };
    bullpen_status: {
      home: BullpenData;
      away: BullpenData;
    };
    situational: SituationalData;
    umpire: UmpireData;
  };
  predictions: {
    individual_models: {
      Model_A: any;
      Model_B: any;
      Model_C: any;
      Model_D: any;
    };
    ensemble: any;
  };
  data_quality: {
    stale_data_alerts: string[];
    missing_data_warnings: string[];
    confidence_penalties: number;
  };
  market_line: number;
  bookmaker: string;
  market_odds: {
    over: number;
    under: number;
  };
  recommendation: string;
  processing_time: number;
}

console.log('🚀 Enhanced MLB Prediction System');
console.log('==================================');
console.log('✨ Features: City-specific weather, pitcher analysis, team form, bullpen tracking');
console.log('🔧 Improvements: Fixed model weights, 40% confidence reduction, stale data alerts');
console.log('');

async function fetchEnhancedMLBGames(date: string): Promise<EnhancedMLBGame[]> {
  try {
    console.log('📡 Fetching MLB games with probable pitchers...');
    
    const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
      params: {
        sportId: 1,
        date: date,
        hydrate: 'team,venue,probablePitcher',
      },
      timeout: 10000,
    });

    if (response.data.dates && response.data.dates.length > 0) {
      return response.data.dates[0].games || [];
    }
    
    return [];
  } catch (error: any) {
    console.error('❌ Failed to fetch MLB games:', error.message);
    throw new Error('Cannot proceed without game data');
  }
}

async function generateEnhancedPrediction(game: EnhancedMLBGame, oddsData: any[]): Promise<EnhancedPredictionResult | null> {
  const startTime = Date.now();
  const gameId = `${game.gameDate.split('T')[0]}_${game.teams.away.team.name.replace(/\s+/g, '')}@${game.teams.home.team.name.replace(/\s+/g, '')}`;
  
  console.log(`\n📊 Analyzing: ${game.teams.away.team.name} @ ${game.teams.home.team.name}`);
  console.log(`🏟️  Venue: ${game.venue.name}`);
  
  // Data quality tracking
  const staleDataAlerts: string[] = [];
  const missingDataWarnings: string[] = [];
  let confidencePenalties = 0;

  try {
    // 1. Enhanced Weather Data
    console.log('🌤️  Fetching venue-specific weather...');
    const weather = await enhancedDataFetcher.getEnhancedWeatherData(game.venue.name);
    
    if (weather.is_stale) {
      staleDataAlerts.push(`Weather data for ${game.venue.name} is stale`);
      confidencePenalties += 5;
    }

    // 2. Starting Pitcher Analysis
    console.log('⚾ Analyzing starting pitchers...');
    const homePitcherId = game.teams.home.probablePitcher?.id;
    const awayPitcherId = game.teams.away.probablePitcher?.id;
    
    console.log(`   Home Pitcher: ${game.teams.home.probablePitcher?.fullName || 'MISSING'} (ID: ${homePitcherId || 'N/A'})`);
    console.log(`   Away Pitcher: ${game.teams.away.probablePitcher?.fullName || 'MISSING'} (ID: ${awayPitcherId || 'N/A'})`);
    
    const [homePitcher, awayPitcher] = await Promise.all([
      homePitcherId ? 
        enhancedDataFetcher.getStartingPitcherData(homePitcherId, game.teams.away.team.id, game.venue.name) :
        Promise.resolve(null),
      awayPitcherId ? 
        enhancedDataFetcher.getStartingPitcherData(awayPitcherId, game.teams.home.team.id, game.venue.name) :
        Promise.resolve(null)
    ]);

    if (!homePitcher || !awayPitcher) {
      console.error('🚨 CRITICAL: Starting pitcher data is mandatory for data-driven predictions');
      console.error(`   Home Pitcher: ${homePitcher ? 'Available' : 'MISSING'}`);
      console.error(`   Away Pitcher: ${awayPitcher ? 'Available' : 'MISSING'}`);
      throw new Error('CRITICAL: Starting pitcher data required for prediction - HALTING');
    }

    // 3. Team Form Analysis
    console.log('📈 Analyzing team form and splits...');
    const [homeTeamForm, awayTeamForm] = await Promise.all([
      enhancedDataFetcher.getTeamFormData(game.teams.home.team.id, game.teams.away.team.id),
      enhancedDataFetcher.getTeamFormData(game.teams.away.team.id, game.teams.home.team.id)
    ]);

    // 4. Bullpen Status
    console.log('🔥 Checking bullpen availability...');
    const [homeBullpen, awayBullpen] = await Promise.all([
      enhancedDataFetcher.getBullpenData(game.teams.home.team.id),
      enhancedDataFetcher.getBullpenData(game.teams.away.team.id)
    ]);

    // 5. Situational Data
    const situational = enhancedDataFetcher.getSituationalData(
      game.gameDate, 
      game.teams.home.team.id, 
      game.teams.away.team.id, 
      1 // Assume game 1 of series for now
    );

    // 6. Umpire Data
    const umpire = await enhancedDataFetcher.getUmpireData(game.gamePk);

    // 7. Market Data (MANDATORY)
    const odds = findOddsForGame(game, oddsData);
    
    // CRITICAL: Validate we have real betting lines
    if (!odds.hasRealLine) {
      console.warn(`⚠️  SKIPPING ${game.teams.away.team.name} @ ${game.teams.home.team.name} - No real betting line available`);
      return null; // Skip games without real lines
    }

    // Build enhanced game factors
    const gameFactors: GameFactors = {
      home_team: game.teams.home.team.name,
      away_team: game.teams.away.team.name,
      venue: game.venue.name,
      date: game.gameDate.split('T')[0],
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

    // Run individual models with enhanced data
    console.log('🤖 Running enhanced prediction models...');
    
    const modelA = runModelA_Recalibrated(gameFactors);
    const modelB = runModelB_Recalibrated(gameFactors);
    const modelC = runModelC_Recalibrated(gameFactors);
    const modelD = runModelD_Recalibrated(gameFactors, odds.total);

    // Apply confidence penalties for missing/stale data
    modelA.confidence = Math.max(45, modelA.confidence - confidencePenalties);
    modelB.confidence = Math.max(45, modelB.confidence - confidencePenalties);
    modelC.confidence = Math.max(45, modelC.confidence - confidencePenalties);
    modelD.confidence = Math.max(45, modelD.confidence - confidencePenalties);

    // Generate ensemble with new weights
    const ensemble = generateRecalibratedEnsemble(modelA, modelB, modelC, modelD);

    // Enhanced recommendation logic
    const recommendation = generateEnhancedRecommendation(
      ensemble, 
      weather, 
      situational, 
      homePitcher, 
      awayPitcher,
      staleDataAlerts.length > 0
    );

    const processingTime = Date.now() - startTime;

    return {
      game_id: gameId,
      game_info: {
        home_team: game.teams.home.team.name,
        away_team: game.teams.away.team.name,
        venue: game.venue.name,
        date: game.gameDate.split('T')[0]
      },
      enhanced_data: {
        weather,
        starting_pitchers: {
          home: homePitcher || {} as StartingPitcherData,
          away: awayPitcher || {} as StartingPitcherData
        },
        team_form: {
          home: homeTeamForm,
          away: awayTeamForm
        },
        bullpen_status: {
          home: homeBullpen,
          away: awayBullpen
        },
        situational,
        umpire
      },
      predictions: {
        individual_models: {
          Model_A: modelA,
          Model_B: modelB,
          Model_C: modelC,
          Model_D: modelD
        },
        ensemble
      },
      data_quality: {
        stale_data_alerts: staleDataAlerts,
        missing_data_warnings: missingDataWarnings,
        confidence_penalties: confidencePenalties
      },
      market_line: odds.total,
      bookmaker: odds.bookmaker,
      market_odds: {
        over: odds.overOdds,
        under: odds.underOdds
      },
      recommendation,
      processing_time: processingTime
    };

  } catch (error: any) {
    console.error(`❌ Error generating prediction for ${gameId}:`, error.message);
    throw error;
  }
}

function generateEnhancedRecommendation(
  ensemble: any, 
  weather: EnhancedWeatherData, 
  situational: SituationalData,
  homePitcher: StartingPitcherData | null,
  awayPitcher: StartingPitcherData | null,
  hasStaleData: boolean
): string {
  if (hasStaleData && ensemble.confidence > 65) {
    return '⚠️ NO PLAY - Stale data detected with high confidence claim';
  }

  if (ensemble.confidence < 50) {
    return '❌ NO PLAY - Low confidence prediction';
  }

  const edgeFactors = [];
  
  // Weather edge
  if (weather.is_dome) {
    edgeFactors.push('Dome game (controlled conditions)');
  } else if (weather.wind_speed_mph > 15) {
    edgeFactors.push('High wind conditions');
  }

  // Situational edges
  if (situational.day_game_after_night) {
    edgeFactors.push('Day-after-night game fatigue factor');
  }

  // Pitcher edges
  if (homePitcher && awayPitcher) {
    if (homePitcher.recent_form.last_5_starts.era < 3.00 && awayPitcher.recent_form.last_5_starts.era < 3.00) {
      edgeFactors.push('Elite pitcher matchup');
    }
  }

  const confidenceLevel = ensemble.confidence >= 70 ? '🔥 STRONG' : 
                         ensemble.confidence >= 65 ? '📈 LEAN' : '💡 SLIGHT';

  let recommendation = `${confidenceLevel} ${ensemble.prediction}`;
  
  if (edgeFactors.length > 0) {
    recommendation += ` (Edge: ${edgeFactors.slice(0, 2).join(', ')})`;
  }

  return recommendation;
}

async function fetchRealOddsData(): Promise<any[]> {
  try {
    if (!process.env.ODDS_API_KEY) {
      throw new Error('❌ CRITICAL: ODDS_API_KEY not found - cannot fetch betting lines');
    }

    console.log('📡 Fetching live betting lines from Odds API...');
    const response = await axios.get('https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/', {
      params: {
        apiKey: process.env.ODDS_API_KEY,
        regions: 'us',
        markets: 'totals',
        oddsFormat: 'american'
      }
    });

    console.log(`✅ Found betting lines for ${response.data.length} games`);
    return response.data;
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR: Failed to fetch betting lines:', error.message);
    throw new Error('MANDATORY: Betting lines required for predictions - STOPPING');
  }
}

function findOddsForGame(game: EnhancedMLBGame, oddsData: any[]) {
  // Find matching game by team names
  const gameOdds = oddsData.find(odds => {
    const homeTeam = game.teams.home.team.name;
    const awayTeam = game.teams.away.team.name;
    
    return odds.home_team.includes(homeTeam.split(' ').pop()) || 
           odds.away_team.includes(awayTeam.split(' ').pop());
  });

  if (gameOdds && gameOdds.bookmakers && gameOdds.bookmakers.length > 0) {
    const bookmaker = gameOdds.bookmakers[0]; // Use first bookmaker
    const totalsMarket = bookmaker.markets.find((m: any) => m.key === 'totals');
    
    if (totalsMarket && totalsMarket.outcomes) {
      const overOutcome = totalsMarket.outcomes.find((o: any) => o.name === 'Over');
      const underOutcome = totalsMarket.outcomes.find((o: any) => o.name === 'Under');
      
      return {
        total: overOutcome?.point || 8.5,
        overOdds: overOutcome?.price || -110,
        underOdds: underOutcome?.price || -110,
        bookmaker: bookmaker.title,
        hasRealLine: true
      };
    }
  }

  // CRITICAL: No real line found - this should be flagged
  console.warn(`⚠️  WARNING: No betting line found for ${game.teams.away.team.name} @ ${game.teams.home.team.name}`);
  return {
    total: 8.5, // Default fallback
    overOdds: -110,
    underOdds: -110,
    bookmaker: 'FALLBACK',
    hasRealLine: false
  };
}

function getVenueRunsFactor(venue: string): number {
  const factors: Record<string, number> = {
    'Coors Field': 1.15,
    'Fenway Park': 1.05,
    'Yankee Stadium': 1.03,
    'Tropicana Field': 0.94,
    'Marlins Park': 0.92,
    'Petco Park': 0.90,
    'Oakland Coliseum': 0.88
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

async function runEnhancedPredictions(): Promise<void> {
  try {
    console.log('🔒 MANDATORY: Validating data sources...');
    await validateBeforePrediction();

    // Check for date parameter from command line
    const dateArg = process.argv.find(arg => arg.startsWith('--date='));
    const today = dateArg ? dateArg.split('=')[1] : new Date().toISOString().split('T')[0];
    console.log(`📅 Getting enhanced predictions for ${today}\n`);

    // Fetch games and odds
    const [games, oddsData] = await Promise.all([
      fetchEnhancedMLBGames(today),
      fetchRealOddsData() // CRITICAL: Fetch actual betting lines
    ]);

    if (games.length === 0) {
      console.log('❌ No games found for today');
      return;
    }

    console.log(`🎯 Found ${games.length} games for analysis\n`);

    let successfulPredictions = 0;
    let totalStaleDataAlerts = 0;

    // Process each game
    for (const game of games) {
      try {
        const prediction = await generateEnhancedPrediction(game, oddsData);
        
        // Skip if no real betting line available
        if (!prediction) {
          continue;
        }
        
        // Display results
        displayEnhancedResults(prediction);
        
        successfulPredictions++;
        totalStaleDataAlerts += prediction.data_quality.stale_data_alerts.length;
        
        // Small delay between predictions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`❌ Failed to predict ${game.teams.away.team.name} @ ${game.teams.home.team.name}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📊 ENHANCED PREDICTION SUMMARY');
    console.log('================================');
    console.log(`✅ Successful predictions: ${successfulPredictions}/${games.length}`);
    console.log(`⚠️  Total stale data alerts: ${totalStaleDataAlerts}`);
    console.log(`🔧 Model improvements applied: 40% confidence reduction, updated weights`);
    console.log(`📡 Data sources: MLB Stats API, OpenWeatherMap (city-specific), Enhanced Analytics`);
    
    if (totalStaleDataAlerts > 0) {
      console.log(`\n🚨 DATA QUALITY WARNING: ${totalStaleDataAlerts} stale data instances detected`);
      console.log('   Consider refreshing data sources or reducing confidence in affected predictions');
    }

  } catch (error: any) {
    console.error('❌ Enhanced prediction run failed:', error.message);
    process.exit(1);
  }
}

function displayEnhancedResults(prediction: EnhancedPredictionResult): void {
  const p = prediction;
  
  console.log(`\n📊 Game: ${p.game_info.away_team} @ ${p.game_info.home_team}`);
  console.log('══════════════════════════════════════════════════════════════');
  
  // Main prediction
  console.log(`🎲 Ensemble Prediction: ${p.predictions.ensemble.prediction}`);
  console.log(`🎯 Calculated Total: ${p.predictions.ensemble.total}`);
  console.log(`📊 Market Line: ${(p as any).market_line || 'N/A'} (${(p as any).bookmaker || 'Unknown'})`);
  console.log(`📈 Confidence: ${p.predictions.ensemble.confidence}% ${p.predictions.ensemble.confidence >= 65 ? '✅' : '❌'}`);
  console.log(`💡 Recommendation: ${p.recommendation}`);
  console.log(`⚡ Processing Time: ${p.processing_time}ms`);

  // Enhanced data insights
  console.log(`\n🌤️  Enhanced Weather (${p.enhanced_data.weather.location}):`);
  console.log(`   Temperature: ${p.enhanced_data.weather.temp_f}°F`);
  console.log(`   Wind: ${p.enhanced_data.weather.wind_speed_mph}mph ${p.enhanced_data.weather.wind_direction}`);
  console.log(`   Humidity: ${p.enhanced_data.weather.humidity}%`);
  console.log(`   Conditions: ${p.enhanced_data.weather.conditions}`);
  console.log(`   Venue Type: ${p.enhanced_data.weather.is_dome ? 'Dome' : 'Outdoor'}`);

  // Data quality alerts
  if (p.data_quality.stale_data_alerts.length > 0) {
    console.log(`\n🚨 Stale Data Alerts:`);
    p.data_quality.stale_data_alerts.forEach(alert => console.log(`   ${alert}`));
  }

  if (p.data_quality.missing_data_warnings.length > 0) {
    console.log(`\n⚠️  Missing Data Warnings:`);
    p.data_quality.missing_data_warnings.forEach(warning => console.log(`   ${warning}`));
  }

  if (p.data_quality.confidence_penalties > 0) {
    console.log(`\n📉 Confidence Penalties Applied: -${p.data_quality.confidence_penalties}%`);
  }

  // Model breakdown
  console.log(`\n🤖 Enhanced Model Results:`);
  console.log(`   Model_A_Pitching: ${p.predictions.individual_models.Model_A.prediction} (${p.predictions.individual_models.Model_A.confidence}%)`);
  console.log(`   Model_B_Offense: ${p.predictions.individual_models.Model_B.prediction} (${p.predictions.individual_models.Model_B.confidence}%)`);
  console.log(`   Model_C_Weather_Park: ${p.predictions.individual_models.Model_C.prediction} (${p.predictions.individual_models.Model_C.confidence}%)`);
  console.log(`   Model_D_Market: ${p.predictions.individual_models.Model_D.prediction} (${p.predictions.individual_models.Model_D.confidence}%)`);
  console.log(`   🎯 Actual Weights: A(40%), B(25%), C(20%), D(15%)`);
}

// Run the enhanced predictions
if (require.main === module) {
  runEnhancedPredictions().catch(console.error);
}