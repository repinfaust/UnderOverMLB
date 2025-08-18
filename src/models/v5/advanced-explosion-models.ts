/**
 * V5 Model: Advanced Explosion Detection with Multi-Layer Analysis
 * 
 * Based on V4 failure analysis from August 17, 2025:
 * - Phillies @ Nationals 20-run explosion missed (V4 predicted Under 8.39)
 * - White Sox @ Royals hot weather overcorrection (V4 predicted Over 8.52, actual 8)
 * 
 * Key V5 Enhancements:
 * 1. Multi-layer hot weather system with team offensive scaling
 * 2. Enhanced explosive team detection (Phillies, Nationals added)
 * 3. Venue-weather interaction matrix
 * 4. Advanced explosion risk calculation with dynamic thresholds
 * 5. Failure pattern recognition and adaptation
 */

export interface V5ModelResult {
  prediction: 'Over' | 'Under';
  confidence: number;
  total: number;
  explosion_risk: number;
  factors_considered: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  adjustments_applied: {
    base_weather: number;
    team_scaled_weather: number;
    venue_weather_interaction: number;
    explosive_teams: number;
    advanced_bullpen: number;
    rivalry_intensity: number;
    failure_pattern_correction: number;
  };
  team_profiles: {
    home_offense_rating: number;
    away_offense_rating: number;
    combined_explosion_potential: number;
  };
}

export interface V5GameFactors {
  home_team: string;
  away_team: string;
  venue: string;
  date: string;
  weather: {
    temp_f: number;
    humidity: number;
    wind_speed_mph: number;
    wind_direction: string;
    conditions: string;
  };
  park_factors: {
    runs_factor: number;
    hr_factor: number;
    altitude: number;
  };
  starting_pitchers?: {
    home: { name: string; era?: number; whip?: number };
    away: { name: string; era?: number; whip?: number };
  };
}

/**
 * V5 Team Offensive Rating System
 * Based on explosion analysis and offensive capability
 */
interface V5TeamProfile {
  offense_rating: number;        // 0.5-1.5 scale
  heat_sensitivity: number;      // How much team benefits from hot weather (0.5-2.0)
  explosion_risk: number;        // Base explosion probability (0.05-0.25)
  venue_synergy: {[venue: string]: number}; // Venue-specific bonuses
  rivalry_boost: number;         // Additional intensity in rivalry games
}

const v5TeamProfiles: Record<string, V5TeamProfile> = {
  // EXPLOSIVE TIER (1.3-1.5 offense rating)
  'Yankees': { 
    offense_rating: 1.5, 
    heat_sensitivity: 1.8,        // Extreme heat response (validated 20-run game)
    explosion_risk: 0.25,
    venue_synergy: { 'Yankee Stadium': 0.5, 'Fenway Park': 0.3 },
    rivalry_boost: 0.4
  },
  'Phillies': {                   // NEW - missed 20-run explosion
    offense_rating: 1.4,
    heat_sensitivity: 1.6,        // Strong heat response (85°F → 20 runs)
    explosion_risk: 0.22,
    venue_synergy: { 'Citizens Bank Park': 0.4, 'Nationals Park': 0.3 },
    rivalry_boost: 0.3
  },
  'Dodgers': { 
    offense_rating: 1.4, 
    heat_sensitivity: 1.4, 
    explosion_risk: 0.20,
    venue_synergy: { 'Dodger Stadium': 0.3, 'Coors Field': 0.6 },
    rivalry_boost: 0.3
  },
  'Braves': { 
    offense_rating: 1.3, 
    heat_sensitivity: 1.5,        // Southern team, heat adapted
    explosion_risk: 0.18,
    venue_synergy: { 'Truist Park': 0.3 },
    rivalry_boost: 0.3
  },
  
  // STRONG TIER (1.0-1.2 offense rating)  
  'Rangers': { 
    offense_rating: 1.2, 
    heat_sensitivity: 1.7,        // Texas heat adaptation (validated)
    explosion_risk: 0.15,
    venue_synergy: { 'Globe Life Field': 0.4, 'Rogers Centre': 0.3 },
    rivalry_boost: 0.2
  },
  'Blue Jays': { 
    offense_rating: 1.1, 
    heat_sensitivity: 1.3, 
    explosion_risk: 0.18,         // Validated explosion pattern
    venue_synergy: { 'Rogers Centre': 0.5 },
    rivalry_boost: 0.2
  },
  'Astros': { 
    offense_rating: 1.1, 
    heat_sensitivity: 1.4,        // Houston heat
    explosion_risk: 0.15,
    venue_synergy: { 'Daikin Park': 0.3 },
    rivalry_boost: 0.2
  },
  'Orioles': { 
    offense_rating: 1.0, 
    heat_sensitivity: 1.2, 
    explosion_risk: 0.12,
    venue_synergy: { 'Camden Yards': 0.3 },
    rivalry_boost: 0.2
  },
  
  // AVERAGE TIER (0.8-0.9 offense rating)
  'Nationals': {                  // NEW - 20-run explosion at home
    offense_rating: 0.9,
    heat_sensitivity: 1.0,
    explosion_risk: 0.12,
    venue_synergy: { 'Nationals Park': 0.4 }, // Strong home field explosion
    rivalry_boost: 0.2
  },
  'Red Sox': { 
    offense_rating: 0.9, 
    heat_sensitivity: 1.1, 
    explosion_risk: 0.10,
    venue_synergy: { 'Fenway Park': 0.4 },
    rivalry_boost: 0.4             // Yankees rivalry
  },
  'Royals': { 
    offense_rating: 0.8, 
    heat_sensitivity: 0.8,        // Modest heat response
    explosion_risk: 0.08,
    venue_synergy: { 'Kauffman Stadium': -0.2 }, // Pitcher-friendly even in heat
    rivalry_boost: 0.1
  },
  
  // WEAK TIER (0.5-0.7 offense rating)
  'White Sox': {                  // Validated weak offense in heat
    offense_rating: 0.5, 
    heat_sensitivity: 0.6,        // Minimal heat benefit
    explosion_risk: 0.05,
    venue_synergy: { 'Guaranteed Rate Field': -0.1 },
    rivalry_boost: 0.1
  },
  'Athletics': { 
    offense_rating: 0.6, 
    heat_sensitivity: 0.7, 
    explosion_risk: 0.06,
    venue_synergy: {},
    rivalry_boost: 0.1
  },
  'Marlins': { 
    offense_rating: 0.6, 
    heat_sensitivity: 0.8,        // Florida heat adaptation
    explosion_risk: 0.06,
    venue_synergy: { 'loanDepot park': -0.3 },
    rivalry_boost: 0.1
  }
};

/**
 * V5 Venue-Weather Interaction Matrix
 * Based on failure analysis of Nationals Park (heat island) and Kauffman (heat resistant)
 */
const venueWeatherInteractions: Record<string, {
  hot_weather_multiplier: number;
  temp_threshold: number;
  altitude_factor?: number;
}> = {
  'Nationals Park': {
    hot_weather_multiplier: 1.8,  // Heat island effect (20-run game)
    temp_threshold: 80             // Lower threshold for DC heat
  },
  'Kauffman Stadium': {
    hot_weather_multiplier: 0.6,  // Pitcher-friendly even in heat (validated)
    temp_threshold: 90
  },
  'Globe Life Field': {
    hot_weather_multiplier: 1.5,  // Texas heat-friendly
    temp_threshold: 85
  },
  'Rogers Centre': {
    hot_weather_multiplier: 1.2,  // Dome amplifies heat
    temp_threshold: 82
  },
  'Daikin Park': {
    hot_weather_multiplier: 1.4,  // Houston heat dome
    temp_threshold: 85
  },
  'Citizens Bank Park': {
    hot_weather_multiplier: 1.3,  // Philadelphia heat
    temp_threshold: 83
  },
  'Coors Field': {
    hot_weather_multiplier: 2.0,  // Altitude + heat = extreme
    temp_threshold: 78,
    altitude_factor: 1.5
  },
  'Fenway Park': {
    hot_weather_multiplier: 1.1,  // Moderate heat response
    temp_threshold: 85
  },
  'Yankee Stadium': {
    hot_weather_multiplier: 1.4,  // Bronx heat
    temp_threshold: 83
  }
};

/**
 * V5 Multi-Layer Hot Weather System
 * Layer 1: Base temperature adjustment
 * Layer 2: Team offensive capability scaling  
 * Layer 3: Venue-specific interactions
 * Layer 4: Pitcher quality resistance
 */
function getV5MultiLayerWeatherAdjustment(
  gameFactors: V5GameFactors,
  homeProfile: V5TeamProfile,
  awayProfile: V5TeamProfile,
  elitePitcherCount: number
): { adjustment: number; factors: string[] } {
  
  const factors: string[] = [];
  const temp_f = gameFactors.weather.temp_f;
  
  // Layer 1: Base Temperature Adjustment (enhanced from V4)
  let baseHeatAdjustment = 0;
  if (temp_f > 95) {
    baseHeatAdjustment = 1.2;     // Extreme heat (up from V4's 1.0)
    factors.push('v5_extreme_heat_base');
  } else if (temp_f > 90) {
    baseHeatAdjustment = 0.9;     // Very hot (up from V4's 0.7)
    factors.push('v5_very_hot_base');
  } else if (temp_f > 85) {
    baseHeatAdjustment = 0.6;     // Hot (up from V4's 0.4)
    factors.push('v5_hot_weather_base');
  } else if (temp_f > 80) {
    baseHeatAdjustment = 0.3;
    factors.push('v5_warm_weather_base');
  }
  
  // Layer 2: Team Offensive Capability Scaling
  const avgOffenseRating = (homeProfile.offense_rating + awayProfile.offense_rating) / 2;
  const avgHeatSensitivity = (homeProfile.heat_sensitivity + awayProfile.heat_sensitivity) / 2;
  
  const teamScaledAdjustment = baseHeatAdjustment * avgOffenseRating * avgHeatSensitivity;
  
  if (avgOffenseRating > 1.2 && baseHeatAdjustment > 0.5) {
    factors.push('v5_explosive_teams_heat_amplified');
  } else if (avgOffenseRating < 0.7 && baseHeatAdjustment > 0.5) {
    factors.push('v5_weak_teams_heat_resistance');
  }
  
  // Layer 3: Venue-Specific Interactions
  let venueWeatherBonus = 0;
  const venueInteraction = venueWeatherInteractions[gameFactors.venue];
  
  if (venueInteraction && temp_f >= venueInteraction.temp_threshold) {
    venueWeatherBonus = baseHeatAdjustment * (venueInteraction.hot_weather_multiplier - 1.0);
    factors.push(`v5_venue_heat_interaction_${gameFactors.venue.replace(/\s+/g, '_').toLowerCase()}`);
    
    if (venueInteraction.altitude_factor) {
      venueWeatherBonus *= venueInteraction.altitude_factor;
      factors.push('v5_altitude_heat_amplification');
    }
  }
  
  // Layer 4: Pitcher Quality Heat Resistance
  let pitcherHeatResistance = 0;
  if (elitePitcherCount >= 2 && baseHeatAdjustment > 0.4) {
    pitcherHeatResistance = -baseHeatAdjustment * 0.3; // Elite pitchers resist heat
    factors.push('v5_elite_pitchers_heat_resistance');
  } else if (elitePitcherCount === 1 && baseHeatAdjustment > 0.4) {
    pitcherHeatResistance = -baseHeatAdjustment * 0.15;
    factors.push('v5_elite_pitcher_heat_resistance');
  }
  
  const totalAdjustment = teamScaledAdjustment + venueWeatherBonus + pitcherHeatResistance;
  
  return { adjustment: totalAdjustment, factors };
}

/**
 * V5 Advanced Explosion Risk Calculation
 * Dynamic thresholds based on multiple factors
 */
function calculateV5ExplosionRisk(
  homeProfile: V5TeamProfile,
  awayProfile: V5TeamProfile,
  weatherAdjustment: number,
  venueBonus: number,
  rivalryFactor: number
): { risk: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' } {
  
  let baseRisk = Math.max(homeProfile.explosion_risk, awayProfile.explosion_risk);
  
  // Multi-team explosion amplification
  if (homeProfile.explosion_risk > 0.15 && awayProfile.explosion_risk > 0.15) {
    baseRisk += 0.1; // Both teams explosive
  }
  
  // Weather explosion factor
  if (weatherAdjustment > 0.8) {
    baseRisk += 0.12; // Hot weather explosions
  } else if (weatherAdjustment > 0.5) {
    baseRisk += 0.06;
  }
  
  // Venue explosion factor
  if (venueBonus > 0.5) {
    baseRisk += 0.08; // Launch pad venues
  }
  
  // Rivalry explosion factor
  if (rivalryFactor > 0.2) {
    baseRisk += 0.05; // Rivalry intensity
  }
  
  // Cap maximum risk
  const finalRisk = Math.min(0.40, baseRisk);
  
  // Determine risk level
  let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  if (finalRisk < 0.10) {
    level = 'LOW';
  } else if (finalRisk < 0.20) {
    level = 'MEDIUM';
  } else if (finalRisk < 0.30) {
    level = 'HIGH';
  } else {
    level = 'EXTREME';
  }
  
  return { risk: finalRisk, level };
}

/**
 * V5 Failure Pattern Recognition and Correction
 * Learns from specific failure patterns to adjust predictions
 */
function applyV5FailurePatternCorrections(
  gameFactors: V5GameFactors,
  homeProfile: V5TeamProfile,
  awayProfile: V5TeamProfile,
  currentTotal: number
): { adjustment: number; factors: string[] } {
  
  let adjustment = 0;
  const factors: string[] = [];
  
  // Pattern 1: Hot Weather + Strong Offense Underestimate
  if (gameFactors.weather.temp_f > 85 && 
      (homeProfile.offense_rating > 1.2 || awayProfile.offense_rating > 1.2)) {
    adjustment += 0.3; // Additional heat boost for strong teams
    factors.push('v5_hot_weather_strong_offense_correction');
  }
  
  // Pattern 2: Weak Offense Hot Weather Overcorrection Prevention
  if (gameFactors.weather.temp_f > 85 && 
      homeProfile.offense_rating < 0.8 && awayProfile.offense_rating < 0.8) {
    adjustment -= 0.2; // Reduce heat boost for weak teams
    factors.push('v5_weak_offense_heat_overcorrection_prevention');
  }
  
  // Pattern 3: Division Rival High-Scoring Games
  const divisionRivals = [
    ['Phillies', 'Nationals'], ['Yankees', 'Red Sox'], ['Dodgers', 'Giants'],
    ['Cubs', 'Cardinals'], ['Rangers', 'Astros']
  ];
  
  const isRivalry = divisionRivals.some(([team1, team2]) => 
    (gameFactors.home_team.includes(team1) && gameFactors.away_team.includes(team2)) ||
    (gameFactors.home_team.includes(team2) && gameFactors.away_team.includes(team1))
  );
  
  if (isRivalry) {
    adjustment += 0.4; // Rivalry intensity boost
    factors.push('v5_division_rivalry_intensity');
  }
  
  // Pattern 4: Weekend Bullpen Fatigue Amplification
  const gameDate = new Date(gameFactors.date);
  const isWeekend = gameDate.getDay() === 0 || gameDate.getDay() === 6;
  
  if (isWeekend && currentTotal > 8.0) {
    adjustment += 0.2; // Weekend fatigue amplification
    factors.push('v5_weekend_bullpen_fatigue_amplification');
  }
  
  return { adjustment, factors };
}

/**
 * V5 Main Model Function
 * Integrates all advanced V5 components
 */
export function runV5AdvancedModel(gameFactors: V5GameFactors): V5ModelResult {
  
  // Get team profiles (with defaults for missing teams)
  const getTeamProfile = (teamName: string): V5TeamProfile => {
    const foundProfile = Object.entries(v5TeamProfiles).find(([key]) => 
      teamName.includes(key)
    );
    
    if (foundProfile) {
      return foundProfile[1];
    }
    
    // Default profile for untracked teams
    return {
      offense_rating: 0.8,
      heat_sensitivity: 1.0,
      explosion_risk: 0.08,
      venue_synergy: {},
      rivalry_boost: 0.1
    };
  };
  
  const homeProfile = getTeamProfile(gameFactors.home_team);
  const awayProfile = getTeamProfile(gameFactors.away_team);
  
  // Start with lowered V5 baseline (further reduced from V4)
  let baseTotal = 7.5; // Reduced from V4's 7.8
  const factorsConsidered: string[] = ['v5_lowered_baseline'];
  
  const adjustments = {
    base_weather: 0,
    team_scaled_weather: 0,
    venue_weather_interaction: 0,
    explosive_teams: 0,
    advanced_bullpen: 0,
    rivalry_intensity: 0,
    failure_pattern_correction: 0
  };
  
  // Elite pitcher detection (preserved from V4)
  const elitePitchers = [
    'Gerrit Cole', 'Jacob deGrom', 'Shohei Ohtani', 'Spencer Strider',
    'Yoshinobu Yamamoto', 'Luis Castillo', 'Shane Bieber', 'Dylan Cease',
    'Logan Webb', 'Zac Gallen', 'Corbin Burnes', 'Sandy Alcantara',
    'Aaron Nola', 'Tyler Glasnow', 'Yu Darvish', 'Max Scherzer'
  ];
  
  let elitePitcherCount = 0;
  if (gameFactors.starting_pitchers) {
    [gameFactors.starting_pitchers.home.name, gameFactors.starting_pitchers.away.name]
      .forEach(pitcher => {
        if (elitePitchers.some(elite => pitcher.toLowerCase().includes(elite.toLowerCase()))) {
          elitePitcherCount++;
        }
      });
  }
  
  // Apply elite pitcher adjustment (slightly reduced from V4)
  if (elitePitcherCount >= 2) {
    baseTotal -= 0.8; // Reduced from V4's -1.0
    factorsConsidered.push('v5_dual_elite_pitching');
  } else if (elitePitcherCount === 1) {
    baseTotal -= 0.5; // Reduced from V4's -0.6
    factorsConsidered.push('v5_elite_pitcher_present');
  }
  
  // V5 Multi-Layer Weather System
  const weatherResult = getV5MultiLayerWeatherAdjustment(
    gameFactors, homeProfile, awayProfile, elitePitcherCount
  );
  baseTotal += weatherResult.adjustment;
  adjustments.team_scaled_weather = weatherResult.adjustment;
  factorsConsidered.push(...weatherResult.factors);
  
  // Explosive teams bonus
  const explosiveBonus = (homeProfile.offense_rating - 1.0) * 0.5 + 
                        (awayProfile.offense_rating - 1.0) * 0.5;
  if (explosiveBonus > 0) {
    baseTotal += explosiveBonus;
    adjustments.explosive_teams = explosiveBonus;
    factorsConsidered.push('v5_explosive_teams_bonus');
  }
  
  // Venue synergy bonuses
  let venueBonus = 0;
  if (homeProfile.venue_synergy[gameFactors.venue]) {
    venueBonus += homeProfile.venue_synergy[gameFactors.venue];
    factorsConsidered.push('v5_home_venue_synergy');
  }
  if (awayProfile.venue_synergy[gameFactors.venue]) {
    venueBonus += awayProfile.venue_synergy[gameFactors.venue];
    factorsConsidered.push('v5_away_venue_synergy');
  }
  baseTotal += venueBonus;
  
  // Advanced bullpen fatigue (enhanced from V4)
  const gameDate = new Date(gameFactors.date);
  const dayOfWeek = gameDate.getDay();
  let bullpenFatigue = 0;
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    bullpenFatigue = 0.4; // Increased weekend fatigue
  } else if (dayOfWeek === 1 || dayOfWeek === 5) {
    bullpenFatigue = 0.2; // Monday/Friday moderate fatigue
  }
  
  baseTotal += bullpenFatigue;
  adjustments.advanced_bullpen = bullpenFatigue;
  
  // Rivalry intensity
  const rivalryBonus = Math.max(homeProfile.rivalry_boost, awayProfile.rivalry_boost);
  if (rivalryBonus > 0.2) {
    baseTotal += rivalryBonus;
    adjustments.rivalry_intensity = rivalryBonus;
    factorsConsidered.push('v5_rivalry_intensity');
  }
  
  // V5 Failure Pattern Corrections
  const patternResult = applyV5FailurePatternCorrections(
    gameFactors, homeProfile, awayProfile, baseTotal
  );
  baseTotal += patternResult.adjustment;
  adjustments.failure_pattern_correction = patternResult.adjustment;
  factorsConsidered.push(...patternResult.factors);
  
  // Calculate explosion risk
  const explosionResult = calculateV5ExplosionRisk(
    homeProfile, awayProfile, weatherResult.adjustment, venueBonus, rivalryBonus
  );
  
  // Confidence calculation (more conservative than V4)
  let confidence = 60; // Lower starting confidence
  
  // Reduce confidence for high explosion risk
  if (explosionResult.level === 'EXTREME') {
    confidence -= 20;
  } else if (explosionResult.level === 'HIGH') {
    confidence -= 15;
  } else if (explosionResult.level === 'MEDIUM') {
    confidence -= 8;
  }
  
  // Reduce confidence for extreme adjustments
  const totalAdjustment = Math.abs(weatherResult.adjustment) + 
                         Math.abs(explosiveBonus) + 
                         Math.abs(patternResult.adjustment);
  
  if (totalAdjustment > 2.0) {
    confidence -= 12;
  } else if (totalAdjustment > 1.0) {
    confidence -= 6;
  }
  
  // Apply bounds
  const final_total = Math.max(3.5, Math.min(19.0, baseTotal));
  confidence = Math.max(40, Math.min(70, confidence)); // Lower max than V4
  
  const prediction = final_total > 8.5 ? 'Over' : 'Under';
  
  return {
    prediction,
    confidence: Math.round(confidence * 10) / 10,
    total: Math.round(final_total * 100) / 100,
    explosion_risk: Math.round(explosionResult.risk * 100) / 100,
    factors_considered: factorsConsidered,
    risk_level: explosionResult.level,
    adjustments_applied: adjustments,
    team_profiles: {
      home_offense_rating: homeProfile.offense_rating,
      away_offense_rating: awayProfile.offense_rating,
      combined_explosion_potential: (homeProfile.explosion_risk + awayProfile.explosion_risk)
    }
  };
}

/**
 * V5 Recommendation Engine with Advanced Risk Management
 */
export function getV5Recommendation(result: V5ModelResult, marketLine?: number): string {
  // Extreme risk override
  if (result.risk_level === 'EXTREME') {
    return 'NO PLAY - EXTREME EXPLOSION RISK';
  }
  
  // High risk games require very high confidence
  if (result.risk_level === 'HIGH' && result.confidence < 60) {
    return 'NO PLAY - High explosion risk, low confidence';
  }
  
  // Low confidence override
  if (result.confidence < 48) {
    return 'NO PLAY - Low confidence';
  }
  
  if (!marketLine) {
    return result.confidence > 55 ? `SLIGHT ${result.prediction}` : 'NO PLAY';
  }
  
  const edge = Math.abs(result.total - marketLine);
  
  if (edge < 0.25) {
    return 'NO PLAY - No significant edge';
  } else if (edge < 0.5) {
    return result.confidence > 55 ? `SLIGHT ${result.prediction}` : 'NO PLAY';
  } else if (edge < 1.0) {
    return `MODERATE ${result.prediction}`;
  } else {
    return result.risk_level === 'LOW' ? `STRONG ${result.prediction}` : `MODERATE ${result.prediction}`;
  }
}