#!/usr/bin/env node

/**
 * Scoring Bias Analysis Script
 * 
 * Analyzes validation results to identify systematic biases
 * in run prediction vs actual game totals
 */

import * as fs from 'fs';

console.log('🔍 MLB Scoring Bias Analysis');
console.log('============================');

interface ValidationResult {
  prediction: {
    game_id: string;
    date: string;
    home_team: string;
    away_team: string;
    venue: string;
    prediction: 'Over' | 'Under';
    calculated_total: number;
    confidence: number;
    individual_models: any;
    weather_data: any;
  };
  actual_total: number;
  prediction_correct: boolean;
  actual_result: 'Over' | 'Under';
  market_total: number;
  edge_correct: boolean;
}

interface BiasAnalysis {
  overall_bias: {
    avg_predicted: number;
    avg_actual: number;
    bias: number;
    direction: string;
  };
  venue_bias: Record<string, {
    count: number;
    avg_predicted: number;
    avg_actual: number;
    bias: number;
  }>;
  weather_bias: {
    hot_weather: { predicted: number; actual: number; bias: number; count: number };
    cold_weather: { predicted: number; actual: number; bias: number; count: number };
    windy_conditions: { predicted: number; actual: number; bias: number; count: number };
    dome_games: { predicted: number; actual: number; bias: number; count: number };
  };
  team_bias: Record<string, {
    count: number;
    avg_predicted: number;
    avg_actual: number;
    bias: number;
  }>;
  confidence_bias: Record<string, {
    count: number;
    avg_predicted: number;
    avg_actual: number;
    bias: number;
    win_rate: number;
  }>;
}

/**
 * Load validation results
 */
function loadValidationResults(): ValidationResult[] {
  try {
    const files = fs.readdirSync('/Users/davidloake/Downloads/mlb/data/reports/')
      .filter(f => f.startsWith('validation-results-'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      throw new Error('No validation results found');
    }
    
    const latestFile = files[0];
    console.log(`📂 Loading validation results from: ${latestFile}`);
    
    const data = JSON.parse(
      fs.readFileSync(`/Users/davidloake/Downloads/mlb/data/reports/${latestFile}`, 'utf8')
    );
    
    console.log(`📊 Loaded ${data.detailed_validations.length} validated predictions\n`);
    return data.detailed_validations;
    
  } catch (error) {
    console.error('❌ Failed to load validation results:', error);
    throw error;
  }
}

/**
 * Analyze overall scoring bias
 */
function analyzeOverallBias(validations: ValidationResult[]): any {
  const totalPredicted = validations.reduce((sum, v) => sum + v.prediction.calculated_total, 0);
  const totalActual = validations.reduce((sum, v) => sum + v.actual_total, 0);
  
  const avgPredicted = totalPredicted / validations.length;
  const avgActual = totalActual / validations.length;
  const bias = avgPredicted - avgActual;
  
  return {
    avg_predicted: Math.round(avgPredicted * 100) / 100,
    avg_actual: Math.round(avgActual * 100) / 100,
    bias: Math.round(bias * 100) / 100,
    direction: bias > 0 ? 'Over-predicting' : 'Under-predicting'
  };
}

/**
 * Analyze venue-specific bias
 */
function analyzeVenueBias(validations: ValidationResult[]): Record<string, any> {
  const venueGroups: Record<string, ValidationResult[]> = {};
  
  // Group by venue
  validations.forEach(v => {
    if (!venueGroups[v.prediction.venue]) {
      venueGroups[v.prediction.venue] = [];
    }
    venueGroups[v.prediction.venue].push(v);
  });
  
  const venueBias: Record<string, any> = {};
  
  Object.entries(venueGroups).forEach(([venue, games]) => {
    if (games.length >= 3) { // Only analyze venues with 3+ games
      const avgPredicted = games.reduce((sum, g) => sum + g.prediction.calculated_total, 0) / games.length;
      const avgActual = games.reduce((sum, g) => sum + g.actual_total, 0) / games.length;
      const bias = avgPredicted - avgActual;
      
      venueBias[venue] = {
        count: games.length,
        avg_predicted: Math.round(avgPredicted * 100) / 100,
        avg_actual: Math.round(avgActual * 100) / 100,
        bias: Math.round(bias * 100) / 100
      };
    }
  });
  
  return venueBias;
}

/**
 * Analyze weather-related bias
 */
function analyzeWeatherBias(validations: ValidationResult[]): any {
  const categories = {
    hot_weather: validations.filter(v => v.prediction.weather_data?.temp_f > 80),
    cold_weather: validations.filter(v => v.prediction.weather_data?.temp_f < 60),
    windy_conditions: validations.filter(v => v.prediction.weather_data?.wind_speed_mph > 12),
    dome_games: validations.filter(v => v.prediction.weather_data?.is_dome === true)
  };
  
  const weatherBias: any = {};
  
  Object.entries(categories).forEach(([category, games]) => {
    if (games.length > 0) {
      const avgPredicted = games.reduce((sum, g) => sum + g.prediction.calculated_total, 0) / games.length;
      const avgActual = games.reduce((sum, g) => sum + g.actual_total, 0) / games.length;
      const bias = avgPredicted - avgActual;
      
      weatherBias[category] = {
        count: games.length,
        predicted: Math.round(avgPredicted * 100) / 100,
        actual: Math.round(avgActual * 100) / 100,
        bias: Math.round(bias * 100) / 100
      };
    }
  });
  
  return weatherBias;
}

/**
 * Analyze team-specific bias
 */
function analyzeTeamBias(validations: ValidationResult[]): Record<string, any> {
  const teamGroups: Record<string, ValidationResult[]> = {};
  
  // Group by home team (since home field advantage matters)
  validations.forEach(v => {
    if (!teamGroups[v.prediction.home_team]) {
      teamGroups[v.prediction.home_team] = [];
    }
    teamGroups[v.prediction.home_team].push(v);
  });
  
  const teamBias: Record<string, any> = {};
  
  Object.entries(teamGroups).forEach(([team, games]) => {
    if (games.length >= 4) { // Only analyze teams with 4+ home games
      const avgPredicted = games.reduce((sum, g) => sum + g.prediction.calculated_total, 0) / games.length;
      const avgActual = games.reduce((sum, g) => sum + g.actual_total, 0) / games.length;
      const bias = avgPredicted - avgActual;
      
      teamBias[team] = {
        count: games.length,
        avg_predicted: Math.round(avgPredicted * 100) / 100,
        avg_actual: Math.round(avgActual * 100) / 100,
        bias: Math.round(bias * 100) / 100
      };
    }
  });
  
  return teamBias;
}

/**
 * Analyze confidence-based bias
 */
function analyzeConfidenceBias(validations: ValidationResult[]): Record<string, any> {
  const confidenceBrackets = {
    'Low (45-65%)': validations.filter(v => v.prediction.confidence >= 45 && v.prediction.confidence < 65),
    'Medium (65-75%)': validations.filter(v => v.prediction.confidence >= 65 && v.prediction.confidence < 75),
    'High (75-85%)': validations.filter(v => v.prediction.confidence >= 75 && v.prediction.confidence < 85),
    'Very High (85%+)': validations.filter(v => v.prediction.confidence >= 85)
  };
  
  const confidenceBias: Record<string, any> = {};
  
  Object.entries(confidenceBrackets).forEach(([bracket, games]) => {
    if (games.length > 0) {
      const avgPredicted = games.reduce((sum, g) => sum + g.prediction.calculated_total, 0) / games.length;
      const avgActual = games.reduce((sum, g) => sum + g.actual_total, 0) / games.length;
      const bias = avgPredicted - avgActual;
      const correct = games.filter(g => g.prediction_correct).length;
      const winRate = (correct / games.length) * 100;
      
      confidenceBias[bracket] = {
        count: games.length,
        avg_predicted: Math.round(avgPredicted * 100) / 100,
        avg_actual: Math.round(avgActual * 100) / 100,
        bias: Math.round(bias * 100) / 100,
        win_rate: Math.round(winRate * 10) / 10
      };
    }
  });
  
  return confidenceBias;
}

/**
 * Identify systematic patterns and missing factors
 */
function identifyMissingFactors(validations: ValidationResult[]): any {
  console.log('🔬 SYSTEMATIC PATTERN ANALYSIS');
  console.log('==============================');
  
  // Analyze day of week patterns
  const dayGroups: Record<string, ValidationResult[]> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  validations.forEach(v => {
    const date = new Date(v.prediction.date);
    const dayName = dayNames[date.getDay()];
    if (!dayGroups[dayName]) dayGroups[dayName] = [];
    dayGroups[dayName].push(v);
  });
  
  console.log('\n📅 Day of Week Analysis:');
  Object.entries(dayGroups).forEach(([day, games]) => {
    if (games.length >= 10) {
      const avgActual = games.reduce((sum, g) => sum + g.actual_total, 0) / games.length;
      const winRate = (games.filter(g => g.prediction_correct).length / games.length) * 100;
      console.log(`   ${day}: ${games.length} games, avg actual: ${avgActual.toFixed(2)}, win rate: ${winRate.toFixed(1)}%`);
    }
  });
  
  // Analyze extreme predictions vs reality
  const highPredictions = validations.filter(v => v.prediction.calculated_total > 9.5);
  const lowPredictions = validations.filter(v => v.prediction.calculated_total < 7.5);
  
  console.log('\n🎯 Extreme Prediction Analysis:');
  console.log(`   High predictions (>9.5): ${highPredictions.length} games`);
  if (highPredictions.length > 0) {
    const avgActual = highPredictions.reduce((sum, g) => sum + g.actual_total, 0) / highPredictions.length;
    const winRate = (highPredictions.filter(g => g.prediction_correct).length / highPredictions.length) * 100;
    console.log(`      Avg actual: ${avgActual.toFixed(2)}, Win rate: ${winRate.toFixed(1)}%`);
  }
  
  console.log(`   Low predictions (<7.5): ${lowPredictions.length} games`);
  if (lowPredictions.length > 0) {
    const avgActual = lowPredictions.reduce((sum, g) => sum + g.actual_total, 0) / lowPredictions.length;
    const winRate = (lowPredictions.filter(g => g.prediction_correct).length / lowPredictions.length) * 100;
    console.log(`      Avg actual: ${avgActual.toFixed(2)}, Win rate: ${winRate.toFixed(1)}%`);
  }
  
  // Identify potential missing factors
  console.log('\n🔍 Potential Missing Factors:');
  
  // Check if certain conditions consistently lead to higher/lower actual scores
  const domeGames = validations.filter(v => v.prediction.weather_data?.is_dome);
  if (domeGames.length > 5) {
    const domeActual = domeGames.reduce((sum, g) => sum + g.actual_total, 0) / domeGames.length;
    const outdoorGames = validations.filter(v => !v.prediction.weather_data?.is_dome);
    const outdoorActual = outdoorGames.reduce((sum, g) => sum + g.actual_total, 0) / outdoorGames.length;
    console.log(`   Dome vs Outdoor: Dome avg ${domeActual.toFixed(2)}, Outdoor avg ${outdoorActual.toFixed(2)}`);
  }
  
  // Check for month/season effects
  const monthGroups: Record<number, ValidationResult[]> = {};
  validations.forEach(v => {
    const month = new Date(v.prediction.date).getMonth();
    if (!monthGroups[month]) monthGroups[month] = [];
    monthGroups[month].push(v);
  });
  
  console.log('\n📊 Monthly Scoring Patterns:');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  Object.entries(monthGroups).forEach(([monthStr, games]) => {
    const month = parseInt(monthStr);
    if (games.length >= 20) {
      const avgActual = games.reduce((sum, g) => sum + g.actual_total, 0) / games.length;
      console.log(`   ${monthNames[month]}: ${games.length} games, avg actual: ${avgActual.toFixed(2)}`);
    }
  });
}

/**
 * Main bias analysis execution
 */
async function analyzeBias(): Promise<void> {
  try {
    const validations = loadValidationResults();
    
    if (validations.length === 0) {
      throw new Error('No validation data to analyze');
    }
    
    // Overall bias analysis
    console.log('📊 OVERALL SCORING BIAS');
    console.log('========================');
    const overallBias = analyzeOverallBias(validations);
    console.log(`Average Predicted: ${overallBias.avg_predicted} runs`);
    console.log(`Average Actual: ${overallBias.avg_actual} runs`);
    console.log(`Bias: ${overallBias.bias > 0 ? '+' : ''}${overallBias.bias} runs (${overallBias.direction})`);
    
    // Venue bias analysis
    console.log('\n🏟️  VENUE-SPECIFIC BIAS');
    console.log('======================');
    const venueBias = analyzeVenueBias(validations);
    const sortedVenues = Object.entries(venueBias)
      .sort(([,a], [,b]) => Math.abs(b.bias) - Math.abs(a.bias))
      .slice(0, 10); // Top 10 most biased venues
    
    sortedVenues.forEach(([venue, stats]) => {
      const direction = stats.bias > 0 ? 'Over' : 'Under';
      console.log(`${venue}: ${stats.bias > 0 ? '+' : ''}${stats.bias} runs (${direction}-predicting, ${stats.count} games)`);
    });
    
    // Weather bias analysis
    console.log('\n🌤️  WEATHER-RELATED BIAS');
    console.log('========================');
    const weatherBias = analyzeWeatherBias(validations);
    Object.entries(weatherBias).forEach(([condition, stats]: [string, any]) => {
      const direction = stats.bias > 0 ? 'Over' : 'Under';
      console.log(`${condition.replace('_', ' ')}: ${stats.bias > 0 ? '+' : ''}${stats.bias} runs (${direction}-predicting, ${stats.count} games)`);
    });
    
    // Team bias analysis
    console.log('\n⚾ TOP TEAM BIAS (Home Games)');
    console.log('=============================');
    const teamBias = analyzeTeamBias(validations);
    const sortedTeams = Object.entries(teamBias)
      .sort(([,a], [,b]) => Math.abs(b.bias) - Math.abs(a.bias))
      .slice(0, 8); // Top 8 most biased teams
    
    sortedTeams.forEach(([team, stats]) => {
      const direction = stats.bias > 0 ? 'Over' : 'Under';
      console.log(`${team}: ${stats.bias > 0 ? '+' : ''}${stats.bias} runs (${direction}-predicting, ${stats.count} games)`);
    });
    
    // Confidence bias analysis
    console.log('\n🎯 CONFIDENCE-BASED BIAS');
    console.log('=========================');
    const confidenceBias = analyzeConfidenceBias(validations);
    Object.entries(confidenceBias).forEach(([bracket, stats]: [string, any]) => {
      const direction = stats.bias > 0 ? 'Over' : 'Under';
      console.log(`${bracket}: ${stats.bias > 0 ? '+' : ''}${stats.bias} runs (${direction}-predicting, ${stats.win_rate}% accuracy, ${stats.count} games)`);
    });
    
    // Identify missing factors
    identifyMissingFactors(validations);
    
    // Generate recommendations
    console.log('\n💡 BIAS CORRECTION RECOMMENDATIONS');
    console.log('==================================');
    
    if (Math.abs(overallBias.bias) > 0.1) {
      console.log(`1. Apply global bias correction: ${overallBias.bias > 0 ? 'Reduce' : 'Increase'} all predictions by ~${Math.abs(overallBias.bias).toFixed(2)} runs`);
    }
    
    const extremeVenues = Object.entries(venueBias).filter(([,stats]: [string, any]) => Math.abs(stats.bias) > 0.3);
    if (extremeVenues.length > 0) {
      console.log('2. Implement venue-specific corrections for:');
      extremeVenues.forEach(([venue, stats]: [string, any]) => {
        console.log(`   - ${venue}: ${stats.bias > 0 ? 'Reduce' : 'Increase'} by ${Math.abs(stats.bias).toFixed(2)} runs`);
      });
    }
    
    const weatherFactors = Object.entries(weatherBias).filter(([,stats]: [string, any]) => Math.abs(stats.bias) > 0.2);
    if (weatherFactors.length > 0) {
      console.log('3. Improve weather factor modeling for:');
      weatherFactors.forEach(([condition, stats]: [string, any]) => {
        console.log(`   - ${condition.replace('_', ' ')}: ${stats.bias > 0 ? 'Reduce' : 'Increase'} impact by ${Math.abs(stats.bias).toFixed(2)} runs`);
      });
    }
    
    // Save analysis results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const analysisFile = `/Users/davidloake/Downloads/mlb/data/reports/bias-analysis-${timestamp}.json`;
    
    const analysisResults: BiasAnalysis = {
      overall_bias: overallBias,
      venue_bias: venueBias,
      weather_bias: weatherBias,
      team_bias: teamBias,
      confidence_bias: confidenceBias
    };
    
    fs.writeFileSync(analysisFile, JSON.stringify(analysisResults, null, 2));
    console.log(`\n💾 Bias analysis saved to: ${analysisFile}`);
    
  } catch (error) {
    console.error('❌ Bias analysis failed:', error);
    process.exit(1);
  }
}

// Run analysis
analyzeBias();