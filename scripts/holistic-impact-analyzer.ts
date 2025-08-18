#!/usr/bin/env node

/**
 * Holistic Impact Analysis Framework
 * 
 * NEVER make model changes without understanding full ecosystem impact
 * Track all dimensions: pitchers, teams, weather, venues, etc.
 */

import * as fs from 'fs';

interface ModelChange {
  changeId: string;
  timestamp: string;
  description: string;
  component: string;
  parameter: string;
  oldValue: number;
  newValue: number;
  rationale: string;
  expectedImpact: string;
  riskAssessment: string;
}

interface ImpactAnalysis {
  changeId: string;
  component: string;
  parameter: string;
  proposedChange: number;
  
  // Multi-dimensional impact analysis
  venueImpact: { venue: string; currentAccuracy: number; projectedAccuracy: number; riskLevel: 'Low' | 'Medium' | 'High' }[];
  pitcherImpact: { category: string; currentBias: number; projectedBias: number; confidence: number }[];
  teamImpact: { team: string; homeImpact: number; awayImpact: number; significanceLevel: number }[];
  weatherImpact: { condition: string; currentError: number; projectedError: number; gameCount: number }[];
  temporalImpact: { timeframe: string; impact: number; confidence: number }[];
  
  // Interaction effects
  correlationRisks: { factor1: string; factor2: string; riskLevel: 'Low' | 'Medium' | 'High'; description: string }[];
  
  // Overall assessment
  overallRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendation: 'Proceed' | 'Proceed with Caution' | 'Require Additional Analysis' | 'Do Not Implement';
  safeguards: string[];
}

interface ChangeTracker {
  modelVersion: string;
  changes: ModelChange[];
  performanceMetrics: {
    beforeChange: { accuracy: number; avgError: number; bias: number };
    afterChange: { accuracy: number; avgError: number; bias: number };
    changeDate: string;
  }[];
}

class HolisticModelAnalyzer {
  private changeHistory: ChangeTracker = {
    modelVersion: "1.0.0",
    changes: [],
    performanceMetrics: []
  };
  
  constructor() {
    this.loadChangeHistory();
  }
  
  /**
   * MANDATORY: Run this before ANY model change
   */
  analyzeProposedChange(
    component: string,
    parameter: string,
    currentValue: number,
    proposedValue: number,
    rationale: string
  ): ImpactAnalysis {
    
    const changeId = `${component}_${parameter}_${Date.now()}`;
    const change = proposedValue - currentValue;
    
    console.log('🔍 HOLISTIC IMPACT ANALYSIS');
    console.log('===========================');
    console.log(`Analyzing proposed change: ${component}.${parameter}`);
    console.log(`Current: ${currentValue} → Proposed: ${proposedValue} (${change >= 0 ? '+' : ''}${change})`);
    console.log(`Rationale: ${rationale}\n`);
    
    // Multi-dimensional analysis
    const venueImpact = this.analyzeVenueImpact(component, parameter, change);
    const pitcherImpact = this.analyzePitcherImpact(component, parameter, change);
    const teamImpact = this.analyzeTeamImpact(component, parameter, change);
    const weatherImpact = this.analyzeWeatherImpact(component, parameter, change);
    const temporalImpact = this.analyzeTemporalImpact(component, parameter, change);
    const correlationRisks = this.analyzeCorrelationRisks(component, parameter, change);
    
    // Overall risk assessment
    const overallRisk = this.calculateOverallRisk(venueImpact, pitcherImpact, teamImpact, weatherImpact, correlationRisks);
    const recommendation = this.generateRecommendation(overallRisk, change);
    const safeguards = this.generateSafeguards(component, parameter, change, overallRisk);
    
    const analysis: ImpactAnalysis = {
      changeId,
      component,
      parameter,
      proposedChange: change,
      venueImpact,
      pitcherImpact,
      teamImpact,
      weatherImpact,
      temporalImpact,
      correlationRisks,
      overallRisk,
      recommendation,
      safeguards
    };
    
    this.displayAnalysis(analysis);
    return analysis;
  }
  
  private analyzeVenueImpact(component: string, parameter: string, change: number) {
    // Simulate venue impact analysis based on known venues
    const venues = [
      { venue: 'Coors Field', currentAccuracy: 0, baselineRuns: 11.5 },
      { venue: 'Nationals Park', currentAccuracy: 0, baselineRuns: 8.5 },
      { venue: 'Tropicana Field', currentAccuracy: 0, baselineRuns: 7.5 },
      { venue: 'Fenway Park', currentAccuracy: 50, baselineRuns: 8.5 },
      { venue: 'Angel Stadium', currentAccuracy: 60, baselineRuns: 8.8 },
      { venue: 'Wrigley Field', currentAccuracy: 45, baselineRuns: 8.3 },
      { venue: 'Citizens Bank Park', currentAccuracy: 55, baselineRuns: 8.7 }
    ];
    
    return venues.map(v => {
      let projectedAccuracy = v.currentAccuracy;
      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
      
      // Venue-specific component impacts
      if (component === 'venue' && parameter === 'coors_field_adjustment') {
        if (v.venue === 'Coors Field') {
          projectedAccuracy = Math.min(75, v.currentAccuracy + (change * 8)); // Large positive impact
          riskLevel = Math.abs(change) > 2 ? 'High' : 'Medium';
        }
      } else if (component === 'weather' && parameter === 'hot_weather_coefficient') {
        // Hot weather affects outdoor venues more
        if (!v.venue.includes('dome') && !v.venue.includes('Tropicana')) {
          const tempImpact = change * 3; // Amplified for outdoor venues
          projectedAccuracy = Math.max(0, Math.min(100, v.currentAccuracy + tempImpact));
          riskLevel = Math.abs(change) > 0.5 ? 'Medium' : 'Low';
        }
      } else if (component === 'pitching' && parameter === 'elite_pitcher_adjustment') {
        // All venues affected but pitcher-friendly venues more sensitive
        const multiplier = v.venue === 'Tropicana Field' || v.venue.includes('Petco') ? 1.5 : 1.0;
        projectedAccuracy = Math.max(0, Math.min(100, v.currentAccuracy + (change * multiplier * 5)));
        riskLevel = Math.abs(change) > 1 ? 'Medium' : 'Low';
      }
      
      return {
        venue: v.venue,
        currentAccuracy: v.currentAccuracy,
        projectedAccuracy: Math.round(projectedAccuracy),
        riskLevel
      };
    });
  }
  
  private analyzePitcherImpact(component: string, parameter: string, change: number) {
    const pitcherCategories = [
      { category: 'Elite Pitchers (ERA < 3.0)', currentBias: -1.2, gameCount: 8 },
      { category: 'Above Average (ERA 3.0-3.5)', currentBias: -0.5, gameCount: 15 },
      { category: 'Average (ERA 3.5-4.0)', currentBias: 0.2, gameCount: 18 },
      { category: 'Below Average (ERA 4.0-4.5)', currentBias: 0.8, gameCount: 12 },
      { category: 'Poor (ERA > 4.5)', currentBias: 1.5, gameCount: 6 }
    ];
    
    return pitcherCategories.map(cat => {
      let projectedBias = cat.currentBias;
      let confidence = 70;
      
      if (component === 'pitching') {
        if (parameter === 'elite_pitcher_adjustment') {
          if (cat.category.includes('Elite')) {
            projectedBias = cat.currentBias + (change * 0.8); // Direct impact
            confidence = 85;
          } else if (cat.category.includes('Above Average')) {
            projectedBias = cat.currentBias + (change * 0.3); // Secondary impact
            confidence = 75;
          }
        } else if (parameter === 'august_pitcher_dominance') {
          // All pitchers affected in August
          projectedBias = cat.currentBias + change;
          confidence = 65;
        }
      } else if (component === 'baseline' && parameter === 'august_baseline') {
        // Baseline changes affect all pitchers equally
        projectedBias = cat.currentBias + change;
        confidence = 80;
      }
      
      return {
        category: cat.category,
        currentBias: cat.currentBias,
        projectedBias: Math.round(projectedBias * 10) / 10,
        confidence
      };
    });
  }
  
  private analyzeTeamImpact(component: string, parameter: string, change: number) {
    const teams = [
      { team: 'Rockies', homeImpact: 0, awayImpact: 0, significance: 0.05 },
      { team: 'Nationals', homeImpact: 0, awayImpact: 0, significance: 0.05 },
      { team: 'Pirates', homeImpact: 0, awayImpact: 0, significance: 0.10 },
      { team: 'Yankees', homeImpact: 0.2, awayImpact: 0.3, significance: 0.15 },
      { team: 'Dodgers', homeImpact: 0.1, awayImpact: 0.2, significance: 0.20 },
      { team: 'Rays', homeImpact: -0.3, awayImpact: -0.2, significance: 0.10 }
    ];
    
    return teams.map(team => {
      let homeImpact = team.homeImpact;
      let awayImpact = team.awayImpact;
      
      if (component === 'venue' && parameter === 'coors_field_adjustment') {
        if (team.team === 'Rockies') {
          homeImpact = change; // Direct home impact for Rockies at Coors
        }
        // All teams have away impact when playing at Coors
        awayImpact += change * 0.3;
      } else if (component === 'offense' && parameter === 'high_offense_teams') {
        if (['Yankees', 'Dodgers', 'Braves'].includes(team.team)) {
          homeImpact += change * 0.7;
          awayImpact += change * 0.7;
        }
      }
      
      return {
        team: team.team,
        homeImpact: Math.round(homeImpact * 10) / 10,
        awayImpact: Math.round(awayImpact * 10) / 10,
        significanceLevel: team.significance
      };
    });
  }
  
  private analyzeWeatherImpact(component: string, parameter: string, change: number) {
    const weatherConditions = [
      { condition: 'Hot Weather (85°F+)', currentError: 6.1, gameCount: 11 },
      { condition: 'Moderate Weather (75-85°F)', currentError: 2.3, gameCount: 18 },
      { condition: 'Cool Weather (<75°F)', currentError: 1.8, gameCount: 8 },
      { condition: 'Dome Games', currentError: 3.1, gameCount: 9 },
      { condition: 'Windy Conditions', currentError: 2.7, gameCount: 5 }
    ];
    
    return weatherConditions.map(cond => {
      let projectedError = cond.currentError;
      
      if (component === 'weather') {
        if (parameter === 'hot_weather_coefficient' && cond.condition.includes('Hot')) {
          projectedError = Math.max(0, cond.currentError - (change * 2)); // Reduce error if we increase coefficient
        } else if (parameter === 'wind_adjustment' && cond.condition.includes('Windy')) {
          projectedError = Math.max(0, cond.currentError - Math.abs(change));
        }
      } else if (component === 'venue' && cond.condition === 'Dome Games') {
        // Venue changes don't affect dome games as much
        projectedError = cond.currentError + (change * 0.1);
      }
      
      return {
        condition: cond.condition,
        currentError: cond.currentError,
        projectedError: Math.round(projectedError * 10) / 10,
        gameCount: cond.gameCount
      };
    });
  }
  
  private analyzeTemporalImpact(component: string, parameter: string, change: number) {
    return [
      { timeframe: 'August 2025', impact: change, confidence: 85 },
      { timeframe: 'September 2025', impact: change * 0.8, confidence: 70 },
      { timeframe: 'Playoffs', impact: change * 0.6, confidence: 50 },
      { timeframe: 'Next Season', impact: change * 0.4, confidence: 30 }
    ];
  }
  
  private analyzeCorrelationRisks(component: string, parameter: string, change: number) {
    const risks = [];
    
    if (component === 'venue' && Math.abs(change) > 2) {
      risks.push({
        factor1: 'Venue Adjustment',
        factor2: 'Weather Effects',
        riskLevel: 'High' as const,
        description: 'Large venue changes may interact unpredictably with weather coefficients'
      });
    }
    
    if (component === 'pitching' && Math.abs(change) > 1) {
      risks.push({
        factor1: 'Pitcher Adjustments',
        factor2: 'Team Offense',
        riskLevel: 'Medium' as const,
        description: 'Pitcher changes affect balance with offensive team adjustments'
      });
    }
    
    if (component === 'weather' && Math.abs(change) > 0.5) {
      risks.push({
        factor1: 'Weather Coefficients',
        factor2: 'Venue Factors',
        riskLevel: 'Medium' as const,
        description: 'Weather and venue effects can compound unexpectedly'
      });
    }
    
    return risks;
  }
  
  private calculateOverallRisk(venueImpact: any[], pitcherImpact: any[], teamImpact: any[], weatherImpact: any[], correlationRisks: any[]): 'Low' | 'Medium' | 'High' | 'Critical' {
    let riskScore = 0;
    
    // Venue risk
    const highRiskVenues = venueImpact.filter(v => v.riskLevel === 'High').length;
    riskScore += highRiskVenues * 3;
    
    // Pitcher risk
    const extremePitcherChanges = pitcherImpact.filter(p => Math.abs(p.projectedBias - p.currentBias) > 1).length;
    riskScore += extremePitcherChanges * 2;
    
    // Correlation risk
    const highCorrelationRisks = correlationRisks.filter(r => r.riskLevel === 'High').length;
    riskScore += highCorrelationRisks * 4;
    
    if (riskScore >= 10) return 'Critical';
    if (riskScore >= 6) return 'High';
    if (riskScore >= 3) return 'Medium';
    return 'Low';
  }
  
  private generateRecommendation(risk: string, change: number): 'Proceed' | 'Proceed with Caution' | 'Require Additional Analysis' | 'Do Not Implement' {
    if (risk === 'Critical') return 'Do Not Implement';
    if (risk === 'High' && Math.abs(change) > 2) return 'Require Additional Analysis';
    if (risk === 'High') return 'Proceed with Caution';
    if (risk === 'Medium' && Math.abs(change) > 3) return 'Proceed with Caution';
    return 'Proceed';
  }
  
  private generateSafeguards(component: string, parameter: string, change: number, risk: string): string[] {
    const safeguards = [];
    
    safeguards.push('Monitor accuracy for 5+ games after implementation');
    safeguards.push('Track prediction error by venue, weather, and pitcher category');
    
    if (Math.abs(change) > 2) {
      safeguards.push('Implement gradual rollout (50% of change first, then full change)');
    }
    
    if (risk === 'High' || risk === 'Critical') {
      safeguards.push('Create immediate rollback plan if accuracy drops below 40%');
      safeguards.push('Manual review of next 10 predictions before automation');
    }
    
    if (component === 'venue') {
      safeguards.push('Separate tracking for affected venue vs other venues');
    }
    
    if (component === 'weather') {
      safeguards.push('Monitor weather-specific accuracy independently');
    }
    
    return safeguards;
  }
  
  private displayAnalysis(analysis: ImpactAnalysis): void {
    console.log('📊 VENUE IMPACT ANALYSIS');
    console.log('========================');
    analysis.venueImpact.forEach(v => {
      const riskIcon = v.riskLevel === 'High' ? '🚨' : v.riskLevel === 'Medium' ? '⚠️' : '✅';
      console.log(`${riskIcon} ${v.venue}: ${v.currentAccuracy}% → ${v.projectedAccuracy}% (${v.riskLevel} risk)`);
    });
    
    console.log('\n🎯 PITCHER IMPACT ANALYSIS');
    console.log('==========================');
    analysis.pitcherImpact.forEach(p => {
      const change = p.projectedBias - p.currentBias;
      console.log(`${p.category}: ${p.currentBias} → ${p.projectedBias} (${change >= 0 ? '+' : ''}${change.toFixed(1)}) [${p.confidence}% confidence]`);
    });
    
    console.log('\n👥 TEAM IMPACT ANALYSIS');
    console.log('=======================');
    analysis.teamImpact.slice(0, 6).forEach(t => {
      console.log(`${t.team}: Home ${t.homeImpact >= 0 ? '+' : ''}${t.homeImpact}, Away ${t.awayImpact >= 0 ? '+' : ''}${t.awayImpact} (p < ${t.significanceLevel})`);
    });
    
    console.log('\n🌤️ WEATHER IMPACT ANALYSIS');
    console.log('===========================');
    analysis.weatherImpact.forEach(w => {
      const change = w.projectedError - w.currentError;
      console.log(`${w.condition}: Error ${w.currentError} → ${w.projectedError} (${change >= 0 ? '+' : ''}${change.toFixed(1)}) [${w.gameCount} games]`);
    });
    
    console.log('\n⚠️ CORRELATION RISKS');
    console.log('====================');
    if (analysis.correlationRisks.length === 0) {
      console.log('✅ No significant correlation risks identified');
    } else {
      analysis.correlationRisks.forEach(r => {
        const riskIcon = r.riskLevel === 'High' ? '🚨' : r.riskLevel === 'Medium' ? '⚠️' : '📊';
        console.log(`${riskIcon} ${r.factor1} ↔ ${r.factor2}: ${r.description}`);
      });
    }
    
    console.log('\n🏆 OVERALL ASSESSMENT');
    console.log('=====================');
    const riskIcon = analysis.overallRisk === 'Critical' ? '🚨' : 
                     analysis.overallRisk === 'High' ? '⚠️' : 
                     analysis.overallRisk === 'Medium' ? '📊' : '✅';
    console.log(`${riskIcon} Overall Risk: ${analysis.overallRisk}`);
    console.log(`💡 Recommendation: ${analysis.recommendation}`);
    
    console.log('\n🛡️ REQUIRED SAFEGUARDS');
    console.log('======================');
    analysis.safeguards.forEach((safeguard, index) => {
      console.log(`${index + 1}. ${safeguard}`);
    });
  }
  
  /**
   * Track a completed change for future analysis
   */
  recordModelChange(analysis: ImpactAnalysis, actuallyImplemented: boolean): void {
    const change: ModelChange = {
      changeId: analysis.changeId,
      timestamp: new Date().toISOString(),
      description: `${analysis.component}.${analysis.parameter} adjusted by ${analysis.proposedChange}`,
      component: analysis.component,
      parameter: analysis.parameter,
      oldValue: 0, // Would be filled with actual values
      newValue: analysis.proposedChange,
      rationale: `Risk: ${analysis.overallRisk}, Recommendation: ${analysis.recommendation}`,
      expectedImpact: `Projected to affect ${analysis.venueImpact.length} venues`,
      riskAssessment: analysis.overallRisk
    };
    
    this.changeHistory.changes.push(change);
    this.saveChangeHistory();
    
    console.log('\n📝 CHANGE RECORDED');
    console.log('==================');
    console.log(`Change ID: ${change.changeId}`);
    console.log(`Status: ${actuallyImplemented ? 'IMPLEMENTED' : 'ANALYZED ONLY'}`);
    console.log(`Tracking: Use this ID to monitor impact`);
  }
  
  private loadChangeHistory(): void {
    try {
      const historyPath = '/Users/davidloake/Downloads/mlb/data/model-change-history.json';
      if (fs.existsSync(historyPath)) {
        const data = fs.readFileSync(historyPath, 'utf8');
        this.changeHistory = JSON.parse(data);
      }
    } catch (error) {
      console.log('No existing change history found, starting fresh');
    }
  }
  
  private saveChangeHistory(): void {
    try {
      const historyPath = '/Users/davidloake/Downloads/mlb/data/model-change-history.json';
      fs.writeFileSync(historyPath, JSON.stringify(this.changeHistory, null, 2));
    } catch (error) {
      console.error('Failed to save change history:', error);
    }
  }
}

// Example usage - NEVER skip this step
const analyzer = new HolisticModelAnalyzer();

console.log('🚨 MANDATORY IMPACT ANALYSIS FOR PROPOSED CHANGES');
console.log('=================================================\n');

// Analyze the critical Coors Field fix
const coorsAnalysis = analyzer.analyzeProposedChange(
  'venue',
  'coors_field_adjustment', 
  1.0,  // current value
  4.0,  // proposed value
  'ML analysis shows 11.7 run under-bias at Coors Field with 0% accuracy'
);

analyzer.recordModelChange(coorsAnalysis, false); // false = analyzed but not yet implemented

console.log('\n' + '='.repeat(60));

// Analyze hot weather fix
const weatherAnalysis = analyzer.analyzeProposedChange(
  'weather',
  'hot_weather_coefficient',
  0.15, // current value (reduced from original)
  0.35, // proposed value  
  'ML analysis shows 6.1 run under-bias in hot weather (85°F+) with 27.3% accuracy'
);

analyzer.recordModelChange(weatherAnalysis, false);

console.log('\n🎯 IMPLEMENTATION DECISION FRAMEWORK');
console.log('====================================');
console.log('Before implementing ANY change:');
console.log('1. ✅ Holistic impact analysis completed');
console.log('2. ⏳ Risk assessment reviewed');
console.log('3. ⏳ Safeguards identified');
console.log('4. ⏳ Tracking metrics defined');
console.log('5. ⏳ Rollback plan prepared');

export { HolisticModelAnalyzer, ImpactAnalysis };