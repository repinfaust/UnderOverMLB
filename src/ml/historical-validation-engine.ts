#!/usr/bin/env node

/**
 * Historical Validation & ML Refinement Engine
 * 
 * Continuously validates predictions against actual results over rolling 4-week windows
 * and automatically refines the prediction model based on variance analysis.
 * 
 * Key Features:
 * - Rolling 4-week validation window
 * - Multi-dimensional error analysis (venue, weather, pitcher, team, temporal)
 * - Automated parameter adjustment based on performance
 * - Comprehensive logging and prediction tracking
 * - Advanced ML techniques for model refinement
 */

import * as fs from 'fs';
import { predictGameTotal, GameData, ComponentBreakdown } from '../models/improved/component-additive-model';

interface HistoricalGame {
  date: string;
  gameId: string;
  venue: string;
  homeTeam: string;
  awayTeam: string;
  actualTotal: number;
  weather: {
    temp_f: number;
    humidity: number;
    wind_speed_mph: number;
    wind_direction: string;
    conditions: string;
  };
  pitchers: {
    home: string;
    away: string;
    homeERA?: number;
    awayERA?: number;
  };
  ourPrediction?: number;
  predictionError?: number;
  sportsBookLine?: number;
  predictionBreakdown?: ComponentBreakdown;
  dataSource: 'MLB_API' | 'MANUAL' | 'WEB_SCRAPE';
}

interface ValidationMetrics {
  meanAbsoluteError: number;
  meanSquaredError: number;
  rootMeanSquaredError: number;
  meanAbsolutePercentageError: number;
  r2Score: number;
  bias: number;
  accuracy: number; // % within 1.5 runs of actual
  directionAccuracy: number; // % correct Over/Under vs 8.5 baseline
}

interface ModelAdjustment {
  parameter: string;
  component: string;
  currentValue: number;
  suggestedValue: number;
  confidence: number;
  rationale: string;
  expectedImprovement: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

interface ValidationReport {
  reportId: string;
  timestamp: string;
  windowStart: string;
  windowEnd: string;
  gamesAnalyzed: number;
  overallMetrics: ValidationMetrics;
  venueMetrics: { [venue: string]: ValidationMetrics };
  weatherMetrics: { [condition: string]: ValidationMetrics };
  pitcherMetrics: { [category: string]: ValidationMetrics };
  teamMetrics: { [team: string]: ValidationMetrics };
  temporalMetrics: { [timeframe: string]: ValidationMetrics };
  suggestedAdjustments: ModelAdjustment[];
  modelPerformanceTrend: 'Improving' | 'Stable' | 'Declining';
}

class HistoricalValidationEngine {
  private historicalData: HistoricalGame[] = [];
  private validationReports: ValidationReport[] = [];
  private readonly dataPath = '/Users/davidloake/Downloads/mlb/data/historical-games.json';
  private readonly reportsPath = '/Users/davidloake/Downloads/mlb/data/validation-reports.json';
  private readonly VALIDATION_WINDOW_DAYS = 28; // 4 weeks
  
  constructor() {
    this.loadHistoricalData();
    this.loadValidationReports();
  }
  
  /**
   * Add a new historical game result for validation
   */
  addHistoricalGame(game: HistoricalGame): void {
    // Generate prediction for this game if we don't have one
    if (!game.ourPrediction) {
      const gameData: GameData = {
        home_team: game.homeTeam,
        away_team: game.awayTeam,
        venue: game.venue,
        date: game.date,
        weather: game.weather,
        starting_pitchers: {
          home: game.pitchers.home,
          away: game.pitchers.away
        }
      };
      
      const prediction = predictGameTotal(gameData);
      game.ourPrediction = prediction.final_total;
      game.predictionError = Math.abs(game.actualTotal - prediction.final_total);
      game.predictionBreakdown = prediction;
    }
    
    // Add to historical data
    this.historicalData.push(game);
    
    // Keep only last 60 days of data to manage memory
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);
    
    this.historicalData = this.historicalData.filter(g => 
      new Date(g.date) >= cutoffDate
    );
    
    this.saveHistoricalData();
    
    console.log(`📊 Historical game added: ${game.homeTeam} vs ${game.awayTeam} (${game.date})`);
    console.log(`   Predicted: ${game.ourPrediction?.toFixed(1)}, Actual: ${game.actualTotal}, Error: ${game.predictionError?.toFixed(1)}`);
  }
  
  /**
   * Run comprehensive validation analysis on rolling 4-week window
   */
  runValidationAnalysis(): ValidationReport {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - this.VALIDATION_WINDOW_DAYS);
    
    // Filter games in validation window
    const windowGames = this.historicalData.filter(game => {
      const gameDate = new Date(game.date);
      return gameDate >= startDate && gameDate <= endDate && game.ourPrediction;
    });
    
    if (windowGames.length < 10) {
      console.log('⚠️ Insufficient historical data for validation (need 10+ games)');
      return this.createEmptyReport(startDate, endDate);
    }
    
    console.log(`🔍 RUNNING VALIDATION ANALYSIS`);
    console.log(`============================`);
    console.log(`Window: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`Games analyzed: ${windowGames.length}`);
    
    // Calculate overall metrics
    const overallMetrics = this.calculateValidationMetrics(windowGames);
    
    // Calculate dimensional metrics
    const venueMetrics = this.calculateMetricsByDimension(windowGames, 'venue');
    const weatherMetrics = this.calculateWeatherMetrics(windowGames);
    const pitcherMetrics = this.calculatePitcherMetrics(windowGames);
    const teamMetrics = this.calculateTeamMetrics(windowGames);
    const temporalMetrics = this.calculateTemporalMetrics(windowGames);
    
    // Generate model adjustment suggestions
    const suggestedAdjustments = this.generateModelAdjustments(
      overallMetrics, venueMetrics, weatherMetrics, pitcherMetrics, teamMetrics
    );
    
    // Determine performance trend
    const performanceTrend = this.calculatePerformanceTrend();
    
    const report: ValidationReport = {
      reportId: `validation_${Date.now()}`,
      timestamp: new Date().toISOString(),
      windowStart: startDate.toISOString().split('T')[0],
      windowEnd: endDate.toISOString().split('T')[0],
      gamesAnalyzed: windowGames.length,
      overallMetrics,
      venueMetrics,
      weatherMetrics,
      pitcherMetrics,
      teamMetrics,
      temporalMetrics,
      suggestedAdjustments,
      modelPerformanceTrend: performanceTrend
    };
    
    this.validationReports.push(report);
    this.saveValidationReports();
    
    this.displayValidationReport(report);
    return report;
  }
  
  private calculateValidationMetrics(games: HistoricalGame[]): ValidationMetrics {
    const predictions = games.map(g => g.ourPrediction!);
    const actuals = games.map(g => g.actualTotal);
    
    // Mean Absolute Error
    const mae = games.reduce((sum, g) => sum + g.predictionError!, 0) / games.length;
    
    // Mean Squared Error
    const mse = games.reduce((sum, g) => sum + Math.pow(g.predictionError!, 2), 0) / games.length;
    
    // Root Mean Squared Error
    const rmse = Math.sqrt(mse);
    
    // Mean Absolute Percentage Error
    const mape = games.reduce((sum, g) => sum + (g.predictionError! / g.actualTotal), 0) / games.length * 100;
    
    // R² Score (coefficient of determination)
    const actualMean = actuals.reduce((sum, val) => sum + val, 0) / actuals.length;
    const totalSumSquares = actuals.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = games.reduce((sum, g) => sum + Math.pow(g.actualTotal - g.ourPrediction!, 2), 0);
    const r2 = 1 - (residualSumSquares / totalSumSquares);
    
    // Bias (average prediction - average actual)
    const predictionMean = predictions.reduce((sum, val) => sum + val, 0) / predictions.length;
    const bias = predictionMean - actualMean;
    
    // Accuracy (% within 1.5 runs)
    const accurateCount = games.filter(g => g.predictionError! <= 1.5).length;
    const accuracy = (accurateCount / games.length) * 100;
    
    // Direction accuracy (Over/Under vs 8.5 baseline)
    const correctDirections = games.filter(g => {
      const predictedDirection = g.ourPrediction! > 8.5 ? 'Over' : 'Under';
      const actualDirection = g.actualTotal > 8.5 ? 'Over' : 'Under';
      return predictedDirection === actualDirection;
    }).length;
    const directionAccuracy = (correctDirections / games.length) * 100;
    
    return {
      meanAbsoluteError: mae,
      meanSquaredError: mse,
      rootMeanSquaredError: rmse,
      meanAbsolutePercentageError: mape,
      r2Score: r2,
      bias,
      accuracy,
      directionAccuracy
    };
  }
  
  private calculateMetricsByDimension(games: HistoricalGame[], dimension: keyof HistoricalGame): { [key: string]: ValidationMetrics } {
    const grouped: { [key: string]: HistoricalGame[] } = {};
    
    games.forEach(game => {
      const key = String(game[dimension]);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(game);
    });
    
    const metrics: { [key: string]: ValidationMetrics } = {};
    Object.entries(grouped).forEach(([key, groupGames]) => {
      if (groupGames.length >= 3) { // Need minimum games for meaningful metrics
        metrics[key] = this.calculateValidationMetrics(groupGames);
      }
    });
    
    return metrics;
  }
  
  private calculateWeatherMetrics(games: HistoricalGame[]): { [condition: string]: ValidationMetrics } {
    const weatherGroups: { [key: string]: HistoricalGame[] } = {
      'Hot (85°F+)': games.filter(g => g.weather.temp_f >= 85),
      'Moderate (70-85°F)': games.filter(g => g.weather.temp_f >= 70 && g.weather.temp_f < 85),
      'Cool (<70°F)': games.filter(g => g.weather.temp_f < 70),
      'Windy (15+ mph)': games.filter(g => g.weather.wind_speed_mph >= 15),
      'High Humidity (80%+)': games.filter(g => g.weather.humidity >= 80),
    };
    
    const metrics: { [key: string]: ValidationMetrics } = {};
    Object.entries(weatherGroups).forEach(([condition, groupGames]) => {
      if (groupGames.length >= 3) {
        metrics[condition] = this.calculateValidationMetrics(groupGames);
      }
    });
    
    return metrics;
  }
  
  private calculatePitcherMetrics(games: HistoricalGame[]): { [category: string]: ValidationMetrics } {
    // Categorize pitchers by ERA if available, otherwise use simple categories
    const pitcherGroups: { [key: string]: HistoricalGame[] } = {
      'Elite ERA (<3.0)': games.filter(g => 
        (g.pitchers.homeERA && g.pitchers.homeERA < 3.0) || 
        (g.pitchers.awayERA && g.pitchers.awayERA < 3.0)
      ),
      'Good ERA (3.0-3.5)': games.filter(g => 
        (g.pitchers.homeERA && g.pitchers.homeERA >= 3.0 && g.pitchers.homeERA <= 3.5) || 
        (g.pitchers.awayERA && g.pitchers.awayERA >= 3.0 && g.pitchers.awayERA <= 3.5)
      ),
      'Average ERA (3.5-4.0)': games.filter(g => 
        (g.pitchers.homeERA && g.pitchers.homeERA > 3.5 && g.pitchers.homeERA <= 4.0) || 
        (g.pitchers.awayERA && g.pitchers.awayERA > 3.5 && g.pitchers.awayERA <= 4.0)
      ),
      'Poor ERA (>4.0)': games.filter(g => 
        (g.pitchers.homeERA && g.pitchers.homeERA > 4.0) || 
        (g.pitchers.awayERA && g.pitchers.awayERA > 4.0)
      ),
    };
    
    const metrics: { [key: string]: ValidationMetrics } = {};
    Object.entries(pitcherGroups).forEach(([category, groupGames]) => {
      if (groupGames.length >= 3) {
        metrics[category] = this.calculateValidationMetrics(groupGames);
      }
    });
    
    return metrics;
  }
  
  private calculateTeamMetrics(games: HistoricalGame[]): { [team: string]: ValidationMetrics } {
    const teamGames: { [team: string]: HistoricalGame[] } = {};
    
    games.forEach(game => {
      [game.homeTeam, game.awayTeam].forEach(team => {
        if (!teamGames[team]) teamGames[team] = [];
        teamGames[team].push(game);
      });
    });
    
    const metrics: { [key: string]: ValidationMetrics } = {};
    Object.entries(teamGames).forEach(([team, teamGameList]) => {
      if (teamGameList.length >= 3) {
        metrics[team] = this.calculateValidationMetrics(teamGameList);
      }
    });
    
    return metrics;
  }
  
  private calculateTemporalMetrics(games: HistoricalGame[]): { [timeframe: string]: ValidationMetrics } {
    const now = new Date();
    const temporalGroups: { [key: string]: HistoricalGame[] } = {
      'Last 7 Days': games.filter(g => {
        const gameDate = new Date(g.date);
        const daysAgo = (now.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7;
      }),
      'Last 14 Days': games.filter(g => {
        const gameDate = new Date(g.date);
        const daysAgo = (now.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 14;
      }),
      'Weekdays': games.filter(g => {
        const gameDate = new Date(g.date);
        const dayOfWeek = gameDate.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      }),
      'Weekends': games.filter(g => {
        const gameDate = new Date(g.date);
        const dayOfWeek = gameDate.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
      })
    };
    
    const metrics: { [key: string]: ValidationMetrics } = {};
    Object.entries(temporalGroups).forEach(([timeframe, groupGames]) => {
      if (groupGames.length >= 3) {
        metrics[timeframe] = this.calculateValidationMetrics(groupGames);
      }
    });
    
    return metrics;
  }
  
  private generateModelAdjustments(
    overall: ValidationMetrics,
    venue: { [key: string]: ValidationMetrics },
    weather: { [key: string]: ValidationMetrics },
    pitcher: { [key: string]: ValidationMetrics },
    team: { [key: string]: ValidationMetrics }
  ): ModelAdjustment[] {
    
    const adjustments: ModelAdjustment[] = [];
    
    // Overall bias adjustment
    if (Math.abs(overall.bias) > 0.3) {
      adjustments.push({
        parameter: 'august_baseline',
        component: 'baseline',
        currentValue: 7.6,
        suggestedValue: 7.6 - overall.bias,
        confidence: 85,
        rationale: `Overall bias of ${overall.bias.toFixed(2)} runs detected`,
        expectedImprovement: Math.abs(overall.bias) * 0.7,
        riskLevel: Math.abs(overall.bias) > 0.5 ? 'Medium' : 'Low'
      });
    }
    
    // Venue-specific adjustments
    Object.entries(venue).forEach(([venueName, metrics]) => {
      if (Math.abs(metrics.bias) > 0.5 && metrics.accuracy < 40) {
        let parameter = 'venue_adjustment';
        let currentValue = 0;
        
        if (venueName.includes('Coors')) {
          parameter = 'coors_field_adjustment';
          currentValue = 4.0;
        }
        
        adjustments.push({
          parameter,
          component: 'venue',
          currentValue,
          suggestedValue: currentValue - metrics.bias,
          confidence: 75,
          rationale: `${venueName} shows ${metrics.bias.toFixed(2)} run bias with ${metrics.accuracy.toFixed(1)}% accuracy`,
          expectedImprovement: Math.abs(metrics.bias) * 0.6,
          riskLevel: Math.abs(metrics.bias) > 1.0 ? 'High' : 'Medium'
        });
      }
    });
    
    // Weather adjustments
    Object.entries(weather).forEach(([condition, metrics]) => {
      if (Math.abs(metrics.bias) > 0.4 && metrics.accuracy < 45) {
        if (condition.includes('Hot')) {
          adjustments.push({
            parameter: 'hot_weather_coefficient',
            component: 'weather',
            currentValue: 0.35,
            suggestedValue: 0.35 - (metrics.bias * 0.1),
            confidence: 70,
            rationale: `Hot weather shows ${metrics.bias.toFixed(2)} run bias`,
            expectedImprovement: Math.abs(metrics.bias) * 0.4,
            riskLevel: 'Low'
          });
        }
      }
    });
    
    // Pitcher adjustments
    Object.entries(pitcher).forEach(([category, metrics]) => {
      if (Math.abs(metrics.bias) > 0.6 && category.includes('Elite')) {
        adjustments.push({
          parameter: 'elite_pitcher_adjustment',
          component: 'pitching',
          currentValue: -1.5,
          suggestedValue: -1.5 - (metrics.bias * 0.5),
          confidence: 65,
          rationale: `Elite pitchers show ${metrics.bias.toFixed(2)} run bias`,
          expectedImprovement: Math.abs(metrics.bias) * 0.5,
          riskLevel: 'Medium'
        });
      }
    });
    
    // Sort by expected improvement
    adjustments.sort((a, b) => b.expectedImprovement - a.expectedImprovement);
    
    return adjustments.slice(0, 5); // Return top 5 adjustments
  }
  
  private calculatePerformanceTrend(): 'Improving' | 'Stable' | 'Declining' {
    if (this.validationReports.length < 3) return 'Stable';
    
    const recent = this.validationReports.slice(-3);
    const errors = recent.map(report => report.overallMetrics.meanAbsoluteError);
    
    const trend = errors[2] - errors[0]; // Compare latest to oldest
    
    if (trend < -0.2) return 'Improving';
    if (trend > 0.2) return 'Declining';
    return 'Stable';
  }
  
  private displayValidationReport(report: ValidationReport): void {
    console.log(`\n📊 VALIDATION REPORT ${report.reportId}`);
    console.log(`=======================================`);
    console.log(`Period: ${report.windowStart} to ${report.windowEnd}`);
    console.log(`Games: ${report.gamesAnalyzed}`);
    
    console.log(`\n🎯 OVERALL PERFORMANCE`);
    console.log(`=====================`);
    console.log(`Mean Absolute Error: ${report.overallMetrics.meanAbsoluteError.toFixed(2)} runs`);
    console.log(`RMSE: ${report.overallMetrics.rootMeanSquaredError.toFixed(2)} runs`);
    console.log(`R² Score: ${report.overallMetrics.r2Score.toFixed(3)}`);
    console.log(`Bias: ${report.overallMetrics.bias.toFixed(2)} runs`);
    console.log(`Accuracy (±1.5 runs): ${report.overallMetrics.accuracy.toFixed(1)}%`);
    console.log(`Direction Accuracy: ${report.overallMetrics.directionAccuracy.toFixed(1)}%`);
    console.log(`Performance Trend: ${report.modelPerformanceTrend}`);
    
    if (Object.keys(report.venueMetrics).length > 0) {
      console.log(`\n🏟️ VENUE PERFORMANCE`);
      console.log(`==================`);
      Object.entries(report.venueMetrics).forEach(([venue, metrics]) => {
        console.log(`${venue}: MAE ${metrics.meanAbsoluteError.toFixed(2)}, Accuracy ${metrics.accuracy.toFixed(1)}%, Bias ${metrics.bias.toFixed(2)}`);
      });
    }
    
    if (report.suggestedAdjustments.length > 0) {
      console.log(`\n🔧 SUGGESTED ADJUSTMENTS`);
      console.log(`========================`);
      report.suggestedAdjustments.forEach((adj, index) => {
        console.log(`${index + 1}. ${adj.component}.${adj.parameter}: ${adj.currentValue} → ${adj.suggestedValue.toFixed(2)}`);
        console.log(`   Rationale: ${adj.rationale}`);
        console.log(`   Expected improvement: ${adj.expectedImprovement.toFixed(2)} runs (${adj.confidence}% confidence, ${adj.riskLevel} risk)`);
      });
    }
  }
  
  private createEmptyReport(startDate: Date, endDate: Date): ValidationReport {
    return {
      reportId: `validation_empty_${Date.now()}`,
      timestamp: new Date().toISOString(),
      windowStart: startDate.toISOString().split('T')[0],
      windowEnd: endDate.toISOString().split('T')[0],
      gamesAnalyzed: 0,
      overallMetrics: {
        meanAbsoluteError: 0,
        meanSquaredError: 0,
        rootMeanSquaredError: 0,
        meanAbsolutePercentageError: 0,
        r2Score: 0,
        bias: 0,
        accuracy: 0,
        directionAccuracy: 0
      },
      venueMetrics: {},
      weatherMetrics: {},
      pitcherMetrics: {},
      teamMetrics: {},
      temporalMetrics: {},
      suggestedAdjustments: [],
      modelPerformanceTrend: 'Stable'
    };
  }
  
  private loadHistoricalData(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8');
        this.historicalData = JSON.parse(data);
      }
    } catch (error) {
      console.log('Starting with empty historical data');
      this.historicalData = [];
    }
  }
  
  private saveHistoricalData(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.historicalData, null, 2));
    } catch (error) {
      console.error('Failed to save historical data:', error);
    }
  }
  
  private loadValidationReports(): void {
    try {
      if (fs.existsSync(this.reportsPath)) {
        const data = fs.readFileSync(this.reportsPath, 'utf8');
        this.validationReports = JSON.parse(data);
      }
    } catch (error) {
      console.log('Starting with empty validation reports');
      this.validationReports = [];
    }
  }
  
  private saveValidationReports(): void {
    try {
      fs.writeFileSync(this.reportsPath, JSON.stringify(this.validationReports, null, 2));
    } catch (error) {
      console.error('Failed to save validation reports:', error);
    }
  }
}

export { HistoricalValidationEngine, HistoricalGame, ValidationReport, ModelAdjustment };