/**
 * Enhanced Training Data Module
 * 
 * Based on bias analysis findings, this module provides more realistic
 * game dynamics and training patterns that reflect actual MLB scoring
 */

export interface RealGameDynamics {
  venue_adjustments: Record<string, number>;
  weather_corrections: Record<string, number>;
  team_scoring_patterns: Record<string, TeamScoringProfile>;
  day_of_week_effects: Record<string, number>;
  monthly_trends: Record<number, number>;
  dome_vs_outdoor: { dome_factor: number; outdoor_factor: number };
}

export interface TeamScoringProfile {
  home_run_factor: number;
  contact_style: 'power' | 'contact' | 'balanced';
  clutch_factor: number;
  late_inning_tendency: number;
  vs_lhp_adjustment: number;
  vs_rhp_adjustment: number;
}

/**
 * Real venue adjustments based on bias analysis
 * Positive = more runs than predicted, Negative = fewer runs
 */
export const VENUE_REALITY_ADJUSTMENTS: Record<string, number> = {
  // Major under-predictions (models missing offensive factors)
  'Yankee Stadium': +3.14,
  'Angel Stadium': +2.78,
  'Nationals Park': +2.62,
  'Comerica Park': +2.56,
  'George M. Steinbrenner Field': +1.85,
  'Rogers Centre': +1.48,
  'Coors Field': +2.8, // ML-adjusted: was severely under-predicting (was +1.45)
  'Busch Stadium': +1.40,
  'Dodger Stadium': +1.37,
  'Target Field': +1.22,
  'Daikin Park': +1.02,
  'Citi Field': +0.86,
  'Fenway Park': +0.84,
  'Citizens Bank Park': +0.47,
  'Wrigley Field': +0.32,
  
  // Major over-predictions (models missing pitcher advantages)
  'Petco Park': -2.57,
  'loanDepot park': -2.33,
  'Globe Life Field': -2.25,
  'Oracle Park': -1.55,
  'Kauffman Stadium': -1.50,
  'Great American Ball Park': -1.00,
  'T-Mobile Park': -0.83,
  'American Family Field': -0.82,
  'PNC Park': -0.74,
  'Minute Maid Park': -0.66,
  
  // Default for unlisted venues
  'default': 0.0
};

/**
 * Weather factor corrections based on actual performance
 */
export const WEATHER_REALITY_CORRECTIONS = {
  hot_weather: {
    threshold_temp: 80,
    actual_factor: 1.19, // ML-adjusted coefficient (was 1.03)
    confidence_penalty: 0.05
  },
  cold_weather: {
    threshold_temp: 60,
    actual_factor: 0.88, // More suppression than models predicted
    confidence_penalty: 0.10
  },
  windy_conditions: {
    threshold_speed: 12,
    wind_out_factor: 1.04, // Reduced from model predictions
    wind_in_factor: 0.84, // More suppression than predicted
    confidence_penalty: 0.08
  },
  dome_games: {
    dome_factor: 1.15, // Domes score more than outdoor (surprising finding)
    outdoor_factor: 0.98,
    confidence_adjustment: -0.05 // Slightly less confident in dome predictions
  },
  high_humidity: {
    threshold: 75,
    suppression_factor: 0.94,
    confidence_penalty: 0.03
  }
};

/**
 * Day of week scoring patterns from actual data
 */
export const DAY_OF_WEEK_REALITY: Record<string, { factor: number; confidence_mod: number }> = {
  'Sunday': { factor: 0.90, confidence_mod: -0.02 }, // Lower scoring
  'Monday': { factor: 0.74, confidence_mod: -0.08 }, // Significantly lower
  'Tuesday': { factor: 1.04, confidence_mod: +0.03 }, // Higher scoring
  'Wednesday': { factor: 0.94, confidence_mod: +0.05 }, // Predictable
  'Thursday': { factor: 1.12, confidence_mod: -0.05 }, // High variance
  'Friday': { factor: 1.01, confidence_mod: +0.02 }, // Average
  'Saturday': { factor: 1.10, confidence_mod: -0.03 }, // High scoring, harder to predict
};

/**
 * Monthly scoring trends (0-11 for Jan-Dec)
 */
export const MONTHLY_SCORING_TRENDS: Record<number, number> = {
  3: 0.95,  // April - Early season, pitchers ahead
  4: 0.98,  // May - Warming up
  5: 1.00,  // June - Baseline
  6: 1.02,  // July - Hot weather peak
  7: 1.01,  // August - Maintained heat
  8: 0.97,  // September - Fatigue, call-ups
  9: 0.94,  // October - Playoffs, better pitching
};

/**
 * Team-specific scoring profiles based on historical patterns
 */
export const TEAM_SCORING_PROFILES: Record<string, TeamScoringProfile> = {
  // High-offense teams that models under-predicted
  'New York Yankees': {
    home_run_factor: 1.25,
    contact_style: 'power',
    clutch_factor: 1.15,
    late_inning_tendency: 1.10,
    vs_lhp_adjustment: 1.08,
    vs_rhp_adjustment: 1.03
  },
  'Los Angeles Angels': {
    home_run_factor: 1.20,
    contact_style: 'balanced',
    clutch_factor: 1.05,
    late_inning_tendency: 1.12,
    vs_lhp_adjustment: 1.12,
    vs_rhp_adjustment: 0.98
  },
  'Washington Nationals': {
    home_run_factor: 1.18,
    contact_style: 'power',
    clutch_factor: 1.08,
    late_inning_tendency: 1.06,
    vs_lhp_adjustment: 1.05,
    vs_rhp_adjustment: 1.08
  },
  'Detroit Tigers': {
    home_run_factor: 1.15,
    contact_style: 'contact',
    clutch_factor: 1.12,
    late_inning_tendency: 1.15,
    vs_lhp_adjustment: 1.02,
    vs_rhp_adjustment: 1.08
  },
  'Texas Rangers': {
    home_run_factor: 1.22,
    contact_style: 'power',
    clutch_factor: 1.03,
    late_inning_tendency: 1.08,
    vs_lhp_adjustment: 1.15,
    vs_rhp_adjustment: 1.05
  },
  
  // Teams where models over-predicted (strong pitching)
  'San Diego Padres': {
    home_run_factor: 0.85,
    contact_style: 'contact',
    clutch_factor: 0.92,
    late_inning_tendency: 0.88,
    vs_lhp_adjustment: 0.95,
    vs_rhp_adjustment: 0.90
  },
  'Miami Marlins': {
    home_run_factor: 0.78,
    contact_style: 'contact',
    clutch_factor: 0.88,
    late_inning_tendency: 0.85,
    vs_lhp_adjustment: 0.92,
    vs_rhp_adjustment: 0.85
  },
  'Seattle Mariners': {
    home_run_factor: 0.88,
    contact_style: 'balanced',
    clutch_factor: 0.95,
    late_inning_tendency: 0.92,
    vs_lhp_adjustment: 0.98,
    vs_rhp_adjustment: 0.88
  },
  
  // Default profile for unlisted teams
  'default': {
    home_run_factor: 1.00,
    contact_style: 'balanced',
    clutch_factor: 1.00,
    late_inning_tendency: 1.00,
    vs_lhp_adjustment: 1.00,
    vs_rhp_adjustment: 1.00
  }
};

/**
 * Situational factors that models missed
 */
export const SITUATIONAL_FACTORS = {
  bullpen_usage: {
    // Models underestimated impact of tired bullpens
    high_usage_penalty: 0.92, // More runs allowed
    fresh_bullpen_bonus: 1.05,
    confidence_impact: 0.08
  },
  
  series_context: {
    // Game 3+ in series tend to score differently
    series_opener: 0.96,
    series_middle: 1.02,
    series_finale: 1.04,
    confidence_impact: 0.03
  },
  
  travel_fatigue: {
    // Cross-country travel impacts scoring
    no_travel: 1.00,
    domestic_travel: 0.98,
    cross_country: 0.94,
    confidence_impact: 0.05
  },
  
  rest_days: {
    // Team rest impacts performance
    back_to_back: 0.96,
    one_day_rest: 1.00,
    two_plus_days: 1.03,
    confidence_impact: 0.04
  }
};

/**
 * Enhanced weather modeling function
 */
export function calculateEnhancedWeatherImpact(weather: any): {
  scoring_factor: number;
  confidence_adjustment: number;
  factors_applied: string[];
} {
  let factor = 1.0;
  let confidenceAdj = 0;
  const factors: string[] = [];
  
  // Temperature effects (corrected based on actual data)
  if (weather.temp_f > WEATHER_REALITY_CORRECTIONS.hot_weather.threshold_temp) {
    factor *= WEATHER_REALITY_CORRECTIONS.hot_weather.actual_factor;
    confidenceAdj -= WEATHER_REALITY_CORRECTIONS.hot_weather.confidence_penalty;
    factors.push('hot_weather_corrected');
  } else if (weather.temp_f < WEATHER_REALITY_CORRECTIONS.cold_weather.threshold_temp) {
    factor *= WEATHER_REALITY_CORRECTIONS.cold_weather.actual_factor;
    confidenceAdj -= WEATHER_REALITY_CORRECTIONS.cold_weather.confidence_penalty;
    factors.push('cold_weather_enhanced');
  }
  
  // Wind effects (more realistic)
  if (weather.wind_speed_mph > WEATHER_REALITY_CORRECTIONS.windy_conditions.threshold_speed) {
    const windDirection = weather.wind_direction || 'variable';
    const windOut = ['S', 'SW', 'SE'].some(dir => windDirection.includes(dir));
    
    if (windOut) {
      factor *= WEATHER_REALITY_CORRECTIONS.windy_conditions.wind_out_factor;
      factors.push('wind_out_corrected');
    } else {
      factor *= WEATHER_REALITY_CORRECTIONS.windy_conditions.wind_in_factor;
      factors.push('wind_in_enhanced');
    }
    confidenceAdj -= WEATHER_REALITY_CORRECTIONS.windy_conditions.confidence_penalty;
  }
  
  // Dome vs outdoor (major finding from analysis)
  if (weather.is_dome) {
    factor *= WEATHER_REALITY_CORRECTIONS.dome_games.dome_factor;
    confidenceAdj += WEATHER_REALITY_CORRECTIONS.dome_games.confidence_adjustment;
    factors.push('dome_boost_applied');
  } else {
    factor *= WEATHER_REALITY_CORRECTIONS.dome_games.outdoor_factor;
    factors.push('outdoor_standard');
  }
  
  // Humidity effects
  if (weather.humidity > WEATHER_REALITY_CORRECTIONS.high_humidity.threshold) {
    factor *= WEATHER_REALITY_CORRECTIONS.high_humidity.suppression_factor;
    confidenceAdj -= WEATHER_REALITY_CORRECTIONS.high_humidity.confidence_penalty;
    factors.push('high_humidity_suppression');
  }
  
  return {
    scoring_factor: Math.round(factor * 1000) / 1000,
    confidence_adjustment: Math.round(confidenceAdj * 100) / 100,
    factors_applied: factors
  };
}

/**
 * Get realistic venue adjustment
 */
export function getVenueRealityAdjustment(venue: string): number {
  return VENUE_REALITY_ADJUSTMENTS[venue] || VENUE_REALITY_ADJUSTMENTS['default'];
}

/**
 * Get team scoring profile
 */
export function getTeamScoringProfile(team: string): TeamScoringProfile {
  return TEAM_SCORING_PROFILES[team] || TEAM_SCORING_PROFILES['default'];
}

/**
 * Calculate day-of-week impact
 */
export function getDayOfWeekImpact(date: string): { factor: number; confidence_mod: number } {
  const gameDate = new Date(date);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[gameDate.getDay()];
  
  return DAY_OF_WEEK_REALITY[dayName] || { factor: 1.0, confidence_mod: 0 };
}

/**
 * Calculate monthly scoring trend
 */
export function getMonthlyTrend(date: string): number {
  const gameDate = new Date(date);
  const month = gameDate.getMonth();
  
  return MONTHLY_SCORING_TRENDS[month] || 1.0;
}

/**
 * Comprehensive reality-based adjustment
 */
export function applyRealityBasedAdjustments(
  baseTotal: number,
  venue: string,
  weather: any,
  homeTeam: string,
  awayTeam: string,
  date: string
): {
  adjusted_total: number;
  confidence_adjustment: number;
  adjustments_applied: string[];
} {
  let adjustedTotal = baseTotal;
  let totalConfidenceAdj = 0;
  const adjustments: string[] = [];
  
  // Apply venue reality adjustment
  const venueAdj = getVenueRealityAdjustment(venue);
  adjustedTotal += venueAdj;
  if (Math.abs(venueAdj) > 0.1) {
    adjustments.push(`venue_reality_${venueAdj > 0 ? 'boost' : 'suppress'}`);
    totalConfidenceAdj += Math.abs(venueAdj) * 0.02; // Confidence penalty for extreme venues
  }
  
  // Apply enhanced weather modeling
  const weatherImpact = calculateEnhancedWeatherImpact(weather);
  adjustedTotal *= weatherImpact.scoring_factor;
  totalConfidenceAdj += weatherImpact.confidence_adjustment;
  adjustments.push(...weatherImpact.factors_applied);
  
  // Apply day of week effects
  const dayImpact = getDayOfWeekImpact(date);
  adjustedTotal *= dayImpact.factor;
  totalConfidenceAdj += dayImpact.confidence_mod;
  if (Math.abs(dayImpact.factor - 1.0) > 0.05) {
    adjustments.push(`day_of_week_${dayImpact.factor > 1.0 ? 'boost' : 'suppress'}`);
  }
  
  // Apply monthly trend
  const monthlyTrend = getMonthlyTrend(date);
  adjustedTotal *= monthlyTrend;
  if (Math.abs(monthlyTrend - 1.0) > 0.02) {
    adjustments.push(`monthly_trend_${monthlyTrend > 1.0 ? 'boost' : 'suppress'}`);
  }
  
  // Apply team-specific factors
  const homeProfile = getTeamScoringProfile(homeTeam);
  const awayProfile = getTeamScoringProfile(awayTeam);
  
  // Average the team factors for overall game impact
  const avgPowerFactor = (homeProfile.home_run_factor + awayProfile.home_run_factor) / 2;
  const avgClutchFactor = (homeProfile.clutch_factor + awayProfile.clutch_factor) / 2;
  
  adjustedTotal *= (avgPowerFactor * 0.6 + avgClutchFactor * 0.4); // Weighted combination
  
  if (Math.abs(avgPowerFactor - 1.0) > 0.1) {
    adjustments.push(`team_power_${avgPowerFactor > 1.0 ? 'boost' : 'suppress'}`);
  }
  
  return {
    adjusted_total: Math.round(adjustedTotal * 100) / 100,
    confidence_adjustment: Math.round(totalConfidenceAdj * 100) / 100,
    adjustments_applied: adjustments
  };
}