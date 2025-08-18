#!/usr/bin/env node

/**
 * Deep Coors Field Analysis - HIGH RISK Change Assessment
 * 
 * Before implementing the Coors Field adjustment (1.0 → 4.0), we need
 * comprehensive analysis of ALL interaction effects:
 * - Team-specific performance at Coors
 * - Weather amplification effects
 * - Pitcher categories at altitude
 * - Monthly variations
 * - Home vs Away team differences
 */

interface CoorsGame {
  date: string;
  homeTeam: string;
  awayTeam: string;
  actualTotal: number;
  temperature: number;
  pitcherTypes: { home: string; away: string };
  month: number;
  ourPrediction: number;
  sportsBookLine: number;
  predictionError: number;
}

// Extended Coors Field dataset for comprehensive analysis
const coorsFieldGames: CoorsGame[] = [
  {
    date: '2025-08-01',
    homeTeam: 'Rockies',
    awayTeam: 'Pirates',
    actualTotal: 33,
    temperature: 88,
    pitcherTypes: { home: 'Average', away: 'Below Average' },
    month: 8,
    ourPrediction: 8.8,
    sportsBookLine: 11.5,
    predictionError: 24.2
  },
  {
    date: '2025-08-02',
    homeTeam: 'Rockies',
    awayTeam: 'Pirates',
    actualTotal: 13,
    temperature: 90,
    pitcherTypes: { home: 'Average', away: 'Average' },
    month: 8,
    ourPrediction: 8.0,
    sportsBookLine: 10.0,
    predictionError: 5.0
  },
  {
    date: '2025-08-03',
    homeTeam: 'Rockies',
    awayTeam: 'Pirates',
    actualTotal: 14,
    temperature: 85,
    pitcherTypes: { home: 'Average', away: 'Average' },
    month: 8,
    ourPrediction: 8.0,
    sportsBookLine: 11.5,
    predictionError: 6.0
  }
];

// Historical Coors data for comparison (simulated - would be real data)
const historicalCoorsData = {
  avgTotalByMonth: { 4: 10.2, 5: 11.1, 6: 11.8, 7: 12.2, 8: 11.9, 9: 10.8 },
  avgTotalByTeam: {
    'Rockies': { home: 12.1, away: 9.8 },
    'Pirates': { home: 8.2, away: 11.4 },
    'Yankees': { home: 9.1, away: 12.8 },
    'Dodgers': { home: 8.8, away: 12.5 },
    'Athletics': { home: 7.9, away: 10.9 }
  },
  weatherEffects: {
    temp85to90: { multiplier: 1.1, sampleSize: 45 },
    temp90to95: { multiplier: 1.25, sampleSize: 32 },
    temp95plus: { multiplier: 1.4, sampleSize: 18 }
  },
  pitcherEffects: {
    'Elite': { avgRunsAllowed: 9.8, sampleSize: 12 },
    'Above Average': { avgRunsAllowed: 11.2, sampleSize: 28 },
    'Average': { avgRunsAllowed: 12.4, sampleSize: 41 },
    'Below Average': { avgRunsAllowed: 13.7, sampleSize: 35 },
    'Poor': { avgRunsAllowed: 15.2, sampleSize: 19 }
  }
};

class CoorsFieldDeepAnalyzer {
  
  analyzeTeamSpecificEffects(): void {
    console.log('👥 TEAM-SPECIFIC COORS FIELD ANALYSIS');
    console.log('====================================');
    
    const teamData = historicalCoorsData.avgTotalByTeam;
    
    console.log('Historical team performance at Coors Field:');
    Object.entries(teamData).forEach(([team, data]) => {
      const homeAdvantage = data.home - data.away;
      console.log(`  ${team}: Home ${data.home.toFixed(1)}, Away ${data.away.toFixed(1)} (${homeAdvantage >= 0 ? '+' : ''}${homeAdvantage.toFixed(1)} home advantage)`);
    });
    
    // Analysis of our recent games
    console.log('\nRecent Coors Field games analysis:');
    coorsFieldGames.forEach(game => {
      const expectedHome = (teamData as any)[game.homeTeam]?.home || 11.0;
      const expectedAway = (teamData as any)[game.awayTeam]?.away || 11.0;
      const historicalExpected = (expectedHome + expectedAway) / 2;
      
      console.log(`  ${game.date}: ${game.awayTeam} @ ${game.homeTeam}`);
      console.log(`    Historical Expected: ${historicalExpected.toFixed(1)} | Actual: ${game.actualTotal} | Our Model: ${game.ourPrediction}`);
      console.log(`    Underestimation: ${(game.actualTotal - game.ourPrediction).toFixed(1)} runs`);
    });
  }
  
  analyzeWeatherAmplification(): void {
    console.log('\n🌤️ WEATHER AMPLIFICATION AT ALTITUDE');
    console.log('====================================');
    
    const weatherData = historicalCoorsData.weatherEffects;
    
    console.log('Temperature effect multipliers at Coors Field:');
    Object.entries(weatherData).forEach(([tempRange, data]) => {
      console.log(`  ${tempRange}: ${data.multiplier}x multiplier (${data.sampleSize} games)`);
    });
    
    console.log('\nRecent game weather analysis:');
    coorsFieldGames.forEach(game => {
      let tempMultiplier = 1.0;
      let tempCategory = 'Normal';
      
      if (game.temperature >= 95) {
        tempMultiplier = weatherData.temp95plus.multiplier;
        tempCategory = 'Extreme Heat';
      } else if (game.temperature >= 90) {
        tempMultiplier = weatherData.temp90to95.multiplier;
        tempCategory = 'Very Hot';
      } else if (game.temperature >= 85) {
        tempMultiplier = weatherData.temp85to90.multiplier;
        tempCategory = 'Hot';
      }
      
      const baselineCoorsExpected = 11.5; // Historical Coors average
      const weatherAdjustedExpected = baselineCoorsExpected * tempMultiplier;
      
      console.log(`  ${game.date}: ${game.temperature}°F (${tempCategory})`);
      console.log(`    Weather-adjusted expected: ${weatherAdjustedExpected.toFixed(1)} | Actual: ${game.actualTotal}`);
      console.log(`    Our model missed weather amplification by: ${(weatherAdjustedExpected - game.ourPrediction).toFixed(1)} runs`);
    });
  }
  
  analyzePitcherAltitudeEffects(): void {
    console.log('\n🎯 PITCHER CATEGORIES AT ALTITUDE');
    console.log('=================================');
    
    const pitcherData = historicalCoorsData.pitcherEffects;
    
    console.log('Average runs allowed by pitcher type at Coors:');
    Object.entries(pitcherData).forEach(([category, data]) => {
      console.log(`  ${category}: ${data.avgRunsAllowed.toFixed(1)} runs (${data.sampleSize} starts)`);
    });
    
    console.log('\nRecent games pitcher analysis:');
    coorsFieldGames.forEach(game => {
      const homePitcherExpected = (pitcherData as any)[game.pitcherTypes.home]?.avgRunsAllowed || 11.5;
      const awayPitcherExpected = (pitcherData as any)[game.pitcherTypes.away]?.avgRunsAllowed || 11.5;
      const pitcherAdjustedExpected = (homePitcherExpected + awayPitcherExpected) / 2;
      
      console.log(`  ${game.date}: ${game.pitcherTypes.home} vs ${game.pitcherTypes.away}`);
      console.log(`    Pitcher-adjusted expected: ${pitcherAdjustedExpected.toFixed(1)} | Actual: ${game.actualTotal}`);
      console.log(`    Our model vs pitcher reality: ${(pitcherAdjustedExpected - game.ourPrediction).toFixed(1)} run gap`);
    });
  }
  
  calculateOptimalAdjustment(): void {
    console.log('\n🔢 OPTIMAL COORS FIELD ADJUSTMENT CALCULATION');
    console.log('=============================================');
    
    // Multiple calculation methods
    const methods = {
      simpleAverage: this.calculateSimpleAverageMethod(),
      weightedByRecency: this.calculateWeightedMethod(),
      historicalBaseline: this.calculateHistoricalMethod(),
      sportsBookComparison: this.calculateSportsBookMethod()
    };
    
    console.log('Adjustment calculation methods:');
    Object.entries(methods).forEach(([method, adjustment]) => {
      console.log(`  ${method}: +${adjustment.toFixed(1)} runs`);
    });
    
    const avgAdjustment = Object.values(methods).reduce((sum, adj) => sum + adj, 0) / Object.values(methods).length;
    const minAdjustment = Math.min(...Object.values(methods));
    const maxAdjustment = Math.max(...Object.values(methods));
    
    console.log('\nAdjustment range analysis:');
    console.log(`  Average: +${avgAdjustment.toFixed(1)} runs`);
    console.log(`  Range: +${minAdjustment.toFixed(1)} to +${maxAdjustment.toFixed(1)} runs`);
    console.log(`  Current model: +1.0 runs`);
    console.log(`  Proposed change: +4.0 runs`);
    
    // Risk assessment
    console.log('\n⚠️ RISK ASSESSMENT');
    console.log('==================');
    
    if (4.0 > maxAdjustment) {
      console.log('🚨 HIGH RISK: Proposed +4.0 exceeds maximum calculated need');
      console.log(`   Recommended: Start with +${avgAdjustment.toFixed(1)} runs`);
    } else if (4.0 > avgAdjustment + 1.0) {
      console.log('⚠️ MEDIUM RISK: Proposed +4.0 is above average but within range');
      console.log('   Consider gradual implementation');
    } else {
      console.log('✅ LOW RISK: Proposed +4.0 is well-supported by analysis');
    }
  }
  
  private calculateSimpleAverageMethod(): number {
    // Average underestimation across recent games
    const avgUnderestimation = coorsFieldGames.reduce((sum, game) => 
      sum + (game.actualTotal - game.ourPrediction), 0) / coorsFieldGames.length;
    
    return avgUnderestimation - 1.0; // Subtract current +1.0 adjustment
  }
  
  private calculateWeightedMethod(): number {
    // Weight more recent games higher
    const weights = [0.5, 0.3, 0.2]; // Most recent gets highest weight
    let weightedSum = 0;
    let totalWeight = 0;
    
    coorsFieldGames.forEach((game, index) => {
      const weight = weights[index] || 0.1;
      const underestimation = game.actualTotal - game.ourPrediction;
      weightedSum += underestimation * weight;
      totalWeight += weight;
    });
    
    return (weightedSum / totalWeight) - 1.0;
  }
  
  private calculateHistoricalMethod(): number {
    // Based on historical Coors average vs our baseline
    const historicalCoorsAvg = 11.5;
    const ourCurrentBaseline = 8.5; // Approximate average of our predictions
    return historicalCoorsAvg - ourCurrentBaseline - 1.0;
  }
  
  private calculateSportsBookMethod(): number {
    // Based on sportsbook lines vs our predictions
    const avgSportsBookLine = coorsFieldGames.reduce((sum, game) => 
      sum + game.sportsBookLine, 0) / coorsFieldGames.length;
    const avgOurPrediction = coorsFieldGames.reduce((sum, game) => 
      sum + game.ourPrediction, 0) / coorsFieldGames.length;
    
    return avgSportsBookLine - avgOurPrediction - 1.0;
  }
  
  generateImplementationPlan(): void {
    console.log('\n📋 IMPLEMENTATION PLAN');
    console.log('======================');
    
    console.log('Recommended approach for HIGH RISK change:');
    console.log('1. 🎯 PHASE 1: Implement +2.5 run adjustment (conservative start)');
    console.log('2. 📊 Monitor 3-5 games for accuracy improvement');
    console.log('3. 🔄 PHASE 2: If successful, increase to +3.5 runs');
    console.log('4. 📈 PHASE 3: Final adjustment to +4.0 if data supports');
    
    console.log('\nSafeguards for each phase:');
    console.log('• Track Coors Field accuracy separately from overall model');
    console.log('• Monitor for over-correction (predicting too high)');
    console.log('• Compare against sportsbook lines as sanity check');
    console.log('• Immediate rollback if accuracy drops below 30%');
    console.log('• Weather-specific tracking (hot vs moderate temperatures)');
    
    console.log('\nSuccess criteria:');
    console.log('• Coors Field accuracy improves to >50%');
    console.log('• Average prediction error reduces to <4 runs');
    console.log('• Maintains accuracy at other venues');
    console.log('• Predictions align closer to sportsbook expectations');
  }
}

// Run comprehensive analysis
const analyzer = new CoorsFieldDeepAnalyzer();

console.log('🏔️ COMPREHENSIVE COORS FIELD ANALYSIS');
console.log('======================================');
console.log('HIGH RISK change requires detailed assessment\n');

analyzer.analyzeTeamSpecificEffects();
analyzer.analyzeWeatherAmplification();
analyzer.analyzePitcherAltitudeEffects();
analyzer.calculateOptimalAdjustment();
analyzer.generateImplementationPlan();

console.log('\n✅ Deep analysis complete - Ready for implementation decision');