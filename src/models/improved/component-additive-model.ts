/**
 * Component-Additive MLB Prediction Model
 * 
 * Replaces the flawed weighted ensemble approach with transparent,
 * additive components that each contribute specific insights.
 * 
 * Key advantages:
 * - No arbitrary weighting between pseudo-independent models
 * - Each component contributes independently 
 * - Transparent and debuggable
 * - Natural balance without bias oscillation
 * - Realistic bounds and uncertainty
 */

export interface GameData {
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
  starting_pitchers?: {
    home: string;
    away: string;
  };
  park_factors?: {
    runs_factor: number;
    hr_factor: number;
    altitude: number;
  };
  market_line?: number;
}

export interface ComponentBreakdown {
  league_baseline: number;
  pitching_adjustment: number;
  offense_adjustment: number;
  weather_adjustment: number;
  venue_adjustment: number;
  market_correction: number;
  total_before_bounds: number;
  final_total: number;
  confidence: number;
  prediction: 'Over' | 'Under';
  components_contributing: string[];
}

/**
 * Calculate MLB baseline runs for given month/year
 * Based on actual league-wide scoring patterns
 */
function getLeagueBaseline(month: number, year: number): number {
  // MLB 2025 scoring patterns (would be updated with real data)
  const monthlyBaselines: { [key: number]: number } = {
    3: 8.8,  // March (Spring Training carryover, pitchers not sharp)
    4: 8.4,  // April (Cold weather, pitchers getting sharp)
    5: 8.6,  // May (Warming up, balanced)
    6: 8.3,  // June (Pitchers hitting stride)
    7: 8.2,  // July (Pitchers dominant, hot weather offset) - Increased slightly
    8: 8.7,  // August (ML-adjusted baseline from 8.1, was showing -2.94 run bias)
    9: 8.4,  // September (Fatigue vs September callups)
    10: 8.6, // October (Playoffs, mixed conditions)
  };
  
  return monthlyBaselines[month] || 8.3;
}

/**
 * Calculate pitching adjustment based on starter quality and matchup
 * Range: -2.5 to +1.5 runs
 */
function getPitchingAdjustment(gameData: GameData): { adjustment: number; factors: string[] } {
  let adjustment = 0;
  const factors: string[] = [];
  
  // Elite pitcher detection (much stronger impact than weighted model)
  const elitePitchers = [
    'Gerrit Cole', 'Jacob deGrom', 'Shohei Ohtani', 'Spencer Strider', 
    'Yoshinobu Yamamoto', 'Luis Castillo', 'Shane Bieber', 'Dylan Cease',
    'Logan Webb', 'Zac Gallen', 'Corbin Burnes', 'Sandy Alcantara'
  ];
  
  const pitchers = [
    gameData.starting_pitchers?.home || '',
    gameData.starting_pitchers?.away || ''
  ];
  
  const eliteCount = pitchers.filter(p => 
    elitePitchers.some(elite => p.includes(elite.split(' ')[1]))
  ).length;
  
  if (eliteCount === 2) {
    adjustment -= 2.0; // Two elite pitchers = significant run suppression
    factors.push('dual_elite_pitching');
  } else if (eliteCount === 1) {
    adjustment -= 1.1; // One elite pitcher = moderate suppression
    factors.push('elite_pitcher_present');
  }
  
  // Rookie/spot starter penalty (opposite effect)
  const rookiePitchers = ['Chase Burns', 'Troy Melton', 'Jacob Misiorowski'];
  const rookieCount = pitchers.filter(p => 
    rookiePitchers.some(rookie => p.includes(rookie.split(' ')[1]))
  ).length;
  
  if (rookieCount >= 1) {
    adjustment += 0.6 * rookieCount; // Rookies tend to allow more runs
    factors.push('rookie_starter_risk');
  }
  
  // Late season effects (from game date - approximated)
  const gameDate = new Date(gameData.date);
  const month = gameDate.getMonth() + 1;
  const dayOfSeason = gameDate.getTime() - new Date('2025-03-01').getTime();
  const fatigueIndex = Math.min(1.0, dayOfSeason / (1000 * 60 * 60 * 24 * 180)); // 0-1 over season
  
  // August pitcher dominance pattern
  if (month === 8) {
    adjustment -= 0.2; // August pitcher effectiveness
    factors.push('august_pitcher_dominance');
  }
  
  if (fatigueIndex > 0.7) { // Late season fatigue
    adjustment += 0.3; // Tired bullpens allow more runs
    factors.push('late_season_bullpen_fatigue');
  }
  
  // Ensure realistic bounds
  adjustment = Math.max(-2.5, Math.min(1.5, adjustment));
  
  return { adjustment, factors };
}

/**
 * Calculate offensive adjustment based on team quality and matchups
 * Range: -1.2 to +2.0 runs
 */
function getOffenseAdjustment(gameData: GameData): { adjustment: number; factors: string[] } {
  let adjustment = 0;
  const factors: string[] = [];
  
  // High-powered offense detection
  const highOffenseTeams = [
    'Yankees', 'Dodgers', 'Braves', 'Astros', 'Rangers', 'Blue Jays'
  ];
  
  const teams = [gameData.home_team, gameData.away_team];
  const highOffenseCount = teams.filter(team => 
    highOffenseTeams.some(offense => team.includes(offense))
  ).length;
  
  if (highOffenseCount === 2) {
    adjustment += 1.2; // Two offensive powerhouses
    factors.push('dual_offensive_powerhouses');
  } else if (highOffenseCount === 1) {
    adjustment += 0.6; // One strong offense
    factors.push('strong_offense_present');
  }
  
  // Poor offense penalty
  const weakOffenseTeams = ['Athletics', 'Marlins', 'White Sox'];
  const weakOffenseCount = teams.filter(team => 
    weakOffenseTeams.some(weak => team.includes(weak))
  ).length;
  
  if (weakOffenseCount >= 1) {
    adjustment -= 0.4 * weakOffenseCount;
    factors.push('weak_offense_present');
  }
  
  // Rivalry game boost (genuine intensity effect)
  const rivalries = [
    ['Yankees', 'Red Sox'], ['Dodgers', 'Giants'], ['Cubs', 'Cardinals'],
    ['Mets', 'Phillies'], ['Angels', 'Astros']
  ];
  
  const isRivalry = rivalries.some(([team1, team2]) => 
    (gameData.home_team.includes(team1) && gameData.away_team.includes(team2)) ||
    (gameData.home_team.includes(team2) && gameData.away_team.includes(team1))
  );
  
  if (isRivalry) {
    adjustment += 0.4; // Rivalry intensity
    factors.push('rivalry_game_intensity');
  }
  
  // Ensure realistic bounds
  adjustment = Math.max(-1.2, Math.min(2.0, adjustment));
  
  return { adjustment, factors };
}

/**
 * Calculate weather adjustment
 * Range: -0.8 to +0.6 runs
 */
function getWeatherAdjustment(gameData: GameData): { adjustment: number; factors: string[] } {
  let adjustment = 0;
  const factors: string[] = [];
  
  const weather = gameData.weather;
  
  // Temperature effects (reduced coefficients after August 1st failures)
  if (weather.temp_f > 95) {
    adjustment += 0.38; // Extreme heat - reduced from 0.5
    factors.push('extreme_heat');
  } else if (weather.temp_f > 90) {
    adjustment += 0.23; // Very hot weather - reduced from 0.3
    factors.push('very_hot_weather');
  } else if (weather.temp_f > 85) {
    adjustment += 0.15; // Hot weather - reduced from 0.2
    factors.push('hot_weather');
  } else if (weather.temp_f < 50) {
    adjustment -= 0.6; // Cold significantly suppresses offense
    factors.push('cold_weather_suppression');
  } else if (weather.temp_f < 60) {
    adjustment -= 0.3; // Cool weather
    factors.push('cool_weather');
  }
  
  // Wind effects (directional)
  const windOut = ['S', 'SW', 'SE'].some(dir => weather.wind_direction.includes(dir));
  
  if (weather.wind_speed_mph > 20) {
    adjustment += windOut ? 0.4 : -0.5; // Strong winds
    factors.push(windOut ? 'strong_wind_out' : 'strong_wind_in');
  } else if (weather.wind_speed_mph > 12) {
    adjustment += windOut ? 0.2 : -0.2; // Moderate winds
    factors.push(windOut ? 'moderate_wind_out' : 'moderate_wind_in');
  }
  
  // Humidity effects (new factor)
  if (weather.humidity > 80) {
    adjustment -= 0.1; // High humidity suppresses balls
    factors.push('high_humidity');
  }
  
  // Ensure realistic bounds
  adjustment = Math.max(-0.8, Math.min(0.6, adjustment));
  
  return { adjustment, factors };
}

/**
 * Calculate venue adjustment based on park factors
 * Range: -1.2 to +1.0 runs
 */
function getVenueAdjustment(gameData: GameData): { adjustment: number; factors: string[] } {
  let adjustment = 0;
  const factors: string[] = [];
  
  // Known hitter-friendly parks
  const hitterParks: { [key: string]: number } = {
    'Yankee Stadium': 0.4,
    'Fenway Park': 0.3,
    'Camden Yards': 0.2,
    'Target Field': 0.3,
    'Globe Life Field': 0.2,
    'Coors Field': 1.8, // ML-adjusted: was severely under-predicting (was 1.0)
  };
  
  // Known pitcher-friendly parks (increased impact for balance)
  const pitcherParks: { [key: string]: number } = {
    'Petco Park': -0.7,
    'Oracle Park': -0.9,
    'Marlins Park': -0.5,
    'Tropicana Field': -0.4,
    'Kauffman Stadium': -0.3,
    'Comerica Park': -0.2,
    'Progressive Field': -0.2,
  };
  
  // Apply park factors
  for (const [park, factor] of Object.entries(hitterParks)) {
    if (gameData.venue.includes(park) || gameData.venue.includes(park.split(' ')[0])) {
      adjustment += factor;
      factors.push(`hitter_friendly_${park.replace(' ', '_').toLowerCase()}`);
      break;
    }
  }
  
  for (const [park, factor] of Object.entries(pitcherParks)) {
    if (gameData.venue.includes(park) || gameData.venue.includes(park.split(' ')[0])) {
      adjustment += factor; // Already negative
      factors.push(`pitcher_friendly_${park.replace(' ', '_').toLowerCase()}`);
      break;
    }
  }
  
  // Altitude adjustment
  if (gameData.park_factors?.altitude && gameData.park_factors.altitude > 3000) {
    adjustment += 0.6; // High altitude helps offense
    factors.push('high_altitude');
  }
  
  // Ensure realistic bounds
  adjustment = Math.max(-1.2, Math.min(1.0, adjustment));
  
  return { adjustment, factors };
}

/**
 * Calculate market correction based on line movement
 * Range: -0.4 to +0.4 runs
 */
function getMarketCorrection(gameData: GameData): { adjustment: number; factors: string[] } {
  let adjustment = 0;
  const factors: string[] = [];
  
  if (gameData.market_line) {
    // If market line differs significantly from our baseline, make small correction
    const baseline = 8.5; // Standard O/U line
    const lineDiff = gameData.market_line - baseline;
    
    if (Math.abs(lineDiff) > 0.5) {
      adjustment = lineDiff * 0.3; // Small correction toward market
      factors.push('market_line_adjustment');
    }
  }
  
  // Weekend/primetime effects
  const gameDate = new Date(gameData.date);
  const isWeekend = gameDate.getDay() === 0 || gameDate.getDay() === 6;
  
  if (isWeekend) {
    adjustment += 0.1; // Weekend games tend to be slightly higher scoring
    factors.push('weekend_effect');
  }
  
  // Ensure realistic bounds
  adjustment = Math.max(-0.4, Math.min(0.4, adjustment));
  
  return { adjustment, factors };
}

/**
 * Calculate confidence based on component certainty
 * Modified August 2nd: Cap confidence for large edges
 */
function calculateConfidence(components: ComponentBreakdown, edge?: number): number {
  let confidence = 75; // Start with reasonable base confidence
  
  // Reduce confidence for extreme adjustments (more uncertainty)
  const totalAdjustment = Math.abs(components.pitching_adjustment) + 
                         Math.abs(components.offense_adjustment) + 
                         Math.abs(components.weather_adjustment) + 
                         Math.abs(components.venue_adjustment);
  
  if (totalAdjustment > 2.0) {
    confidence -= 15; // High total adjustment = more uncertainty
  } else if (totalAdjustment > 1.0) {
    confidence -= 8;
  }
  
  // Increase confidence when components agree on direction
  const adjustments = [
    components.pitching_adjustment,
    components.offense_adjustment, 
    components.weather_adjustment,
    components.venue_adjustment
  ];
  
  const positiveCount = adjustments.filter(a => a > 0.1).length;
  const negativeCount = adjustments.filter(a => a < -0.1).length;
  
  if (positiveCount >= 3 || negativeCount >= 3) {
    confidence += 10; // Strong consensus increases confidence
  }
  
  // Distance from 8.5 line affects confidence
  const distanceFrom85 = Math.abs(components.final_total - 8.5);
  if (distanceFrom85 > 1.0) {
    confidence += 5; // Clear predictions are more confident
  }
  
  // Cap confidence for large edges (August 2nd adjustment)
  if (edge && Math.abs(edge) > 1.5) {
    confidence = Math.min(confidence, 70); // Cap at 70% for large edges
  }
  
  // Ensure realistic bounds
  return Math.max(45, Math.min(80, confidence));
}

/**
 * Main prediction function using component-additive approach
 */
export function predictGameTotal(gameData: GameData): ComponentBreakdown {
  // Start with proper league baseline
  const gameDate = new Date(gameData.date);
  const league_baseline = getLeagueBaseline(gameDate.getMonth() + 1, gameDate.getFullYear());
  
  // Calculate each component independently
  const pitchingResult = getPitchingAdjustment(gameData);
  const offenseResult = getOffenseAdjustment(gameData);
  const weatherResult = getWeatherAdjustment(gameData);
  const venueResult = getVenueAdjustment(gameData);
  const marketResult = getMarketCorrection(gameData);
  
  // Add components to baseline
  const total_before_bounds = league_baseline + 
                             pitchingResult.adjustment + 
                             offenseResult.adjustment + 
                             weatherResult.adjustment + 
                             venueResult.adjustment + 
                             marketResult.adjustment;
  
  // Apply realistic game bounds with slight upward bias for close calls
  const final_total = Math.max(2.5, Math.min(16.5, total_before_bounds + 0.1));
  
  // Create breakdown
  const breakdown: ComponentBreakdown = {
    league_baseline,
    pitching_adjustment: pitchingResult.adjustment,
    offense_adjustment: offenseResult.adjustment,
    weather_adjustment: weatherResult.adjustment,
    venue_adjustment: venueResult.adjustment,
    market_correction: marketResult.adjustment,
    total_before_bounds,
    final_total,
    confidence: 0, // Will be calculated below
    prediction: final_total > 8.5 ? 'Over' : 'Under',
    components_contributing: [
      ...pitchingResult.factors,
      ...offenseResult.factors,
      ...weatherResult.factors,
      ...venueResult.factors,
      ...marketResult.factors
    ]
  };
  
  // Calculate edge for confidence adjustment
  const edge = gameData.market_line ? Math.abs(final_total - gameData.market_line) : 0;
  
  // Calculate confidence based on all components
  breakdown.confidence = calculateConfidence(breakdown, edge);
  
  return breakdown;
}

/**
 * Helper function to format component breakdown for display
 */
export function formatBreakdown(breakdown: ComponentBreakdown): string {
  const lines = [
    `🎯 COMPONENT BREAKDOWN:`,
    `   League Baseline (July 2025): ${breakdown.league_baseline.toFixed(1)}`,
    `   Pitching Adjustment: ${breakdown.pitching_adjustment >= 0 ? '+' : ''}${breakdown.pitching_adjustment.toFixed(1)}`,
    `   Offense Adjustment: ${breakdown.offense_adjustment >= 0 ? '+' : ''}${breakdown.offense_adjustment.toFixed(1)}`,
    `   Weather Adjustment: ${breakdown.weather_adjustment >= 0 ? '+' : ''}${breakdown.weather_adjustment.toFixed(1)}`,
    `   Venue Adjustment: ${breakdown.venue_adjustment >= 0 ? '+' : ''}${breakdown.venue_adjustment.toFixed(1)}`,
    `   Market Correction: ${breakdown.market_correction >= 0 ? '+' : ''}${breakdown.market_correction.toFixed(1)}`,
    `   ─────────────────────────────`,
    `   Final Total: ${breakdown.final_total.toFixed(1)} (${breakdown.prediction})`,
    `   Confidence: ${breakdown.confidence}%`,
    ``,
    `🔍 Contributing Factors: ${breakdown.components_contributing.join(', ')}`
  ];
  
  return lines.join('\n');
}