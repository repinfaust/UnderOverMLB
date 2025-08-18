#!/usr/bin/env node

/**
 * Enhanced Historical Backtest - Last 4 Weeks
 * 
 * Tests the enhanced prediction system against historical games
 * WITHOUT peeking at results first (blind backtest)
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { 
  enhancedDataFetcher,
  EnhancedWeatherData 
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

interface HistoricalGame {
  date: string;
  away_team: string;
  home_team: string;
  venue: string;
  game_id: string;
  prediction?: {
    ensemble_total: number;
    ensemble_prediction: 'Over' | 'Under';
    confidence: number;
    individual_models: any;
    recommendation: string;
    market_line?: number;
  };
  actual_result?: {
    final_score: string;
    total_runs: number;
    actual_outcome: 'Over' | 'Under';
  };
}

interface BacktestResults {
  total_games: number;
  games_predicted: number;
  correct_predictions: number;
  accuracy_rate: number;
  confidence_breakdown: {
    [range: string]: {
      games: number;
      correct: number;
      accuracy: number;
    };
  };
  model_performance: {
    [model: string]: {
      correct: number;
      total: number;
      accuracy: number;
    };
  };
  over_under_breakdown: {
    over_predictions: { correct: number; total: number; accuracy: number };
    under_predictions: { correct: number; total: number; accuracy: number };
  };
}

class EnhancedHistoricalBacktest {
  private results: HistoricalGame[] = [];
  private startDate: Date;
  private endDate: Date;

  constructor() {
    // Last 4 weeks from July 28, 2025
    this.endDate = new Date('2025-07-27'); // Day before our test
    this.startDate = new Date('2025-06-30'); // 4 weeks back
  }

  /**
   * Generate date range for testing
   */
  private generateDateRange(): string[] {
    const dates: string[] = [];
    const current = new Date(this.startDate);
    
    while (current <= this.endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Fetch historical games for a date
   */
  private async fetchHistoricalGames(date: string): Promise<HistoricalGame[]> {
    try {
      const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
        params: {
          sportId: 1,
          date: date,
          hydrate: 'team,venue,linescore'
        },
        timeout: 10000
      });

      if (!response.data.dates || response.data.dates.length === 0) {
        return [];
      }

      const games = response.data.dates[0].games || [];
      
      return games
        .filter((game: any) => game.status.abstractGameState === 'Final')
        .map((game: any) => ({
          date,
          away_team: game.teams.away.team.name,
          home_team: game.teams.home.team.name,
          venue: game.venue.name,
          game_id: `${date}_${game.teams.away.team.name.replace(/\s+/g, '')}@${game.teams.home.team.name.replace(/\s+/g, '')}`,
          actual_result: {
            final_score: `${game.teams.away.score || 0}-${game.teams.home.score || 0}`,
            total_runs: (game.teams.away.score || 0) + (game.teams.home.score || 0),
            actual_outcome: ((game.teams.away.score || 0) + (game.teams.home.score || 0)) > 8.5 ? 'Over' : 'Under'
          }
        }));
    } catch (error: any) {
      console.warn(`⚠️ Failed to fetch games for ${date}: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate enhanced prediction for historical game (blind)
   */
  private async generateBlindPrediction(game: HistoricalGame): Promise<void> {
    try {
      // Simulate our enhanced prediction process without knowing results
      
      // 1. Get historical weather (using current as proxy for historical)
      let weather: EnhancedWeatherData;
      try {
        weather = await enhancedDataFetcher.getEnhancedWeatherData(game.venue);
      } catch (error) {
        // Use mock weather for unknown venues
        weather = {
          temp_f: 75 + (Math.random() * 20),
          humidity: 50 + (Math.random() * 40),
          wind_speed_mph: Math.random() * 15,
          wind_direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
          conditions: 'partly cloudy',
          pressure: 1013,
          feels_like: 75,
          is_dome: ['American Family Field', 'Tropicana Field', 'Rogers Centre', 'Chase Field', 'loanDepot park', 'T-Mobile Park', 'Globe Life Field'].includes(game.venue),
          data_timestamp: Date.now(),
          location: 'Historical',
          is_stale: false
        };
      }

      // 2. Build game factors
      const gameFactors: GameFactors = {
        home_team: game.home_team,
        away_team: game.away_team,
        venue: game.venue,
        date: game.date,
        weather: {
          temp_f: weather.temp_f,
          humidity: weather.humidity,
          wind_speed_mph: weather.wind_speed_mph,
          wind_direction: weather.wind_direction,
          conditions: weather.conditions
        },
        park_factors: {
          runs_factor: this.getVenueRunsFactor(game.venue),
          hr_factor: this.getVenueHRFactor(game.venue),
          altitude: this.getVenueAltitude(game.venue)
        }
      };

      // 3. Run enhanced models
      const modelA = runModelA_Recalibrated(gameFactors);
      const modelB = runModelB_Recalibrated(gameFactors);
      const modelC = runModelC_Recalibrated(gameFactors);
      const modelD = runModelD_Recalibrated(gameFactors, 8.5); // Assume 8.5 market line

      // 4. Apply confidence penalties for historical data limitations
      const confidencePenalty = 15; // Historical data always has some uncertainty
      modelA.confidence = Math.max(45, modelA.confidence - confidencePenalty);
      modelB.confidence = Math.max(45, modelB.confidence - confidencePenalty);
      modelC.confidence = Math.max(45, modelC.confidence - confidencePenalty);
      modelD.confidence = Math.max(45, modelD.confidence - confidencePenalty);

      // 5. Generate ensemble
      const ensemble = generateRecalibratedEnsemble(modelA, modelB, modelC, modelD);

      // 6. Generate recommendation
      const recommendation = this.generateRecommendation(ensemble, weather);

      game.prediction = {
        ensemble_total: ensemble.total,
        ensemble_prediction: ensemble.prediction,
        confidence: ensemble.confidence,
        individual_models: {
          Model_A: modelA,
          Model_B: modelB,
          Model_C: modelC,
          Model_D: modelD
        },
        recommendation,
        market_line: 8.5
      };

    } catch (error: any) {
      console.warn(`⚠️ Failed to generate prediction for ${game.game_id}: ${error.message}`);
    }
  }

  /**
   * Generate recommendation based on ensemble and conditions
   */
  private generateRecommendation(ensemble: any, weather: EnhancedWeatherData): string {
    if (ensemble.confidence < 60) {
      return '❌ NO PLAY - Low confidence';
    }

    if (weather.is_stale && ensemble.confidence > 65) {
      return '⚠️ NO PLAY - Stale data with high confidence claim';
    }

    const confidenceLevel = ensemble.confidence >= 70 ? '🔥 STRONG' : 
                           ensemble.confidence >= 65 ? '📈 LEAN' : '💡 SLIGHT';

    return `${confidenceLevel} ${ensemble.prediction}`;
  }

  /**
   * Run complete backtest
   */
  async runBacktest(): Promise<BacktestResults> {
    console.log('🔄 ENHANCED HISTORICAL BACKTEST - LAST 4 WEEKS');
    console.log('==============================================');
    console.log(`📅 Testing Period: ${this.startDate.toDateString()} to ${this.endDate.toDateString()}`);
    console.log('🚫 BLIND MODE: Predictions made without knowing actual results');
    console.log('');

    const dates = this.generateDateRange();
    let totalGames = 0;

    // Phase 1: Collect all historical games
    console.log('📊 Phase 1: Collecting historical games...');
    for (const date of dates) {
      console.log(`   Fetching ${date}...`);
      const games = await this.fetchHistoricalGames(date);
      this.results.push(...games);
      totalGames += games.length;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`✅ Collected ${totalGames} completed games`);
    console.log('');

    // Phase 2: Generate blind predictions
    console.log('🎯 Phase 2: Generating blind predictions...');
    let predictionsGenerated = 0;
    
    for (const game of this.results) {
      console.log(`   Predicting ${game.away_team} @ ${game.home_team} (${game.date})`);
      await this.generateBlindPrediction(game);
      
      if (game.prediction) {
        predictionsGenerated++;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Generated ${predictionsGenerated} predictions`);
    console.log('');

    // Phase 3: Analyze results
    console.log('📈 Phase 3: Analyzing prediction accuracy...');
    const analysis = this.analyzeResults();

    // Phase 4: Save results
    this.saveResults();

    return analysis;
  }

  /**
   * Analyze prediction accuracy
   */
  private analyzeResults(): BacktestResults {
    const gamesWithPredictions = this.results.filter(g => g.prediction && g.actual_result);
    
    let correctPredictions = 0;
    const confidenceBreakdown: { [range: string]: { games: number; correct: number; accuracy: number } } = {
      '45-55%': { games: 0, correct: 0, accuracy: 0 },
      '55-65%': { games: 0, correct: 0, accuracy: 0 },
      '65-75%': { games: 0, correct: 0, accuracy: 0 }
    };

    const modelPerformance = {
      Model_A: { correct: 0, total: 0, accuracy: 0 },
      Model_B: { correct: 0, total: 0, accuracy: 0 },
      Model_C: { correct: 0, total: 0, accuracy: 0 },
      Model_D: { correct: 0, total: 0, accuracy: 0 }
    };

    let overPredictions = { correct: 0, total: 0, accuracy: 0 };
    let underPredictions = { correct: 0, total: 0, accuracy: 0 };

    for (const game of gamesWithPredictions) {
      const prediction = game.prediction!;
      const actual = game.actual_result!;
      
      // Check ensemble accuracy
      const isCorrect = prediction.ensemble_prediction === actual.actual_outcome;
      if (isCorrect) correctPredictions++;

      // Confidence breakdown
      const confidence = prediction.confidence;
      if (confidence >= 45 && confidence < 55) {
        confidenceBreakdown['45-55%'].games++;
        if (isCorrect) confidenceBreakdown['45-55%'].correct++;
      } else if (confidence >= 55 && confidence < 65) {
        confidenceBreakdown['55-65%'].games++;
        if (isCorrect) confidenceBreakdown['55-65%'].correct++;
      } else if (confidence >= 65 && confidence <= 75) {
        confidenceBreakdown['65-75%'].games++;
        if (isCorrect) confidenceBreakdown['65-75%'].correct++;
      }

      // Over/Under breakdown
      if (prediction.ensemble_prediction === 'Over') {
        overPredictions.total++;
        if (isCorrect) overPredictions.correct++;
      } else {
        underPredictions.total++;
        if (isCorrect) underPredictions.correct++;
      }

      // Individual model performance
      Object.keys(modelPerformance).forEach(modelKey => {
        const modelPred = prediction.individual_models[modelKey];
        if (modelPred) {
          modelPerformance[modelKey as keyof typeof modelPerformance].total++;
          if (modelPred.prediction === actual.actual_outcome) {
            modelPerformance[modelKey as keyof typeof modelPerformance].correct++;
          }
        }
      });
    }

    // Calculate accuracies
    Object.keys(confidenceBreakdown).forEach(range => {
      const data = confidenceBreakdown[range];
      data.accuracy = data.games > 0 ? (data.correct / data.games) * 100 : 0;
    });

    Object.keys(modelPerformance).forEach(model => {
      const data = modelPerformance[model as keyof typeof modelPerformance];
      data.accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    });

    overPredictions.accuracy = overPredictions.total > 0 ? (overPredictions.correct / overPredictions.total) * 100 : 0;
    underPredictions.accuracy = underPredictions.total > 0 ? (underPredictions.correct / underPredictions.total) * 100 : 0;

    return {
      total_games: this.results.length,
      games_predicted: gamesWithPredictions.length,
      correct_predictions: correctPredictions,
      accuracy_rate: gamesWithPredictions.length > 0 ? (correctPredictions / gamesWithPredictions.length) * 100 : 0,
      confidence_breakdown: confidenceBreakdown,
      model_performance: modelPerformance,
      over_under_breakdown: {
        over_predictions: overPredictions,
        under_predictions: underPredictions
      }
    };
  }

  /**
   * Save results to file
   */
  private saveResults(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `enhanced-backtest-4weeks-${timestamp}.json`;
    const filepath = path.join(__dirname, '..', 'data', 'reports', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify({
      metadata: {
        start_date: this.startDate.toISOString(),
        end_date: this.endDate.toISOString(),
        generated_at: new Date().toISOString(),
        system_version: 'enhanced-recalibrated'
      },
      results: this.results
    }, null, 2));

    console.log(`💾 Results saved to: ${filepath}`);
  }

  // Helper methods for venue factors
  private getVenueRunsFactor(venue: string): number {
    const factors: Record<string, number> = {
      'Coors Field': 1.15,
      'Fenway Park': 1.05,
      'Yankee Stadium': 1.03,
      'Tropicana Field': 0.94,
      'loanDepot park': 0.92,
      'Petco Park': 0.90,
      'Oakland Coliseum': 0.88
    };
    return factors[venue] || 1.0;
  }

  private getVenueHRFactor(venue: string): number {
    const factors: Record<string, number> = {
      'Coors Field': 1.20,
      'Yankee Stadium': 1.10,
      'Fenway Park': 1.05,
      'loanDepot park': 0.85,
      'Petco Park': 0.80
    };
    return factors[venue] || 1.0;
  }

  private getVenueAltitude(venue: string): number {
    const altitudes: Record<string, number> = {
      'Coors Field': 5200,
      'Chase Field': 1100,
      'Truist Park': 1050,
      'Kauffman Stadium': 750,
      'PNC Park': 730
    };
    return altitudes[venue] || 500;
  }
}

/**
 * Display results
 */
function displayResults(results: BacktestResults): void {
  console.log('📊 ENHANCED BACKTEST RESULTS');
  console.log('============================');
  console.log(`🎯 Overall Accuracy: ${results.accuracy_rate.toFixed(1)}% (${results.correct_predictions}/${results.games_predicted})`);
  console.log(`📈 Total Games: ${results.total_games}`);
  console.log(`🔮 Predictions Generated: ${results.games_predicted}`);
  console.log('');

  console.log('📊 CONFIDENCE BREAKDOWN:');
  Object.entries(results.confidence_breakdown).forEach(([range, data]) => {
    console.log(`   ${range}: ${data.accuracy.toFixed(1)}% (${data.correct}/${data.games})`);
  });
  console.log('');

  console.log('🤖 INDIVIDUAL MODEL PERFORMANCE:');
  Object.entries(results.model_performance).forEach(([model, data]) => {
    console.log(`   ${model}: ${data.accuracy.toFixed(1)}% (${data.correct}/${data.total})`);
  });
  console.log('');

  console.log('📈 OVER/UNDER BREAKDOWN:');
  console.log(`   Over Predictions: ${results.over_under_breakdown.over_predictions.accuracy.toFixed(1)}% (${results.over_under_breakdown.over_predictions.correct}/${results.over_under_breakdown.over_predictions.total})`);
  console.log(`   Under Predictions: ${results.over_under_breakdown.under_predictions.accuracy.toFixed(1)}% (${results.over_under_breakdown.under_predictions.correct}/${results.over_under_breakdown.under_predictions.total})`);
  console.log('');

  // Performance assessment
  if (results.accuracy_rate >= 52) {
    console.log('✅ SYSTEM STATUS: Ready for production use');
  } else if (results.accuracy_rate >= 48) {
    console.log('⚠️ SYSTEM STATUS: Marginally viable - proceed with caution');
  } else {
    console.log('❌ SYSTEM STATUS: Not ready for production - needs improvement');
  }
}

// Run the backtest
if (require.main === module) {
  const backtest = new EnhancedHistoricalBacktest();
  
  backtest.runBacktest()
    .then(results => {
      displayResults(results);
    })
    .catch(error => {
      console.error('❌ Backtest failed:', error.message);
      process.exit(1);
    });
}