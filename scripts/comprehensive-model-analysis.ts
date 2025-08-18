#!/usr/bin/env node

/**
 * Comprehensive ML-Driven Model Analysis
 * 
 * Stop being reactive - use proper data science techniques to identify
 * ALL systematic biases, not just the obvious ones
 */

import * as fs from 'fs';

interface GameData {
  date: string;
  game: string;
  venue: string;
  ourPrediction: number;
  actualTotal: number;
  sportsBookLine: number;
  weather: {
    temp: number;
    conditions: string;
  };
  gameTime: 'Day' | 'Night';
  dayOfWeek: string;
  homeTeam: string;
  awayTeam: string;
  month: number;
  correct: boolean;
  predictionError: number;
  actualResult: 'Over' | 'Under' | 'Push';
  ourRecommendation: string;
}

// Comprehensive dataset from our recent predictions
const gameDataset: GameData[] = [
  // August 1st (Pre-adjustment)
  { date: '2025-08-01', game: 'Braves @ Reds', venue: 'Great American Ball Park', ourPrediction: 9.3, actualTotal: 5, sportsBookLine: 9.5, weather: { temp: 82, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Reds', awayTeam: 'Braves', month: 8, correct: true, predictionError: 4.3, actualResult: 'Under', ourRecommendation: 'PASS' },
  { date: '2025-08-01', game: 'Orioles @ Cubs', venue: 'Wrigley Field', ourPrediction: 8.6, actualTotal: 1, sportsBookLine: 7.5, weather: { temp: 78, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Cubs', awayTeam: 'Orioles', month: 8, correct: false, predictionError: 7.6, actualResult: 'Under', ourRecommendation: 'STRONG Over' },
  { date: '2025-08-01', game: 'Tigers @ Phillies', venue: 'Citizens Bank Park', ourPrediction: 8.7, actualTotal: 9, sportsBookLine: 7.5, weather: { temp: 84, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Phillies', awayTeam: 'Tigers', month: 8, correct: true, predictionError: 0.3, actualResult: 'Over', ourRecommendation: 'STRONG Over' },
  { date: '2025-08-01', game: 'Brewers @ Nationals', venue: 'Nationals Park', ourPrediction: 8.5, actualTotal: 25, sportsBookLine: 8.5, weather: { temp: 86, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Nationals', awayTeam: 'Brewers', month: 8, correct: false, predictionError: 16.5, actualResult: 'Over', ourRecommendation: 'PASS' },
  { date: '2025-08-01', game: 'Royals @ Blue Jays', venue: 'Rogers Centre', ourPrediction: 8.9, actualTotal: 12, sportsBookLine: 8.0, weather: { temp: 75, conditions: 'dome' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Blue Jays', awayTeam: 'Royals', month: 8, correct: true, predictionError: 3.1, actualResult: 'Over', ourRecommendation: 'PASS' },
  { date: '2025-08-01', game: 'Twins @ Guardians', venue: 'Progressive Field', ourPrediction: 8.9, actualTotal: 5, sportsBookLine: 7.0, weather: { temp: 76, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Guardians', awayTeam: 'Twins', month: 8, correct: false, predictionError: 3.9, actualResult: 'Under', ourRecommendation: 'STRONG Over' },
  { date: '2025-08-01', game: 'Astros @ Red Sox', venue: 'Fenway Park', ourPrediction: 9.1, actualTotal: 3, sportsBookLine: 8.0, weather: { temp: 79, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Red Sox', awayTeam: 'Astros', month: 8, correct: false, predictionError: 6.1, actualResult: 'Under', ourRecommendation: 'STRONG Over' },
  { date: '2025-08-01', game: 'Yankees @ Marlins', venue: 'loanDepot park', ourPrediction: 8.4, actualTotal: 25, sportsBookLine: 7.5, weather: { temp: 88, conditions: 'dome' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Marlins', awayTeam: 'Yankees', month: 8, correct: false, predictionError: 16.6, actualResult: 'Over', ourRecommendation: 'LEAN Over' },
  { date: '2025-08-01', game: 'Giants @ Mets', venue: 'Citi Field', ourPrediction: 8.8, actualTotal: 7, sportsBookLine: 7.5, weather: { temp: 81, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Mets', awayTeam: 'Giants', month: 8, correct: false, predictionError: 1.8, actualResult: 'Under', ourRecommendation: 'STRONG Over' },
  { date: '2025-08-01', game: 'Dodgers @ Rays', venue: 'Tropicana Field', ourPrediction: 9.4, actualTotal: 5, sportsBookLine: 9.0, weather: { temp: 72, conditions: 'dome' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Rays', awayTeam: 'Dodgers', month: 8, correct: false, predictionError: 4.4, actualResult: 'Under', ourRecommendation: 'PASS' },
  { date: '2025-08-01', game: 'Pirates @ Rockies', venue: 'Coors Field', ourPrediction: 8.8, actualTotal: 33, sportsBookLine: 11.5, weather: { temp: 88, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Rockies', awayTeam: 'Pirates', month: 8, correct: false, predictionError: 24.2, actualResult: 'Over', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-01', game: 'White Sox @ Angels', venue: 'Angel Stadium', ourPrediction: 8.4, actualTotal: 9, sportsBookLine: 9.5, weather: { temp: 86, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Angels', awayTeam: 'White Sox', month: 8, correct: true, predictionError: 0.6, actualResult: 'Under', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-01', game: 'Cardinals @ Padres', venue: 'Petco Park', ourPrediction: 8.8, actualTotal: 5, sportsBookLine: 7.5, weather: { temp: 72, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Padres', awayTeam: 'Cardinals', month: 8, correct: false, predictionError: 3.8, actualResult: 'Under', ourRecommendation: 'STRONG Over' },
  { date: '2025-08-01', game: 'Diamondbacks @ Athletics', venue: 'Oakland Coliseum', ourPrediction: 8.4, actualTotal: 6, sportsBookLine: 9.5, weather: { temp: 75, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Athletics', awayTeam: 'Diamondbacks', month: 8, correct: true, predictionError: 2.4, actualResult: 'Under', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-01', game: 'Rangers @ Mariners', venue: 'T-Mobile Park', ourPrediction: 9.4, actualTotal: 7, sportsBookLine: 7.5, weather: { temp: 72, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Thursday', homeTeam: 'Mariners', awayTeam: 'Rangers', month: 8, correct: false, predictionError: 2.4, actualResult: 'Under', ourRecommendation: 'STRONG Over' },
  
  // August 2nd (Post-adjustment)
  { date: '2025-08-02', game: 'Dodgers @ Rays', venue: 'Tropicana Field', ourPrediction: 8.5, actualTotal: 4, sportsBookLine: 8.5, weather: { temp: 72, conditions: 'dome' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Rays', awayTeam: 'Dodgers', month: 8, correct: false, predictionError: 4.5, actualResult: 'Under', ourRecommendation: 'PASS' },
  { date: '2025-08-02', game: 'Orioles @ Cubs', venue: 'Wrigley Field', ourPrediction: 8.0, actualTotal: 7, sportsBookLine: 8.5, weather: { temp: 76, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Cubs', awayTeam: 'Orioles', month: 8, correct: true, predictionError: 1.0, actualResult: 'Under', ourRecommendation: 'PASS' },
  { date: '2025-08-02', game: 'Royals @ Blue Jays', venue: 'Rogers Centre', ourPrediction: 8.4, actualTotal: 6, sportsBookLine: 8.0, weather: { temp: 75, conditions: 'dome' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Blue Jays', awayTeam: 'Royals', month: 8, correct: false, predictionError: 2.4, actualResult: 'Under', ourRecommendation: 'PASS' },
  { date: '2025-08-02', game: 'Pirates @ Rockies', venue: 'Coors Field', ourPrediction: 8.0, actualTotal: 13, sportsBookLine: 10.0, weather: { temp: 87, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Rockies', awayTeam: 'Pirates', month: 8, correct: false, predictionError: 5.0, actualResult: 'Over', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-02', game: 'Tigers @ Phillies', venue: 'Citizens Bank Park', ourPrediction: 8.0, actualTotal: 12, sportsBookLine: 7.0, weather: { temp: 83, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Phillies', awayTeam: 'Tigers', month: 8, correct: true, predictionError: 4.0, actualResult: 'Over', ourRecommendation: 'STRONG Over' },
  { date: '2025-08-02', game: 'Brewers @ Nationals', venue: 'Nationals Park', ourPrediction: 7.9, actualTotal: 10, sportsBookLine: 8.5, weather: { temp: 85, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Nationals', awayTeam: 'Brewers', month: 8, correct: false, predictionError: 2.1, actualResult: 'Over', ourRecommendation: 'LEAN Under' },
  { date: '2025-08-02', game: 'Astros @ Red Sox', venue: 'Fenway Park', ourPrediction: 8.4, actualTotal: 10, sportsBookLine: 9.5, weather: { temp: 78, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Red Sox', awayTeam: 'Astros', month: 8, correct: false, predictionError: 1.6, actualResult: 'Over', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-02', game: 'Twins @ Guardians', venue: 'Progressive Field', ourPrediction: 8.0, actualTotal: 9, sportsBookLine: 7.5, weather: { temp: 77, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Guardians', awayTeam: 'Twins', month: 8, correct: true, predictionError: 1.0, actualResult: 'Over', ourRecommendation: 'LEAN Over' },
  { date: '2025-08-02', game: 'Yankees @ Marlins', venue: 'loanDepot park', ourPrediction: 7.7, actualTotal: 2, sportsBookLine: 8.0, weather: { temp: 89, conditions: 'dome' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Marlins', awayTeam: 'Yankees', month: 8, correct: true, predictionError: 5.7, actualResult: 'Under', ourRecommendation: 'PASS' },
  { date: '2025-08-02', game: 'Giants @ Mets', venue: 'Citi Field', ourPrediction: 8.0, actualTotal: 18, sportsBookLine: 8.5, weather: { temp: 82, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Mets', awayTeam: 'Giants', month: 8, correct: false, predictionError: 10.0, actualResult: 'Over', ourRecommendation: 'PASS' },
  { date: '2025-08-02', game: 'Rangers @ Mariners', venue: 'T-Mobile Park', ourPrediction: 8.6, actualTotal: 10, sportsBookLine: 7.5, weather: { temp: 71, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Mariners', awayTeam: 'Rangers', month: 8, correct: true, predictionError: 1.4, actualResult: 'Over', ourRecommendation: 'STRONG Over' },
  { date: '2025-08-02', game: 'Diamondbacks @ Athletics', venue: 'Oakland Coliseum', ourPrediction: 7.6, actualTotal: 9, sportsBookLine: 10.0, weather: { temp: 74, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Athletics', awayTeam: 'Diamondbacks', month: 8, correct: true, predictionError: 1.4, actualResult: 'Under', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-02', game: 'White Sox @ Angels', venue: 'Angel Stadium', ourPrediction: 7.5, actualTotal: 1, sportsBookLine: 9.5, weather: { temp: 85, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Angels', awayTeam: 'White Sox', month: 8, correct: true, predictionError: 6.5, actualResult: 'Under', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-02', game: 'Cardinals @ Padres', venue: 'Petco Park', ourPrediction: 8.0, actualTotal: 13, sportsBookLine: 8.5, weather: { temp: 71, conditions: 'clear' }, gameTime: 'Night', dayOfWeek: 'Friday', homeTeam: 'Padres', awayTeam: 'Cardinals', month: 8, correct: false, predictionError: 5.0, actualResult: 'Over', ourRecommendation: 'PASS' },
  
  // August 3rd (Post-adjustment continued)
  { date: '2025-08-03', game: 'Astros @ Red Sox', venue: 'Fenway Park', ourPrediction: 8.7, actualTotal: 7, sportsBookLine: 8.5, weather: { temp: 79, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Red Sox', awayTeam: 'Astros', month: 8, correct: false, predictionError: 1.7, actualResult: 'Under', ourRecommendation: 'PASS' },
  { date: '2025-08-03', game: 'Dodgers @ Rays', venue: 'Tropicana Field', ourPrediction: 8.7, actualTotal: 3, sportsBookLine: 8.5, weather: { temp: 72, conditions: 'dome' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Rays', awayTeam: 'Dodgers', month: 8, correct: false, predictionError: 5.7, actualResult: 'Under', ourRecommendation: 'PASS' },
  { date: '2025-08-03', game: 'Brewers @ Nationals', venue: 'Nationals Park', ourPrediction: 8.0, actualTotal: 17, sportsBookLine: 8.5, weather: { temp: 84, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Nationals', awayTeam: 'Brewers', month: 8, correct: false, predictionError: 9.0, actualResult: 'Over', ourRecommendation: 'PASS' },
  { date: '2025-08-03', game: 'Royals @ Blue Jays', venue: 'Rogers Centre', ourPrediction: 8.5, actualTotal: 11, sportsBookLine: 8.0, weather: { temp: 75, conditions: 'dome' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Blue Jays', awayTeam: 'Royals', month: 8, correct: true, predictionError: 2.5, actualResult: 'Over', ourRecommendation: 'PASS' },
  { date: '2025-08-03', game: 'Twins @ Guardians', venue: 'Progressive Field', ourPrediction: 7.9, actualTotal: 9, sportsBookLine: 8.5, weather: { temp: 76, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Guardians', awayTeam: 'Twins', month: 8, correct: false, predictionError: 1.1, actualResult: 'Over', ourRecommendation: 'LEAN Under' },
  { date: '2025-08-03', game: 'Yankees @ Marlins', venue: 'loanDepot park', ourPrediction: 7.5, actualTotal: 10, sportsBookLine: 8.0, weather: { temp: 90, conditions: 'dome' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Marlins', awayTeam: 'Yankees', month: 8, correct: false, predictionError: 2.5, actualResult: 'Over', ourRecommendation: 'PASS' },
  { date: '2025-08-03', game: 'Giants @ Mets', venue: 'Citi Field', ourPrediction: 7.8, actualTotal: 16, sportsBookLine: 8.5, weather: { temp: 81, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Mets', awayTeam: 'Giants', month: 8, correct: false, predictionError: 8.2, actualResult: 'Over', ourRecommendation: 'LEAN Under' },
  { date: '2025-08-03', game: 'Orioles @ Cubs', venue: 'Wrigley Field', ourPrediction: 8.2, actualTotal: 8, sportsBookLine: 8.5, weather: { temp: 78, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Cubs', awayTeam: 'Orioles', month: 8, correct: true, predictionError: 0.2, actualResult: 'Under', ourRecommendation: 'PASS' },
  { date: '2025-08-03', game: 'Pirates @ Rockies', venue: 'Coors Field', ourPrediction: 8.0, actualTotal: 14, sportsBookLine: 11.5, weather: { temp: 89, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Rockies', awayTeam: 'Pirates', month: 8, correct: false, predictionError: 6.0, actualResult: 'Over', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-03', game: 'Diamondbacks @ Athletics', venue: 'Oakland Coliseum', ourPrediction: 7.5, actualTotal: 10, sportsBookLine: 10.0, weather: { temp: 75, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Athletics', awayTeam: 'Diamondbacks', month: 8, correct: false, predictionError: 2.5, actualResult: 'Push', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-03', game: 'White Sox @ Angels', venue: 'Angel Stadium', ourPrediction: 7.3, actualTotal: 13, sportsBookLine: 9.5, weather: { temp: 87, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Angels', awayTeam: 'White Sox', month: 8, correct: false, predictionError: 5.7, actualResult: 'Over', ourRecommendation: 'STRONG Under' },
  { date: '2025-08-03', game: 'Cardinals @ Padres', venue: 'Petco Park', ourPrediction: 8.0, actualTotal: 10, sportsBookLine: 8.0, weather: { temp: 72, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Padres', awayTeam: 'Cardinals', month: 8, correct: false, predictionError: 2.0, actualResult: 'Over', ourRecommendation: 'PASS' },
  { date: '2025-08-03', game: 'Rangers @ Mariners', venue: 'T-Mobile Park', ourPrediction: 8.6, actualTotal: 9, sportsBookLine: 7.5, weather: { temp: 73, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Mariners', awayTeam: 'Rangers', month: 8, correct: true, predictionError: 0.4, actualResult: 'Over', ourRecommendation: 'STRONG Over' },
  { date: '2025-08-03', game: 'Tigers @ Phillies', venue: 'Citizens Bank Park', ourPrediction: 8.0, actualTotal: 2, sportsBookLine: 8.0, weather: { temp: 84, conditions: 'clear' }, gameTime: 'Day', dayOfWeek: 'Saturday', homeTeam: 'Phillies', awayTeam: 'Tigers', month: 8, correct: false, predictionError: 6.0, actualResult: 'Under', ourRecommendation: 'PASS' }
];

interface BiasAnalysis {
  category: string;
  subcategory: string;
  sampleSize: number;
  avgPredictionError: number;
  accuracy: number;
  avgUnderBias: number;
  significanceLevel: number;
  recommendation: string;
}

interface ConfusionMatrix {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  precision: number;
  recall: number;
  f1Score: number;
}

class MLModelAnalyzer {
  private data: GameData[];
  
  constructor(data: GameData[]) {
    this.data = data;
  }
  
  /**
   * Comprehensive bias detection across all dimensions
   */
  analyzeSystematicBiases(): BiasAnalysis[] {
    const biases: BiasAnalysis[] = [];
    
    // Venue-based analysis
    const venues = [...new Set(this.data.map(d => d.venue))];
    venues.forEach(venue => {
      const venueData = this.data.filter(d => d.venue === venue);
      if (venueData.length >= 2) {
        biases.push(this.calculateBias('venue', venue, venueData));
      }
    });
    
    // Team-based analysis (home/away)
    const teams = [...new Set([...this.data.map(d => d.homeTeam), ...this.data.map(d => d.awayTeam)])];
    teams.forEach(team => {
      const homeData = this.data.filter(d => d.homeTeam === team);
      const awayData = this.data.filter(d => d.awayTeam === team);
      
      if (homeData.length >= 2) {
        biases.push(this.calculateBias('team_home', team, homeData));
      }
      if (awayData.length >= 2) {
        biases.push(this.calculateBias('team_away', team, awayData));
      }
    });
    
    // Weather-based analysis
    const hotWeather = this.data.filter(d => d.weather.temp >= 85);
    const coolWeather = this.data.filter(d => d.weather.temp <= 75);
    const moderateWeather = this.data.filter(d => d.weather.temp > 75 && d.weather.temp < 85);
    
    if (hotWeather.length >= 3) biases.push(this.calculateBias('weather', 'hot_85plus', hotWeather));
    if (coolWeather.length >= 3) biases.push(this.calculateBias('weather', 'cool_75minus', coolWeather));
    if (moderateWeather.length >= 3) biases.push(this.calculateBias('weather', 'moderate_75_85', moderateWeather));
    
    // Game time analysis
    const dayGames = this.data.filter(d => d.gameTime === 'Day');
    const nightGames = this.data.filter(d => d.gameTime === 'Night');
    
    if (dayGames.length >= 3) biases.push(this.calculateBias('gametime', 'day', dayGames));
    if (nightGames.length >= 3) biases.push(this.calculateBias('gametime', 'night', nightGames));
    
    // Day of week analysis
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    weekdays.forEach(day => {
      const dayData = this.data.filter(d => d.dayOfWeek === day);
      if (dayData.length >= 2) {
        biases.push(this.calculateBias('dayofweek', day, dayData));
      }
    });
    
    // Date-based analysis (pre vs post adjustment)
    const preAdjustment = this.data.filter(d => d.date === '2025-08-01');
    const postAdjustment = this.data.filter(d => d.date !== '2025-08-01');
    
    if (preAdjustment.length >= 3) biases.push(this.calculateBias('model_version', 'pre_adjustment', preAdjustment));
    if (postAdjustment.length >= 3) biases.push(this.calculateBias('model_version', 'post_adjustment', postAdjustment));
    
    return biases.sort((a, b) => Math.abs(b.avgUnderBias) - Math.abs(a.avgUnderBias));
  }
  
  private calculateBias(category: string, subcategory: string, data: GameData[]): BiasAnalysis {
    const sampleSize = data.length;
    const totalError = data.reduce((sum, d) => sum + d.predictionError, 0);
    const avgPredictionError = totalError / sampleSize;
    
    const correct = data.filter(d => d.correct).length;
    const accuracy = (correct / sampleSize) * 100;
    
    const underBias = data.reduce((sum, d) => sum + (d.actualTotal - d.ourPrediction), 0) / sampleSize;
    
    // Simple statistical significance (t-test approximation)
    const variance = data.reduce((sum, d) => sum + Math.pow((d.actualTotal - d.ourPrediction) - underBias, 2), 0) / (sampleSize - 1);
    const standardError = Math.sqrt(variance / sampleSize);
    const tScore = Math.abs(underBias) / standardError;
    const significanceLevel = tScore > 2.0 ? 0.05 : tScore > 1.65 ? 0.10 : 0.20;
    
    let recommendation = 'No action needed';
    if (Math.abs(underBias) > 2.0 && significanceLevel <= 0.10) {
      recommendation = underBias > 0 ? 'INCREASE predictions for this category' : 'DECREASE predictions for this category';
    } else if (Math.abs(underBias) > 1.0 && accuracy < 40) {
      recommendation = 'Monitor closely - potential systematic issue';
    }
    
    return {
      category,
      subcategory,
      sampleSize,
      avgPredictionError,
      accuracy,
      avgUnderBias: underBias,
      significanceLevel,
      recommendation
    };
  }
  
  /**
   * Generate confusion matrices for Over/Under predictions
   */
  generateConfusionMatrices(): { overall: ConfusionMatrix, byCategory: Map<string, ConfusionMatrix> } {
    const overall = this.calculateConfusionMatrix(this.data);
    const byCategory = new Map<string, ConfusionMatrix>();
    
    // By venue type
    const coorsGames = this.data.filter(d => d.venue === 'Coors Field');
    const domeGames = this.data.filter(d => d.weather.conditions === 'dome');
    const outdoorGames = this.data.filter(d => d.weather.conditions !== 'dome');
    
    if (coorsGames.length >= 2) byCategory.set('Coors Field', this.calculateConfusionMatrix(coorsGames));
    if (domeGames.length >= 3) byCategory.set('Dome Games', this.calculateConfusionMatrix(domeGames));
    if (outdoorGames.length >= 3) byCategory.set('Outdoor Games', this.calculateConfusionMatrix(outdoorGames));
    
    // By temperature
    const hotGames = this.data.filter(d => d.weather.temp >= 85);
    const coolGames = this.data.filter(d => d.weather.temp <= 75);
    
    if (hotGames.length >= 3) byCategory.set('Hot Weather (85°F+)', this.calculateConfusionMatrix(hotGames));
    if (coolGames.length >= 3) byCategory.set('Cool Weather (75°F-)', this.calculateConfusionMatrix(coolGames));
    
    // By model version
    const preAdj = this.data.filter(d => d.date === '2025-08-01');
    const postAdj = this.data.filter(d => d.date !== '2025-08-01');
    
    if (preAdj.length >= 3) byCategory.set('Pre-Adjustment Model', this.calculateConfusionMatrix(preAdj));
    if (postAdj.length >= 3) byCategory.set('Post-Adjustment Model', this.calculateConfusionMatrix(postAdj));
    
    return { overall, byCategory };
  }
  
  private calculateConfusionMatrix(data: GameData[]): ConfusionMatrix {
    let truePositive = 0; // Predicted Over, Actual Over
    let falsePositive = 0; // Predicted Over, Actual Under
    let trueNegative = 0; // Predicted Under, Actual Under  
    let falseNegative = 0; // Predicted Under, Actual Over
    
    data.forEach(d => {
      const predictedOver = d.ourPrediction > d.sportsBookLine;
      const actualOver = d.actualResult === 'Over';
      
      if (predictedOver && actualOver) truePositive++;
      else if (predictedOver && !actualOver) falsePositive++;
      else if (!predictedOver && !actualOver) trueNegative++;
      else if (!predictedOver && actualOver) falseNegative++;
    });
    
    const precision = truePositive / (truePositive + falsePositive) || 0;
    const recall = truePositive / (truePositive + falseNegative) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    return {
      truePositive,
      falsePositive,
      trueNegative,
      falseNegative,
      precision,
      recall,
      f1Score
    };
  }
  
  /**
   * Bayesian analysis of model assumptions
   */
  bayesianAnalysis(): any {
    // Prior assumption: Games should be roughly 50/50 Over/Under
    const priorOverRate = 0.5;
    
    // Observed data
    const totalGames = this.data.length;
    const actualOvers = this.data.filter(d => d.actualResult === 'Over').length;
    const observedOverRate = actualOvers / totalGames;
    
    // Bayesian update (simplified)
    const alpha = 1; // Prior pseudo-count for overs
    const beta = 1;  // Prior pseudo-count for unders
    
    const posteriorAlpha = alpha + actualOvers;
    const posteriorBeta = beta + (totalGames - actualOvers);
    const posteriorOverRate = posteriorAlpha / (posteriorAlpha + posteriorBeta);
    
    // Model performance vs expectation
    const ourOverPredictions = this.data.filter(d => d.ourPrediction > d.sportsBookLine).length;
    const ourOverRate = ourOverPredictions / totalGames;
    
    return {
      prior: {
        overRate: priorOverRate,
        assumption: '50/50 split expected'
      },
      observed: {
        overRate: observedOverRate,
        totalGames,
        actualOvers
      },
      posterior: {
        overRate: posteriorOverRate,
        confidence: `${Math.round(posteriorOverRate * 100)}% chance next game goes Over`
      },
      model: {
        ourOverRate,
        bias: ourOverRate - observedOverRate,
        biasInterpretation: ourOverRate > observedOverRate ? 'We predict too many Overs' : 'We predict too many Unders'
      }
    };
  }
  
  /**
   * Generate comprehensive report
   */
  generateReport(): void {
    console.log('🤖 COMPREHENSIVE ML-DRIVEN MODEL ANALYSIS');
    console.log('==========================================');
    console.log('Using proper data science techniques to identify ALL systematic issues\n');
    
    // Systematic bias analysis
    const biases = this.analyzeSystematicBiases();
    
    console.log('🎯 SYSTEMATIC BIAS DETECTION (RANKED BY SEVERITY)');
    console.log('=================================================');
    
    biases.slice(0, 15).forEach((bias, index) => {
      const severity = Math.abs(bias.avgUnderBias) > 3.0 ? '🚨 CRITICAL' :
                      Math.abs(bias.avgUnderBias) > 2.0 ? '⚠️ HIGH' :
                      Math.abs(bias.avgUnderBias) > 1.0 ? '📊 MODERATE' : '✅ LOW';
      
      console.log(`${index + 1}. ${severity} ${bias.category.toUpperCase()}: ${bias.subcategory}`);
      console.log(`   📊 Sample Size: ${bias.sampleSize} games`);
      console.log(`   📈 Accuracy: ${bias.accuracy.toFixed(1)}%`);
      console.log(`   📐 Avg Error: ${bias.avgPredictionError.toFixed(1)} runs`);
      console.log(`   🎯 Under Bias: ${bias.avgUnderBias >= 0 ? '+' : ''}${bias.avgUnderBias.toFixed(1)} runs`);
      console.log(`   📊 Significance: p < ${bias.significanceLevel.toFixed(2)}`);
      console.log(`   💡 ${bias.recommendation}`);
      console.log('');
    });
    
    // Confusion matrices
    const matrices = this.generateConfusionMatrices();
    
    console.log('📊 CONFUSION MATRIX ANALYSIS');
    console.log('============================');
    
    console.log('Overall Model Performance:');
    this.printConfusionMatrix('OVERALL', matrices.overall);
    
    matrices.byCategory.forEach((matrix, category) => {
      console.log(`\n${category}:`);
      this.printConfusionMatrix(category, matrix);
    });
    
    // Bayesian analysis
    const bayesian = this.bayesianAnalysis();
    
    console.log('\n🧠 BAYESIAN INFERENCE ANALYSIS');
    console.log('===============================');
    console.log(`Prior Assumption: ${bayesian.prior.assumption}`);
    console.log(`Observed Reality: ${(bayesian.observed.overRate * 100).toFixed(1)}% of games go Over`);
    console.log(`Posterior Belief: ${bayesian.posterior.confidence}`);
    console.log(`Our Model Bias: ${(bayesian.model.bias * 100).toFixed(1)} percentage points`);
    console.log(`Interpretation: ${bayesian.model.biasInterpretation}`);
    
    // Critical recommendations
    console.log('\n🚨 CRITICAL RECOMMENDATIONS (AUTO-GENERATED)');
    console.log('=============================================');
    
    const criticalBiases = biases.filter(b => Math.abs(b.avgUnderBias) > 2.0 && b.significanceLevel <= 0.10);
    
    if (criticalBiases.length === 0) {
      console.log('✅ No statistically significant critical biases detected');
    } else {
      criticalBiases.forEach((bias, index) => {
        console.log(`${index + 1}. ${bias.category.toUpperCase()} - ${bias.subcategory}:`);
        console.log(`   🔧 ${bias.recommendation}`);
        console.log(`   📊 Impact: ${bias.avgUnderBias.toFixed(1)} runs per game`);
      });
    }
    
    // Feature importance (simplified)
    console.log('\n🔍 FEATURE IMPORTANCE ANALYSIS');
    console.log('==============================');
    
    const venueImportance = this.calculateFeatureImportance('venue');
    const tempImportance = this.calculateFeatureImportance('temperature');
    const teamImportance = this.calculateFeatureImportance('team');
    
    console.log(`Venue Impact: ${venueImportance.toFixed(2)} (higher = more predictive)`);
    console.log(`Temperature Impact: ${tempImportance.toFixed(2)}`);
    console.log(`Team Impact: ${teamImportance.toFixed(2)}`);
    
    console.log('\n💾 ML Analysis Complete - Data-driven insights generated');
  }
  
  private printConfusionMatrix(label: string, matrix: ConfusionMatrix): void {
    console.log(`\n${label} Confusion Matrix:`);
    console.log(`                 Predicted`);
    console.log(`              Over    Under`);
    console.log(`Actual Over   ${matrix.truePositive.toString().padStart(3)}     ${matrix.falseNegative.toString().padStart(3)}`);
    console.log(`      Under   ${matrix.falsePositive.toString().padStart(3)}     ${matrix.trueNegative.toString().padStart(3)}`);
    console.log(`Precision: ${(matrix.precision * 100).toFixed(1)}% | Recall: ${(matrix.recall * 100).toFixed(1)}% | F1: ${(matrix.f1Score * 100).toFixed(1)}%`);
  }
  
  private calculateFeatureImportance(feature: string): number {
    // Simplified feature importance based on prediction variance
    let totalVariance = 0;
    let count = 0;
    
    if (feature === 'venue') {
      const venues = [...new Set(this.data.map(d => d.venue))];
      venues.forEach(venue => {
        const venueData = this.data.filter(d => d.venue === venue);
        if (venueData.length >= 2) {
          const avgError = venueData.reduce((sum, d) => sum + d.predictionError, 0) / venueData.length;
          totalVariance += avgError;
          count++;
        }
      });
    } else if (feature === 'temperature') {
      const tempRanges = [
        { min: 0, max: 70 },
        { min: 70, max: 75 },
        { min: 75, max: 80 },
        { min: 80, max: 85 },
        { min: 85, max: 95 }
      ];
      
      tempRanges.forEach(range => {
        const rangeData = this.data.filter(d => d.weather.temp >= range.min && d.weather.temp < range.max);
        if (rangeData.length >= 2) {
          const avgError = rangeData.reduce((sum, d) => sum + d.predictionError, 0) / rangeData.length;
          totalVariance += avgError;
          count++;
        }
      });
    } else if (feature === 'team') {
      const teams = [...new Set([...this.data.map(d => d.homeTeam), ...this.data.map(d => d.awayTeam)])];
      teams.forEach(team => {
        const teamData = this.data.filter(d => d.homeTeam === team || d.awayTeam === team);
        if (teamData.length >= 2) {
          const avgError = teamData.reduce((sum, d) => sum + d.predictionError, 0) / teamData.length;
          totalVariance += avgError;
          count++;
        }
      });
    }
    
    return count > 0 ? totalVariance / count : 0;
  }
}

// Run comprehensive analysis
const analyzer = new MLModelAnalyzer(gameDataset);
analyzer.generateReport();