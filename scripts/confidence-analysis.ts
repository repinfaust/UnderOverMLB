#!/usr/bin/env node

/**
 * Confidence-Based Betting Analysis
 * 
 * Analyzes the relationship between confidence levels and success rates
 * to determine optimal betting thresholds for the component-additive model.
 */

import axios from 'axios';
import { predictGameTotal, GameData } from '../src/models/improved/component-additive-model';

interface BettingResult {
  confidence: number;
  prediction: 'Over' | 'Under';
  actualResult: 'Over' | 'Under';
  correct: boolean;
  game: string;
  date: string;
}

interface ConfidenceBracket {
  range: string;
  minConfidence: number;
  maxConfidence: number;
  totalGames: number;
  correctPredictions: number;
  winRate: number;
  expectedROI: number;
  volumePercentage: number;
}

/**
 * Fetch actual game results for a specific date
 */
async function fetchActualResults(date: string): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=linescore`,
      { timeout: 10000 }
    );

    if (!response.data.dates || response.data.dates.length === 0) {
      return [];
    }

    const games = response.data.dates[0]?.games || [];
    
    return games
      .filter((game: any) => 
        game.status.abstractGameState === 'Final' &&
        game.teams?.home?.score !== undefined &&
        game.teams?.away?.score !== undefined
      )
      .map((game: any) => ({
        ...game,
        actualTotal: game.teams.home.score + game.teams.away.score,
        actualResult: (game.teams.home.score + game.teams.away.score) > 8.5 ? 'Over' : 'Under'
      }));

  } catch (error) {
    console.error(`❌ Failed to fetch results for ${date}:`, error);
    return [];
  }
}

/**
 * Convert API game data to our GameData format
 */
function convertToGameData(game: any, date: string): GameData {
  const baseTemp = getBaseTemperatureForDate(date, game.venue.name);
  const weather = {
    temp_f: baseTemp + (Math.random() * 10 - 5),
    humidity: 45 + Math.random() * 30,
    wind_speed_mph: Math.random() * 15,
    wind_direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
    conditions: Math.random() > 0.3 ? 'clear sky' : 'scattered clouds'
  };

  return {
    home_team: game.teams.home.team.name,
    away_team: game.teams.away.team.name,
    venue: game.venue.name,
    date: date,
    weather: weather,
    starting_pitchers: {
      home: game.teams.home.probablePitcher?.fullName || 'Unknown',
      away: game.teams.away.probablePitcher?.fullName || 'Unknown'
    },
    market_line: 8.5
  };
}

function getBaseTemperatureForDate(date: string, venue: string): number {
  const month = new Date(date).getMonth() + 1;
  const monthlyTemps: { [key: number]: number } = { 6: 82, 7: 87, 8: 85 };
  const venueAdjustments: { [key: string]: number } = {
    'Fenway Park': -3, 'Coors Field': 5, 'Minute Maid Park': 8,
    'Globe Life Field': 8, 'Marlins Park': 6, 'Oracle Park': -10,
    'Petco Park': 2, 'Safeco Field': -5, 'Tropicana Field': 0,
  };
  
  let baseTemp = monthlyTemps[month] || 85;
  for (const [park, adjustment] of Object.entries(venueAdjustments)) {
    if (venue.includes(park.split(' ')[0])) {
      baseTemp += adjustment;
      break;
    }
  }
  return baseTemp;
}

/**
 * Calculate expected ROI based on win rate
 * Assumes standard -110 odds for both Over/Under
 */
function calculateExpectedROI(winRate: number): number {
  if (winRate <= 0.5) return -100; // Guaranteed loss
  
  // Standard -110 betting (risk $110 to win $100)
  const winAmount = 100;
  const lossAmount = -110;
  
  const expectedValue = (winRate * winAmount) + ((1 - winRate) * lossAmount);
  const roi = (expectedValue / 110) * 100; // ROI as percentage
  
  return roi;
}

/**
 * Analyze confidence brackets
 */
function analyzeConfidenceBrackets(results: BettingResult[]): ConfidenceBracket[] {
  const brackets = [
    { range: '45-50%', min: 45, max: 50 },
    { range: '50-55%', min: 50, max: 55 },
    { range: '55-60%', min: 55, max: 60 },
    { range: '60-65%', min: 60, max: 65 },
    { range: '65-70%', min: 65, max: 70 },
    { range: '70-75%', min: 70, max: 75 },
    { range: '75-80%', min: 75, max: 80 },
    { range: '80%+', min: 80, max: 100 }
  ];
  
  return brackets.map(bracket => {
    const bracketGames = results.filter(r => 
      r.confidence >= bracket.min && r.confidence < bracket.max
    );
    
    const correctGames = bracketGames.filter(r => r.correct).length;
    const winRate = bracketGames.length > 0 ? correctGames / bracketGames.length : 0;
    const expectedROI = calculateExpectedROI(winRate);
    const volumePercentage = (bracketGames.length / results.length) * 100;
    
    return {
      range: bracket.range,
      minConfidence: bracket.min,
      maxConfidence: bracket.max,
      totalGames: bracketGames.length,
      correctPredictions: correctGames,
      winRate: winRate,
      expectedROI: expectedROI,
      volumePercentage: volumePercentage
    };
  });
}

interface ThresholdAnalysis {
  threshold: string;
  winRate: number;
  expectedROI: number;
  totalGames: number;
  volumePercentage: number;
  gamesPerWeek: number;
  profitability: string;
}

/**
 * Find optimal confidence thresholds
 */
function findOptimalThresholds(results: BettingResult[]): ThresholdAnalysis[] {
  const thresholds = [45, 50, 55, 60, 65, 70, 75, 80];
  
  return thresholds.map((threshold: number) => {
    const qualifyingGames = results.filter(r => r.confidence >= threshold);
    const correctGames = qualifyingGames.filter(r => r.correct).length;
    const winRate = qualifyingGames.length > 0 ? correctGames / qualifyingGames.length : 0;
    const expectedROI = calculateExpectedROI(winRate);
    const volumePercentage = (qualifyingGames.length / results.length) * 100;
    const gamesPerWeek = (qualifyingGames.length / 4); // 4 weeks of data
    
    return {
      threshold: `${threshold}%+`,
      winRate: winRate,
      expectedROI: expectedROI,
      totalGames: qualifyingGames.length,
      volumePercentage: volumePercentage,
      gamesPerWeek: gamesPerWeek,
      profitability: expectedROI > 0 ? 'PROFITABLE' : 'UNPROFITABLE'
    };
  });
}

/**
 * Main analysis function
 */
async function analyzeConfidenceStrategy(): Promise<void> {
  console.log('🎯 Confidence-Based Betting Strategy Analysis');
  console.log('==============================================');
  console.log('Analyzing optimal confidence thresholds for betting decisions\n');

  // Use same date range as validation (FULL 4 weeks)
  const dates = [];
  const endDate = new Date('2025-07-27');
  const startDate = new Date('2025-06-30'); // FULL 4 weeks to match validation
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`📅 Analyzing ${dates.length} days of games (FULL 4-week dataset)...\n`);
  
  const allResults: BettingResult[] = [];
  
  // Process each date
  for (const date of dates) {
    const actualGames = await fetchActualResults(date);
    
    if (actualGames.length === 0) continue;
    
    console.log(`📅 Processing ${date}: ${actualGames.length} games`);
    
    for (const actualGame of actualGames) {
      try {
        const gameData = convertToGameData(actualGame, date);
        const prediction = predictGameTotal(gameData);
        
        const result: BettingResult = {
          confidence: prediction.confidence,
          prediction: prediction.prediction,
          actualResult: actualGame.actualResult,
          correct: prediction.prediction === actualGame.actualResult,
          game: `${gameData.away_team} @ ${gameData.home_team}`,
          date: date
        };
        
        allResults.push(result);
        
      } catch (error) {
        console.error(`⚠️ Error processing game`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📊 Analysis completed on ${allResults.length} games\n`);
  
  // Analyze confidence brackets
  const brackets = analyzeConfidenceBrackets(allResults);
  
  console.log('📊 CONFIDENCE BRACKET ANALYSIS');
  console.log('===============================');
  console.log('Range      | Games | Win Rate | Expected ROI | Volume %');
  console.log('-----------|-------|----------|--------------|----------');
  
  brackets.forEach(bracket => {
    if (bracket.totalGames > 0) {
      const winRateStr = `${(bracket.winRate * 100).toFixed(1)}%`.padEnd(8);
      const roiStr = `${bracket.expectedROI.toFixed(1)}%`.padEnd(10);
      const volumeStr = `${bracket.volumePercentage.toFixed(1)}%`;
      console.log(`${bracket.range.padEnd(10)} | ${bracket.totalGames.toString().padEnd(5)} | ${winRateStr} | ${roiStr} | ${volumeStr}`);
    }
  });
  
  // Find optimal thresholds
  const thresholds = findOptimalThresholds(allResults);
  
  console.log('\n🎯 CONFIDENCE THRESHOLD ANALYSIS');
  console.log('=================================');
  console.log('Threshold | Win Rate | Expected ROI | Games/Week | Volume % | Status');
  console.log('----------|----------|--------------|------------|----------|--------');
  
  thresholds.forEach(threshold => {
    if (threshold.totalGames > 0) {
      const winRateStr = `${(threshold.winRate * 100).toFixed(1)}%`.padEnd(8);
      const roiStr = `${threshold.expectedROI.toFixed(1)}%`.padEnd(10);
      const gamesWeekStr = `${threshold.gamesPerWeek.toFixed(1)}`.padEnd(8);
      const volumeStr = `${threshold.volumePercentage.toFixed(1)}%`.padEnd(7);
      const status = threshold.expectedROI > 0 ? '✅ PROFIT' : '❌ LOSS';
      console.log(`${threshold.threshold.padEnd(9)} | ${winRateStr} | ${roiStr} | ${gamesWeekStr} | ${volumeStr} | ${status}`);
    }
  });
  
  // Find optimal strategy
  const profitableThresholds = thresholds.filter((t: ThresholdAnalysis) => t.expectedROI > 0 && t.totalGames >= 10);
  
  console.log('\n🏆 OPTIMAL BETTING STRATEGY RECOMMENDATIONS');
  console.log('===========================================');
  
  if (profitableThresholds.length === 0) {
    console.log('❌ No confidence thresholds show consistent profitability');
    console.log('🔧 Model may need further calibration or different betting approach');
  } else {
    // Find best balance of ROI and volume
    const bestBalance = profitableThresholds.reduce((best: ThresholdAnalysis, current: ThresholdAnalysis) => {
      // Score based on ROI * volume (higher is better)
      const currentScore = current.expectedROI * (current.volumePercentage / 100);
      const bestScore = best.expectedROI * (best.volumePercentage / 100);
      return currentScore > bestScore ? current : best;
    });
    
    const highestROI = profitableThresholds.reduce((best: ThresholdAnalysis, current: ThresholdAnalysis) => 
      current.expectedROI > best.expectedROI ? current : best
    );
    
    const highestVolume = profitableThresholds.reduce((best: ThresholdAnalysis, current: ThresholdAnalysis) => 
      current.volumePercentage > best.volumePercentage ? current : best
    );
    
    console.log('🎯 CONSERVATIVE STRATEGY (Highest ROI):');
    console.log(`   Confidence Threshold: ${highestROI.threshold}`);
    console.log(`   Expected Win Rate: ${(highestROI.winRate * 100).toFixed(1)}%`);
    console.log(`   Expected ROI: ${highestROI.expectedROI.toFixed(1)}%`);
    console.log(`   Games per Week: ${highestROI.gamesPerWeek.toFixed(1)}`);
    console.log(`   Volume: ${highestROI.volumePercentage.toFixed(1)}% of all games\n`);
    
    console.log('⚖️ BALANCED STRATEGY (Best ROI × Volume):');
    console.log(`   Confidence Threshold: ${bestBalance.threshold}`);
    console.log(`   Expected Win Rate: ${(bestBalance.winRate * 100).toFixed(1)}%`);
    console.log(`   Expected ROI: ${bestBalance.expectedROI.toFixed(1)}%`);
    console.log(`   Games per Week: ${bestBalance.gamesPerWeek.toFixed(1)}`);
    console.log(`   Volume: ${bestBalance.volumePercentage.toFixed(1)}% of all games\n`);
    
    console.log('📈 AGGRESSIVE STRATEGY (Highest Volume):');
    console.log(`   Confidence Threshold: ${highestVolume.threshold}`);
    console.log(`   Expected Win Rate: ${(highestVolume.winRate * 100).toFixed(1)}%`);
    console.log(`   Expected ROI: ${highestVolume.expectedROI.toFixed(1)}%`);
    console.log(`   Games per Week: ${highestVolume.gamesPerWeek.toFixed(1)}`);
    console.log(`   Volume: ${highestVolume.volumePercentage.toFixed(1)}% of all games\n`);
  }
  
  // Additional insights
  console.log('💡 KEY INSIGHTS:');
  console.log('================');
  
  const overallWinRate = allResults.filter(r => r.correct).length / allResults.length;
  console.log(`📊 Overall Model Win Rate: ${(overallWinRate * 100).toFixed(1)}%`);
  
  const breakEvenRate = 110 / 210; // Need 52.38% to break even at -110 odds
  console.log(`⚖️ Break-Even Win Rate Needed: ${(breakEvenRate * 100).toFixed(1)}%`);
  
  const profitableBrackets = brackets.filter(b => b.expectedROI > 0 && b.totalGames > 5);
  if (profitableBrackets.length > 0) {
    console.log(`✅ Profitable Confidence Ranges: ${profitableBrackets.map(b => b.range).join(', ')}`);
  } else {
    console.log(`❌ No confidence ranges show consistent profitability`);
  }
  
  // Calibration assessment
  const highConfidenceGames = allResults.filter(r => r.confidence >= 75);
  const highConfidenceWinRate = highConfidenceGames.length > 0 ? 
    highConfidenceGames.filter(r => r.correct).length / highConfidenceGames.length : 0;
  
  console.log(`🎯 High Confidence (75%+) Actual Win Rate: ${(highConfidenceWinRate * 100).toFixed(1)}%`);
  
  if (highConfidenceWinRate >= 0.75) {
    console.log(`✅ Model confidence appears well-calibrated`);
  } else if (highConfidenceWinRate >= 0.65) {
    console.log(`⚠️ Model confidence slightly overconfident but usable`);
  } else {
    console.log(`❌ Model confidence significantly overconfident - needs recalibration`);
  }
}

// Run analysis
if (require.main === module) {
  analyzeConfidenceStrategy().catch(console.error);
}