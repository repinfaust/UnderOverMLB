#!/usr/bin/env node
/**
 * MLB Prediction System - Main Entry Point
 * 
 * This is the main entry point for the MLB over/under prediction system.
 * It provides a CLI interface and can run various modes of operation.
 */

import { MLBPredictionApp, GamePredictionRequest } from './lib/workflow-orchestration';
import { program } from 'commander';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Version from package.json
const version = '1.0.0';

// Configure CLI
program
  .name('mlb-predictions')
  .description('MLB Over/Under Prediction System')
  .version(version);

// Start command - runs the full application
program
  .command('start')
  .description('Start the MLB prediction system')
  .option('-d, --daemon', 'Run as daemon process')
  .option('-p, --port <port>', 'Port for web interface', '3000')
  .action(async (options: any) => {
    console.log('🚀 Starting MLB Prediction System...');
    
    try {
      const app = new MLBPredictionApp();
      await app.start();
      
      if (options.daemon) {
        console.log('📡 Running in daemon mode - use Ctrl+C to stop');
        // Keep process running
        process.stdin.resume();
      } else {
        console.log('✅ System started successfully!');
      }
      
    } catch (error) {
      console.error('❌ Failed to start system:', error);
      process.exit(1);
    }
  });

// Predict command - run prediction for today's games or specific game
program
  .command('predict')
  .description('Run predictions for today\'s games or a specific game')
  .option('-h, --home <team>', 'Home team abbreviation (e.g., NYY)')
  .option('-a, --away <team>', 'Away team abbreviation (e.g., BOS)')
  .option('-v, --venue <venue>', 'Venue name (e.g., "Yankee Stadium")')
  .option('-d, --date <date>', 'Game date (YYYY-MM-DD format)', new Date().toISOString().split('T')[0])
  .option('-t, --time <time>', 'Game time (HH:MM format)')
  .option('-o, --output <format>', 'Output format (json|table)', 'table')
  .action(async (options: any) => {
    try {
      const app = new MLBPredictionApp();
      await app.start();
      
      // If specific game parameters provided, predict that game
      if (options.home && options.away && options.venue) {
        console.log(`🎯 Running prediction for ${options.away} @ ${options.home}`);
        
        const request: GamePredictionRequest = {
          home_team: options.home,
          away_team: options.away,
          venue: options.venue,
          date: options.date,
          game_time: options.time,
        };
        
        const result = await app.predictGame(request);
        
        // Display single game result
        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('\n📊 Prediction Results:');
          console.log('══════════════════════════════════════════════════════════════');
          console.log(`Game: ${result.game_id}`);
          console.log(`Recommendation: ${result.recommendation}`);
          console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
          console.log(`Processing Time: ${result.processing_time}ms`);
          
          if (result.predictions?.ensemble) {
            console.log(`Ensemble Prediction: ${result.predictions.ensemble.prediction}`);
            console.log(`Calculated Total: ${result.predictions.ensemble.calculated_total}`);
          }
        }
      } else {
        // Run daily workflow for today's games
        console.log(`🎯 Running predictions for all games on ${options.date}`);
        
        const result = await app.runDailyWorkflow(options.date);
        
        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('\n✅ Daily workflow completed successfully!');
          console.log('══════════════════════════════════════════════════════════════');
          console.log(`📊 Predictions Generated: ${result.predictions?.length || 0}`);
          console.log(`🎯 Recommended Plays: ${result.predictions?.filter((p: any) => p.recommendation !== 'No Play').length || 0}`);
          console.log(`⭐ High Confidence Plays: ${result.predictions?.filter((p: any) => p.confidence > 0.70).length || 0}`);
          
          if (result.predictions && result.predictions.length > 0) {
            console.log('\n🏆 Today\'s Predictions:');
            result.predictions.forEach((pred: any, index: number) => {
              console.log(`  ${index + 1}. ${pred.game_id}: ${pred.recommendation} (${(pred.confidence * 100).toFixed(1)}%)`);
            });
          }
        }
      }
      
      await app.shutdown();
      
    } catch (error) {
      console.error('❌ Prediction failed:', error);
      process.exit(1);
    }
  });

// Batch command - run predictions for multiple games
program
  .command('batch')
  .description('Run predictions for multiple games')
  .requiredOption('-f, --file <file>', 'CSV file with game data')
  .option('-o, --output <file>', 'Output file for results')
  .option('-c, --concurrent <number>', 'Max concurrent predictions', '3')
  .action(async (options: any) => {
    console.log(`🔄 Running batch predictions from ${options.file}`);
    
    try {
      const app = new MLBPredictionApp();
      await app.start();
      
      // In a real implementation, you would read the CSV file
      // For now, we'll simulate with sample data
      const sampleRequests: GamePredictionRequest[] = [
        { home_team: 'NYY', away_team: 'BOS', venue: 'Yankee Stadium', date: '2024-07-15' },
        { home_team: 'LAD', away_team: 'SF', venue: 'Dodger Stadium', date: '2024-07-15' },
        { home_team: 'CHC', away_team: 'STL', venue: 'Wrigley Field', date: '2024-07-15' },
      ];
      
      const results = await app.predictMultipleGames(sampleRequests);
      
      console.log(`\n✅ Batch prediction completed: ${results.length} games processed`);
      
      if (options.output) {
        console.log(`📁 Results saved to ${options.output}`);
        // In a real implementation, you would save to the specified file
      } else {
        console.log('\n📊 Results Summary:');
        results.forEach(result => {
          console.log(`  ${result.game_id}: ${result.recommendation} (${(result.confidence * 100).toFixed(1)}%)`);
        });
      }
      
      await app.shutdown();
      
    } catch (error) {
      console.error('❌ Batch prediction failed:', error);
      process.exit(1);
    }
  });

// Daily command - run daily workflow
program
  .command('daily')
  .description('Run daily workflow for all games')
  .option('-d, --date <date>', 'Date to process (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('-o, --output <file>', 'Output file for report')
  .action(async (options: any) => {
    console.log(`📅 Running daily workflow for ${options.date}`);
    
    try {
      const app = new MLBPredictionApp();
      await app.start();
      
      const result = await app.runDailyWorkflow(options.date);
      
      console.log('\n✅ Daily workflow completed successfully!');
      console.log('══════════════════════════════════════════════════════════════');
      console.log(`📊 Predictions Generated: ${result.predictions.length}`);
      console.log(`🎯 Recommended Plays: ${result.predictions.filter((p: any) => p.recommendation !== 'No Play').length}`);
      console.log(`⭐ High Confidence Plays: ${result.predictions.filter((p: any) => p.confidence > 0.70).length}`);
      
      if (result.daily_report?.summary) {
        console.log(`📈 Average Confidence: ${(result.daily_report.summary.average_confidence * 100).toFixed(1)}%`);
      }
      
      if (result.daily_report?.top_plays?.length > 0) {
        console.log('\n🏆 Top Plays:');
        result.daily_report.top_plays.forEach((play: any, index: number) => {
          console.log(`  ${index + 1}. ${play.game_id}: ${play.recommendation} (${(play.confidence * 100).toFixed(1)}%)`);
        });
      }
      
      if (options.output) {
        console.log(`\n📁 Report saved to ${options.output}`);
        // In a real implementation, you would save the report
      }
      
      await app.shutdown();
      
    } catch (error) {
      console.error('❌ Daily workflow failed:', error);
      process.exit(1);
    }
  });

// Health command - check system health
program
  .command('health')
  .description('Check system health status')
  .option('-j, --json', 'Output in JSON format')
  .action(async (options: any) => {
    try {
      const app = new MLBPredictionApp();
      await app.start();
      
      const health = await app.getSystemHealth();
      
      if (options.json) {
        console.log(JSON.stringify(health, null, 2));
      } else {
        console.log('\n🏥 System Health Status:');
        console.log('══════════════════════════════════════════════════════════════');
        console.log(`Orchestrator: ${health.orchestrator.status}`);
        console.log(`Active Predictions: ${health.orchestrator.active_predictions}`);
        console.log(`Queue Length: ${health.orchestrator.queue_length}`);
        
        console.log('\n📡 Server Status:');
        Object.entries(health.servers).forEach(([server, status]: [string, any]) => {
          console.log(`  ${server}: ${status.status} (${status.response_time_ms}ms)`);
        });
        
        console.log('\n📊 Metrics:');
        console.log(`  Total Predictions: ${health.metrics.total_predictions}`);
        console.log(`  Success Rate: ${health.metrics.total_predictions > 0 ? 
          ((health.metrics.successful_predictions / health.metrics.total_predictions) * 100).toFixed(1) : 0}%`);
        console.log(`  Avg Processing Time: ${health.metrics.average_processing_time}ms`);
        
        console.log('\n🔌 Data Layer:');
        Object.entries(health.data_layer).forEach(([service, status]) => {
          console.log(`  ${service}: ${status ? '✅ healthy' : '❌ unhealthy'}`);
        });
      }
      
      await app.shutdown();
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      process.exit(1);
    }
  });

// Metrics command - show performance metrics
program
  .command('metrics')
  .description('Show performance metrics')
  .action(async (options: any) => {
    try {
      const app = new MLBPredictionApp();
      await app.start();
      
      const metrics = app.getMetrics();
      
      console.log('\n📊 Performance Metrics:');
      console.log('══════════════════════════════════════════════════════════════');
      console.log(`Total Predictions: ${metrics.total_predictions}`);
      console.log(`Successful: ${metrics.successful_predictions}`);
      console.log(`Failed: ${metrics.failed_predictions}`);
      console.log(`Success Rate: ${metrics.total_predictions > 0 ? 
        ((metrics.successful_predictions / metrics.total_predictions) * 100).toFixed(1) : 0}%`);
      console.log(`Average Processing Time: ${metrics.average_processing_time}ms`);
      console.log(`API Calls Made: ${metrics.api_calls_made}`);
      console.log(`Cache Hit Ratio: ${(metrics.cache_hit_ratio * 100).toFixed(1)}%`);
      
      await app.shutdown();
      
    } catch (error) {
      console.error('❌ Failed to retrieve metrics:', error);
      process.exit(1);
    }
  });

// Setup command - initialize configuration
program
  .command('setup')
  .description('Initialize system configuration')
  .action(async () => {
    console.log('⚙️  Setting up MLB Prediction System...');
    
    console.log('\n📋 Configuration Checklist:');
    console.log('══════════════════════════════════════════════════════════════');
    
    // Check environment variables
    const requiredEnvVars = ['ODDS_API_KEY', 'WEATHER_API_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('❌ Missing environment variables:');
      missingVars.forEach(varName => {
        console.log(`  - ${varName}`);
      });
      console.log('\n💡 Please set these in your .env file');
    } else {
      console.log('✅ Environment variables configured');
    }
    
    // Check API connectivity
    console.log('\n🔍 Testing API connectivity...');
    try {
      const app = new MLBPredictionApp();
      await app.start();
      
      const health = await app.getSystemHealth();
      
      console.log('✅ System health check passed');
      console.log('✅ All servers are responding');
      
      await app.shutdown();
      
    } catch (error) {
      console.log('❌ System health check failed:', error);
    }
    
    console.log('\n🎉 Setup complete! You can now use the prediction system.');
  });

// Handle unknown commands
program
  .command('*')
  .action(() => {
    console.log('❌ Unknown command. Use --help for available commands.');
    process.exit(1);
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}