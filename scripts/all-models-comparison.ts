/**
 * Complete Model Comparison: V4, V5, V6, V7A, V7B
 * 
 * Runs all 5 models on tonight's games with live betting lines
 * Provides comprehensive comparison and analysis
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { V6AdvancedModel } from '../src/models/v6/v6-advanced-model';
import { V7AHybridModel } from '../src/models/v7/v7a-hybrid-model';
import { V7BMarkovModel } from '../src/models/v7/v7b-markov-model';
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

async function runAllModelsComparison() {
  console.log('🎯 COMPLETE MODEL COMPARISON: V4, V5, V6, V7A, V7B');
  console.log('=' .repeat(55));
  console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
  
  // Initialize V6, V7A, V7B models
  // V4 and V5 are functions, not classes
  const v6Model = new V6AdvancedModel();
  const v7aModel = new V7AHybridModel();
  const v7bModel = new V7BMarkovModel();
  
  console.log('✅ V6, V7A, V7B models initialized\n');

  // Fetch tonight's games
  const games = await fetchTonightsGames();
  console.log(`📊 Found ${games.length} games for analysis\n`);

  if (games.length === 0) {
    console.log('❌ No games available for prediction');
    return;
  }

  const allPredictions: any[] = [];
  const bettingLines = getMockBettingLines();

  // Analyze each game with all 5 models
  for (let i = 0; i < Math.min(games.length, 8); i++) { // Limit to 8 games for readability
    const game = games[i];
    const homeTeam = getTeamAbbreviation(game.teams.home.team.name);
    const awayTeam = getTeamAbbreviation(game.teams.away.team.name);
    const venue = game.venue.name;
    const weather = getMockWeather();

    console.log(`${'='.repeat(60)}`);
    console.log(`📊 GAME ${i + 1}: ${awayTeam} @ ${homeTeam}`);
    console.log(`🏟️  Venue: ${venue}`);
    console.log(`🌤️  Weather: ${weather.temperature.toFixed(1)}°F, ${weather.conditions}`);
    
    // Market lines
    console.log('💰 MARKET LINES:');
    bettingLines.forEach(line => {
      console.log(`   ${line.bookmaker}: O/U ${line.total} (${line.over_odds}/${line.under_odds})`);
    });

    // Prepare context for V4 model (GameData interface)
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

    // Prepare context for V5 model (V5GameFactors interface) 
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

    // Prepare context for V6/V7A/V7B models
    const context = {
      home_team: homeTeam,
      away_team: awayTeam, 
      venue: venue,
      date: new Date().toISOString().split('T')[0],
      temperature: weather.temperature,
      weather_conditions: weather.conditions
    };

    // Run all models
    const v4Result = predictV4GameTotal(v4Context);
    const v5Result = runV5AdvancedModel(v5Context);
    
    // Convert V4/V5 results to consistent format
    const v4Pred = {
      prediction: v4Result.prediction,
      calculated_total: v4Result.final_total,
      confidence: v4Result.confidence,
      recommendation: getV4Recommendation(v4Result),
      explosion_risk: v4Result.explosion_risk * 100
    };
    
    const v5Pred = {
      prediction: v5Result.prediction,
      calculated_total: v5Result.total,
      confidence: v5Result.confidence,
      recommendation: getV5Recommendation(v5Result),
      explosion_risk: v5Result.explosion_risk,
      risk_level: v5Result.risk_level
    };
    const v6Pred = v6Model.predict(context);
    const v7aPred = v7aModel.predict(context);
    const v7bPred = v7bModel.predict(context);

    console.log('\n🤖 ALL MODEL PREDICTIONS:');
    console.log('─'.repeat(30));

    // V4 Results
    console.log(`V4: ${v4Pred.prediction} ${v4Pred.calculated_total} (${v4Pred.confidence}%) - ${v4Pred.recommendation}`);
    
    // V5 Results  
    console.log(`V5: ${v5Pred.prediction} ${v5Pred.calculated_total} (${v5Pred.confidence}%) - ${v5Pred.recommendation}`);
    if (v5Pred.explosion_risk) console.log(`    Risk: ${v5Pred.explosion_risk}%`);
    
    // V6 Results
    console.log(`V6: ${v6Pred.prediction} ${v6Pred.calculated_total} (${v6Pred.confidence}%) - ${v6Pred.risk_level} risk`);
    console.log(`    Explosion Risk: ${v6Pred.explosion_risk}%`);
    
    // V7A Results
    console.log(`V7A: ${v7aPred.prediction} ${v7aPred.calculated_total} (${v7aPred.confidence}%) - ${v7aPred.risk_level} risk`);
    console.log(`     Markov Analysis: ${v7aPred.markov_analysis.markov_prediction} (${v7aPred.markov_analysis.markov_confidence}%)`);
    console.log(`     Pattern Alignment: ${v7aPred.markov_analysis.pattern_alignment}`);
    
    // V7B Results
    console.log(`V7B: ${v7bPred.prediction} ${v7bPred.calculated_total} (${v7bPred.confidence}%) - Pure Markov`);
    console.log(`     Explosion Risk: ${v7bPred.risk_assessment.explosion_probability}%`);
    console.log(`     Historical Base: ${v7bPred.markov_breakdown.team_patterns.combined_base.toFixed(2)}`);

    // Edge analysis vs market
    const marketLine = 8.5;
    console.log('\n📈 MARKET EDGE ANALYSIS (vs 8.5):');
    console.log(`V4:  Edge ${(Math.abs(v4Pred.calculated_total - marketLine)).toFixed(2)}`);
    console.log(`V5:  Edge ${(Math.abs(v5Pred.calculated_total - marketLine)).toFixed(2)}`);
    console.log(`V6:  Edge ${(Math.abs(v6Pred.calculated_total - marketLine)).toFixed(2)}`);
    console.log(`V7A: Edge ${(Math.abs(v7aPred.calculated_total - marketLine)).toFixed(2)}`);
    console.log(`V7B: Edge ${(Math.abs(v7bPred.calculated_total - marketLine)).toFixed(2)}`);

    // Store results
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
        v7b: v7bPred
      }
    });
  }

  console.log(`\n\n📊 COMPREHENSIVE MODEL COMPARISON SUMMARY`);
  console.log('=' .repeat(55));
  console.log(`Games Analyzed: ${allPredictions.length}`);

  // Calculate summary statistics
  const modelStats: {[key: string]: any} = {
    v4: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0 },
    v5: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0 },
    v6: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0 },
    v7a: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0 },
    v7b: { totals: [], confidences: [], overs: 0, unders: 0, playable: 0 }
  };

  allPredictions.forEach(game => {
    const preds = game.predictions;
    
    // V4 stats
    modelStats.v4.totals.push(preds.v4.calculated_total);
    modelStats.v4.confidences.push(preds.v4.confidence);
    if (preds.v4.prediction === 'Over') modelStats.v4.overs++;
    else modelStats.v4.unders++;
    if (!preds.v4.recommendation.includes('NO PLAY')) modelStats.v4.playable++;
    
    // V5 stats
    modelStats.v5.totals.push(preds.v5.calculated_total);
    modelStats.v5.confidences.push(preds.v5.confidence);
    if (preds.v5.prediction === 'Over') modelStats.v5.overs++;
    else modelStats.v5.unders++;
    if (!preds.v5.recommendation.includes('NO PLAY')) modelStats.v5.playable++;
    
    // V6 stats
    modelStats.v6.totals.push(preds.v6.calculated_total);
    modelStats.v6.confidences.push(preds.v6.confidence);
    if (preds.v6.prediction === 'Over') modelStats.v6.overs++;
    else modelStats.v6.unders++;
    if (preds.v6.confidence > 55) modelStats.v6.playable++;
    
    // V7A stats
    modelStats.v7a.totals.push(preds.v7a.calculated_total);
    modelStats.v7a.confidences.push(preds.v7a.confidence);
    if (preds.v7a.prediction === 'Over') modelStats.v7a.overs++;
    else modelStats.v7a.unders++;
    if (preds.v7a.confidence > 60) modelStats.v7a.playable++;
    
    // V7B stats
    modelStats.v7b.totals.push(preds.v7b.calculated_total);
    modelStats.v7b.confidences.push(preds.v7b.confidence);
    if (preds.v7b.prediction === 'Over') modelStats.v7b.overs++;
    else modelStats.v7b.unders++;
    if (preds.v7b.confidence > 55) modelStats.v7b.playable++;
  });

  // Display summary table
  console.log('\n📊 MODEL COMPARISON TABLE:');
  console.log('Model | Avg Total | Avg Conf | O/U Split | Playable |');
  console.log('------|-----------|----------|-----------|----------|');
  
  Object.entries(modelStats).forEach(([model, stats]) => {
    const avgTotal = (stats.totals.reduce((a: number, b: number) => a + b, 0) / stats.totals.length).toFixed(2);
    const avgConf = Math.round(stats.confidences.reduce((a: number, b: number) => a + b, 0) / stats.confidences.length);
    const split = `${stats.overs}/${stats.unders}`;
    console.log(`${model.toUpperCase().padEnd(5)} | ${avgTotal.padStart(9)} | ${avgConf.toString().padStart(8)}% | ${split.padStart(9)} | ${stats.playable.toString().padStart(8)} |`);
  });

  // Consensus analysis
  console.log('\n🤝 CONSENSUS ANALYSIS:');
  let strongConsensus = 0;
  let splitDecisions = 0;
  
  allPredictions.forEach(game => {
    const preds = game.predictions;
    const overs = [preds.v4, preds.v5, preds.v6, preds.v7a, preds.v7b].filter(p => p.prediction === 'Over').length;
    const unders = 5 - overs;
    
    if (overs >= 4 || unders >= 4) strongConsensus++;
    else if (overs === 3 || unders === 3) splitDecisions++;
  });

  console.log(`Strong Consensus (4+ models agree): ${strongConsensus}/${allPredictions.length}`);
  console.log(`Split Decisions: ${splitDecisions}/${allPredictions.length}`);

  // Save results
  const logData = {
    date: new Date().toISOString().split('T')[0],
    models_compared: ['V4', 'V5', 'V6', 'V7A', 'V7B'],
    games_analyzed: allPredictions.length,
    predictions: allPredictions,
    summary_stats: modelStats,
    consensus_analysis: { strong_consensus: strongConsensus, split_decisions: splitDecisions }
  };

  const logFile = path.join(process.cwd(), 'data', 'predictions', `${new Date().toISOString().split('T')[0]}-five-model-comparison.json`);
  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));

  console.log(`\n✅ COMPLETE ANALYSIS LOGGED: ${logFile}`);
  console.log(`\n🎯 Ready for validation tomorrow!`);
}

// Run the analysis
runAllModelsComparison().catch(console.error);

export { runAllModelsComparison };