#!/usr/bin/env node

/**
 * Comprehensive Logging and Tracking System
 * 
 * Complete logging infrastructure for all ML activities:
 * - Prediction logging with full context
 * - Performance tracking across all dimensions
 * - Model change audit trail
 * - Validation result archiving
 * - Betting performance correlation
 * - Real-time dashboards and alerts
 * - Data quality monitoring
 * - Error analysis and debugging
 */

import * as fs from 'fs';
import * as path from 'path';

interface PredictionLog {
  predictionId: string;
  timestamp: string;
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  
  // Input data
  weather: {
    temp_f: number;
    humidity: number;
    wind_speed_mph: number;
    wind_direction: string;
    conditions: string;
  };
  
  // Prediction details
  ourPrediction: number;
  confidence: number;
  componentBreakdown: {
    baseline: number;
    pitching: number;
    offense: number;
    weather: number;
    venue: number;
    market: number;
  };
  
  // Market data
  sportsBookLine?: number;
  edge?: number;
  recommendation: 'Strong Over' | 'Lean Over' | 'Pass' | 'Lean Under' | 'Strong Under';
  
  // Results (filled in later)
  actualTotal?: number;
  predictionError?: number;
  correct?: boolean;
  betOutcome?: 'Win' | 'Loss' | 'Push' | 'Not Bet';
  
  // Metadata
  modelVersion: string;
  dataSource: string;
  validationStatus: 'Predicted' | 'Validated' | 'Analyzed';
}

interface PerformanceMetrics {
  timestamp: string;
  timeframe: string; // 'daily', 'weekly', 'monthly'
  
  // Overall metrics
  totalPredictions: number;
  meanAbsoluteError: number;
  accuracy: number;
  directionAccuracy: number;
  r2Score: number;
  bias: number;
  
  // Dimensional breakdowns
  venuePerformance: { [venue: string]: { mae: number; accuracy: number; count: number } };
  weatherPerformance: { [condition: string]: { mae: number; accuracy: number; count: number } };
  teamPerformance: { [team: string]: { mae: number; accuracy: number; count: number } };
  confidenceCalibration: { [range: string]: { mae: number; accuracy: number; count: number } };
  
  // Betting performance
  bettingMetrics?: {
    totalBets: number;
    winRate: number;
    roi: number;
    totalStaked: number;
    totalReturns: number;
    netProfit: number;
    avgOdds: number;
    edgeAccuracy: number;
  };
  
  // Trend indicators
  performanceTrend: 'Improving' | 'Stable' | 'Declining';
  alertsTriggered: string[];
}

interface ModelChangeLog {
  changeId: string;
  timestamp: string;
  changeType: 'Parameter_Adjustment' | 'Component_Update' | 'Algorithm_Change' | 'Data_Update';
  
  changes: {
    parameter: string;
    component: string;
    oldValue: any;
    newValue: any;
    rationale: string;
  }[];
  
  trigger: 'Manual' | 'Automated_Refinement' | 'Validation_Results' | 'Performance_Alert';
  approvedBy: string;
  implementedBy: string;
  
  // Impact tracking
  preChangeMetrics: {
    mae: number;
    accuracy: number;
    sampleSize: number;
  };
  postChangeMetrics?: {
    mae: number;
    accuracy: number;
    sampleSize: number;
    evaluationPeriod: string;
  };
  
  status: 'Pending' | 'Implemented' | 'Testing' | 'Successful' | 'Rolled_Back';
  rollbackReason?: string;
}

interface DataQualityReport {
  reportId: string;
  timestamp: string;
  
  dataCompleteness: {
    weatherData: number; // % complete
    pitcherData: number;
    venueData: number;
    marketData: number;
  };
  
  dataFreshness: {
    lastWeatherUpdate: string;
    lastMarketUpdate: string;
    lastResultUpdate: string;
  };
  
  anomaliesDetected: {
    type: string;
    description: string;
    severity: 'Low' | 'Medium' | 'High';
    affectedGames: number;
  }[];
  
  dataDriftIndicators: {
    feature: string;
    driftScore: number;
    threshold: number;
    driftDetected: boolean;
  }[];
}

interface AlertConfig {
  alertType: string;
  threshold: number;
  enabled: boolean;
  recipients: string[];
  cooldownMinutes: number;
  lastTriggered?: string;
}

class ComprehensiveLoggingSystem {
  private predictionLogs: PredictionLog[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private modelChanges: ModelChangeLog[] = [];
  private dataQualityReports: DataQualityReport[] = [];
  private alertConfigs: AlertConfig[] = [];
  
  private readonly logsDir = '/Users/davidloake/Downloads/mlb/logs';
  private readonly predictionsPath = path.join(this.logsDir, 'predictions.json');
  private readonly performancePath = path.join(this.logsDir, 'performance-history.json');
  private readonly changesPath = path.join(this.logsDir, 'model-changes.json');
  private readonly qualityPath = path.join(this.logsDir, 'data-quality.json');
  private readonly alertsPath = path.join(this.logsDir, 'alert-configs.json');
  
  constructor() {
    this.ensureLogsDirectory();
    this.loadAllLogs();
    this.initializeAlertConfigs();
  }
  
  /**
   * Log a new prediction with full context
   */
  logPrediction(predictionData: Omit<PredictionLog, 'predictionId' | 'timestamp' | 'validationStatus'>): string {
    const predictionLog: PredictionLog = {
      predictionId: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      validationStatus: 'Predicted',
      ...predictionData
    };
    
    this.predictionLogs.push(predictionLog);
    this.savePredictionLogs();
    
    console.log(`📝 Prediction logged: ${predictionLog.predictionId}`);
    console.log(`   Game: ${predictionLog.awayTeam} @ ${predictionLog.homeTeam}`);
    console.log(`   Prediction: ${predictionLog.ourPrediction.toFixed(1)} runs (${predictionLog.confidence}% confidence)`);
    console.log(`   Recommendation: ${predictionLog.recommendation}`);
    
    // Check for real-time alerts
    this.checkRealTimeAlerts(predictionLog);
    
    return predictionLog.predictionId;
  }
  
  /**
   * Update prediction with actual results
   */
  updatePredictionResult(predictionId: string, actualTotal: number, betOutcome?: 'Win' | 'Loss' | 'Push' | 'Not Bet'): void {
    const prediction = this.predictionLogs.find(p => p.predictionId === predictionId);
    
    if (!prediction) {
      console.error(`Prediction ${predictionId} not found`);
      return;
    }
    
    prediction.actualTotal = actualTotal;
    prediction.predictionError = Math.abs(actualTotal - prediction.ourPrediction);
    prediction.correct = prediction.predictionError <= 1.5;
    prediction.betOutcome = betOutcome || 'Not Bet';
    prediction.validationStatus = 'Validated';
    
    this.savePredictionLogs();
    
    console.log(`✅ Result updated: ${predictionId}`);
    console.log(`   Actual: ${actualTotal}, Error: ${prediction.predictionError.toFixed(1)}, Correct: ${prediction.correct}`);
    
    // Trigger performance recalculation
    this.updatePerformanceMetrics();
    
    // Check for performance alerts
    this.checkPerformanceAlerts();
  }
  
  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(days: number = 7): void {
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    const recentPredictions = this.predictionLogs.filter(p => 
      p.validationStatus === 'Validated' && new Date(p.timestamp) >= cutoffDate
    );
    
    if (recentPredictions.length === 0) {
      console.log('No validated predictions in the specified period');
      return;
    }
    
    console.log(`\n📊 PERFORMANCE REPORT (Last ${days} days)`);
    console.log(`========================================`);
    console.log(`Period: ${cutoffDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`);
    console.log(`Total Predictions: ${recentPredictions.length}`);
    
    // Overall metrics
    const mae = recentPredictions.reduce((sum, p) => sum + p.predictionError!, 0) / recentPredictions.length;
    const accuracy = (recentPredictions.filter(p => p.correct).length / recentPredictions.length) * 100;
    const avgConfidence = recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length;
    
    console.log(`\n🎯 OVERALL PERFORMANCE`);
    console.log(`=====================`);
    console.log(`Mean Absolute Error: ${mae.toFixed(2)} runs`);
    console.log(`Accuracy (±1.5 runs): ${accuracy.toFixed(1)}%`);
    console.log(`Average Confidence: ${avgConfidence.toFixed(1)}%`);
    
    // Venue breakdown
    const venueGroups = this.groupPredictionsBy(recentPredictions, 'venue');
    console.log(`\n🏟️ VENUE PERFORMANCE`);
    console.log(`==================`);
    Object.entries(venueGroups).forEach(([venue, predictions]) => {
      if (predictions.length >= 3) {
        const venueMae = predictions.reduce((sum, p) => sum + p.predictionError!, 0) / predictions.length;
        const venueAccuracy = (predictions.filter(p => p.correct).length / predictions.length) * 100;
        console.log(`${venue}: MAE ${venueMae.toFixed(2)}, Accuracy ${venueAccuracy.toFixed(1)}% (${predictions.length} games)`);
      }
    });
    
    // Recent trend
    console.log(`\n📈 RECENT TREND`);
    console.log(`==============`);
    const trend = this.calculatePerformanceTrend(recentPredictions);
    console.log(`Performance Trend: ${trend}`);
  }
  
  /**
   * Monitor data quality and log issues
   */
  generateDataQualityReport(): DataQualityReport {
    const report: DataQualityReport = {
      reportId: `quality_${Date.now()}`,
      timestamp: new Date().toISOString(),
      dataCompleteness: this.calculateDataCompleteness(),
      dataFreshness: this.calculateDataFreshness(),
      anomaliesDetected: this.detectAnomalies(),
      dataDriftIndicators: this.calculateDataDrift()
    };
    
    this.dataQualityReports.push(report);
    this.saveDataQualityReports();
    
    // Display quality report
    console.log(`\n🔍 DATA QUALITY REPORT`);
    console.log(`=====================`);
    console.log(`Report ID: ${report.reportId}`);
    
    console.log(`\nData Completeness:`);
    Object.entries(report.dataCompleteness).forEach(([type, completeness]) => {
      const status = completeness >= 95 ? '✅' : completeness >= 80 ? '⚠️' : '❌';
      console.log(`  ${status} ${type}: ${completeness.toFixed(1)}%`);
    });
    
    if (report.anomaliesDetected.length > 0) {
      console.log(`\nAnomalies Detected:`);
      report.anomaliesDetected.forEach(anomaly => {
        const icon = anomaly.severity === 'High' ? '🚨' : anomaly.severity === 'Medium' ? '⚠️' : '💡';
        console.log(`  ${icon} ${anomaly.type}: ${anomaly.description} (${anomaly.affectedGames} games)`);
      });
    }
    
    return report;
  }
  
  /**
   * Calculate and log performance metrics
   */
  private updatePerformanceMetrics(): void {
    const now = new Date();
    const timeframes = [
      { name: 'daily', days: 1 },
      { name: 'weekly', days: 7 },
      { name: 'monthly', days: 30 }
    ];
    
    timeframes.forEach(timeframe => {
      const cutoffDate = new Date(now.getTime() - (timeframe.days * 24 * 60 * 60 * 1000));
      
      const recentPredictions = this.predictionLogs.filter(p => 
        p.validationStatus === 'Validated' && new Date(p.timestamp) >= cutoffDate
      );
      
      if (recentPredictions.length < 5) return; // Need minimum predictions
      
      const metrics = this.calculatePerformanceMetrics(recentPredictions, timeframe.name);
      
      // Remove old metric for same timeframe
      this.performanceHistory = this.performanceHistory.filter(m => 
        !(m.timeframe === timeframe.name && 
          new Date(m.timestamp).toDateString() === now.toDateString())
      );
      
      this.performanceHistory.push(metrics);
    });
    
    this.savePerformanceHistory();
  }
  
  // Helper methods
  private groupPredictionsBy(predictions: PredictionLog[], field: keyof PredictionLog): { [key: string]: PredictionLog[] } {
    const groups: { [key: string]: PredictionLog[] } = {};
    
    predictions.forEach(prediction => {
      const key = String(prediction[field]);
      if (!groups[key]) groups[key] = [];
      groups[key].push(prediction);
    });
    
    return groups;
  }
  
  private calculatePerformanceMetrics(predictions: PredictionLog[], timeframe: string): PerformanceMetrics {
    const mae = predictions.reduce((sum, p) => sum + p.predictionError!, 0) / predictions.length;
    const accuracy = (predictions.filter(p => p.correct).length / predictions.length) * 100;
    
    // Calculate more metrics...
    const actualMean = predictions.reduce((sum, p) => sum + p.actualTotal!, 0) / predictions.length;
    const totalSumSquares = predictions.reduce((sum, p) => sum + Math.pow(p.actualTotal! - actualMean, 2), 0);
    const residualSumSquares = predictions.reduce((sum, p) => sum + Math.pow(p.actualTotal! - p.ourPrediction, 2), 0);
    const r2Score = 1 - (residualSumSquares / totalSumSquares);
    
    const predictionMean = predictions.reduce((sum, p) => sum + p.ourPrediction, 0) / predictions.length;
    const bias = predictionMean - actualMean;
    
    // Direction accuracy
    const correctDirections = predictions.filter(p => {
      const predictedOver = p.ourPrediction > 8.5;
      const actualOver = p.actualTotal! > 8.5;
      return predictedOver === actualOver;
    }).length;
    const directionAccuracy = (correctDirections / predictions.length) * 100;
    
    return {
      timestamp: new Date().toISOString(),
      timeframe,
      totalPredictions: predictions.length,
      meanAbsoluteError: mae,
      accuracy,
      directionAccuracy,
      r2Score: Math.max(0, r2Score),
      bias,
      venuePerformance: {},
      weatherPerformance: {},
      teamPerformance: {},
      confidenceCalibration: {},
      performanceTrend: this.calculatePerformanceTrend(predictions),
      alertsTriggered: []
    };
  }
  
  private calculatePerformanceTrend(predictions: PredictionLog[]): 'Improving' | 'Stable' | 'Declining' {
    if (predictions.length < 10) return 'Stable';
    
    const half = Math.floor(predictions.length / 2);
    const firstHalf = predictions.slice(0, half);
    const secondHalf = predictions.slice(half);
    
    const firstMAE = firstHalf.reduce((sum, p) => sum + p.predictionError!, 0) / firstHalf.length;
    const secondMAE = secondHalf.reduce((sum, p) => sum + p.predictionError!, 0) / secondHalf.length;
    
    const improvement = firstMAE - secondMAE;
    
    if (improvement > 0.3) return 'Improving';
    if (improvement < -0.3) return 'Declining';
    return 'Stable';
  }
  
  private calculateDataCompleteness(): { weatherData: number; pitcherData: number; venueData: number; marketData: number } {
    const recent = this.predictionLogs.slice(-50); // Last 50 predictions
    
    if (recent.length === 0) {
      return { weatherData: 0, pitcherData: 0, venueData: 0, marketData: 0 };
    }
    
    const weatherComplete = recent.filter(p => p.weather.temp_f > 0).length;
    const pitcherComplete = recent.filter(p => p.componentBreakdown.pitching !== 0).length;
    const venueComplete = recent.filter(p => p.venue && p.venue.length > 0).length;
    const marketComplete = recent.filter(p => p.sportsBookLine && p.sportsBookLine > 0).length;
    
    return {
      weatherData: (weatherComplete / recent.length) * 100,
      pitcherData: (pitcherComplete / recent.length) * 100,
      venueData: (venueComplete / recent.length) * 100,
      marketData: (marketComplete / recent.length) * 100
    };
  }
  
  private calculateDataFreshness(): { lastWeatherUpdate: string; lastMarketUpdate: string; lastResultUpdate: string } {
    const recent = this.predictionLogs.slice(-10);
    
    return {
      lastWeatherUpdate: recent.length > 0 ? recent[recent.length - 1].timestamp : 'Never',
      lastMarketUpdate: recent.find(p => p.sportsBookLine)?.timestamp || 'Never',
      lastResultUpdate: recent.find(p => p.actualTotal !== undefined)?.timestamp || 'Never'
    };
  }
  
  private detectAnomalies(): any[] {
    const anomalies: any[] = [];
    const recent = this.predictionLogs.slice(-20);
    
    if (recent.length === 0) return anomalies;
    
    // Check for extreme predictions
    const extremePredictions = recent.filter(p => p.ourPrediction > 15 || p.ourPrediction < 3);
    if (extremePredictions.length > 0) {
      anomalies.push({
        type: 'Extreme Predictions',
        description: `${extremePredictions.length} predictions outside normal range (3-15 runs)`,
        severity: 'Medium' as const,
        affectedGames: extremePredictions.length
      });
    }
    
    return anomalies;
  }
  
  private calculateDataDrift(): any[] {
    const recent = this.predictionLogs.slice(-30);
    const older = this.predictionLogs.slice(-60, -30);
    
    if (recent.length < 10 || older.length < 10) return [];
    
    const driftIndicators: any[] = [];
    
    // Temperature drift
    const recentAvgTemp = recent.reduce((sum, p) => sum + p.weather.temp_f, 0) / recent.length;
    const olderAvgTemp = older.reduce((sum, p) => sum + p.weather.temp_f, 0) / older.length;
    const tempDrift = Math.abs(recentAvgTemp - olderAvgTemp) / 10; // Normalize
    
    driftIndicators.push({
      feature: 'Temperature',
      driftScore: tempDrift,
      threshold: 0.5,
      driftDetected: tempDrift > 0.5
    });
    
    return driftIndicators;
  }
  
  private initializeAlertConfigs(): void {
    if (this.alertConfigs.length === 0) {
      this.alertConfigs = [
        {
          alertType: 'High_Error_Rate',
          threshold: 3.0, // MAE threshold
          enabled: true,
          recipients: ['model-alerts@mlb-predictions.com'],
          cooldownMinutes: 60
        },
        {
          alertType: 'Low_Accuracy',
          threshold: 35.0, // Accuracy threshold
          enabled: true,
          recipients: ['model-alerts@mlb-predictions.com'],
          cooldownMinutes: 120
        }
      ];
      this.saveAlertConfigs();
    }
  }
  
  private checkRealTimeAlerts(prediction: PredictionLog): void {
    // Check for extreme predictions
    if (prediction.ourPrediction > 15 || prediction.ourPrediction < 3) {
      console.log(`🚨 ALERT: Extreme prediction ${prediction.ourPrediction.toFixed(1)} runs`);
    }
  }
  
  private checkPerformanceAlerts(): void {
    const recentPredictions = this.predictionLogs
      .filter(p => p.validationStatus === 'Validated')
      .slice(-20); // Last 20 predictions
    
    if (recentPredictions.length < 10) return;
    
    const mae = recentPredictions.reduce((sum, p) => sum + p.predictionError!, 0) / recentPredictions.length;
    const accuracy = (recentPredictions.filter(p => p.correct).length / recentPredictions.length) * 100;
    
    if (mae > 3.0) {
      console.log(`🚨 ALERT: High error rate detected: MAE ${mae.toFixed(2)}`);
    }
    
    if (accuracy < 35.0) {
      console.log(`🚨 ALERT: Low accuracy detected: ${accuracy.toFixed(1)}%`);
    }
  }
  
  // File I/O methods
  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }
  
  private loadAllLogs(): void {
    this.loadPredictionLogs();
    this.loadPerformanceHistory();
    this.loadModelChanges();
    this.loadDataQualityReports();
    this.loadAlertConfigs();
  }
  
  private loadPredictionLogs(): void {
    try {
      if (fs.existsSync(this.predictionsPath)) {
        const data = fs.readFileSync(this.predictionsPath, 'utf8');
        this.predictionLogs = JSON.parse(data);
      }
    } catch (error) {
      console.log('Starting with empty prediction logs');
      this.predictionLogs = [];
    }
  }
  
  private savePredictionLogs(): void {
    try {
      fs.writeFileSync(this.predictionsPath, JSON.stringify(this.predictionLogs, null, 2));
    } catch (error) {
      console.error('Failed to save prediction logs:', error);
    }
  }
  
  private loadPerformanceHistory(): void {
    try {
      if (fs.existsSync(this.performancePath)) {
        const data = fs.readFileSync(this.performancePath, 'utf8');
        this.performanceHistory = JSON.parse(data);
      }
    } catch (error) {
      console.log('Starting with empty performance history');
      this.performanceHistory = [];
    }
  }
  
  private savePerformanceHistory(): void {
    try {
      fs.writeFileSync(this.performancePath, JSON.stringify(this.performanceHistory, null, 2));
    } catch (error) {
      console.error('Failed to save performance history:', error);
    }
  }
  
  private loadModelChanges(): void {
    try {
      if (fs.existsSync(this.changesPath)) {
        const data = fs.readFileSync(this.changesPath, 'utf8');
        this.modelChanges = JSON.parse(data);
      }
    } catch (error) {
      console.log('Starting with empty model changes');
      this.modelChanges = [];
    }
  }
  
  private saveModelChanges(): void {
    try {
      fs.writeFileSync(this.changesPath, JSON.stringify(this.modelChanges, null, 2));
    } catch (error) {
      console.error('Failed to save model changes:', error);
    }
  }
  
  private loadDataQualityReports(): void {
    try {
      if (fs.existsSync(this.qualityPath)) {
        const data = fs.readFileSync(this.qualityPath, 'utf8');
        this.dataQualityReports = JSON.parse(data);
      }
    } catch (error) {
      console.log('Starting with empty data quality reports');
      this.dataQualityReports = [];
    }
  }
  
  private saveDataQualityReports(): void {
    try {
      fs.writeFileSync(this.qualityPath, JSON.stringify(this.dataQualityReports, null, 2));
    } catch (error) {
      console.error('Failed to save data quality reports:', error);
    }
  }
  
  private loadAlertConfigs(): void {
    try {
      if (fs.existsSync(this.alertsPath)) {
        const data = fs.readFileSync(this.alertsPath, 'utf8');
        this.alertConfigs = JSON.parse(data);
      }
    } catch (error) {
      console.log('Starting with default alert configs');
      this.alertConfigs = [];
    }
  }
  
  private saveAlertConfigs(): void {
    try {
      fs.writeFileSync(this.alertsPath, JSON.stringify(this.alertConfigs, null, 2));
    } catch (error) {
      console.error('Failed to save alert configs:', error);
    }
  }
}

export { 
  ComprehensiveLoggingSystem, 
  PredictionLog, 
  PerformanceMetrics, 
  ModelChangeLog, 
  DataQualityReport, 
  AlertConfig 
};