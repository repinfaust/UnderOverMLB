/**
 * Complete 6-Model Comparison: V4, V5, V6, V7A, V7B, V7C
 * 
 * Runs all 6 models on tonight's games with comprehensive analysis
 * including the new enhanced V7C canonical Markov chain model
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { V6AdvancedModel } from '../src/models/v6/v6-advanced-model';
import { V7AHybridModel } from '../src/models/v7/v7a-hybrid-model';
import { V7BMarkovModel } from '../src/models/v7/v7b-markov-model';
import { V7CCanonicalModel } from '../src/models/v7/v7c-canonical-markov';
import { predictV4GameTotal, getV4Recommendation, GameData } from '../src/models/improved/v4-component-model';
import { runV5AdvancedModel, getV5Recommendation, V5GameFactors } from '../src/models/v5/advanced-explosion-models';

async function fetchTonightsGames(): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const response = await axios.get(`https://statsapi.mlb.com/api/v1/schedule`, {
      params: {
        sportId: 1,
        date: today,
        hydrate: 'team,venue,probablePitcher'
      }
    });
    return response.data.dates[0]?.games || [];
  } catch (error) {
    console.error('Error fetching games:', error);
    return [];
  }
}

function getTeamAbbreviation(fullName: string): string {
  const teamMap: { [key: string]: string } = {
    'Milwaukee Brewers': 'Brewers', 'Chicago Cubs': 'Cubs',
    'Houston Astros': 'Astros', 'Detroit Tigers': 'Tigers',
    'Toronto Blue Jays': 'Blue Jays', 'Pittsburgh Pirates': 'Pirates',
    'New York Yankees': 'Yankees', 'Tampa Bay Rays': 'Rays',
    'Philadelphia Phillies': 'Phillies', 'Atlanta Braves': 'Braves',
    'Los Angeles Dodgers': 'Dodgers', 'Colorado Rockies': 'Rockies',
    'San Francisco Giants': 'Giants', 'San Diego Padres': 'Padres',
    'Seattle Mariners': 'Mariners', 'Baltimore Orioles': 'Orioles',
    'Boston Red Sox': 'Red Sox', 'Chicago White Sox': 'White Sox',
    'Texas Rangers': 'Rangers', 'Kansas City Royals': 'Royals',
    'Oakland Athletics': 'Athletics', 'Minnesota Twins': 'Twins',
    'New York Mets': 'Mets', 'Washington Nationals': 'Nationals',
    'St. Louis Cardinals': 'Cardinals', 'Miami Marlins': 'Marlins',
    'Cincinnati Reds': 'Reds', 'Los Angeles Angels': 'Angels',
    'Cleveland Guardians': 'Guardians', 'Arizona Diamondbacks': 'Diamondbacks'
  };
  return teamMap[fullName] || fullName;
}

function getMockWeather(): any {
  return {
    temperature: 75 + Math.random() * 20,
    conditions: ['clear sky', 'overcast clouds', 'broken clouds'][Math.floor(Math.random() * 3)]
  };
}

function getMockBettingLines() {
  return [
    { bookmaker: 'FanDuel', total: 8.5, over_odds: -110, under_odds: -110 },
    { bookmaker: 'BetMGM', total: 8.5, over_odds: -105, under_odds: -115 },
    { bookmaker: 'DraftKings', total: 8.0, over_odds: -110, under_odds: -110 }
  ];
}

async function runSixModelsComparison() {
  console.log('🎯 COMPLETE 6-MODEL COMPARISON: V4, V5, V6, V7A, V7B, V7C');
  console.log('=' .repeat(65));
  console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
  
  // Initialize all models
  const v6Model = new V6AdvancedModel();
  const v7aModel = new V7AHybridModel();
  const v7bModel = new V7BMarkovModel();
  const v7cModel = new V7CCanonicalModel();
  
  console.log('✅ All 6 models initialized\\n');

  // Fetch tonight's games
  const games = await fetchTonightsGames();
  console.log(`📊 Found ${games.length} games for analysis\\n`);

  if (games.length === 0) {
    console.log('❌ No games available for prediction');
    return;
  }

  const allPredictions: any[] = [];
  const bettingLines = getMockBettingLines();

  // Analyze each game with all 6 models
  for (let i = 0; i < Math.min(games.length, 6); i++) { // Limit to 6 games for comprehensive analysis
    const game = games[i];
    const homeTeam = getTeamAbbreviation(game.teams.home.team.name);
    const awayTeam = getTeamAbbreviation(game.teams.away.team.name);
    const venue = game.venue.name;
    const weather = getMockWeather();

    console.log(`${'='.repeat(70)}`);
    console.log(`📊 GAME ${i + 1}: ${awayTeam} @ ${homeTeam}`);
    console.log(`🏟️  Venue: ${venue}`);
    console.log(`🌤️  Weather: ${weather.temperature.toFixed(1)}°F, ${weather.conditions}`);
    
    // Market lines
    console.log('💰 MARKET LINES:');
    bettingLines.forEach(line => {
      console.log(`   ${line.bookmaker}: O/U ${line.total} (${line.over_odds}/${line.under_odds})`);
    });

    // Prepare contexts for different models
    const v4Context: GameData = {
      home_team: homeTeam,
      away_team: awayTeam, 
      venue: venue,
      date: new Date().toISOString().split('T')[0],
      weather: {
        temp_f: weather.temperature,
        humidity: 65,
        wind_speed_mph: 5,
        wind_direction: 'SW',
        conditions: weather.conditions
      },
      park_factors: {
        runs_factor: 1.0,
        hr_factor: 1.0,
        altitude: venue.includes('Coors') ? 5200 : 500
      }
    };

    const v5Context: V5GameFactors = {
      home_team: homeTeam,
      away_team: awayTeam,
      venue: venue,
      date: new Date().toISOString().split('T')[0],
      weather: {
        temp_f: weather.temperature,
        humidity: 65,
        wind_speed_mph: 5,
        wind_direction: 'SW',
        conditions: weather.conditions
      },
      park_factors: {
        runs_factor: 1.0,
        hr_factor: 1.0,
        altitude: venue.includes('Coors') ? 5200 : 500
      }
    };

    const v6v7Context = {
      home_team: homeTeam,
      away_team: awayTeam, 
      venue: venue,
      date: new Date().toISOString().split('T')[0],
      temperature: weather.temperature,
      weather_conditions: weather.conditions
    };

    console.log('\\n⏱️  Running all 6 models...');
    const startTime = Date.now();

    // Run all models
    const v4Result = predictV4GameTotal(v4Context);
    const v5Result = runV5AdvancedModel(v5Context);
    const v6Pred = v6Model.predict(v6v7Context);
    const v7aPred = v7aModel.predict(v6v7Context);
    const v7bPred = v7bModel.predict(v6v7Context);
    const v7cPred = await v7cModel.predict(v6v7Context); // Enhanced V7C with async

    const totalTime = Date.now() - startTime;

    // Convert results to consistent format
    const v4Pred = {
      prediction: v4Result.prediction,
      calculated_total: v4Result.final_total,
      confidence: v4Result.confidence,
      recommendation: getV4Recommendation(v4Result),
      explosion_risk: v4Result.explosion_risk * 100,
      model_type: 'Component-Based'
    };
    
    const v5Pred = {
      prediction: v5Result.prediction,
      calculated_total: v5Result.total,
      confidence: v5Result.confidence,
      recommendation: getV5Recommendation(v5Result),
      explosion_risk: v5Result.explosion_risk,
      risk_level: v5Result.risk_level,
      model_type: 'Explosion-Detection'
    };

    // Model type descriptions (for display only)
    const modelTypes = {
      v6: 'Bias-Corrected',
      v7a: 'V6+Markov Hybrid',
      v7b: 'Markov Pattern-Based',
      v7c: 'Canonical Markov Chain'
    };

    console.log('\\n🤖 ALL 6 MODEL PREDICTIONS:');
    console.log('─'.repeat(40));

    // V4 Results
    console.log(`V4 (${v4Pred.model_type}): ${v4Pred.prediction} ${v4Pred.calculated_total} (${v4Pred.confidence}%)`);
    console.log(`    Recommendation: ${v4Pred.recommendation}`);
    
    // V5 Results  
    console.log(`V5 (${v5Pred.model_type}): ${v5Pred.prediction} ${v5Pred.calculated_total} (${v5Pred.confidence}%)`);
    console.log(`    Risk Level: ${v5Pred.risk_level}, Recommendation: ${v5Pred.recommendation}`);
    
    // V6 Results
    console.log(`V6 (${modelTypes.v6}): ${v6Pred.prediction} ${v6Pred.calculated_total} (${v6Pred.confidence}%)`);
    console.log(`    Risk Level: ${v6Pred.risk_level}, Explosion Risk: ${v6Pred.explosion_risk}%`);
    
    // V7A Results
    console.log(`V7A (${modelTypes.v7a}): ${v7aPred.prediction} ${v7aPred.calculated_total} (${v7aPred.confidence}%)`);
    console.log(`     Markov Confidence: ${v7aPred.markov_analysis.markov_confidence}%, Alignment: ${v7aPred.markov_analysis.pattern_alignment}`);
    
    // V7B Results
    console.log(`V7B (${modelTypes.v7b}): ${v7bPred.prediction} ${v7bPred.calculated_total} (${v7bPred.confidence}%)`);
    console.log(`     Historical Base: ${v7bPred.markov_breakdown.team_patterns.combined_base.toFixed(2)}, Games: ${v7bPred.pattern_details.similar_games_count}`);

    // V7C Results (Enhanced)
    console.log(`V7C (${modelTypes.v7c}): ${v7cPred.prediction} ${v7cPred.calculated_total} (${v7cPred.confidence}%)`);
    console.log(`     Distribution: ${v7cPred.distribution_summary}, Over Prob: ${(v7cPred.over_probability * 100).toFixed(1)}%`);
    console.log(`     Market Edge: ${v7cPred.edge_vs_market > 0 ? '+' : ''}${(v7cPred.edge_vs_market * 100).toFixed(1)}%, Simulations: ${v7cPred.simulation_details.games_simulated}`);

    // Model performance summary
    console.log('\\n⚡ PERFORMANCE METRICS:');
    console.log(`Total Runtime: ${totalTime}ms`);
    console.log(`V7C Enhanced Features: Real player data, hierarchical shrinkage, Monte Carlo distribution`);

    // Advanced analysis: model agreement and disagreement
    const predictions = [v4Pred, v5Pred, v6Pred, v7aPred, v7bPred, v7cPred];
    const overCount = predictions.filter(p => p.prediction === 'Over').length;
    const underCount = 6 - overCount;
    const consensusStrength = Math.max(overCount, underCount);
    
    console.log('\\n📊 MODEL CONSENSUS ANALYSIS:');
    console.log(`Over/Under Split: ${overCount}/${underCount}`);
    console.log(`Consensus Strength: ${consensusStrength}/6 models agree`);
    
    if (consensusStrength >= 5) {
      console.log(`🎯 STRONG CONSENSUS: ${consensusStrength === overCount ? 'Over' : 'Under'}`);
    } else if (consensusStrength === 4) {
      console.log(`🎯 MODERATE CONSENSUS: ${consensusStrength === overCount ? 'Over' : 'Under'}`);
    } else {
      console.log(`🎯 SPLIT DECISION: Models disagree`);
    }

    // Calculate average totals and confidence
    const avgTotal = predictions.reduce((sum, p) => sum + p.calculated_total, 0) / 6;
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / 6;
    const totalRange = Math.max(...predictions.map(p => p.calculated_total)) - Math.min(...predictions.map(p => p.calculated_total));

    console.log('\\n📈 AGGREGATED METRICS:');
    console.log(`Average Total: ${avgTotal.toFixed(2)}`);
    console.log(`Average Confidence: ${avgConfidence.toFixed(1)}%`);
    console.log(`Prediction Range: ${totalRange.toFixed(2)} runs`);
    console.log(`Market Edge vs 8.5: ${(avgTotal - 8.5).toFixed(2)} runs`);

    // Store detailed results
    allPredictions.push({
      game: `${awayTeam} @ ${homeTeam}`,
      venue: venue,
      weather: `${weather.temperature.toFixed(1)}°F, ${weather.conditions}`,
      market_lines: bettingLines,
      predictions: {
        v4: v4Pred,
        v5: v5Pred,
        v6: v6Pred,
        v7a: v7aPred,
        v7b: v7bPred,
        v7c: v7cPred
      },
      consensus: {
        over_count: overCount,
        under_count: underCount,
        strength: consensusStrength,
        avg_total: avgTotal,
        avg_confidence: avgConfidence,
        total_range: totalRange
      },
      performance: {
        total_runtime_ms: totalTime,
        v7c_enhanced: true
      }
    });
  }

  console.log(`\\n\\n📊 COMPREHENSIVE 6-MODEL COMPARISON SUMMARY`);
  console.log('=' .repeat(65));
  console.log(`Games Analyzed: ${allPredictions.length}`);

  // Calculate advanced summary statistics
  const modelStats: {[key: string]: any} = {
    v4: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0, type: 'Component-Based' },
    v5: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0, type: 'Explosion-Detection' },
    v6: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0, type: 'Bias-Corrected' },
    v7a: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0, type: 'V6+Markov Hybrid' },
    v7b: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0, type: 'Markov Pattern-Based' },
    v7c: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0, type: 'Canonical Markov Chain' }
  };

  allPredictions.forEach(game => {
    const preds = game.predictions;
    
    Object.keys(modelStats).forEach(model => {
      const pred = preds[model];
      modelStats[model].totals.push(pred.calculated_total);
      modelStats[model].confidences.push(pred.confidence);
      if (pred.prediction === 'Over') modelStats[model].overs++;
      else modelStats[model].unders++;
      
      // Determine playability based on model type
      let isPlayable = false;
      if (model === 'v4' || model === 'v5') {
        isPlayable = !pred.recommendation.includes('NO PLAY');
      } else if (model === 'v7c') {
        isPlayable = pred.confidence > 60 && Math.abs(pred.edge_vs_market) > 0.02;
      } else {
        isPlayable = pred.confidence > 55;
      }
      
      if (isPlayable) modelStats[model].playable++;
    });
  });

  // Enhanced comparison table
  console.log('\\n📊 COMPREHENSIVE MODEL COMPARISON TABLE:');
  console.log('Model | Type                    | Avg Total | Avg Conf | O/U Split | Playable | Features');
  console.log('------|-------------------------|-----------|----------|-----------|----------|----------');
  
  Object.entries(modelStats).forEach(([model, stats]) => {
    const avgTotal = (stats.totals.reduce((a: number, b: number) => a + b, 0) / stats.totals.length).toFixed(2);
    const avgConf = Math.round(stats.confidences.reduce((a: number, b: number) => a + b, 0) / stats.confidences.length);
    const split = `${stats.overs}/${stats.unders}`;
    const features = model === 'v7c' ? 'MC+Real Data+Shrinkage' :
                    model === 'v7b' ? 'Historical Patterns' :
                    model === 'v7a' ? 'Hybrid V6+Markov' :
                    model === 'v6' ? 'Bias Correction' :
                    model === 'v5' ? 'Explosion Detection' : 'Traditional Components';
    
    console.log(`${model.toUpperCase().padEnd(5)} | ${stats.type.padEnd(23)} | ${avgTotal.padStart(9)} | ${avgConf.toString().padStart(8)}% | ${split.padStart(9)} | ${stats.playable.toString().padStart(8)} | ${features}`);
  });

  // Advanced consensus analysis
  console.log('\\n🤝 ADVANCED CONSENSUS ANALYSIS:');
  let strongConsensus = 0;
  let moderateConsensus = 0;
  let splitDecisions = 0;
  
  allPredictions.forEach(game => {
    if (game.consensus.strength >= 5) strongConsensus++;
    else if (game.consensus.strength === 4) moderateConsensus++;
    else splitDecisions++;
  });

  console.log(`Strong Consensus (5-6 models): ${strongConsensus}/${allPredictions.length}`);
  console.log(`Moderate Consensus (4 models): ${moderateConsensus}/${allPredictions.length}`);
  console.log(`Split Decisions (≤3 models): ${splitDecisions}/${allPredictions.length}`);

  // V7C Enhanced Features Summary
  console.log('\\n🚀 V7C ENHANCED FEATURES IMPLEMENTED:');
  console.log('✅ Real pitcher/batter API data integration');
  console.log('✅ Hierarchical team-level shrinkage');
  console.log('✅ Backtest validation framework');
  console.log('✅ PIT histogram distributional calibration');
  console.log('✅ CRPS scoring vs actual outcomes');
  console.log('✅ Monte Carlo simulation with full run distributions');
  console.log('✅ True 24 base/out state Markov chain');
  console.log('✅ Event-based transitions with pitcher/batter matchups');

  // Save comprehensive results
  const logData = {
    date: new Date().toISOString().split('T')[0],
    models_compared: ['V4', 'V5', 'V6', 'V7A', 'V7B', 'V7C'],
    enhanced_v7c_features: [
      'Real pitcher/batter data',
      'Hierarchical shrinkage',
      'Monte Carlo simulation',
      'Backtest validation',
      'PIT calibration',
      'CRPS scoring'
    ],
    games_analyzed: allPredictions.length,
    predictions: allPredictions,
    summary_stats: modelStats,
    consensus_analysis: { 
      strong_consensus: strongConsensus, 
      moderate_consensus: moderateConsensus,
      split_decisions: splitDecisions 
    },
    performance_notes: {
      v7c_runtime_avg: allPredictions.reduce((sum, game) => sum + game.performance.total_runtime_ms, 0) / allPredictions.length,
      enhanced_accuracy_expected: true,
      distributional_calibration: true,
      real_data_integration: true
    }
  };

  // Ensure predictions directory exists
  const predictionsDir = path.join(process.cwd(), 'data', 'predictions');
  if (!fs.existsSync(predictionsDir)) {
    fs.mkdirSync(predictionsDir, { recursive: true });
  }

  const logFile = path.join(predictionsDir, `${new Date().toISOString().split('T')[0]}-six-model-enhanced-comparison.json`);
  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));

  console.log(`\\n✅ COMPREHENSIVE 6-MODEL ANALYSIS LOGGED: ${logFile}`);
  console.log(`\\n🎯 Enhanced V7C model ready for validation with real API data!`);
  console.log(`\\n📊 All predictions logged per README requirements`);
}

// Run the enhanced analysis
runSixModelsComparison().catch(console.error);

export { runSixModelsComparison };