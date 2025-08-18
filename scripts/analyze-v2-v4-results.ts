#!/usr/bin/env node

/**
 * Analyze V2 vs V4 Predictions Against Actual Results
 * August 17, 2025 - Critical Validation Day
 * 
 * This script fetches actual game results and compares them against
 * both V2 and V4 predictions to validate model improvements
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface GameResult {
  game: string;
  venue: string;
  market_line: number;
  weather: {
    temp: number;
    conditions: string;
  };
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
  };
  actual_result: {
    home_score: number;
    away_score: number;
    total_runs: number;
    v2_result: 'WIN' | 'LOSS' | 'PUSH';
    v4_result: 'WIN' | 'LOSS' | 'PUSH';
    v2_error: number;
    v4_error: number;
  };
  analysis: {
    better_model: 'V2' | 'V4' | 'TIE';
    explosion_detected: boolean;
    hot_weather_factor: boolean;
    key_insights: string[];
  };
}

// Yesterday's predictions from our comparison
const PREDICTIONS = [
  {
    game: 'Philadelphia Phillies @ Washington Nationals',
    venue: 'Nationals Park',
    market_line: 10.0,
    weather: { temp: 85.53, conditions: 'broken clouds' },
    v2: { type: 'Under', total: 8.12, confidence: 50.5, rec: 'SLIGHT Under' },
    v4: { type: 'Under', total: 8.39, confidence: 50.0, rec: 'SLIGHT Under', risk: 12.0 }
  },
  {
    game: 'Miami Marlins @ Boston Red Sox',
    venue: 'Fenway Park', 
    market_line: 8.5,
    weather: { temp: 81.55, conditions: 'few clouds' },
    v2: { type: 'Under', total: 8.26, confidence: 50.4, rec: 'SLIGHT Under' },
    v4: { type: 'Under', total: 8.31, confidence: 45.0, rec: 'NO PLAY', risk: 8.0 }
  },
  {
    game: 'Texas Rangers @ Toronto Blue Jays',
    venue: 'Rogers Centre',
    market_line: 8.0,
    weather: { temp: 75.7, conditions: 'overcast' },
    v2: { type: 'Under', total: 7.52, confidence: 51.0, rec: 'SLIGHT Under' },
    v4: { type: 'Over', total: 9.19, confidence: 49.8, rec: 'NO PLAY', risk: 13.0 }
  },
  {
    game: 'Atlanta Braves @ Cleveland Guardians',
    venue: 'Progressive Field',
    market_line: 9.0,
    weather: { temp: 78.55, conditions: 'broken clouds' },
    v2: { type: 'Under', total: 7.44, confidence: 50.8, rec: 'SLIGHT Under' },
    v4: { type: 'Under', total: 8.34, confidence: 45.2, rec: 'NO PLAY', risk: 10.0 }
  },
  {
    game: 'Milwaukee Brewers @ Cincinnati Reds',
    venue: 'Great American Ball Park',
    market_line: 9.0,
    weather: { temp: 84.27, conditions: 'clear sky' },
    v2: { type: 'Under', total: 7.95, confidence: 53.0, rec: 'SLIGHT Under' },
    v4: { type: 'Under', total: 8.05, confidence: 51.9, rec: 'SLIGHT Under', risk: 8.0 }
  },
  {
    game: 'Baltimore Orioles @ Houston Astros',
    venue: 'Daikin Park',
    market_line: 8.5,
    weather: { temp: 87.78, conditions: 'broken clouds' },
    v2: { type: 'Under', total: 8.05, confidence: 54.7, rec: 'SLIGHT Under' },
    v4: { type: 'Over', total: 8.92, confidence: 48.2, rec: 'NO PLAY', risk: 12.0 }
  },
  {
    game: 'Chicago White Sox @ Kansas City Royals',
    venue: 'Kauffman Stadium',
    market_line: 9.5,
    weather: { temp: 88.52, conditions: 'clear sky' },
    v2: { type: 'Under', total: 8.46, confidence: 45.0, rec: 'NO PLAY' },
    v4: { type: 'Over', total: 8.52, confidence: 45.0, rec: 'NO PLAY', risk: 12.0 }
  }
];

console.log('📊 V2 vs V4 RESULTS ANALYSIS - August 17, 2025');
console.log('================================================');
console.log('🔍 Fetching actual game results and comparing model performance...');
console.log('');

async function fetchGameResults(date: string): Promise<any[]> {
  try {
    console.log(`📡 Fetching MLB game results for ${date}...`);
    
    const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
      params: {
        sportId: 1,
        date: date,
        hydrate: 'team,linescore,decisions,boxscore'
      },
      timeout: 10000
    });

    const games = response.data.dates?.[0]?.games || [];
    console.log(`✅ Found ${games.length} completed games`);
    
    return games;
  } catch (error: any) {
    console.error(`❌ Error fetching game results: ${error.message}`);
    return [];
  }
}

function findGameResult(gameTitle: string, mlbGames: any[]): any {
  const [awayTeam, homeTeam] = gameTitle.split(' @ ');
  
  const game = mlbGames.find(g => {
    const home = g.teams.home.team.name;
    const away = g.teams.away.team.name;
    
    return home.includes(homeTeam.split(' ').pop()) && 
           away.includes(awayTeam.split(' ').pop());
  });

  if (game && game.status.statusCode === 'F') {
    return {
      homeScore: game.teams.home.score,
      awayScore: game.teams.away.score,
      totalRuns: game.teams.home.score + game.teams.away.score,
      linescore: game.linescore
    };
  }

  return null;
}

function analyzeResult(prediction: any, actualRuns: number): { result: string; error: number } {
  const predictionType = prediction.type;
  const predictionTotal = prediction.total;
  const error = Math.abs(actualRuns - predictionTotal);
  
  if (predictionType === 'Over') {
    const result = actualRuns > 8.5 ? 'WIN' : 'LOSS'; // Using standard 8.5 threshold
    return { result, error };
  } else {
    const result = actualRuns < 8.5 ? 'WIN' : 'LOSS';
    return { result, error };
  }
}

function determineWinnerAndInsights(v2Result: any, v4Result: any, actualRuns: number, prediction: any): any {
  const insights: string[] = [];
  
  // Determine better model
  let betterModel = 'TIE';
  
  if (v2Result.result === 'WIN' && v4Result.result === 'LOSS') {
    betterModel = 'V2';
    insights.push('V2 direction correct, V4 wrong');
  } else if (v4Result.result === 'WIN' && v2Result.result === 'LOSS') {
    betterModel = 'V4';
    insights.push('V4 direction correct, V2 wrong');
  } else if (v2Result.result === v4Result.result) {
    // Both same result, check which was closer
    if (v2Result.error < v4Result.error) {
      betterModel = 'V2';
      insights.push('Both same result, V2 closer to actual');
    } else if (v4Result.error < v2Result.error) {
      betterModel = 'V4';
      insights.push('Both same result, V4 closer to actual');
    } else {
      insights.push('Both models performed identically');
    }
  }
  
  // Check explosion detection
  const explosionDetected = prediction.v4.risk > 12 && actualRuns > 10;
  if (explosionDetected) {
    insights.push(`🚨 EXPLOSION DETECTED: ${prediction.v4.risk}% risk, ${actualRuns} runs`);
  }
  
  // Check hot weather factor
  const hotWeatherFactor = prediction.weather.temp > 85;
  if (hotWeatherFactor) {
    insights.push(`🌡️ HOT WEATHER: ${prediction.weather.temp}°F affected scoring`);
  }
  
  // Check if game was explosive (13+ runs)
  if (actualRuns >= 13) {
    insights.push(`💥 EXPLOSIVE GAME: ${actualRuns} runs (catastrophic miss territory)`);
  }
  
  // Check Rangers @ Blue Jays specific pattern
  if (prediction.game.includes('Rangers') && prediction.game.includes('Blue Jays')) {
    insights.push('🎯 CRITICAL TEST: Rangers/Blue Jays explosive pattern');
  }
  
  return {
    better_model: betterModel,
    explosion_detected: explosionDetected,
    hot_weather_factor: hotWeatherFactor,
    key_insights: insights
  };
}

async function analyzeAllGames(): Promise<void> {
  try {
    const date = '2025-08-17';
    const mlbGames = await fetchGameResults(date);
    
    if (mlbGames.length === 0) {
      console.log('❌ No game results found. Games may not be completed yet.');
      return;
    }

    const results: GameResult[] = [];
    let v2Wins = 0, v4Wins = 0, ties = 0;
    let v2TotalError = 0, v4TotalError = 0;
    let explosionTests = 0, explosionDetected = 0;
    let hotWeatherTests = 0;

    console.log('\n🎯 GAME-BY-GAME ANALYSIS');
    console.log('========================');

    for (const prediction of PREDICTIONS) {
      const gameResult = findGameResult(prediction.game, mlbGames);
      
      if (!gameResult) {
        console.log(`⚠️  Could not find result for: ${prediction.game}`);
        continue;
      }

      const actualRuns = gameResult.totalRuns;
      const v2Analysis = analyzeResult(prediction.v2, actualRuns);
      const v4Analysis = analyzeResult(prediction.v4, actualRuns);
      
      const analysis = determineWinnerAndInsights(v2Analysis, v4Analysis, actualRuns, prediction);

      // Update counters
      if (analysis.better_model === 'V2') v2Wins++;
      else if (analysis.better_model === 'V4') v4Wins++;
      else ties++;
      
      v2TotalError += v2Analysis.error;
      v4TotalError += v4Analysis.error;
      
      if (prediction.v4.risk > 12) {
        explosionTests++;
        if (actualRuns > 10) explosionDetected++;
      }
      
      if (prediction.weather.temp > 85) hotWeatherTests++;

      // Display result
      console.log(`\n📊 ${prediction.game}`);
      console.log(`🏟️  ${prediction.venue} | Market: ${prediction.market_line}`);
      console.log(`🌤️  Weather: ${prediction.weather.temp}°F, ${prediction.weather.conditions}`);
      console.log(`⚾ ACTUAL RESULT: ${gameResult.awayScore} - ${gameResult.homeScore} = ${actualRuns} runs`);
      console.log(`📈 V2: ${prediction.v2.type} ${prediction.v2.total} → ${v2Analysis.result} (error: ${v2Analysis.error.toFixed(2)})`);
      console.log(`🚀 V4: ${prediction.v4.type} ${prediction.v4.total} → ${v4Analysis.result} (error: ${v4Analysis.error.toFixed(2)})`);
      console.log(`🏆 WINNER: ${analysis.better_model}`);
      
      if (analysis.key_insights.length > 0) {
        console.log(`💡 Insights:`);
        analysis.key_insights.forEach(insight => console.log(`   ${insight}`));
      }

      // Store result
      results.push({
        game: prediction.game,
        venue: prediction.venue,
        market_line: prediction.market_line,
        weather: prediction.weather,
        v2_prediction: {
          type: prediction.v2.type,
          total: prediction.v2.total,
          confidence: prediction.v2.confidence,
          recommendation: prediction.v2.rec
        },
        v4_prediction: {
          type: prediction.v4.type,
          total: prediction.v4.total,
          confidence: prediction.v4.confidence,
          recommendation: prediction.v4.rec,
          explosion_risk: prediction.v4.risk
        },
        actual_result: {
          home_score: gameResult.homeScore,
          away_score: gameResult.awayScore,
          total_runs: actualRuns,
          v2_result: v2Analysis.result as 'WIN' | 'LOSS',
          v4_result: v4Analysis.result as 'WIN' | 'LOSS',
          v2_error: v2Analysis.error,
          v4_error: v4Analysis.error
        },
        analysis
      });
    }

    // Overall analysis
    console.log(`\n\n📊 OVERALL PERFORMANCE ANALYSIS`);
    console.log('===============================');
    
    const totalGames = results.length;
    console.log(`🎯 Games Analyzed: ${totalGames}`);
    console.log(`🏆 Model Performance:`);
    console.log(`   V2 Wins: ${v2Wins} (${((v2Wins/totalGames)*100).toFixed(1)}%)`);
    console.log(`   V4 Wins: ${v4Wins} (${((v4Wins/totalGames)*100).toFixed(1)}%)`);
    console.log(`   Ties: ${ties} (${((ties/totalGames)*100).toFixed(1)}%)`);
    
    console.log(`\n📏 Average Prediction Error:`);
    console.log(`   V2 Average Error: ${(v2TotalError/totalGames).toFixed(2)} runs`);
    console.log(`   V4 Average Error: ${(v4TotalError/totalGames).toFixed(2)} runs`);
    
    // Critical tests analysis
    console.log(`\n🧪 CRITICAL TESTS VALIDATION:`);
    
    // Rangers @ Blue Jays test
    const rangersBlueJays = results.find(r => r.game.includes('Rangers') && r.game.includes('Blue Jays'));
    if (rangersBlueJays) {
      console.log(`\n🎯 RANGERS @ BLUE JAYS TEST (HIGHEST PRIORITY):`);
      console.log(`   Actual Result: ${rangersBlueJays.actual_result.total_runs} runs`);
      console.log(`   V2 Prediction: Under ${rangersBlueJays.v2_prediction.total} (${rangersBlueJays.actual_result.v2_result})`);
      console.log(`   V4 Prediction: Over ${rangersBlueJays.v4_prediction.total} (${rangersBlueJays.actual_result.v4_result})`);
      console.log(`   V4 Explosion Risk: ${rangersBlueJays.v4_prediction.explosion_risk}%`);
      
      if (rangersBlueJays.actual_result.total_runs > 10) {
        console.log(`   ✅ EXPLOSION CONFIRMED: V4 detected high risk, game exploded`);
      } else {
        console.log(`   ❌ NO EXPLOSION: V4 overestimated explosion risk`);
      }
    }
    
    // Hot weather tests
    const hotWeatherGames = results.filter(r => r.weather.temp > 85);
    console.log(`\n🌡️  HOT WEATHER VALIDATION (${hotWeatherGames.length} games 85°F+):`);
    hotWeatherGames.forEach(game => {
      console.log(`   ${game.game.split(' @ ')[1]}: ${game.weather.temp}°F → ${game.actual_result.total_runs} runs`);
      console.log(`     V2: ${game.v2_prediction.type} ${game.v2_prediction.total} (${game.actual_result.v2_result})`);
      console.log(`     V4: ${game.v4_prediction.type} ${game.v4_prediction.total} (${game.actual_result.v4_result})`);
    });
    
    // Explosion detection validation
    if (explosionTests > 0) {
      console.log(`\n💥 EXPLOSION DETECTION VALIDATION:`);
      console.log(`   High Risk Games: ${explosionTests}`);
      console.log(`   Actual Explosions: ${explosionDetected}`);
      console.log(`   Detection Rate: ${((explosionDetected/explosionTests)*100).toFixed(1)}%`);
    }
    
    // Under bias analysis
    const v2Unders = results.filter(r => r.v2_prediction.type === 'Under').length;
    const v4Unders = results.filter(r => r.v4_prediction.type === 'Under').length;
    console.log(`\n📉 UNDER BIAS ANALYSIS:`);
    console.log(`   V2 Under Predictions: ${v2Unders}/${totalGames} (${((v2Unders/totalGames)*100).toFixed(1)}%)`);
    console.log(`   V4 Under Predictions: ${v4Unders}/${totalGames} (${((v4Unders/totalGames)*100).toFixed(1)}%)`);
    console.log(`   Bias Reduction: ${((v2Unders-v4Unders)/totalGames*100).toFixed(1)}% fewer Unders`);
    
    // Final verdict
    console.log(`\n🏁 FINAL VERDICT:`);
    if (v4Wins > v2Wins) {
      console.log(`✅ V4 MODEL VALIDATION SUCCESSFUL`);
      console.log(`   V4 outperformed V2 on ${v4Wins}/${totalGames} games`);
      console.log(`   Bias reduction effective: ${((v2Unders-v4Unders)/totalGames*100).toFixed(1)}% fewer Unders`);
    } else if (v2Wins > v4Wins) {
      console.log(`❌ V4 MODEL NEEDS REFINEMENT`);
      console.log(`   V2 still outperformed V4 on ${v2Wins}/${totalGames} games`);
      console.log(`   Consider reverting to V2 or adjusting V4 parameters`);
    } else {
      console.log(`🤝 MODELS PERFORMED EQUALLY`);
      console.log(`   Additional testing needed to determine superiority`);
    }

    // Generate updated table
    generateUpdatedTable(results);

  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
  }
}

function generateUpdatedTable(results: GameResult[]): void {
  console.log(`\n\n📋 UPDATED PREDICTIONS vs RESULTS TABLE`);
  console.log('=======================================');
  console.log('| Game | Market | Weather | V2 Pred | V2 Result | V4 Pred | V4 Result | Actual | Winner |');
  console.log('|------|--------|---------|---------|-----------|---------|-----------|--------|--------|');
  
  results.forEach(result => {
    const gameShort = result.game.split(' @ ').map(team => team.split(' ').pop()).join(' @ ');
    const weatherShort = `${result.weather.temp.toFixed(0)}°F`;
    const v2Short = `${result.v2_prediction.type} ${result.v2_prediction.total}`;
    const v4Short = `${result.v4_prediction.type} ${result.v4_prediction.total}`;
    const winner = result.analysis.better_model;
    
    console.log(`| ${gameShort} | ${result.market_line} | ${weatherShort} | ${v2Short} | ${result.actual_result.v2_result} | ${v4Short} | ${result.actual_result.v4_result} | ${result.actual_result.total_runs} | ${winner} |`);
  });
  
  console.log('\n📊 This updated table should be added to the documentation.');
}

if (require.main === module) {
  analyzeAllGames().catch(console.error);
}