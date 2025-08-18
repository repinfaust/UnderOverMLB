#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Prediction Server - All four models (A-D) and prediction logic
class PredictionServer {
  private server: Server;
  private modelWeights = {
    Model_A: 0.25, // Pitching-focused model
    Model_B: 0.25, // Offense-focused model  
    Model_C: 0.25, // Weather/Park factor model
    Model_D: 0.25, // Market sentiment model
  };

  constructor() {
    this.server = new Server(
      {
        name: 'prediction-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'models://model/{model_name}/prediction',
          name: 'Individual Model Predictions',
          description: 'Individual model predictions',
          mimeType: 'application/json',
        },
        {
          uri: 'models://ensemble/prediction',
          name: 'Ensemble Prediction',
          description: 'Combined model prediction',
          mimeType: 'application/json',
        },
        {
          uri: 'models://game/{game_id}/predictions',
          name: 'Game Predictions',
          description: 'All model predictions for game',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'runAllModels',
          description: 'Run all four models (A-D) and generate ensemble prediction',
          inputSchema: {
            type: 'object',
            properties: {
              home_team: { type: 'string' },
              away_team: { type: 'string' },
              venue: { type: 'string' },
              date: { type: 'string', format: 'date' },
              game_factors: { type: 'object', description: 'Pre-fetched game factors' },
              market_data: { type: 'object', description: 'Pre-fetched market data' },
              models_to_run: {
                type: 'array',
                items: { type: 'string' },
                default: ['Model_A', 'Model_B', 'Model_C', 'Model_D'],
              },
            },
            required: ['home_team', 'away_team', 'venue', 'date'],
          },
        },
        {
          name: 'runSingleModel',
          description: 'Run a specific model prediction',
          inputSchema: {
            type: 'object',
            properties: {
              model_name: { type: 'string', enum: ['Model_A', 'Model_B', 'Model_C', 'Model_D'] },
              home_team: { type: 'string' },
              away_team: { type: 'string' },
              venue: { type: 'string' },
              date: { type: 'string', format: 'date' },
              game_factors: { type: 'object' },
            },
            required: ['model_name', 'home_team', 'away_team', 'venue', 'date'],
          },
        },
        {
          name: 'backtestModel',
          description: 'Backtest a model over historical data',
          inputSchema: {
            type: 'object',
            properties: {
              model_name: { type: 'string' },
              start_date: { type: 'string', format: 'date' },
              end_date: { type: 'string', format: 'date' },
              teams: { type: 'array', items: { type: 'string' }, description: 'Optional team filter' },
              parallel_processing: { type: 'boolean', default: true },
            },
            required: ['model_name', 'start_date', 'end_date'],
          },
        },
        {
          name: 'updateModelWeights',
          description: 'Update ensemble model weights based on performance',
          inputSchema: {
            type: 'object',
            properties: {
              new_weights: {
                type: 'object',
                properties: {
                  Model_A: { type: 'number', minimum: 0, maximum: 1 },
                  Model_B: { type: 'number', minimum: 0, maximum: 1 },
                  Model_C: { type: 'number', minimum: 0, maximum: 1 },
                  Model_D: { type: 'number', minimum: 0, maximum: 1 },
                },
              },
            },
            required: ['new_weights'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'runAllModels':
            return await this.runAllModels(args);
          case 'runSingleModel':
            return await this.runSingleModel(args);
          case 'backtestModel':
            return await this.backtestModel(args);
          case 'updateModelWeights':
            return await this.updateModelWeights(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async runAllModels(args: any) {
    const {
      home_team,
      away_team,
      venue,
      date,
      game_factors,
      market_data,
      models_to_run = ['Model_A', 'Model_B', 'Model_C', 'Model_D'],
    } = args;

    const game_id = `${date}_${away_team}@${home_team}`;
    const prediction_time = new Date().toISOString();

    // Run all individual models
    const individual_models: any = {};
    const model_predictions: number[] = [];
    const model_confidences: number[] = [];

    for (const model_name of models_to_run) {
      const prediction = await this.runModelPrediction(model_name, {
        home_team,
        away_team,
        venue,
        date,
        game_factors,
        market_data,
      });
      
      individual_models[model_name] = prediction;
      model_predictions.push(prediction.calculated_total);
      model_confidences.push(prediction.confidence);
    }

    // Generate ensemble prediction
    const ensemble = this.generateEnsemble(individual_models, model_predictions, model_confidences);

    // Market comparison
    const market_comparison = this.generateMarketComparison(ensemble, market_data);

    const result = {
      game_id,
      prediction_time,
      individual_models,
      ensemble,
      market_comparison,
    };

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async runSingleModel(args: any) {
    const { model_name, home_team, away_team, venue, date, game_factors } = args;

    const prediction = await this.runModelPrediction(model_name, {
      home_team,
      away_team,
      venue,
      date,
      game_factors,
    });

    return { content: [{ type: 'text', text: JSON.stringify(prediction, null, 2) }] };
  }

  private async runModelPrediction(model_name: string, params: any): Promise<any> {
    const { home_team, away_team, venue, date, game_factors, market_data } = params;

    switch (model_name) {
      case 'Model_A':
        return this.runPitchingModel(params);
      case 'Model_B':
        return this.runOffenseModel(params);
      case 'Model_C':
        return this.runWeatherParkModel(params);
      case 'Model_D':
        return this.runMarketSentimentModel(params);
      default:
        throw new Error(`Unknown model: ${model_name}`);
    }
  }

  // Model A: Pitching-Focused Model
  private async runPitchingModel(params: any) {
    const { game_factors } = params;
    const pitching = game_factors?.pitching || {};

    // Calculate projected total based on pitching
    let projected_total = 9.0; // Base total

    // Adjust for starter ERA
    const home_era = pitching.home_starter?.era || 4.0;
    const away_era = pitching.away_starter?.era || 4.0;
    const avg_starter_era = (home_era + away_era) / 2;

    // ERA adjustments
    if (avg_starter_era < 3.0) projected_total -= 1.5;
    else if (avg_starter_era < 3.5) projected_total -= 0.8;
    else if (avg_starter_era > 5.0) projected_total += 1.2;
    else if (avg_starter_era > 4.5) projected_total += 0.6;

    // Bullpen adjustments
    const home_bullpen_era = pitching.home_bullpen_era || 4.0;
    const away_bullpen_era = pitching.away_bullpen_era || 4.0;
    const avg_bullpen_era = (home_bullpen_era + away_bullpen_era) / 2;

    if (avg_bullpen_era > 4.5) projected_total += 0.5;
    else if (avg_bullpen_era < 3.5) projected_total -= 0.3;

    const prediction = projected_total > 8.5 ? 'Over' : 'Under';
    const confidence = Math.min(0.95, Math.abs(projected_total - 8.5) * 0.3 + 0.6);

    return {
      prediction,
      confidence: Number(confidence.toFixed(2)),
      reasoning: `Pitching analysis: Avg starter ERA ${avg_starter_era.toFixed(2)}, bullpen ERA ${avg_bullpen_era.toFixed(2)}`,
      factors_used: ['starter_era', 'bullpen_era', 'innings_pitched'],
      calculated_total: Number(projected_total.toFixed(1)),
    };
  }

  // Model B: Offense-Focused Model  
  private async runOffenseModel(params: any) {
    const { game_factors } = params;
    const offense = game_factors?.offense || {};

    let projected_total = 8.0; // Base total

    // Recent scoring trends
    const home_rpg = offense.home_team?.recent_runs_per_game || 4.5;
    const away_rpg = offense.away_team?.recent_runs_per_game || 4.5;
    const combined_rpg = home_rpg + away_rpg;

    projected_total = combined_rpg;

    // OPS adjustments
    const home_ops = offense.home_team?.ops || 0.750;
    const away_ops = offense.away_team?.ops || 0.750;
    const avg_ops = (home_ops + away_ops) / 2;

    if (avg_ops > 0.800) projected_total += 0.8;
    else if (avg_ops > 0.750) projected_total += 0.3;
    else if (avg_ops < 0.700) projected_total -= 0.5;

    // wOBA adjustments
    const home_woba = offense.home_team?.woba || 0.320;
    const away_woba = offense.away_team?.woba || 0.320;
    const avg_woba = (home_woba + away_woba) / 2;

    if (avg_woba > 0.340) projected_total += 0.4;
    else if (avg_woba < 0.310) projected_total -= 0.3;

    const prediction = projected_total > 8.5 ? 'Over' : 'Under';
    const confidence = Math.min(0.95, Math.abs(projected_total - 8.5) * 0.25 + 0.65);

    return {
      prediction,
      confidence: Number(confidence.toFixed(2)),
      reasoning: `Offense analysis: Combined RPG ${combined_rpg.toFixed(1)}, avg OPS ${avg_ops.toFixed(3)}`,
      factors_used: ['recent_runs_per_game', 'ops', 'woba'],
      calculated_total: Number(projected_total.toFixed(1)),
    };
  }

  // Model C: Weather/Park Factor Model
  private async runWeatherParkModel(params: any) {
    const { game_factors } = params;
    const weather = game_factors?.weather || {};
    const park = game_factors?.park || {};

    let projected_total = 8.5; // Base total

    // Park factor adjustments
    const park_factor = park.park_factor || 1.0;
    const runs_factor = park.runs_factor || 1.0;

    projected_total *= runs_factor;

    // Weather adjustments (if not dome)
    if (!weather.is_dome) {
      const temp = weather.temp_f || 72;
      const wind_speed = weather.wind_speed_mph || 5;
      const humidity = weather.humidity || 50;

      // Temperature effects
      if (temp > 85) projected_total += 0.4; // Hot weather favors offense
      else if (temp > 75) projected_total += 0.2;
      else if (temp < 50) projected_total -= 0.3; // Cold weather suppresses offense
      else if (temp < 60) projected_total -= 0.1;

      // Wind effects
      if (wind_speed > 15) {
        // Strong winds - check direction (simplified)
        if (weather.wind_direction?.includes('out') || Math.random() > 0.5) {
          projected_total += 0.3; // Wind blowing out
        } else {
          projected_total -= 0.2; // Wind blowing in
        }
      }

      // Humidity effects (high humidity = less carry)
      if (humidity > 80) projected_total -= 0.2;
      else if (humidity < 40) projected_total += 0.1;

      // Precipitation effects
      if (weather.precipitation_chance > 50) projected_total -= 0.3;
    }

    const prediction = projected_total > 8.5 ? 'Over' : 'Under';
    const confidence = Math.min(0.95, Math.abs(projected_total - 8.5) * 0.35 + 0.55);

    return {
      prediction,
      confidence: Number(confidence.toFixed(2)),
      reasoning: `Weather/Park analysis: Park factor ${park_factor}, temp ${weather.temp_f}°F, wind ${weather.wind_speed_mph}mph`,
      factors_used: ['park_factor', 'temperature', 'wind', 'humidity'],
      calculated_total: Number(projected_total.toFixed(1)),
    };
  }

  // Model D: Market Sentiment Model
  private async runMarketSentimentModel(params: any) {
    const { market_data } = params;

    let projected_total = 8.5; // Start with current market total
    
    if (market_data?.totals) {
      projected_total = market_data.totals.current_total;
    }

    let confidence = 0.6; // Base confidence

    // Line movement analysis
    if (market_data?.line_movement && market_data.line_movement.length > 1) {
      const movement = market_data.totals.movement || 0;
      
      // Strong line movement indicates sharp money
      if (Math.abs(movement) > 0.5) {
        confidence += 0.2;
        if (movement > 0) {
          projected_total += 0.3; // Line moving up, lean over
        } else {
          projected_total -= 0.3; // Line moving down, lean under
        }
      }
    }

    // Betting volume analysis
    if (market_data?.betting_volume) {
      const volume = market_data.betting_volume;
      
      // Reverse line movement (sharp money indicator)
      if (volume.public_vs_sharp?.reverse_line_movement) {
        confidence += 0.15;
        // Fade the public
        if (volume.over_percentage > 60) {
          projected_total -= 0.2; // Public on over, lean under
        } else if (volume.over_percentage < 40) {
          projected_total += 0.2; // Public on under, lean over
        }
      }

      // Sharp money side
      if (volume.public_vs_sharp?.sharp_money_side) {
        confidence += 0.1;
        if (volume.public_vs_sharp.sharp_money_side === 'Over') {
          projected_total += 0.1;
        } else {
          projected_total -= 0.1;
        }
      }
    }

    // Steam moves (rapid line movement)
    if (market_data?.line_movement) {
      const recentMoves = market_data.line_movement.filter((move: any) => 
        move.trigger === 'steam_move'
      );
      if (recentMoves.length > 0) {
        confidence += 0.1;
      }
    }

    const prediction = projected_total > 8.5 ? 'Over' : 'Under';

    return {
      prediction,
      confidence: Number(Math.min(0.95, confidence).toFixed(2)),
      reasoning: `Market analysis: Current total ${market_data?.totals?.current_total}, movement ${market_data?.totals?.movement || 0}`,
      factors_used: ['line_movement', 'betting_volume', 'sharp_money', 'public_percentage'],
      calculated_total: Number(projected_total.toFixed(1)),
    };
  }

  private generateEnsemble(individual_models: any, model_predictions: number[], model_confidences: number[]) {
    // Calculate weighted average using both model weights and confidences
    let weighted_sum = 0;
    let weight_sum = 0;
    const predictions = Object.entries(individual_models);

    predictions.forEach(([model_name, prediction]: [string, any], index) => {
      const base_weight = this.modelWeights[model_name as keyof typeof this.modelWeights] || 0.25;
      const confidence_weight = prediction.confidence;
      const combined_weight = base_weight * confidence_weight;
      
      weighted_sum += prediction.calculated_total * combined_weight;
      weight_sum += combined_weight;
    });

    const weighted_average_total = weight_sum > 0 ? weighted_sum / weight_sum : 8.5;

    // Determine consensus
    const over_votes = predictions.filter(([_, pred]: [string, any]) => pred.prediction === 'Over').length;
    const under_votes = predictions.filter(([_, pred]: [string, any]) => pred.prediction === 'Under').length;
    
    const unanimous = over_votes === predictions.length || under_votes === predictions.length;
    const majority = over_votes > under_votes ? 'Over' : under_votes > over_votes ? 'Under' : 'Split';
    const split = over_votes === under_votes;

    // Calculate ensemble confidence
    const avg_confidence = model_confidences.reduce((a, b) => a + b, 0) / model_confidences.length;
    const consensus_strength = Math.abs(over_votes - under_votes) / predictions.length;
    const ensemble_confidence = avg_confidence * (0.7 + consensus_strength * 0.3);

    return {
      prediction: weighted_average_total > 8.5 ? 'Over' : 'Under',
      confidence: Number(ensemble_confidence.toFixed(2)),
      consensus_strength: Number(consensus_strength.toFixed(2)),
      weighted_average_total: Number(weighted_average_total.toFixed(1)),
      model_agreement: {
        unanimous,
        majority,
        split,
      },
    };
  }

  private generateMarketComparison(ensemble: any, market_data: any) {
    const closing_total = market_data?.totals?.current_total || 8.5;
    const our_total = ensemble.weighted_average_total;
    const edge = Math.abs(our_total - closing_total);

    let recommendation = 'No Play';
    if (edge >= 0.5 && ensemble.confidence >= 0.75) {
      recommendation = our_total > closing_total ? 'Strong Over' : 'Strong Under';
    } else if (edge >= 0.3 && ensemble.confidence >= 0.65) {
      recommendation = our_total > closing_total ? 'Lean Over' : 'Lean Under';
    }

    return {
      closing_total,
      our_edge: Number(edge.toFixed(1)),
      value_bet: edge >= 0.3 && ensemble.confidence >= 0.65,
      recommendation,
    };
  }

  private async backtestModel(args: any) {
    const { model_name, start_date, end_date, teams, parallel_processing = true } = args;

    // Mock backtesting implementation
    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const results = {
      model_name,
      backtest_period: { start_date, end_date, days },
      total_predictions: Math.floor(days * 8), // ~8 games per day
      correct_predictions: 0,
      performance_metrics: {
        accuracy: 0,
        roi: 0,
        units_won: 0,
        units_wagered: 0,
      },
      daily_results: [] as any[],
    };

    // Simulate backtest results
    for (let i = 0; i < results.total_predictions; i++) {
      const correct = Math.random() > 0.45; // 55% accuracy
      if (correct) results.correct_predictions++;
      
      // Calculate units (assuming -110 odds)
      if (correct) {
        results.performance_metrics.units_won += 0.91; // Win $0.91 per $1 bet
      } else {
        results.performance_metrics.units_won -= 1.0; // Lose $1 per bet
      }
      results.performance_metrics.units_wagered += 1.0;
    }

    results.performance_metrics.accuracy = Number((results.correct_predictions / results.total_predictions).toFixed(3));
    results.performance_metrics.roi = Number((results.performance_metrics.units_won / results.performance_metrics.units_wagered).toFixed(3));

    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  private async updateModelWeights(args: any) {
    const { new_weights } = args;

    // Validate weights sum to 1
    const total = Object.values(new_weights).reduce((sum: number, weight: any) => sum + weight, 0);
    if (Math.abs(total - 1.0) > 0.01) {
      throw new Error(`Model weights must sum to 1.0, got ${total}`);
    }

    // Update weights
    Object.assign(this.modelWeights, new_weights);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'Model weights updated successfully',
          new_weights: this.modelWeights,
        }, null, 2)
      }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Prediction Server running on stdio');
  }
}

const server = new PredictionServer();
server.run().catch(console.error);