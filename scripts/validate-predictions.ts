#!/usr/bin/env node

/**
 * Prediction Validation Script
 * 
 * Compares our blind predictions against actual game results
 * to calculate accuracy metrics and model performance
 */

import axios from 'axios';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 MLB Prediction Validation - Accuracy Analysis');
console.log('===============================================');

interface HistoricalPrediction {
  game_id: string;
  date: string;
  home_team: string;
  away_team: string;
  venue: string;
  prediction: 'Over' | 'Under';
  calculated_total: number;
  confidence: number;
  individual_models: any;
  weather_data: any;
  processing_time: number;
}

interface ActualGameResult {
  gamePk: number;
  gameDate: string;
  teams: {
    away: { 
      team: { name: string; abbreviation: string };
      score: number;
    };
    home: { 
      team: { name: string; abbreviation: string };
      score: number;
    };
  };
  venue: { name: string };
  status: { abstractGameState: string };
  linescore?: {
    teams: {
      away: { runs: number };
      home: { runs: number };
    };
  };
}

interface PredictionValidation {
  prediction: HistoricalPrediction;
  actual_total: number;
  prediction_correct: boolean;
  actual_result: 'Over' | 'Under';
  market_total?: number;
  edge_correct?: boolean;
}

interface ValidationSummary {
  total_predictions: number;
  correct_predictions: number;
  win_rate: number;
  over_predictions: {
    total: number;
    correct: number;
    win_rate: number;
  };
  under_predictions: {
    total: number;
    correct: number;
    win_rate: number;
  };
  confidence_brackets: {
    [key: string]: {
      total: number;
      correct: number;
      win_rate: number;
      expected_rate: number;
      calibration_error: number;
    };
  };
  edge_analysis: {
    total_with_edge: number;
    edge_correct: number;
    edge_win_rate: number;
    average_edge: number;
  };
}

/**
 * Load our historical predictions
 */
function loadHistoricalPredictions(): HistoricalPrediction[] {
  try {
    // Find the most recent backtest file
    const files = fs.readdirSync('/Users/davidloake/Downloads/mlb/data/reports/')
      .filter(f => f.startsWith('historical-backtest-'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      throw new Error('No historical backtest files found');
    }
    
    const latestFile = files[0];
    console.log(`📂 Loading predictions from: ${latestFile}`);
    
    const data = JSON.parse(
      fs.readFileSync(`/Users/davidloake/Downloads/mlb/data/reports/${latestFile}`, 'utf8')
    );
    
    console.log(`📊 Loaded ${data.predictions.length} predictions from ${data.metadata.period_start} to ${data.metadata.period_end}`);
    return data.predictions;
    
  } catch (error) {
    console.error('❌ Failed to load historical predictions:', error);
    throw error;
  }
}

/**
 * Fetch actual game results for a specific date
 */
async function fetchActualResults(date: string): Promise<ActualGameResult[]> {
  try {
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=linescore`,
      { timeout: 10000 }
    );

    if (!response.data.dates || response.data.dates.length === 0) {
      return [];
    }

    const games = response.data.dates[0]?.games || [];
    
    // Only return completed games with scores
    return games.filter((game: any) => 
      game.status.abstractGameState === 'Final' &&
      game.teams?.home?.score !== undefined &&
      game.teams?.away?.score !== undefined
    );

  } catch (error) {
    console.error(`❌ Failed to fetch results for ${date}:`, error);
    return [];
  }
}

/**
 * Match prediction to actual game result
 */
function matchPredictionToResult(
  prediction: HistoricalPrediction, 
  actualGames: ActualGameResult[]
): ActualGameResult | null {
  
  // Try to match by teams and venue
  const match = actualGames.find(game => {
    const homeMatch = game.teams.home.team.name === prediction.home_team;
    const awayMatch = game.teams.away.team.name === prediction.away_team;
    const venueMatch = game.venue.name === prediction.venue;
    
    return homeMatch && awayMatch && venueMatch;
  });
  
  if (!match) {
    // Try matching by teams only (in case venue names differ)
    return actualGames.find(game => {
      const homeMatch = game.teams.home.team.name === prediction.home_team;
      const awayMatch = game.teams.away.team.name === prediction.away_team;
      return homeMatch && awayMatch;
    }) || null;
  }
  
  return match;
}

/**
 * Validate a single prediction against actual result
 */
function validatePrediction(
  prediction: HistoricalPrediction,
  actualGame: ActualGameResult
): PredictionValidation {
  
  // Calculate actual total runs
  const actualTotal = actualGame.teams.home.score + actualGame.teams.away.score;
  
  // Determine actual result (assuming 8.5 as market standard for comparison)
  const marketTotal = 8.5; // We'll use this as baseline since we don't have historical lines
  const actualResult: 'Over' | 'Under' = actualTotal > marketTotal ? 'Over' : 'Under';
  
  // Check if our prediction was correct
  const predictionCorrect = prediction.prediction === actualResult;
  
  // Calculate edge accuracy (if our calculated total was closer than market)
  const ourError = Math.abs(prediction.calculated_total - actualTotal);
  const marketError = Math.abs(marketTotal - actualTotal);
  const edgeCorrect = ourError < marketError;
  
  return {
    prediction,
    actual_total: actualTotal,
    prediction_correct: predictionCorrect,
    actual_result: actualResult,
    market_total: marketTotal,
    edge_correct: edgeCorrect
  };
}

/**
 * Analyze confidence calibration
 */
function analyzeConfidenceCalibration(validations: PredictionValidation[]): any {
  const brackets = {
    '60-70%': { min: 60, max: 70, expected: 65 },
    '70-75%': { min: 70, max: 75, expected: 72.5 },
    '75-80%': { min: 75, max: 80, expected: 77.5 },
    '80-85%': { min: 80, max: 85, expected: 82.5 },
    '85-90%': { min: 85, max: 90, expected: 87.5 },
    '90%+': { min: 90, max: 100, expected: 95 }
  };
  
  const results: any = {};
  
  for (const [bracketName, range] of Object.entries(brackets)) {
    const bracketPredictions = validations.filter(v => 
      v.prediction.confidence >= range.min && v.prediction.confidence < range.max
    );
    
    const correct = bracketPredictions.filter(v => v.prediction_correct).length;
    const total = bracketPredictions.length;
    const winRate = total > 0 ? (correct / total) * 100 : 0;
    const calibrationError = Math.abs(winRate - range.expected);
    
    results[bracketName] = {
      total,
      correct,
      win_rate: winRate,
      expected_rate: range.expected,
      calibration_error: calibrationError
    };
  }
  
  return results;
}

/**
 * Main validation execution
 */
async function validatePredictions(): Promise<void> {
  try {
    console.log('🔒 Loading historical predictions...');
    const predictions = loadHistoricalPredictions();
    
    if (predictions.length === 0) {
      throw new Error('No predictions to validate');
    }
    
    // Get unique dates from predictions (extract just the date part)
    const uniqueDates = [...new Set(predictions.map(p => {
      // Handle both ISO timestamps and date-only strings
      const dateStr = p.date.includes('T') ? p.date.split('T')[0] : p.date;
      return dateStr;
    }))].sort();
    console.log(`📅 Fetching actual results for ${uniqueDates.length} dates...\n`);
    
    const validations: PredictionValidation[] = [];
    let totalMatched = 0;
    let totalUnmatched = 0;
    
    // Process each date
    for (const date of uniqueDates) {
      process.stdout.write(`📅 Processing ${date}... `);
      
      const datePredictions = predictions.filter(p => {
        const predDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
        return predDate === date;
      });
      const actualGames = await fetchActualResults(date);
      
      let dateMatched = 0;
      let dateUnmatched = 0;
      
      for (const prediction of datePredictions) {
        const actualGame = matchPredictionToResult(prediction, actualGames);
        
        if (actualGame) {
          const validation = validatePrediction(prediction, actualGame);
          validations.push(validation);
          dateMatched++;
        } else {
          dateUnmatched++;
          console.log(`\n   ⚠️  No match found for: ${prediction.away_team} @ ${prediction.home_team}`);
        }
      }
      
      totalMatched += dateMatched;
      totalUnmatched += dateUnmatched;
      
      console.log(`${dateMatched}/${datePredictions.length} matched`);
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 MATCHING SUMMARY`);
    console.log(`✅ Successfully matched: ${totalMatched}`);
    console.log(`❌ Unmatched predictions: ${totalUnmatched}`);
    console.log(`📈 Match rate: ${((totalMatched / predictions.length) * 100).toFixed(1)}%\n`);
    
    if (validations.length === 0) {
      throw new Error('No predictions could be matched with actual results');
    }
    
    // Calculate overall metrics
    const correctPredictions = validations.filter(v => v.prediction_correct).length;
    const overPredictions = validations.filter(v => v.prediction.prediction === 'Over');
    const underPredictions = validations.filter(v => v.prediction.prediction === 'Under');
    
    const overCorrect = overPredictions.filter(v => v.prediction_correct).length;
    const underCorrect = underPredictions.filter(v => v.prediction_correct).length;
    
    // Edge analysis
    const edgeCorrect = validations.filter(v => v.edge_correct).length;
    const averageEdge = validations.reduce((sum, v) => {
      return sum + Math.abs(v.prediction.calculated_total - (v.market_total || 8.5));
    }, 0) / validations.length;
    
    // Confidence calibration
    const confidenceAnalysis = analyzeConfidenceCalibration(validations);
    
    const summary: ValidationSummary = {
      total_predictions: validations.length,
      correct_predictions: correctPredictions,
      win_rate: (correctPredictions / validations.length) * 100,
      over_predictions: {
        total: overPredictions.length,
        correct: overCorrect,
        win_rate: overPredictions.length > 0 ? (overCorrect / overPredictions.length) * 100 : 0
      },
      under_predictions: {
        total: underPredictions.length,
        correct: underCorrect,
        win_rate: underPredictions.length > 0 ? (underCorrect / underPredictions.length) * 100 : 0
      },
      confidence_brackets: confidenceAnalysis,
      edge_analysis: {
        total_with_edge: validations.length,
        edge_correct: edgeCorrect,
        edge_win_rate: (edgeCorrect / validations.length) * 100,
        average_edge: averageEdge
      }
    };
    
    // Display results
    console.log('🎯 PREDICTION ACCURACY ANALYSIS');
    console.log('================================');
    console.log(`📊 Total Validated Predictions: ${summary.total_predictions}`);
    console.log(`✅ Correct Predictions: ${summary.correct_predictions}`);
    console.log(`📈 Overall Win Rate: ${summary.win_rate.toFixed(1)}%`);
    console.log(`🎲 Random Chance: 50.0%`);
    console.log(`📊 Edge vs Random: ${(summary.win_rate - 50).toFixed(1)} percentage points\n`);
    
    console.log('🔍 OVER/UNDER BREAKDOWN');
    console.log('========================');
    console.log(`📈 Over Predictions: ${summary.over_predictions.correct}/${summary.over_predictions.total} (${summary.over_predictions.win_rate.toFixed(1)}%)`);
    console.log(`📉 Under Predictions: ${summary.under_predictions.correct}/${summary.under_predictions.total} (${summary.under_predictions.win_rate.toFixed(1)}%)\n`);
    
    console.log('🎯 CONFIDENCE CALIBRATION');
    console.log('==========================');
    for (const [bracket, stats] of Object.entries(summary.confidence_brackets)) {
      if (stats.total > 0) {
        const calibrated = stats.calibration_error < 5 ? '✅' : '⚠️';
        console.log(`${calibrated} ${bracket}: ${stats.correct}/${stats.total} (${stats.win_rate.toFixed(1)}% vs ${stats.expected_rate}% expected, error: ${stats.calibration_error.toFixed(1)}%)`);
      }
    }
    
    console.log('\n💰 EDGE DETECTION ANALYSIS');
    console.log('===========================');
    console.log(`📊 Predictions with better accuracy than market: ${summary.edge_analysis.edge_correct}/${summary.edge_analysis.total_with_edge}`);
    console.log(`📈 Edge Detection Rate: ${summary.edge_analysis.edge_win_rate.toFixed(1)}%`);
    console.log(`📏 Average prediction deviation: ${summary.edge_analysis.average_edge.toFixed(2)} runs\n`);
    
    // Determine overall model performance
    let performanceRating = '';
    if (summary.win_rate >= 60) performanceRating = '🔥 EXCELLENT';
    else if (summary.win_rate >= 55) performanceRating = '✅ GOOD';
    else if (summary.win_rate >= 52) performanceRating = '📈 ABOVE AVERAGE';
    else if (summary.win_rate >= 48) performanceRating = '⚖️ AVERAGE';
    else performanceRating = '⚠️ BELOW AVERAGE';
    
    console.log(`🏆 OVERALL MODEL PERFORMANCE: ${performanceRating}`);
    
    // Save detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = `/Users/davidloake/Downloads/mlb/data/reports/validation-results-${timestamp}.json`;
    
    const detailedResults = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_predictions: predictions.length,
        matched_predictions: validations.length,
        match_rate: (validations.length / predictions.length) * 100,
        period_analyzed: {
          start: uniqueDates[0],
          end: uniqueDates[uniqueDates.length - 1],
          days: uniqueDates.length
        }
      },
      summary,
      detailed_validations: validations
    };
    
    fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
    
    // Performance insights
    console.log('\n🔬 KEY INSIGHTS:');
    if (summary.win_rate > 52) {
      console.log('✅ Model demonstrates predictive edge above random chance');
    }
    if (summary.over_predictions.win_rate > summary.under_predictions.win_rate + 5) {
      console.log('📈 Model appears stronger at predicting overs');
    } else if (summary.under_predictions.win_rate > summary.over_predictions.win_rate + 5) {
      console.log('📉 Model appears stronger at predicting unders');
    }
    
    const wellCalibratedBrackets = Object.values(summary.confidence_brackets)
      .filter((b: any) => b.total > 5 && b.calibration_error < 5).length;
    
    if (wellCalibratedBrackets >= 3) {
      console.log('🎯 Confidence calibration appears well-tuned');
    } else {
      console.log('⚠️ Confidence calibration may need adjustment');
    }
    
    if (summary.edge_analysis.edge_win_rate > 55) {
      console.log('💰 Model shows strong edge detection vs market baseline');
    }
    
  } catch (error) {
    console.error('❌ Prediction validation failed:', error);
    process.exit(1);
  }
}

// Run validation
validatePredictions();