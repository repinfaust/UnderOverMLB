/**
 * V6 Advanced MLB Over/Under Prediction Model
 * 
 * FIXES FOR SYSTEMATIC ISSUES IDENTIFIED IN V4/V5:
 * 1. Under-prediction bias correction (+0.8 runs baseline adjustment)
 * 2. Enhanced explosion detection with team offensive ratings
 * 3. Venue-specific calibration fixes for problem parks
 * 4. Advanced weather-offensive interaction modeling
 * 5. Multi-factor scoring environment detection
 * 
 * Based on failure analysis from August 18-19, 2025 games
 */

interface GameContext {
  home_team: string;
  away_team: string;
  venue: string;
  date: string;
  temperature?: number;
  weather_conditions?: string;
  wind_speed?: number;
  humidity?: number;
  home_pitcher?: {
    name: string;
    era: number;
    whip: number;
    recent_performance?: number;
  };
  away_pitcher?: {
    name: string;
    era: number;
    whip: number;
    recent_performance?: number;
  };
}

interface V6ModelResult {
  prediction: 'Over' | 'Under';
  calculated_total: number;
  confidence: number;
  explosion_risk: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  adjustments_applied: string[];
  model_components: {
    baseline: number;
    pitching_adjustment: number;
    offensive_adjustment: number;
    venue_adjustment: number;
    weather_adjustment: number;
    explosion_bonus: number;
    bias_correction: number;
  };
}

// ENHANCED TEAM OFFENSIVE RATINGS - Based on failure analysis
const TEAM_OFFENSIVE_RATINGS: { [key: string]: { rating: number; heat_sensitivity: number; explosion_risk: number } } = {
  // High explosion teams (consistently underestimated)
  'Phillies': { rating: 1.6, heat_sensitivity: 1.8, explosion_risk: 0.28 },
  'Yankees': { rating: 1.5, heat_sensitivity: 1.4, explosion_risk: 0.25 },
  'Braves': { rating: 1.4, heat_sensitivity: 1.6, explosion_risk: 0.24 },
  'Rangers': { rating: 1.4, heat_sensitivity: 1.5, explosion_risk: 0.22 },
  'Blue Jays': { rating: 1.3, heat_sensitivity: 1.3, explosion_risk: 0.20 },
  'Dodgers': { rating: 1.3, heat_sensitivity: 1.2, explosion_risk: 0.18 },
  
  // Medium explosion teams
  'Astros': { rating: 1.2, heat_sensitivity: 1.3, explosion_risk: 0.16 },
  'Mets': { rating: 1.2, heat_sensitivity: 1.2, explosion_risk: 0.15 },
  'Cardinals': { rating: 1.1, heat_sensitivity: 1.2, explosion_risk: 0.14 },
  'Red Sox': { rating: 1.1, heat_sensitivity: 1.1, explosion_risk: 0.13 },
  'Orioles': { rating: 1.1, heat_sensitivity: 1.0, explosion_risk: 0.12 },
  
  // Lower explosion teams
  'Tigers': { rating: 0.9, heat_sensitivity: 1.0, explosion_risk: 0.08 },
  'Mariners': { rating: 0.9, heat_sensitivity: 0.9, explosion_risk: 0.07 },
  'Angels': { rating: 0.8, heat_sensitivity: 0.9, explosion_risk: 0.06 },
  'White Sox': { rating: 0.8, heat_sensitivity: 1.0, explosion_risk: 0.05 },
  
  // Default for unlisted teams
  'DEFAULT': { rating: 1.0, heat_sensitivity: 1.0, explosion_risk: 0.10 }
};

// VENUE CALIBRATION FIXES - Based on systematic failures
const VENUE_ADJUSTMENTS: { [key: string]: { baseline_adj: number; explosion_multiplier: number } } = {
  // Problem venues from failure analysis
  'Citizens Bank Park': { baseline_adj: 1.2, explosion_multiplier: 1.5 }, // Phillies - multiple failures
  'loanDepot park': { baseline_adj: 0.8, explosion_multiplier: 1.3 }, // Marlins - dome, multiple failures
  'Truist Park': { baseline_adj: 1.1, explosion_multiplier: 1.4 }, // Braves - hot weather issues
  'Kauffman Stadium': { baseline_adj: 0.9, explosion_multiplier: 1.2 }, // Royals - wind issues
  'Angel Stadium': { baseline_adj: 0.8, explosion_multiplier: 1.1 }, // Angels - consistent under-prediction
  'Target Field': { baseline_adj: 1.0, explosion_multiplier: 1.2 }, // Twins - moderate adjustment
  
  // High-scoring venues
  'Coors Field': { baseline_adj: 2.0, explosion_multiplier: 1.8 }, // Already known
  'Fenway Park': { baseline_adj: 1.1, explosion_multiplier: 1.3 }, // Green Monster
  'Yankee Stadium': { baseline_adj: 1.2, explosion_multiplier: 1.4 }, // Short porch
  'Nationals Park': { baseline_adj: 1.0, explosion_multiplier: 1.2 }, // Moderate
  
  // Pitcher-friendly venues
  'PNC Park': { baseline_adj: 0.9, explosion_multiplier: 1.0 },
  'Petco Park': { baseline_adj: 0.8, explosion_multiplier: 0.9 },
  'Comerica Park': { baseline_adj: 0.9, explosion_multiplier: 1.0 },
  'Wrigley Field': { baseline_adj: 1.0, explosion_multiplier: 1.1 }, // Wind dependent
  
  // Default
  'DEFAULT': { baseline_adj: 1.0, explosion_multiplier: 1.0 }
};

class V6AdvancedModel {
  
  private getTeamProfile(teamName: string) {
    return TEAM_OFFENSIVE_RATINGS[teamName] || TEAM_OFFENSIVE_RATINGS['DEFAULT'];
  }
  
  private getVenueProfile(venue: string) {
    return VENUE_ADJUSTMENTS[venue] || VENUE_ADJUSTMENTS['DEFAULT'];
  }
  
  // BIAS CORRECTION - Address systematic under-prediction
  private calculateBiasCorrection(): number {
    // Based on failure analysis: both models consistently under-predict by ~1 run
    return 0.8; // Baseline upward adjustment
  }
  
  // ENHANCED EXPLOSION DETECTION
  private calculateExplosionRisk(context: GameContext): { risk: number; bonus: number } {
    const homeProfile = this.getTeamProfile(context.home_team);
    const awayProfile = this.getTeamProfile(context.away_team);
    const venueProfile = this.getVenueProfile(context.venue);
    
    // Base explosion risk from teams
    const baseRisk = (homeProfile.explosion_risk + awayProfile.explosion_risk) / 2;
    
    // Weather amplification
    let weatherMultiplier = 1.0;
    if (context.temperature && context.temperature > 85) {
      const heatBonus = (context.temperature - 85) * 0.02; // 2% per degree over 85F
      const teamHeatSensitivity = (homeProfile.heat_sensitivity + awayProfile.heat_sensitivity) / 2;
      weatherMultiplier = 1 + (heatBonus * teamHeatSensitivity);
    }
    
    // Venue explosion multiplier
    const venueMultiplier = venueProfile.explosion_multiplier;
    
    // Final risk calculation
    const totalRisk = Math.min(baseRisk * weatherMultiplier * venueMultiplier, 0.5); // Cap at 50%
    
    // Convert risk to run bonus
    let explosionBonus = 0;
    if (totalRisk > 0.25) explosionBonus = 2.0; // EXTREME risk
    else if (totalRisk > 0.20) explosionBonus = 1.5; // HIGH risk  
    else if (totalRisk > 0.15) explosionBonus = 1.0; // MEDIUM risk
    else if (totalRisk > 0.10) explosionBonus = 0.5; // LOW risk
    
    return { risk: totalRisk, bonus: explosionBonus };
  }
  
  // ADVANCED WEATHER-OFFENSIVE INTERACTION
  private calculateWeatherAdjustment(context: GameContext): number {
    if (!context.temperature) return 0;
    
    const homeProfile = this.getTeamProfile(context.home_team);
    const awayProfile = this.getTeamProfile(context.away_team);
    const avgOffensiveRating = (homeProfile.rating + awayProfile.rating) / 2;
    const avgHeatSensitivity = (homeProfile.heat_sensitivity + awayProfile.heat_sensitivity) / 2;
    
    let weatherAdj = 0;
    
    // Hot weather boost (main issue from failures)
    if (context.temperature > 80) {
      const heatFactor = (context.temperature - 80) * 0.05; // 0.05 runs per degree
      weatherAdj += heatFactor * avgOffensiveRating * avgHeatSensitivity;
    }
    
    // Cold weather penalty
    if (context.temperature < 50) {
      weatherAdj -= (50 - context.temperature) * 0.02;
    }
    
    // Wind considerations
    if (context.wind_speed && context.wind_speed > 15) {
      weatherAdj += 0.3; // High wind can help offense
    }
    
    return weatherAdj;
  }
  
  // ENHANCED PITCHING ANALYSIS
  private calculatePitchingAdjustment(context: GameContext): number {
    let pitchingAdj = 0;
    
    // Home pitcher
    if (context.home_pitcher) {
      const era = context.home_pitcher.era;
      if (era < 3.0) pitchingAdj -= 0.8; // Elite pitcher
      else if (era > 5.0) pitchingAdj += 1.0; // Poor pitcher  
      else pitchingAdj += (era - 4.0) * 0.3; // Linear scaling
    }
    
    // Away pitcher  
    if (context.away_pitcher) {
      const era = context.away_pitcher.era;
      if (era < 3.0) pitchingAdj -= 0.8;
      else if (era > 5.0) pitchingAdj += 1.0;
      else pitchingAdj += (era - 4.0) * 0.3;
    }
    
    return pitchingAdj;
  }
  
  // OFFENSIVE RATING ADJUSTMENT
  private calculateOffensiveAdjustment(context: GameContext): number {
    const homeProfile = this.getTeamProfile(context.home_team);
    const awayProfile = this.getTeamProfile(context.away_team);
    
    const avgRating = (homeProfile.rating + awayProfile.rating) / 2;
    
    // Convert rating to run adjustment
    return (avgRating - 1.0) * 1.5; // 1.5 runs per 1.0 rating difference
  }
  
  // VENUE ADJUSTMENT
  private calculateVenueAdjustment(context: GameContext): number {
    const venueProfile = this.getVenueProfile(context.venue);
    return (venueProfile.baseline_adj - 1.0) * 2.0; // Convert multiplier to run adjustment
  }
  
  // MAIN PREDICTION METHOD
  public predict(context: GameContext): V6ModelResult {
    const adjustments: string[] = [];
    
    // Base prediction (corrected from V4/V5 under-bias)
    let baselineTotal = 8.5; // Increased from 8.0 based on failure analysis
    
    // Component calculations
    const biasCorrection = this.calculateBiasCorrection();
    const pitchingAdj = this.calculatePitchingAdjustment(context);
    const offensiveAdj = this.calculateOffensiveAdjustment(context);
    const venueAdj = this.calculateVenueAdjustment(context);
    const weatherAdj = this.calculateWeatherAdjustment(context);
    const explosionData = this.calculateExplosionRisk(context);
    
    // Build final total
    const calculatedTotal = baselineTotal + 
                          biasCorrection + 
                          pitchingAdj + 
                          offensiveAdj + 
                          venueAdj + 
                          weatherAdj + 
                          explosionData.bonus;
    
    // Risk level determination
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'LOW';
    if (explosionData.risk > 0.30) riskLevel = 'EXTREME';
    else if (explosionData.risk > 0.20) riskLevel = 'HIGH';
    else if (explosionData.risk > 0.15) riskLevel = 'MEDIUM';
    
    // Prediction direction and confidence
    const prediction: 'Over' | 'Under' = calculatedTotal > 8.5 ? 'Over' : 'Under';
    
    // Confidence based on component agreement and risk
    let confidence = 50;
    const totalAdjustment = Math.abs(pitchingAdj + offensiveAdj + venueAdj + weatherAdj);
    confidence += Math.min(totalAdjustment * 10, 30); // Up to 30% bonus for strong factors
    
    // Risk penalty
    if (riskLevel === 'EXTREME') confidence -= 15;
    else if (riskLevel === 'HIGH') confidence -= 10;
    else if (riskLevel === 'MEDIUM') confidence -= 5;
    
    confidence = Math.max(35, Math.min(85, confidence)); // Cap between 35-85%
    
    // Track adjustments
    if (Math.abs(biasCorrection) > 0.1) adjustments.push(`Bias correction: +${biasCorrection.toFixed(1)}`);
    if (Math.abs(pitchingAdj) > 0.1) adjustments.push(`Pitching: ${pitchingAdj > 0 ? '+' : ''}${pitchingAdj.toFixed(1)}`);
    if (Math.abs(offensiveAdj) > 0.1) adjustments.push(`Offense: ${offensiveAdj > 0 ? '+' : ''}${offensiveAdj.toFixed(1)}`);
    if (Math.abs(venueAdj) > 0.1) adjustments.push(`Venue: ${venueAdj > 0 ? '+' : ''}${venueAdj.toFixed(1)}`);
    if (Math.abs(weatherAdj) > 0.1) adjustments.push(`Weather: ${weatherAdj > 0 ? '+' : ''}${weatherAdj.toFixed(1)}`);
    if (explosionData.bonus > 0.1) adjustments.push(`Explosion risk: +${explosionData.bonus.toFixed(1)}`);
    
    return {
      prediction,
      calculated_total: Math.round(calculatedTotal * 100) / 100,
      confidence: Math.round(confidence),
      explosion_risk: Math.round(explosionData.risk * 100),
      risk_level: riskLevel,
      adjustments_applied: adjustments,
      model_components: {
        baseline: baselineTotal,
        pitching_adjustment: pitchingAdj,
        offensive_adjustment: offensiveAdj,
        venue_adjustment: venueAdj,
        weather_adjustment: weatherAdj,
        explosion_bonus: explosionData.bonus,
        bias_correction: biasCorrection
      }
    };
  }
}

export { V6AdvancedModel, GameContext, V6ModelResult };