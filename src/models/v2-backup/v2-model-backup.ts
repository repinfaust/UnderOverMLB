/**
 * V2 MODEL BACKUP - August 17, 2025
 * 
 * PERFORMANCE RECORD:
 * - 61.5% accuracy foundation (16/26 games)
 * - +17.7% ROI over testing period
 * - 100% Under bias (critical flaw)
 * - Validation: 42.9% win rate vs V4's 57.1%
 * 
 * PRESERVED FOR ROLLBACK CAPABILITY
 * Use this configuration if V4+ models fail validation
 */

export interface V2ModelWeights {
  pitching: 0.40;
  offense: 0.25; 
  weather_park: 0.20;
  market: 0.15;
}

export interface V2Baselines {
  modelA_pitching: 8.7;
  modelB_offense: 8.0;
  modelC_weather: 7.9;
  modelD_market: 8.5; // market baseline
}

export interface V2WeatherFactors {
  hot_weather_85f: 0.15; // KNOWN UNDERWEIGHTED
  hot_weather_90f: 0.30; // KNOWN UNDERWEIGHTED
  cold_weather_50f: -0.6;
  wind_out_15mph: 0.3;
  wind_in_15mph: -0.4;
}

export interface V2VenueFactors {
  rogers_centre: -0.4; // FAILED 2 EXPLOSIONS
  oracle_park: -0.9;   // FAILED 1 EXPLOSION
  great_american: 0.0; // FAILED 1 EXPLOSION
  coors_field: 1.8;
  fenway_park: 0.4;
  yankee_stadium: 0.5;
}

export interface V2ExplosiveTeams {
  // NONE - Major weakness leading to failures
  rangers: 0.0;    // FAILED 2 EXPLOSIONS
  blue_jays: 0.0;  // FAILED 2 EXPLOSIONS  
  yankees: 0.0;    // FAILED 1 EXPLOSION (20 runs)
}

export interface V2ConfidenceSettings {
  base_range: [60, 80];
  recalibration_factor: 0.75; // 25% reduction
  agreement_penalty: 3; // per disagreeing model
  minimum_confidence: 45;
  maximum_confidence: 75;
}

export const V2_CONFIGURATION = {
  model_weights: {
    pitching: 0.40,
    offense: 0.25,
    weather_park: 0.20,
    market: 0.15
  },
  baselines: {
    modelA_pitching: 8.7,
    modelB_offense: 8.0,
    modelC_weather: 7.9,
    modelD_market: 8.5
  },
  weather_factors: {
    hot_85f: 0.15,
    hot_90f: 0.30,
    cold_50f: -0.6,
    wind_out: 0.3,
    wind_in: -0.4
  },
  venue_factors: {
    "Rogers Centre": -0.4,
    "Oracle Park": -0.9,
    "Great American Ball Park": 0.0,
    "Coors Field": 1.8,
    "Fenway Park": 0.4,
    "Yankee Stadium": 0.5,
    "Petco Park": -0.5,
    "Tropicana Field": -0.3
  },
  explosive_teams: {
    // No explosive team detection - major weakness
  },
  confidence: {
    base_range: [60, 80],
    recalibration: 0.75,
    agreement_penalty: 3,
    min_confidence: 45,
    max_confidence: 75
  },
  performance_record: {
    accuracy: 61.5,
    roi: 17.7,
    under_bias: 100.0,
    games_tested: 26,
    validation_date: "2025-08-17",
    validation_win_rate: 42.9,
    avg_error: 3.93
  }
};

/**
 * ROLLBACK INSTRUCTIONS:
 * 
 * If V4+ models fail validation (accuracy < 55% for 3+ days):
 * 1. Copy this configuration to main model files
 * 2. Remove explosive detection features
 * 3. Restore original weather/venue factors
 * 4. Reset baselines to V2 values
 * 5. Document rollback reason and date
 */