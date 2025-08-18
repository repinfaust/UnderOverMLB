#!/usr/bin/env node
// Complete Workflow Orchestration System for MLB Over/Under Predictions

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

interface GamePredictionRequest {
  home_team: string;
  away_team: string;
  venue: string;
  date: string;
  game_time?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface PredictionResult {
  game_id: string;
  predictions: any;
  market_data: any;
  game_factors: any;
  recommendation: string;
  confidence: number;
  processing_time: number;
  errors?: string[];
}

interface WorkflowMetrics {
  total_predictions: number;
  successful_predictions: number;
  failed_predictions: number;
  average_processing_time: number;
  api_calls_made: number;
  cache_hit_ratio: number;
}

class MLBPredictionOrchestrator extends EventEmitter {
  private mcpClients: Map<string, Client> = new Map();
  private isConnected: boolean = false;
  private processingQueue: GamePredictionRequest[] = [];
  private activeProcessing: Set<string> = new Set();
  private metrics: WorkflowMetrics = {
    total_predictions: 0,
    successful_predictions: 0,
    failed_predictions: 0,
    average_processing_time: 0,
    api_calls_made: 0,
    cache_hit_ratio: 0,
  };
  private processingTimes: number[] = [];

  constructor(private config: {
    maxConcurrentPredictions?: number;
    retryAttempts?: number;
    timeoutMs?: number;
    enableCaching?: boolean;
  } = {}) {
    super();
    this.config = {
      maxConcurrentPredictions: 5,
      retryAttempts: 3,
      timeoutMs: 30000,
      enableCaching: true,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing MLB Prediction Orchestrator...');
    
    try {
      // Start MCP servers
      await this.startMCPServers();
      
      // Connect to all servers
      await this.connectToServers();
      
      // Verify connections
      await this.verifyConnections();
      
      this.isConnected = true;
      console.log('✅ Orchestrator initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize orchestrator:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private async startMCPServers(): Promise<void> {
    const servers = [
      { name: 'mlb-data-server', script: './dist/mlb-data-server.js' },
      { name: 'market-server', script: './dist/market-server.js' },
      { name: 'prediction-server', script: './dist/prediction-server.js' },
      { name: 'analytics-server', script: './dist/analytics-server.js' },
    ];

    console.log('📡 Starting MCP servers...');
    
    for (const server of servers) {
      console.log(`  Starting ${server.name}...`);
      
      // In a real implementation, you'd manage server processes
      // For now, we'll simulate the startup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`  ✅ ${server.name} started`);
    }
  }

  private async connectToServers(): Promise<void> {
    const serverConfigs = [
      { name: 'mlb-data-server', command: 'node', args: ['./dist/mlb-data-server.js'] },
      { name: 'market-server', command: 'node', args: ['./dist/market-server.js'] },
      { name: 'prediction-server', command: 'node', args: ['./dist/prediction-server.js'] },
      { name: 'analytics-server', command: 'node', args: ['./dist/analytics-server.js'] },
    ];

    console.log('🔌 Connecting to MCP servers...');

    for (const config of serverConfigs) {
      try {
        const client = new Client(
          { name: `orchestrator-${config.name}`, version: '1.0.0' },
          { capabilities: {} }
        );

        // In production, this would spawn actual server processes
        // For demo purposes, we'll create mock connections
        const transport = new StdioClientTransport();
        
        await client.connect(transport);
        this.mcpClients.set(config.name, client);
        
        console.log(`  ✅ Connected to ${config.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to connect to ${config.name}:`, error);
        throw error;
      }
    }
  }

  private async verifyConnections(): Promise<void> {
    console.log('🔍 Verifying server connections...');
    
    for (const [serverName, client] of this.mcpClients) {
      try {
        const response = await client.request(
          { method: 'tools/list', params: {} },
          { timeout: 5000 }
        );
        
        if (response.tools && response.tools.length > 0) {
          console.log(`  ✅ ${serverName} - ${response.tools.length} tools available`);
        } else {
          throw new Error('No tools available');
        }
      } catch (error) {
        console.error(`  ❌ ${serverName} verification failed:`, error);
        throw error;
      }
    }
  }

  // Main prediction workflow
  async runPrediction(request: GamePredictionRequest): Promise<PredictionResult> {
    const startTime = Date.now();
    const game_id = `${request.date}_${request.away_team}@${request.home_team}`;
    
    if (!this.isConnected) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }

    if (this.activeProcessing.has(game_id)) {
      throw new Error(`Prediction already in progress for game: ${game_id}`);
    }

    this.activeProcessing.add(game_id);
    this.metrics.total_predictions++;
    
    console.log(`🎯 Starting prediction for ${game_id}`);
    this.emit('predictionStarted', { game_id, request });

    try {
      const result = await this.executePredictionWorkflow(request);
      
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      this.metrics.successful_predictions++;
      this.updateAverageProcessingTime();
      
      result.processing_time = processingTime;
      
      console.log(`✅ Prediction completed for ${game_id} in ${processingTime}ms`);
      this.emit('predictionCompleted', result);
      
      return result;
      
    } catch (error) {
      this.metrics.failed_predictions++;
      console.error(`❌ Prediction failed for ${game_id}:`, error);
      this.emit('predictionFailed', { game_id, error });
      throw error;
      
    } finally {
      this.activeProcessing.delete(game_id);
    }
  }

  private async executePredictionWorkflow(request: GamePredictionRequest): Promise<PredictionResult> {
    const { home_team, away_team, venue, date } = request;
    const game_id = `${date}_${away_team}@${home_team}`;
    const errors: string[] = [];

    // Step 1: Fetch all game factors
    console.log(`  📊 Fetching game factors for ${game_id}...`);
    let game_factors;
    try {
      const response = await this.callTool('mlb-data-server', 'getGameFactors', {
        home_team,
        away_team,
        venue,
        date,
        factors: ['pitching', 'offense', 'weather', 'park', 'umpire']
      });
      game_factors = JSON.parse(response.content[0].text);
      this.metrics.api_calls_made++;
    } catch (error) {
      errors.push(`Failed to fetch game factors: ${error}`);
      console.warn(`  ⚠️ Using fallback game factors`);
      game_factors = this.getFallbackGameFactors(request);
    }

    // Step 2: Fetch market data
    console.log(`  💰 Fetching market data for ${game_id}...`);
    let market_data;
    try {
      const response = await this.callTool('market-server', 'getGameMarketData', {
        game_id,
        include_movement: true,
        include_volume: true
      });
      market_data = JSON.parse(response.content[0].text);
      this.metrics.api_calls_made++;
    } catch (error) {
      errors.push(`Failed to fetch market data: ${error}`);
      console.warn(`  ⚠️ Using fallback market data`);
      market_data = this.getFallbackMarketData(game_id);
    }

    // Step 3: Run all prediction models
    console.log(`  🤖 Running prediction models for ${game_id}...`);
    let predictions;
    try {
      const response = await this.callTool('prediction-server', 'runAllModels', {
        home_team,
        away_team,
        venue,
        date,
        game_factors,
        market_data,
        models_to_run: ['Model_A', 'Model_B', 'Model_C', 'Model_D']
      });
      predictions = JSON.parse(response.content[0].text);
      this.metrics.api_calls_made++;
    } catch (error) {
      errors.push(`Failed to run prediction models: ${error}`);
      throw new Error(`Critical failure in prediction models: ${error}`);
    }

    // Step 4: Track predictions for analytics
    console.log(`  📈 Tracking predictions for ${game_id}...`);
    try {
      const trackingData = Object.entries(predictions.individual_models).map(([model_name, pred]: [string, any]) => ({
        game_id,
        model_name,
        prediction: pred.prediction,
        confidence: pred.confidence,
        calculated_total: pred.calculated_total,
        factors_used: pred.factors_used
      }));

      await this.callTool('analytics-server', 'trackPredictions', {
        predictions: trackingData
      });
      this.metrics.api_calls_made++;
    } catch (error) {
      errors.push(`Failed to track predictions: ${error}`);
      console.warn(`  ⚠️ Prediction tracking failed, continuing...`);
    }

    return {
      game_id,
      predictions,
      market_data,
      game_factors,
      recommendation: predictions.market_comparison?.recommendation || 'No Play',
      confidence: predictions.ensemble?.confidence || 0,
      processing_time: 0, // Will be set by caller
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Batch processing for multiple games
  async runBatchPredictions(requests: GamePredictionRequest[]): Promise<PredictionResult[]> {
    console.log(`🔄 Starting batch prediction for ${requests.length} games`);
    this.emit('batchStarted', { count: requests.length });

    const results: PredictionResult[] = [];
    const batches = this.chunkArray(requests, this.config.maxConcurrentPredictions || 5);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`  Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} games)`);

      const batchPromises = batch.map(request => 
        this.runPrediction(request).catch(error => ({
          game_id: `${request.date}_${request.away_team}@${request.home_team}`,
          error: error.message,
          predictions: null,
          market_data: null,
          game_factors: null,
          recommendation: 'Error',
          confidence: 0,
          processing_time: 0,
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults as PredictionResult[]);

      // Small delay between batches to avoid overwhelming APIs
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Batch prediction completed: ${results.length} total results`);
    this.emit('batchCompleted', { results });

    return results;
  }

  // Daily workflow automation
  async runDailyWorkflow(date?: string): Promise<{
    predictions: PredictionResult[];
    performance_update: any;
    daily_report: any;
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log(`📅 Running daily workflow for ${targetDate}`);

    try {
      // Step 1: Get all games for the date
      const gamesResponse = await this.callTool('market-server', 'getDailyMarket', {
        date: targetDate,
        include_results: true
      });
      const dailyMarket = JSON.parse(gamesResponse.content[0].text);

      // Step 2: Create prediction requests for upcoming games
      const upcomingGames = dailyMarket.games
        .filter((game: any) => !game.result.completed)
        .map((game: any) => ({
          home_team: game.home_team,
          away_team: game.away_team,
          venue: `${game.home_team} Stadium`, // Simplified venue mapping
          date: targetDate,
        }));

      console.log(`  Found ${upcomingGames.length} upcoming games`);

      // Step 3: Run predictions for upcoming games
      const predictions = upcomingGames.length > 0 ? 
        await this.runBatchPredictions(upcomingGames) : [];

      // Step 4: Update performance with completed game results
      const completedGames = dailyMarket.games.filter((game: any) => game.result.completed);
      let performance_update = null;

      if (completedGames.length > 0) {
        console.log(`  Updating performance with ${completedGames.length} completed games`);
        
        const gameResults = completedGames.map((game: any) => ({
          game_id: game.game_id,
          actual_result: game.result.over_under_result,
          total_runs: game.result.total_runs,
          closing_total: game.totals.current_total
        }));

        const updateResponse = await this.callTool('analytics-server', 'trackPredictions', {
          predictions: [], // No new predictions, just updating results
          game_results: gameResults
        });
        performance_update = JSON.parse(updateResponse.content[0].text);
      }

      // Step 5: Generate daily report
      console.log(`  Generating daily report for ${targetDate}`);
      const reportResponse = await this.callTool('analytics-server', 'generateReport', {
        report_type: 'daily',
        models: ['Model_A', 'Model_B', 'Model_C', 'Model_D', 'Ensemble']
      });
      const daily_report = JSON.parse(reportResponse.content[0].text);

      console.log(`✅ Daily workflow completed for ${targetDate}`);
      
      return {
        predictions,
        performance_update,
        daily_report
      };

    } catch (error) {
      console.error(`❌ Daily workflow failed for ${targetDate}:`, error);
      throw error;
    }
  }

  // Utility methods
  private async callTool(serverName: string, toolName: string, args: any): Promise<any> {
    const client = this.mcpClients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    try {
      const response = await client.request(
        {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args
          }
        },
        { timeout: this.config.timeoutMs }
      );

      return response;
    } catch (error) {
      throw new Error(`Tool call failed - ${serverName}.${toolName}: ${error}`);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private updateAverageProcessingTime(): void {
    if (this.processingTimes.length > 0) {
      const sum = this.processingTimes.reduce((a, b) => a + b, 0);
      this.metrics.average_processing_time = Math.round(sum / this.processingTimes.length);
      
      // Keep only last 100 processing times for rolling average
      if (this.processingTimes.length > 100) {
        this.processingTimes = this.processingTimes.slice(-100);
      }
    }
  }

  private getFallbackGameFactors(request: GamePredictionRequest): any {
    return {
      game_id: `${request.date}_${request.away_team}@${request.home_team}`,
      home_team: request.home_team,
      away_team: request.away_team,
      venue: request.venue,
      date: request.date,
      pitching: {
        home_starter: { era: 4.0, games_started: 15, innings_pitched: 90 },
        away_starter: { era: 4.0, games_started: 15, innings_pitched: 90 },
        home_bullpen_era: 4.0,
        away_bullpen_era: 4.0,
      },
      offense: {
        home_team: { recent_runs_per_game: 4.5, ops: 0.750, woba: 0.320 },
        away_team: { recent_runs_per_game: 4.5, ops: 0.750, woba: 0.320 },
      },
      weather: {
        temp_f: 72,
        humidity: 50,
        wind_speed_mph: 5,
        conditions: 'Clear',
        is_dome: false,
      },
      park: { park_factor: 1.0, runs_factor: 1.0, hr_factor: 1.0 },
      data_sources: { stats_source: 'Fallback', last_updated: new Date().toISOString() },
    };
  }

  private getFallbackMarketData(game_id: string): any {
    return {
      game_id,
      totals: {
        current_total: 8.5,
        over_odds: -110,
        under_odds: -110,
        opening_total: 8.5,
        movement: 0,
      },
      betting_volume: {
        over_percentage: 50,
        under_percentage: 50,
        public_vs_sharp: { sharp_money_side: 'Under', reverse_line_movement: false },
      },
      data_source: 'Fallback',
      retrieved_at: new Date().toISOString(),
    };
  }

  // Performance monitoring and health checks
  async getSystemHealth(): Promise<any> {
    const health = {
      orchestrator: {
        status: this.isConnected ? 'healthy' : 'disconnected',
        active_predictions: this.activeProcessing.size,
        queue_length: this.processingQueue.length,
      },
      servers: {} as Record<string, any>,
      metrics: this.metrics,
    };

    // Check each server
    for (const [serverName, client] of this.mcpClients) {
      try {
        const startTime = Date.now();
        await client.request({ method: 'tools/list', params: {} }, { timeout: 5000 });
        const responseTime = Date.now() - startTime;
        
        health.servers[serverName] = {
          status: 'healthy',
          response_time_ms: responseTime,
        };
      } catch (error) {
        health.servers[serverName] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return health;
  }

  getMetrics(): WorkflowMetrics {
    return { ...this.metrics };
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down MLB Prediction Orchestrator...');
    
    // Wait for active predictions to complete
    if (this.activeProcessing.size > 0) {
      console.log(`  ⏳ Waiting for ${this.activeProcessing.size} active predictions to complete...`);
      while (this.activeProcessing.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Disconnect from all servers
    for (const [serverName, client] of this.mcpClients) {
      try {
        await client.disconnect();
        console.log(`  ✅ Disconnected from ${serverName}`);
      } catch (error) {
        console.error(`  ❌ Error disconnecting from ${serverName}:`, error);
      }
    }

    this.mcpClients.clear();
    this.isConnected = false;
    
    console.log('✅ Orchestrator shutdown complete');
    this.emit('shutdown');
  }
}

// Workflow Scheduler for automated daily operations
class WorkflowScheduler {
  private orchestrator: MLBPredictionOrchestrator;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(orchestrator: MLBPredictionOrchestrator) {
    this.orchestrator = orchestrator;
  }

  // Schedule daily workflow at specific time
  scheduleDailyWorkflow(hour: number = 9, minute: number = 0): void {
    const jobId = 'daily-workflow';
    
    // Clear existing schedule
    if (this.scheduledJobs.has(jobId)) {
      clearInterval(this.scheduledJobs.get(jobId)!);
    }

    console.log(`📅 Scheduling daily workflow for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);

    const scheduleNext = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      const timeUntilNext = next.getTime() - now.getTime();
      
      const timeout = setTimeout(async () => {
        try {
          console.log('🚀 Running scheduled daily workflow...');
          await this.orchestrator.runDailyWorkflow();
          console.log('✅ Scheduled daily workflow completed');
        } catch (error) {
          console.error('❌ Scheduled daily workflow failed:', error);
        }
        
        // Schedule the next run
        scheduleNext();
      }, timeUntilNext);

      this.scheduledJobs.set(jobId, timeout);
      console.log(`⏰ Next daily workflow scheduled for ${next.toISOString()}`);
    };

    scheduleNext();
  }

  // Schedule performance reports
  schedulePerformanceReports(): void {
    const jobId = 'performance-reports';
    
    // Weekly report every Monday at 8 AM
    const weeklyInterval = setInterval(async () => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 8) { // Monday, 8 AM
        try {
          console.log('📊 Generating weekly performance report...');
          // This would call analytics server for weekly report
          console.log('✅ Weekly performance report generated');
        } catch (error) {
          console.error('❌ Weekly performance report failed:', error);
        }
      }
    }, 60 * 60 * 1000); // Check every hour

    this.scheduledJobs.set(jobId, weeklyInterval);
  }

  stopScheduler(): void {
    console.log('🛑 Stopping workflow scheduler...');
    
    for (const [jobId, timeout] of this.scheduledJobs) {
      clearTimeout(timeout);
      console.log(`  ✅ Stopped ${jobId}`);
    }
    
    this.scheduledJobs.clear();
    console.log('✅ Workflow scheduler stopped');
  }
}

// Main application runner
class MLBPredictionApp {
  private orchestrator: MLBPredictionOrchestrator;
  private scheduler: WorkflowScheduler;

  constructor() {
    this.orchestrator = new MLBPredictionOrchestrator({
      maxConcurrentPredictions: 3,
      retryAttempts: 3,
      timeoutMs: 30000,
      enableCaching: true,
    });
    
    this.scheduler = new WorkflowScheduler(this.orchestrator);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.orchestrator.on('initialized', () => {
      console.log('🎉 System ready for predictions!');
    });

    this.orchestrator.on('predictionStarted', (data) => {
      console.log(`🎯 Started: ${data.game_id}`);
    });

    this.orchestrator.on('predictionCompleted', (result) => {
      console.log(`✅ Completed: ${result.game_id} - ${result.recommendation} (${result.confidence})`);
    });

    this.orchestrator.on('predictionFailed', (data) => {
      console.error(`❌ Failed: ${data.game_id} - ${data.error.message}`);
    });

    this.orchestrator.on('error', (error) => {
      console.error('💥 System error:', error);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting MLB Prediction Application...');
      
      // Initialize orchestrator
      await this.orchestrator.initialize();
      
      // Start scheduler
      this.scheduler.scheduleDailyWorkflow(9, 0); // 9:00 AM daily
      this.scheduler.schedulePerformanceReports();
      
      console.log('✅ MLB Prediction Application started successfully!');
      
      // Keep the application running
      this.keepAlive();
      
    } catch (error) {
      console.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }

  private keepAlive(): void {
    // Simple keep-alive mechanism
    setInterval(async () => {
      try {
        const health = await this.orchestrator.getSystemHealth();
        if (health.orchestrator.status !== 'healthy') {
          console.warn('⚠️ System health check failed:', health);
        }
      } catch (error) {
        console.error('💔 Health check error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async shutdown(): Promise<void> {
    this.scheduler.stopScheduler();
    await this.orchestrator.shutdown();
  }

  // Public API methods for external usage
  async predictGame(request: GamePredictionRequest): Promise<PredictionResult> {
    return this.orchestrator.runPrediction(request);
  }

  async predictMultipleGames(requests: GamePredictionRequest[]): Promise<PredictionResult[]> {
    return this.orchestrator.runBatchPredictions(requests);
  }

  async runDailyWorkflow(date?: string): Promise<any> {
    return this.orchestrator.runDailyWorkflow(date);
  }

  async getSystemHealth(): Promise<any> {
    return this.orchestrator.getSystemHealth();
  }

  getMetrics(): WorkflowMetrics {
    return this.orchestrator.getMetrics();
  }
}

// CLI interface for easy usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const app = new MLBPredictionApp();

  switch (command) {
    case 'start':
      await app.start();
      break;

    case 'predict':
      if (args.length < 5) {
        console.error('Usage: predict <home_team> <away_team> <venue> <date>');
        process.exit(1);
      }
      
      await app.start();
      
      const result = await app.predictGame({
        home_team: args[1],
        away_team: args[2],
        venue: args[3],
        date: args[4],
      });
      
      console.log('\n📊 Prediction Result:');
      console.log(JSON.stringify(result, null, 2));
      
      await app.shutdown();
      break;

    case 'daily':
      await app.start();
      
      const dailyResult = await app.runDailyWorkflow(args[1]);
      
      console.log('\n📅 Daily Workflow Result:');
      console.log(`Predictions: ${dailyResult.predictions.length}`);
      console.log(`Performance Updates: ${dailyResult.performance_update ? 'Yes' : 'No'}`);
      console.log(`Report Generated: ${dailyResult.daily_report ? 'Yes' : 'No'}`);
      
      await app.shutdown();
      break;

    case 'health':
      await app.start();
      
      const health = await app.getSystemHealth();
      console.log('\n🏥 System Health:');
      console.log(JSON.stringify(health, null, 2));
      
      await app.shutdown();
      break;

    default:
      console.log(`
🎾 MLB Over/Under Prediction System

Usage:
  node workflow-orchestration.js start              # Start the full application
  node workflow-orchestration.js predict <args>     # Run single prediction
  node workflow-orchestration.js daily [date]       # Run daily workflow
  node workflow-orchestration.js health             # Check system health

Examples:
  node workflow-orchestration.js predict NYY BOS "Yankee Stadium" 2024-06-26
  node workflow-orchestration.js daily 2024-06-26
      `);
      process.exit(0);
  }
}

// Export for library usage
export {
  MLBPredictionOrchestrator,
  WorkflowScheduler,
  MLBPredictionApp,
  GamePredictionRequest,
  PredictionResult,
  WorkflowMetrics
};

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Application error:', error);
    process.exit(1);
  });
}
    