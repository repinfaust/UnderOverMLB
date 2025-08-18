#!/usr/bin/env node

/**
 * Phase 3 Daily Prediction & Results Tracker
 * 
 * Purpose: Generate daily predictions and track results WITHOUT betting
 * Goal: Validate the 61.5% accuracy foundation while identifying improvement patterns
 * 
 * Features:
 * - Uses locked baseline model configuration
 * - Generates predictions for today's games
 * - Tracks results against actual outcomes
 * - Maintains hit rate analytics
 * - Identifies patterns for future enhancements
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Phase3TrackingEntry {
  date: string;
  game_id: string;
  teams: string;
  venue: string;
  prediction: {
    type: 'Over' | 'Under';
    total: number;
    confidence: number;
    recommendation: string;
  };
  market_data: {
    line: number;
    bookmaker: string;
    edge: number;
  };
  actual_result?: {
    total_runs: number;
    outcome: 'WIN' | 'LOSS' | 'PUSH';
    added_date: string;
  };
  notes: string[];
}

interface Phase3DailyReport {
  date: string;
  total_games: number;
  playable_games: number;
  results_pending: number;
  results_available: number;
  current_accuracy?: number;
  current_roi?: number;
  foundation_tracking: {
    days_tracked: number;
    total_predictions: number;
    total_wins: number;
    overall_accuracy: number;
    overall_roi: number;
  };
  predictions: Phase3TrackingEntry[];
}

const PHASE3_DATA_DIR = path.join(__dirname, '../data/phase3-tracking');
const PREDICTIONS_DIR = path.join(__dirname, '../data/predictions');

console.log('🎯 Phase 3: Daily Prediction & Results Tracker');
console.log('=============================================');
console.log('📊 Goal: Validate 61.5% foundation without betting');
console.log('🔒 Using: Locked baseline model configuration');
console.log('');

async function initializePhase3Tracking(): Promise<void> {
  // Ensure directories exist
  if (!fs.existsSync(PHASE3_DATA_DIR)) {
    fs.mkdirSync(PHASE3_DATA_DIR, { recursive: true });
    console.log('✅ Created Phase 3 tracking directory');
  }

  if (!fs.existsSync(PREDICTIONS_DIR)) {
    fs.mkdirSync(PREDICTIONS_DIR, { recursive: true });
    console.log('✅ Created predictions directory');
  }

  // Create initial tracking summary if it doesn't exist
  const summaryPath = path.join(PHASE3_DATA_DIR, 'tracking-summary.json');
  if (!fs.existsSync(summaryPath)) {
    const initialSummary = {
      phase3_start_date: new Date().toISOString().split('T')[0],
      baseline_foundation: {
        period: "August 14-16, 2025",
        games: 26,
        accuracy: 61.5,
        roi: 17.7,
        status: "LOCKED"
      },
      tracking_period: {
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        total_days: 0,
        total_predictions: 0,
        total_results: 0
      },
      performance_summary: {
        current_accuracy: null,
        current_roi: null,
        trend_vs_baseline: null
      }
    };

    fs.writeFileSync(summaryPath, JSON.stringify(initialSummary, null, 2));
    console.log('✅ Initialized Phase 3 tracking summary');
  }
}

async function generatePhase3Predictions(date?: string): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  console.log(`\n📅 Generating Phase 3 predictions for ${targetDate}`);
  console.log('🔒 Using locked baseline model configuration...');

  try {
    // Import the enhanced prediction system
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    // Run the enhanced prediction system
    const command = `npm run predict:enhanced -- --date=${targetDate}`;
    console.log(`🚀 Executing: ${command}`);

    const { stdout, stderr } = await execPromise(command);
    
    if (stderr && !stderr.includes('warn')) {
      console.error('❌ Error running predictions:', stderr);
      return;
    }

    console.log('✅ Predictions generated successfully');
    
    // Read the generated predictions
    const predictionsPath = path.join(PREDICTIONS_DIR, `${targetDate}.json`);
    if (fs.existsSync(predictionsPath)) {
      const predictions = JSON.parse(fs.readFileSync(predictionsPath, 'utf8'));
      
      // Convert to Phase 3 tracking format
      await createPhase3TrackingEntry(targetDate, predictions);
      
      console.log(`📊 Phase 3 tracking entry created for ${targetDate}`);
    } else {
      console.warn(`⚠️  No predictions file found for ${targetDate}`);
    }

  } catch (error: any) {
    console.error('❌ Error generating Phase 3 predictions:', error.message);
  }
}

async function createPhase3TrackingEntry(date: string, predictions: any): Promise<void> {
  const trackingEntries: Phase3TrackingEntry[] = [];

  // Process each prediction
  for (const pred of predictions.predictions || []) {
    const entry: Phase3TrackingEntry = {
      date,
      game_id: pred.game_id,
      teams: `${pred.game_info.away_team} @ ${pred.game_info.home_team}`,
      venue: pred.game_info.venue,
      prediction: {
        type: pred.predictions.ensemble.prediction.includes('Over') ? 'Over' : 'Under',
        total: pred.predictions.ensemble.total,
        confidence: pred.predictions.ensemble.confidence,
        recommendation: pred.recommendation
      },
      market_data: {
        line: pred.market_line || 0,
        bookmaker: pred.bookmaker || 'Unknown',
        edge: pred.predictions.ensemble.total - (pred.market_line || 0)
      },
      notes: []
    };

    // Add contextual notes
    if (pred.enhanced_data?.weather?.is_dome) {
      entry.notes.push('Dome game (controlled conditions)');
    }
    
    if (pred.enhanced_data?.weather?.wind_speed_mph > 15) {
      entry.notes.push(`High wind: ${pred.enhanced_data.weather.wind_speed_mph}mph`);
    }

    if (pred.prediction.confidence >= 65) {
      entry.notes.push('High confidence prediction');
    }

    trackingEntries.push(entry);
  }

  // Create daily report
  const dailyReport: Phase3DailyReport = {
    date,
    total_games: trackingEntries.length,
    playable_games: trackingEntries.filter(e => e.prediction.confidence >= 50).length,
    results_pending: trackingEntries.length,
    results_available: 0,
    foundation_tracking: await calculateFoundationTracking(),
    predictions: trackingEntries
  };

  // Save daily report
  const reportPath = path.join(PHASE3_DATA_DIR, `${date}-report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(dailyReport, null, 2));

  console.log(`✅ Phase 3 daily report saved: ${reportPath}`);
  
  // Display summary
  displayPhase3Summary(dailyReport);
}

async function calculateFoundationTracking(): Promise<any> {
  // Get all existing reports
  const reports = fs.readdirSync(PHASE3_DATA_DIR)
    .filter(file => file.endsWith('-report.json'))
    .map(file => {
      const content = fs.readFileSync(path.join(PHASE3_DATA_DIR, file), 'utf8');
      return JSON.parse(content);
    });

  let totalPredictions = 0;
  let totalWins = 0;
  let totalROI = 0;

  for (const report of reports) {
    totalPredictions += report.playable_games;
    
    // Count wins from predictions with results
    const predictionsWithResults = report.predictions.filter((p: any) => p.actual_result);
    totalWins += predictionsWithResults.filter((p: any) => p.actual_result.outcome === 'WIN').length;
  }

  const overallAccuracy = totalPredictions > 0 ? (totalWins / totalPredictions) * 100 : 0;

  return {
    days_tracked: reports.length,
    total_predictions: totalPredictions,
    total_wins: totalWins,
    overall_accuracy: Math.round(overallAccuracy * 10) / 10,
    overall_roi: 0 // Will be calculated when results are added
  };
}

function displayPhase3Summary(report: Phase3DailyReport): void {
  console.log(`\n📊 PHASE 3 DAILY SUMMARY - ${report.date}`);
  console.log('===============================================');
  console.log(`🎯 Total Games Analyzed: ${report.total_games}`);
  console.log(`💡 Playable Recommendations: ${report.playable_games}`);
  console.log(`⏳ Results Pending: ${report.results_pending}`);
  
  console.log(`\n🔒 FOUNDATION TRACKING:`);
  console.log(`   Days Tracked: ${report.foundation_tracking.days_tracked}`);
  console.log(`   Total Predictions: ${report.foundation_tracking.total_predictions}`);
  console.log(`   Current Accuracy: ${report.foundation_tracking.overall_accuracy}%`);
  console.log(`   Baseline Target: 61.5%`);

  if (report.playable_games > 0) {
    console.log(`\n🎲 TODAY'S RECOMMENDATIONS:`);
    const playableGames = report.predictions.filter(p => p.prediction.confidence >= 50);
    
    playableGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.teams}`);
      console.log(`      Prediction: ${game.prediction.type} ${game.prediction.total}`);
      console.log(`      Market Line: ${game.market_data.line} (${game.market_data.bookmaker})`);
      console.log(`      Confidence: ${game.prediction.confidence}%`);
      console.log(`      Edge: ${game.market_data.edge > 0 ? '+' : ''}${game.market_data.edge.toFixed(2)} runs`);
      if (game.notes.length > 0) {
        console.log(`      Notes: ${game.notes.join(', ')}`);
      }
      console.log('');
    });
  }

  console.log(`⚠️  REMINDER: Phase 3 is for tracking only - NO BETTING`);
  console.log(`🎯 Goal: Validate 61.5% foundation and identify patterns`);
}

async function addResultsToPhase3Tracking(date: string): Promise<void> {
  const reportPath = path.join(PHASE3_DATA_DIR, `${date}-report.json`);
  
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ No Phase 3 report found for ${date}`);
    return;
  }

  console.log(`📊 Adding results for Phase 3 tracking: ${date}`);
  console.log('⚠️  This feature requires manual result entry or API integration');
  console.log('🔄 Will be implemented in next iteration');
  
  // TODO: Implement result fetching and accuracy calculation
  // This would involve:
  // 1. Fetching actual game results from MLB API
  // 2. Comparing predictions vs actual outcomes
  // 3. Calculating win/loss for each prediction
  // 4. Updating the daily report with results
  // 5. Recalculating foundation tracking metrics
}

async function generatePhase3WeeklyReport(): Promise<void> {
  console.log(`📈 Generating Phase 3 weekly report...`);
  
  // Get all reports from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const reports = fs.readdirSync(PHASE3_DATA_DIR)
    .filter(file => file.endsWith('-report.json'))
    .map(file => {
      const content = fs.readFileSync(path.join(PHASE3_DATA_DIR, file), 'utf8');
      return JSON.parse(content);
    })
    .filter(report => new Date(report.date) >= sevenDaysAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (reports.length === 0) {
    console.log('📭 No reports found for the last 7 days');
    return;
  }

  console.log(`\n📊 PHASE 3 WEEKLY REPORT`);
  console.log('=========================');
  console.log(`📅 Period: ${reports[0].date} to ${reports[reports.length - 1].date}`);
  console.log(`📈 Days Tracked: ${reports.length}`);
  
  const totalPredictions = reports.reduce((sum, r) => sum + r.playable_games, 0);
  console.log(`🎯 Total Predictions: ${totalPredictions}`);
  
  console.log(`\n🔒 FOUNDATION COMPARISON:`);
  console.log(`   Baseline: 61.5% accuracy (August 14-16)`);
  console.log(`   Current: TBD (results pending)`);
  
  console.log(`\n📋 DAILY BREAKDOWN:`);
  reports.forEach(report => {
    console.log(`   ${report.date}: ${report.playable_games} predictions`);
  });
}

// Command line interface
async function main(): Promise<void> {
  const command = process.argv[2];
  const dateArg = process.argv.find(arg => arg.startsWith('--date='));
  const date = dateArg ? dateArg.split('=')[1] : undefined;

  switch (command) {
    case 'init':
      await initializePhase3Tracking();
      break;
    
    case 'predict':
      await initializePhase3Tracking();
      await generatePhase3Predictions(date);
      break;
    
    case 'add-results':
      if (!date) {
        console.error('❌ Date required for add-results command');
        console.log('Usage: npm run phase3:add-results -- --date=YYYY-MM-DD');
        return;
      }
      await addResultsToPhase3Tracking(date);
      break;
    
    case 'weekly-report':
      await generatePhase3WeeklyReport();
      break;
    
    default:
      console.log('🎯 Phase 3 Daily Tracker - Available Commands:');
      console.log('');
      console.log('📊 npm run phase3:init           # Initialize tracking system');
      console.log('🎲 npm run phase3:predict        # Generate today\'s predictions');
      console.log('🎲 npm run phase3:predict -- --date=YYYY-MM-DD  # Specific date');
      console.log('📈 npm run phase3:add-results -- --date=YYYY-MM-DD  # Add actual results');
      console.log('📋 npm run phase3:weekly-report  # Generate weekly summary');
      console.log('');
      console.log('🎯 Goal: Validate 61.5% foundation without betting');
      console.log('🔒 Using: Locked baseline model configuration');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  generatePhase3Predictions,
  addResultsToPhase3Tracking,
  generatePhase3WeeklyReport,
  initializePhase3Tracking
};