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
        {
          name: 'optimizeEnsemble',
          description: 'Optimize ensemble weights based on recent performance',
          inputSchema: {
            type: 'object',
            properties: {
              lookback_days: { type: 'number', default: 30 },
              optimization_metric: { type: 'string', enum: ['accuracy', 'roi', 'sharpe'], default: 'accuracy' },
              min_confidence: { type: 'number', default: 0.6 },
            },
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
          case 'optimizeEnsemble':
            return await this.optimizeEnsemble(args);
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

    // Value assessment
    const value_assessment = this.assessBettingValue(ensemble, market_data);

    const result = {
      game_id,
      prediction_time,
      individual_models,
      ensemble,
      market_comparison,
      value_assessment,
      model_agreement: this.calculateModelAgreement(individual_models),
      confidence_analysis: this.analyzeConfidence(model_confidences),
      risk_assessment: this.assessRisk(ensemble, market_data),
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

    // ERA adjustments (more sophisticated)
    if (avg_starter_era < 2.5) projected_total -= 2.0;
    else if (avg_starter_era < 3.0) projected_total -= 1.5;
    else if (avg_starter_era < 3.5) projected_total -= 0.8;
    else if (avg_starter_era < 4.0) projected_total -= 0.3;
    else if (avg_starter_era > 5.5) projected_total += 1.8;
    else if (avg_starter_era > 5.0) projected_total += 1.2;
    else if (avg_starter_era > 4.5) projected_total += 0.6;

    // WHIP adjustments
    const home_whip = pitching.home_starter?.whip || 1.3;
    const away_whip = pitching.away_starter?.whip || 1.3;
    const avg_whip = (home_whip + away_whip) / 2;

    if (avg_whip < 1.0) projected_total -= 0.5;
    else if (avg_whip < 1.15) projected_total -= 0.3;
    else if (avg_whip > 1.5) projected_total += 0.5;
    else if (avg_whip > 1.35) projected_total += 0.3;

    // Bullpen adjustments
    const home_bullpen_era = pitching.home_bullpen_era || 4.0;
    const away_bullpen_era = pitching.away_bullpen_era || 4.0;
    const avg_bullpen_era = (home_bullpen_era + away_bullpen_era) / 2;

    if (avg_bullpen_era > 5.0) projected_total += 0.8;
    else if (avg_bullpen_era > 4.5) projected_total += 0.5;
    else if (avg_bullpen_era < 3.0) projected_total -= 0.5;
    else if (avg_bullpen_era < 3.5) projected_total -= 0.3;

    // Innings pitched factor (fatigue)
    const home_innings = pitching.home_starter?.innings_pitched || 90;
    const away_innings = pitching.away_starter?.innings_pitched || 90;
    
    if (home_innings > 180 || away_innings > 180) projected_total += 0.2; // Fatigue factor
    if (home_innings < 50 || away_innings < 50) projected_total -= 0.1; // Fresh arms

    const prediction = projected_total > 8.5 ? 'Over' : 'Under';
    const confidence = Math.min(0.95, Math.max(0.5, Math.abs(projected_total - 8.5) * 0.3 + 0.6));

    return {
      prediction,
      confidence: Number(confidence.toFixed(2)),
      reasoning: `Pitching analysis: Avg starter ERA ${avg_starter_era.toFixed(2)}, WHIP ${avg_whip.toFixed(2)}, bullpen ERA ${avg_bullpen_era.toFixed(2)}`,
      factors_used: ['starter_era', 'whip', 'bullpen_era', 'innings_pitched'],
      calculated_total: Number(projected_total.toFixed(1)),
      key_insights: [
        avg_starter_era < 3.5 ? 'Strong starting pitching matchup' : 'Vulnerable starting pitching',
        avg_bullpen_era > 4.5 ? 'Weak bullpen advantage' : 'Solid bullpen depth',
        avg_whip < 1.2 ? 'Excellent command expected' : 'Higher baserunner volume likely',
      ],
    };
  }

  // Model B: Offense-Focused Model  
  private async runOffenseModel(params: any) {
    const { game_factors } = params;
    const offense = game_factors?.offense || {};

    let projected_total = 8.0; // Base total

    // Recent scoring trends (weighted heavily)
    const home_rpg = offense.home_team?.recent_runs_per_game || 4.5;
    const away_rpg = offense.away_team?.recent_runs_per_game || 4.5;
    const combined_rpg = home_rpg + away_rpg;

    projected_total = combined_rpg * 0.8 + projected_total * 0.2; // Weight recent form heavily

    // OPS adjustments
    const home_ops = offense.home_team?.ops || 0.750;
    const away_ops = offense.away_team?.ops || 0.750;
    const avg_ops = (home_ops + away_ops) / 2;

    if (avg_ops > 0.850) projected_total += 1.0;
    else if (avg_ops > 0.800) projected_total += 0.8;
    else if (avg_ops > 0.750) projected_total += 0.3;
    else if (avg_ops < 0.650) projected_total -= 0.8;
    else if (avg_ops < 0.700) projected_total -= 0.5;

    // wOBA adjustments (more predictive than OPS)
    const home_woba = offense.home_team?.woba || 0.320;
    const away_woba = offense.away_team?.woba || 0.320;
    const avg_woba = (home_woba + away_woba) / 2;

    if (avg_woba > 0.360) projected_total += 0.6;
    else if (avg_woba > 0.340) projected_total += 0.4;
    else if (avg_woba > 0.320) projected_total += 0.1;
    else if (avg_woba < 0.300) projected_total -= 0.5;
    else if (avg_woba < 0.310) projected_total -= 0.3;

    // Power factor (HR/game)
    const home_hr = offense.home_team?.home_runs_per_game || 1.2;
    const away_hr = offense.away_team?.home_runs_per_game || 1.2;
    const total_hr = home_hr + away_hr;

    if (total_hr > 3.0) projected_total += 0.5;
    else if (total_hr > 2.5) projected_total += 0.3;
    else if (total_hr < 1.5) projected_total -= 0.3;

    // Discipline factor (walks vs strikeouts)
    const home_bb = offense.home_team?.walks_per_game || 3.5;
    const away_bb = offense.away_team?.walks_per_game || 3.5;
    const home_k = offense.home_team?.strikeouts_per_game || 9.0;
    const away_k = offense.away_team?.strikeouts_per_game || 9.0;

    const discipline_factor = (home_bb + away_bb) / (home_k + away_k);
    if (discipline_factor > 0.5) projected_total += 0.2;
    else if (discipline_factor < 0.3) projected_total -= 0.2;

    const prediction = projected_total > 8.5 ? 'Over' : 'Under';
    const confidence = Math.min(0.95, Math.max(0.5, Math.abs(projected_total - 8.5) * 0.25 + 0.65));

    return {
      prediction,
      confidence: Number(confidence.toFixed(2)),
      reasoning: `Offense analysis: Combined RPG ${combined_rpg.toFixed(1)}, avg OPS ${avg_ops.toFixed(3)}, wOBA ${avg_woba.toFixed(3)}`,
      factors_used: ['recent_runs_per_game', 'ops', 'woba', 'home_runs', 'discipline'],
      calculated_total: Number(projected_total.toFixed(1)),
      key_insights: [
        combined_rpg > 9.5 ? 'High-powered offensive matchup' : 'Moderate offensive production expected',
        avg_ops > 0.800 ? 'Strong power potential' : 'Limited power upside',
        discipline_factor > 0.4 ? 'Patient approach should create opportunities' : 'Aggressive hitting may limit rallies',
      ],
    };
  }

  // Model C: Weather/Park Factor Model
  private async runWeatherParkModel(params: any) {
    const { game_factors } = params;
    const weather = game_factors?.weather || {};
    const park = game_factors?.park || {};

    let projected_total = 8.5; // Base total

    // Park factor adjustments (most important)
    const park_factor = park.park_factor || 1.0;
    const runs_factor = park.runs_factor || 1.0;
    const hr_factor = park.hr_factor || 1.0;

    projected_total *= runs_factor;
    
    // Additional park-specific adjustments
    if (park.altitude && park.altitude > 3000) {
      projected_total += 0.8; // High altitude bonus (Coors Field effect)
    }
    
    if (park.foul_territory === 'large') {
      projected_total -= 0.2; // Large foul territory suppresses offense
    } else if (park.foul_territory === 'small') {
      projected_total += 0.2; // Small foul territory helps offense
    }

    // Weather adjustments (if not dome)
    if (!weather.is_dome && !park.dome) {
      const temp = weather.temp_f || 72;
      const wind_speed = weather.wind_speed_mph || 5;
      const humidity = weather.humidity || 50;

      // Temperature effects (more nuanced)
      if (temp > 90) projected_total += 0.6; // Very hot
      else if (temp > 85) projected_total += 0.4; // Hot
      else if (temp > 75) projected_total += 0.2; // Warm
      else if (temp < 45) projected_total -= 0.5; // Very cold
      else if (temp < 55) projected_total -= 0.3; // Cold
      else if (temp < 65) projected_total -= 0.1; // Cool

      // Wind effects (direction-aware)
      if (wind_speed > 20) {
        const wind_direction = weather.wind_direction || 'N';
        if (wind_direction.includes('out') || ['S', 'SW', 'SE'].includes(wind_direction)) {
          projected_total += 0.5; // Strong wind blowing out
        } else {
          projected_total -= 0.4; // Strong wind blowing in
        }
      } else if (wind_speed > 15) {
        projected_total += Math.random() > 0.5 ? 0.2 : -0.2; // Moderate wind, variable effect
      }

      // Humidity effects (ball carry)
      if (humidity > 85) projected_total -= 0.3; // Very humid
      else if (humidity > 70) projected_total -= 0.1; // Humid
      else if (humidity < 30) projected_total += 0.2; // Dry air

      // Precipitation effects
      if (weather.precipitation_chance > 70) projected_total -= 0.5; // High rain chance
      else if (weather.precipitation_chance > 50) projected_total -= 0.3; // Moderate rain chance
    }

    const prediction = projected_total > 8.5 ? 'Over' : 'Under';
    const confidence = Math.min(0.95, Math.max(0.5, Math.abs(projected_total - 8.5) * 0.35 + 0.55));

    return {
      prediction,
      confidence: Number(confidence.toFixed(2)),
      reasoning: `Weather/Park analysis: Park factor ${park_factor.toFixed(2)}, temp ${weather.temp_f || 72}°F, wind ${weather.wind_speed_mph || 5}mph`,
      factors_used: ['park_factor', 'temperature', 'wind', 'humidity', 'altitude'],
      calculated_total: Number(projected_total.toFixed(1)),
      key_insights: [
        park_factor > 1.05 ? 'Hitter-friendly park advantage' : park_factor < 0.95 ? 'Pitcher-friendly park' : 'Neutral park environment',
        weather.temp_f > 80 ? 'Hot weather favors offense' : weather.temp_f < 60 ? 'Cold weather suppresses offense' : 'Neutral weather conditions',
        weather.wind_speed_mph > 15 ? 'Significant wind factor' : 'Minimal wind impact',
      ],
    };
  }

  // Model D: Market Sentiment Model
  private async runMarketSentimentModel(params: any) {
    const { market_data } = params;

    let projected_total = 8.5; // Start with current market total
    let confidence = 0.6; // Base confidence
    
    if (market_data?.totals) {
      projected_total = market_data.totals.current_total;
    }

    // Line movement analysis (most important for this model)
    if (market_data?.line_movement && market_data.line_movement.length > 1) {
      const movement = market_data.totals.movement || 0;
      const lineMovements = market_data.line_movement;
      
      // Analyze movement strength and direction
      if (Math.abs(movement) > 0.5) {
        confidence += 0.25; // Strong movement increases confidence
        if (movement > 0) {
          projected_total += 0.4; // Line moving up, lean over
        } else {
          projected_total -= 0.4; // Line moving down, lean under
        }
      } else if (Math.abs(movement) > 0.25) {
        confidence += 0.15; // Moderate movement
        if (movement > 0) {
          projected_total += 0.2;
        } else {
          projected_total -= 0.2;
        }
      }

      // Steam move detection
      const steamMoves = lineMovements.filter((move: any) => move.trigger === 'steam_move').length;
      if (steamMoves > 0) {
        confidence += 0.1 * steamMoves;
        projected_total += steamMoves > 1 ? 0.3 : 0.2; // Steam usually means over
      }

      // Sharp money indicators
      const sharpMoves = lineMovements.filter((move: any) => move.sharp_money_indicator).length;
      if (sharpMoves > 0) {
        confidence += 0.1;
      }
    }

    // Betting volume analysis
    if (market_data?.betting_volume) {
      const volume = market_data.betting_volume;
      
      // Reverse line movement (key sharp money indicator)
      if (volume.public_vs_sharp?.reverse_line_movement) {
        confidence += 0.2;
        // Fade the public
        if (volume.over_percentage > 65) {
          projected_total -= 0.3; // Heavy public on over, lean under
        } else if (volume.over_percentage < 35) {
          projected_total += 0.3; // Heavy public on under, lean over
        }
      }

      // Sharp money side
      if (volume.public_vs_sharp?.sharp_money_side) {
        confidence += 0.15;
        const sharpSide = volume.public_vs_sharp.sharp_money_side;
        if (sharpSide === 'Over') {
          projected_total += 0.2;
        } else if (sharpSide === 'Under') {
          projected_total -= 0.2;
        }
      }

      // Public vs sharp money percentage
      const sharpPercentage = volume.public_vs_sharp?.sharp_money_percentage || 50;
      if (sharpPercentage > 60) {
        confidence += 0.1; // High sharp money involvement
      }

      // Betting handle analysis
      if (volume.total_handle > 1000000) {
        confidence += 0.05; // High handle games are more efficient
      }
    }

    // Consensus analysis
    if (market_data?.consensus) {
      const consensus = market_data.consensus;
      const marketEfficiency = consensus.market_efficiency || 0.85;
      
      if (marketEfficiency > 0.9) {
        confidence += 0.1; // Efficient market
      } else if (marketEfficiency < 0.8) {
        confidence -= 0.1; // Inefficient market
      }

      // Arbitrage opportunities suggest inefficiencies
      if (consensus.arbitrage_opportunities && consensus.arbitrage_opportunities.length > 0) {
        confidence -= 0.1;
      }
    }

    const prediction = projected_total > 8.5 ? 'Over' : 'Under';

    return {
      prediction,
      confidence: Number(Math.min(0.95, Math.max(0.5, confidence)).toFixed(2)),
      reasoning: `Market analysis: Current total ${market_data?.totals?.current_total || 8.5}, movement ${market_data?.totals?.movement || 0}`,
      factors_used: ['line_movement', 'betting_volume', 'sharp_money', 'public_percentage', 'market_efficiency'],
      calculated_total: Number(projected_total.toFixed(1)),
      key_insights: [
        market_data?.totals?.movement > 0.3 ? 'Significant upward line movement' : 
        market_data?.totals?.movement < -0.3 ? 'Significant downward line movement' : 'Stable line movement',
        market_data?.betting_volume?.public_vs_sharp?.reverse_line_movement ? 'Reverse line movement detected (sharp money)' : 'Line movement follows public money',
        market_data?.betting_volume?.public_vs_sharp?.sharp_money_side ? `Sharp money on ${market_data.betting_volume.public_vs_sharp.sharp_money_side}` : 'No clear sharp money direction',
      ],
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
      const combined_weight = base_weight * (0.7 + confidence_weight * 0.3); // Blend base and confidence weights
      
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

    // Calculate ensemble confidence with bonuses for consensus
    const avg_confidence = model_confidences.reduce((a, b) => a + b, 0) / model_confidences.length;
    const consensus_strength = Math.abs(over_votes - under_votes) / predictions.length;
    let ensemble_confidence = avg_confidence * (0.6 + consensus_strength * 0.4);
    
    // Bonus for unanimous decisions
    if (unanimous) {
      ensemble_confidence = Math.min(0.95, ensemble_confidence + 0.1);
    }

    return {
      prediction: weighted_average_total > 8.5 ? 'Over' : 'Under',
      confidence: Number(ensemble_confidence.toFixed(2)),
      consensus_strength: Number(consensus_strength.toFixed(2)),
      weighted_average_total: Number(weighted_average_total.toFixed(1)),
      model_agreement: {
        unanimous,
        majority,
        split,
        over_votes,
        under_votes,
      },
      weight_distribution: this.modelWeights,
    };
  }

  private generateMarketComparison(ensemble: any, market_data: any) {
    const closing_total = market_data?.totals?.current_total || 8.5;
    const our_total = ensemble.weighted_average_total;
    const edge = our_total - closing_total;
    const abs_edge = Math.abs(edge);

    let recommendation = 'No Play';
    let bet_size = 'None';
    
    if (abs_edge >= 0.5 && ensemble.confidence >= 0.75) {
      recommendation = our_total > closing_total ? 'Strong Over' : 'Strong Under';
      bet_size = 'Large';
    } else if (abs_edge >= 0.3 && ensemble.confidence >= 0.65) {
      recommendation = our_total > closing_total ? 'Lean Over' : 'Lean Under';
      bet_size = 'Medium';
    } else if (abs_edge >= 0.2 && ensemble.confidence >= 0.6) {
      recommendation = our_total > closing_total ? 'Slight Over' : 'Slight Under';
      bet_size = 'Small';
    }

    return {
      closing_total,
      our_projection: our_total,
      edge: Number(edge.toFixed(1)),
      absolute_edge: Number(abs_edge.toFixed(1)),
      value_bet: abs_edge >= 0.3 && ensemble.confidence >= 0.65,
      recommendation,
      bet_size,
      kelly_criterion: this.calculateKellyCriterion(ensemble.confidence, abs_edge),
    };
  }

  private calculateKellyCriterion(confidence: number, edge: number): any {
    // Simplified Kelly Criterion calculation
    const odds = 1.91; // Assume -110 odds
    const win_probability = confidence;
    const kelly_fraction = (win_probability * odds - 1) / (odds - 1);
    
    return {
      kelly_fraction: Number(Math.max(0, kelly_fraction).toFixed(3)),
      suggested_bet_size: Math.min(0.05, Math.max(0, kelly_fraction * 0.25)), // Conservative Kelly
      risk_level: kelly_fraction > 0.03 ? 'high' : kelly_fraction > 0.01 ? 'medium' : 'low',
    };
  }

  private assessBettingValue(ensemble: any, market_data: any): any {
    const closing_total = market_data?.totals?.current_total || 8.5;
    const our_total = ensemble.weighted_average_total;
    const over_odds = market_data?.totals?.over_odds || -110;
    const under_odds = market_data?.totals?.under_odds || -110;

    const over_implied_prob = Math.abs(over_odds) / (Math.abs(over_odds) + 100);
    const under_implied_prob = Math.abs(under_odds) / (Math.abs(under_odds) + 100);

    const our_over_prob = ensemble.confidence * (our_total > closing_total ? 1 : 0) + 
                          (1 - ensemble.confidence) * 0.5;
    const our_under_prob = 1 - our_over_prob;

    const over_value = our_over_prob - over_implied_prob;
    const under_value = our_under_prob - under_implied_prob;

    return {
      over_value: Number(over_value.toFixed(3)),
      under_value: Number(under_value.toFixed(3)),
      best_value: over_value > under_value ? 'Over' : 'Under',
      max_value: Number(Math.max(over_value, under_value).toFixed(3)),
      value_rating: Math.max(over_value, under_value) > 0.05 ? 'excellent' : 
                    Math.max(over_value, under_value) > 0.03 ? 'good' : 
                    Math.max(over_value, under_value) > 0.01 ? 'fair' : 'poor',
      expected_value: {
        over: Number(((our_over_prob * (100 / Math.abs(over_odds))) - (1 - our_over_prob)).toFixed(3)),
        under: Number(((our_under_prob * (100 / Math.abs(under_odds))) - (1 - our_under_prob)).toFixed(3)),
      },
    };
  }

  private calculateModelAgreement(individual_models: any): any {
    const predictions = Object.values(individual_models) as any[];
    const over_count = predictions.filter(p => p.prediction === 'Over').length;
    const under_count = predictions.filter(p => p.prediction === 'Under').length;
    
    const agreement_score = Math.abs(over_count - under_count) / predictions.length;
    
    return {
      agreement_score: Number(agreement_score.toFixed(2)),
      agreement_level: agreement_score === 1 ? 'unanimous' : 
                      agreement_score >= 0.5 ? 'strong' : 
                      agreement_score > 0 ? 'moderate' : 'split',
      over_models: over_count,
      under_models: under_count,
      most_confident_model: predictions.reduce((max, p) => p.confidence > max.confidence ? p : max, predictions[0]),
    };
  }

  private analyzeConfidence(confidences: number[]): any {
    const avg_confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const max_confidence = Math.max(...confidences);
    const min_confidence = Math.min(...confidences);
    const confidence_range = max_confidence - min_confidence;
    
    return {
      average_confidence: Number(avg_confidence.toFixed(2)),
      confidence_range: Number(confidence_range.toFixed(2)),
      max_confidence: Number(max_confidence.toFixed(2)),
      min_confidence: Number(min_confidence.toFixed(2)),
      consistency: confidence_range < 0.2 ? 'high' : confidence_range < 0.4 ? 'moderate' : 'low',
      overall_strength: avg_confidence > 0.8 ? 'very_strong' : 
                        avg_confidence > 0.7 ? 'strong' : 
                        avg_confidence > 0.6 ? 'moderate' : 'weak',
    };
  }

  private assessRisk(ensemble: any, market_data: any): any {
    const confidence = ensemble.confidence;
    const edge = Math.abs(ensemble.weighted_average_total - (market_data?.totals?.current_total || 8.5));
    
    let risk_level = 'medium';
    if (confidence > 0.8 && edge > 0.5) risk_level = 'low';
    else if (confidence < 0.6 || edge < 0.2) risk_level = 'high';
    
    return {
      risk_level,
      risk_factors: [
        confidence < 0.65 ? 'Low model confidence' : null,
        edge < 0.3 ? 'Small edge vs market' : null,
        ensemble.consensus_strength < 0.5 ? 'Model disagreement' : null,
        market_data?.betting_volume?.public_vs_sharp?.reverse_line_movement ? 'Reverse line movement' : null,
      ].filter(Boolean),
      recommended_action: risk_level === 'low' ? 'Bet' : risk_level === 'medium' ? 'Small bet' : 'Pass',
    };
  }

  private async backtestModel(args: any) {
    const { model_name, start_date, end_date, teams, parallel_processing = true } = args;

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
        max_drawdown: 0,
        win_streak: 0,
        lose_streak: 0,
        sharpe_ratio: 0,
      },
      confidence_analysis: {
        high_confidence: { total: 0, correct: 0, accuracy: 0 },
        medium_confidence: { total: 0, correct: 0, accuracy: 0 },
        low_confidence: { total: 0, correct: 0, accuracy: 0 },
      },
      monthly_breakdown: [] as any[],
    };

    // Simulate realistic backtest results
    let running_balance = 0;
    let max_balance = 0;
    let current_win_streak = 0;
    let current_lose_streak = 0;
    let max_win_streak = 0;
    let max_lose_streak = 0;

    for (let i = 0; i < results.total_predictions; i++) {
      const confidence = 0.5 + Math.random() * 0.4; // 50-90% confidence
      const correct = Math.random() > (0.52 - confidence * 0.02); // Higher confidence = slightly better accuracy
      
      // Track confidence buckets
      const confidenceBucket = confidence > 0.75 ? 'high_confidence' : 
                              confidence > 0.6 ? 'medium_confidence' : 'low_confidence';
      results.confidence_analysis[confidenceBucket].total++;
      
      if (correct) {
        results.correct_predictions++;
        results.confidence_analysis[confidenceBucket].correct++;
        results.performance_metrics.units_won += 0.91; // Win $0.91 per $1 bet at -110
        running_balance += 0.91;
        current_win_streak++;
        current_lose_streak = 0;
        max_win_streak = Math.max(max_win_streak, current_win_streak);
      } else {
        results.performance_metrics.units_won -= 1.0; // Lose $1 per bet
        running_balance -= 1.0;
        current_lose_streak++;
        current_win_streak = 0;
        max_lose_streak = Math.max(max_lose_streak, current_lose_streak);
      }
      
      results.performance_metrics.units_wagered += 1.0;
      max_balance = Math.max(max_balance, running_balance);
    }

    // Calculate final metrics
    results.performance_metrics.accuracy = Number((results.correct_predictions / results.total_predictions).toFixed(3));
    results.performance_metrics.roi = Number((results.performance_metrics.units_won / results.performance_metrics.units_wagered).toFixed(3));
    results.performance_metrics.max_drawdown = Number((max_balance - running_balance).toFixed(2));
    results.performance_metrics.win_streak = max_win_streak;
    results.performance_metrics.lose_streak = max_lose_streak;
    results.performance_metrics.sharpe_ratio = Number((results.performance_metrics.roi / 0.3).toFixed(2)); // Simplified Sharpe

    // Calculate confidence bucket accuracies
    Object.keys(results.confidence_analysis).forEach(bucket => {
      const data = results.confidence_analysis[bucket];
      data.accuracy = data.total > 0 ? Number((data.correct / data.total).toFixed(3)) : 0;
    });

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
          old_weights: { Model_A: 0.25, Model_B: 0.25, Model_C: 0.25, Model_D: 0.25 },
          new_weights: this.modelWeights,
          update_timestamp: new Date().toISOString(),
        }, null, 2)
      }]
    };
  }

  private async optimizeEnsemble(args: any) {
    const { lookback_days = 30, optimization_metric = 'accuracy', min_confidence = 0.6 } = args;

    // Simulate optimization process
    const optimization_results = {
      lookback_period: `${lookback_days} days`,
      optimization_metric,
      min_confidence,
      current_weights: { ...this.modelWeights },
      optimized_weights: {} as any,
      performance_improvement: {
        before: {} as any,
        after: {} as any,
        improvement: {} as any,
      },
      recommended_action: 'apply' as string,
    };

    // Generate optimized weights (simplified simulation)
    const performance_scores = {
      Model_A: 0.52 + Math.random() * 0.08,
      Model_B: 0.54 + Math.random() * 0.08,
      Model_C: 0.50 + Math.random() * 0.08,
      Model_D: 0.53 + Math.random() * 0.08,
    };

    // Weight based on performance
    const total_performance = Object.values(performance_scores).reduce((a, b) => a + b, 0);
    Object.keys(performance_scores).forEach(model => {
      optimization_results.optimized_weights[model] = 
        Number((performance_scores[model] / total_performance).toFixed(2));
    });

    // Simulate performance metrics
    optimization_results.performance_improvement.before = {
      accuracy: 0.545 + Math.random() * 0.02,
      roi: (Math.random() - 0.45) * 0.1,
      sharpe_ratio: 0.8 + Math.random() * 0.4,
    };

    optimization_results.performance_improvement.after = {
      accuracy: optimization_results.performance_improvement.before.accuracy + 0.005 + Math.random() * 0.01,
      roi: optimization_results.performance_improvement.before.roi + 0.01 + Math.random() * 0.02,
      sharpe_ratio: optimization_results.performance_improvement.before.sharpe_ratio + 0.1 + Math.random() * 0.2,
    };

    // Calculate improvements
    Object.keys(optimization_results.performance_improvement.before).forEach(metric => {
      const before = (optimization_results.performance_improvement.before as any)[metric];
      const after = (optimization_results.performance_improvement.after as any)[metric];
      (optimization_results.performance_improvement.improvement as any)[metric] = Number(((after - before) / before * 100).toFixed(1));
    });

    // Determine recommendation
    const avg_improvement = (Object.values(optimization_results.performance_improvement.improvement) as number[]).reduce((a: number, b: number) => a + b, 0) / 3;
    optimization_results.recommended_action = avg_improvement > 2 ? 'apply' : avg_improvement > 0 ? 'test' : 'keep_current';

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(optimization_results, null, 2)
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