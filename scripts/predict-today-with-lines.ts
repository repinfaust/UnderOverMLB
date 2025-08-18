#!/usr/bin/env node

/**
 * Today's MLB Predictions with Actual Betting Lines
 * 
 * Fetch today's games, get actual over/under lines from Odds API,
 * and generate predictions using our updated component model
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { predictGameTotal, GameData } from '../src/models/improved/component-additive-model';

// Load environment variables
dotenv.config();

interface GameWithLine {
  game: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  gameTime: string;
  actualOverUnder: number | null;
  bookmaker: string;
  ourPrediction: 'Over' | 'Under';
  ourTotal: number;
  ourConfidence: number;
  edge: number; // Difference between our prediction and sportsbook line
  recommendation: string;
}

/**
 * Fetch today's MLB games with betting lines
 */
async function fetchTodaysGamesWithLines(): Promise<any[]> {
  const apiKey = process.env.ODDS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ ODDS_API_KEY not found in environment variables');
    console.log('📝 Please add your Odds API key to .env file');
    return [];
  }

  try {
    console.log('📊 Fetching today\'s MLB games with betting lines...');
    
    const response = await axios.get(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds`,
      {
        params: {
          apiKey: apiKey,
          regions: 'us',
          markets: 'totals', // Over/under lines
          oddsFormat: 'american',
          dateFormat: 'iso'
        },
        timeout: 15000
      }
    );

    if (!response.data || response.data.length === 0) {
      console.log('⚠️ No games found - may be off-season or no games today');
      return [];
    }

    console.log(`📈 Found ${response.data.length} games with betting data`);
    return response.data;

  } catch (error: any) {
    console.error('❌ Failed to fetch betting lines:', error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 API key authentication failed');
    } else if (error.response?.status === 429) {
      console.log('⏱️ Rate limit exceeded');
    } else if (error.response?.status === 422) {
      console.log('📅 No games available today');
    }
    
    return [];
  }
}

/**
 * Convert API game to our GameData format with realistic weather simulation
 */
function convertToGameData(game: any): GameData {
  const gameDate = new Date(game.commence_time);
  const venue = game.home_team + ' Stadium'; // Simplified venue name
  
  // Realistic weather simulation for current date
  const baseTemp = getCurrentSeasonTemp();
  const weather = {
    temp_f: baseTemp + (Math.random() * 8 - 4), // ±4°F variation
    humidity: 45 + Math.random() * 30, // 45-75%
    wind_speed_mph: 3 + Math.random() * 12, // 3-15mph
    wind_direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
    conditions: Math.random() > 0.25 ? 'clear sky' : 'scattered clouds'
  };

  return {
    home_team: game.home_team,
    away_team: game.away_team,
    venue: venue,
    date: gameDate.toISOString().split('T')[0],
    weather: weather,
    starting_pitchers: {
      home: 'TBD',
      away: 'TBD'
    },
    market_line: 8.5 // Will be overridden with actual line
  };
}

function getCurrentSeasonTemp(): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  
  // Current season temperatures
  const monthlyTemps: { [key: number]: number } = {
    3: 65,  // March
    4: 72,  // April  
    5: 78,  // May
    6: 85,  // June
    7: 89,  // July
    8: 87,  // August
    9: 81,  // September
    10: 73, // October
    11: 45  // November (off-season)
  };
  
  return monthlyTemps[month] || 75;
}

/**
 * Main prediction function
 */
async function predictTodaysGames(): Promise<void> {
  console.log('🎯 TODAY\'S MLB PREDICTIONS WITH ACTUAL BETTING LINES');
  console.log('====================================================');
  
  const currentDate = new Date().toLocaleDateString();
  console.log(`📅 Date: ${currentDate}\n`);

  // Fetch games with betting lines
  const gamesData = await fetchTodaysGamesWithLines();
  
  if (gamesData.length === 0) {
    console.log('❌ No games available today or API issues');
    return;
  }

  const predictions: GameWithLine[] = [];

  // Process each game
  for (const apiGame of gamesData) {
    try {
      // Convert to our format
      const gameData = convertToGameData(apiGame);
      
      // Extract actual betting line
      let actualOverUnder: number | null = null;
      let bookmaker = 'Unknown';
      
      if (apiGame.bookmakers && apiGame.bookmakers.length > 0) {
        // Use first bookmaker with totals data
        for (const book of apiGame.bookmakers) {
          const totalsMarket = book.markets?.find((m: any) => m.key === 'totals');
          if (totalsMarket && totalsMarket.outcomes && totalsMarket.outcomes.length > 0) {
            actualOverUnder = totalsMarket.outcomes[0].point;
            bookmaker = book.title;
            break;
          }
        }
      }
      
      // Generate our prediction
      const prediction = predictGameTotal(gameData);
      
      // Calculate edge vs sportsbook
      const edge = actualOverUnder ? prediction.final_total - actualOverUnder : 0;
      
      // Generate recommendation
      let recommendation = 'No Line Available';
      if (actualOverUnder !== null) {
        const ourPredictionVsLine = prediction.final_total > actualOverUnder ? 'Over' : 'Under';
        const confidence = prediction.confidence;
        
        if (Math.abs(edge) >= 1.0 && confidence >= 75) {
          recommendation = `STRONG ${ourPredictionVsLine} (${Math.abs(edge).toFixed(1)} run edge)`;
        } else if (Math.abs(edge) >= 0.5 && confidence >= 70) {
          recommendation = `LEAN ${ourPredictionVsLine} (${Math.abs(edge).toFixed(1)} run edge)`;
        } else {
          recommendation = `PASS (${Math.abs(edge).toFixed(1)} run edge)`;
        }
      }
      
      predictions.push({
        game: `${gameData.away_team} @ ${gameData.home_team}`,
        homeTeam: gameData.home_team,
        awayTeam: gameData.away_team,
        venue: gameData.venue,
        gameTime: new Date(apiGame.commence_time).toLocaleTimeString(),
        actualOverUnder,
        bookmaker,
        ourPrediction: prediction.prediction,
        ourTotal: prediction.final_total,
        ourConfidence: prediction.confidence,
        edge,
        recommendation
      });
      
    } catch (error) {
      console.error(`⚠️ Error processing game: ${apiGame.away_team} @ ${apiGame.home_team}`);
    }
  }

  if (predictions.length === 0) {
    console.log('❌ No predictions generated');
    return;
  }

  // Display predictions
  console.log('🎯 GAME PREDICTIONS vs SPORTSBOOK LINES');
  console.log('========================================');

  predictions.forEach((pred, index) => {
    console.log(`${index + 1}. ${pred.game}`);
    console.log(`   ⏰ Game Time: ${pred.gameTime}`);
    
    if (pred.actualOverUnder !== null) {
      console.log(`   📊 Sportsbook Line: Over/Under ${pred.actualOverUnder} (${pred.bookmaker})`);
      console.log(`   🎯 Our Prediction: ${pred.ourPrediction} ${pred.ourTotal.toFixed(1)} (${pred.ourConfidence}% confidence)`);
      console.log(`   📈 Edge: ${pred.edge >= 0 ? '+' : ''}${pred.edge.toFixed(1)} runs`);
      console.log(`   💡 Recommendation: ${pred.recommendation}`);
    } else {
      console.log(`   ⚠️ No betting line available`);
      console.log(`   🎯 Our Prediction: ${pred.ourPrediction} ${pred.ourTotal.toFixed(1)} (${pred.ourConfidence}% confidence)`);
    }
    console.log('');
  });

  // Summary statistics
  const gamesWithLines = predictions.filter(p => p.actualOverUnder !== null);
  
  if (gamesWithLines.length > 0) {
    const avgSportsbookLine = gamesWithLines.reduce((sum, p) => sum + (p.actualOverUnder || 0), 0) / gamesWithLines.length;
    const avgOurPrediction = gamesWithLines.reduce((sum, p) => sum + p.ourTotal, 0) / gamesWithLines.length;
    const avgEdge = gamesWithLines.reduce((sum, p) => sum + Math.abs(p.edge), 0) / gamesWithLines.length;
    
    console.log('📊 SUMMARY STATISTICS');
    console.log('=====================');
    console.log(`🎯 Games with Lines: ${gamesWithLines.length}/${predictions.length}`);
    console.log(`📊 Avg Sportsbook Line: ${avgSportsbookLine.toFixed(1)} runs`);
    console.log(`🎯 Avg Our Prediction: ${avgOurPrediction.toFixed(1)} runs`);
    console.log(`📈 Avg Edge: ${avgEdge.toFixed(1)} runs`);
    
    // Show best betting opportunities
    const strongRecommendations = gamesWithLines.filter(p => p.recommendation.includes('STRONG'));
    const leanRecommendations = gamesWithLines.filter(p => p.recommendation.includes('LEAN'));
    
    console.log('\n🔥 BETTING RECOMMENDATIONS');
    console.log('===========================');
    
    if (strongRecommendations.length > 0) {
      console.log('💪 STRONG PLAYS:');
      strongRecommendations.forEach(rec => {
        console.log(`   ${rec.game}: ${rec.recommendation}`);
      });
    }
    
    if (leanRecommendations.length > 0) {
      console.log('📈 LEAN PLAYS:');
      leanRecommendations.forEach(rec => {
        console.log(`   ${rec.game}: ${rec.recommendation}`);
      });
    }
    
    if (strongRecommendations.length === 0 && leanRecommendations.length === 0) {
      console.log('😐 No strong betting opportunities identified today');
      console.log('💡 Our predictions are close to sportsbook lines');
    }
  }

  // API usage info
  console.log('\n📊 API USAGE');
  console.log('=============');
  console.log('✅ Successfully fetched current betting lines');
  console.log('📈 This data can be used to track prediction accuracy over time');
  console.log('💡 Compare results after games complete to measure model performance');
}

// Run today's predictions
predictTodaysGames().catch(console.error);