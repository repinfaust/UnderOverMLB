#!/usr/bin/env node

/**
 * Get Historical Betting Lines for July 30th
 * 
 * Attempts to fetch historical over/under lines from July 30th, 2025
 * using The Odds API to properly evaluate our predictions
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface HistoricalBettingLine {
  game: string;
  homeTeam: string;
  awayTeam: string;
  overUnderLine: number | null;
  bookmaker: string;
  gameDate: string;
  actualTotal?: number;
  actualResult?: 'Over' | 'Under' | 'Push';
}

/**
 * Fetch historical betting lines for a specific date
 */
async function fetchHistoricalLines(date: string): Promise<HistoricalBettingLine[]> {
  const apiKey = process.env.ODDS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ ODDS_API_KEY not found in environment variables');
    return [];
  }

  try {
    console.log(`📊 Fetching historical MLB lines for ${date}...`);
    
    // Try different API endpoints for historical data
    const endpoints = [
      // Historical odds endpoint (if available)
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/history`,
      // Regular endpoint with date parameter
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds`,
      // Events endpoint
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/events`
    ];

    const results: HistoricalBettingLine[] = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint.split('/').pop()}`);
        
        const response = await axios.get(endpoint, {
          params: {
            apiKey: apiKey,
            regions: 'us',
            markets: 'totals',
            oddsFormat: 'american',
            dateFormat: 'iso',
            date: date, // Try with date parameter
            commenceTimeFrom: `${date}T00:00:00Z`,
            commenceTimeTo: `${date}T23:59:59Z`
          },
          timeout: 10000
        });

        if (response.data && response.data.length > 0) {
          console.log(`✅ Found ${response.data.length} games from ${endpoint.split('/').pop()}`);
          
          response.data.forEach((game: any) => {
            const gameDate = new Date(game.commence_time).toISOString().split('T')[0];
            
            // Only include games from our target date
            if (gameDate === date) {
              let overUnderLine: number | null = null;
              let bookmaker = 'Unknown';

              if (game.bookmakers && game.bookmakers.length > 0) {
                for (const book of game.bookmakers) {
                  const totalsMarket = book.markets?.find((m: any) => m.key === 'totals');
                  if (totalsMarket && totalsMarket.outcomes && totalsMarket.outcomes.length > 0) {
                    overUnderLine = totalsMarket.outcomes[0].point;
                    bookmaker = book.title;
                    break;
                  }
                }
              }

              results.push({
                game: `${game.away_team} @ ${game.home_team}`,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                overUnderLine,
                bookmaker,
                gameDate
              });
            }
          });
          
          break; // If we found data, stop trying other endpoints
        }
        
      } catch (endpointError: any) {
        console.log(`⚠️ Endpoint failed: ${endpointError.message}`);
        continue; // Try next endpoint
      }
    }

    return results;

  } catch (error: any) {
    console.error('❌ Failed to fetch historical lines:', error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 API key authentication failed');
    } else if (error.response?.status === 422) {
      console.log('📅 Historical data not available for the requested date');
      console.log('💡 The Odds API may not support historical data or date is too far back');
    } else if (error.response?.status === 403) {
      console.log('🚫 Historical data access requires premium subscription');
    }
    
    return [];
  }
}

/**
 * Get actual game results for July 30th to compare with lines
 */
async function getJuly30Results(): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2025-07-30&hydrate=linescore`,
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
        game: `${game.teams.away.team.name} @ ${game.teams.home.team.name}`,
        actualTotal: game.teams.home.score + game.teams.away.score,
        homeTeam: game.teams.home.team.name,
        awayTeam: game.teams.away.team.name
      }));

  } catch (error) {
    console.error('❌ Failed to fetch game results');
    return [];
  }
}

/**
 * Compare historical lines with actual results
 */
async function analyzeHistoricalLines(): Promise<void> {
  console.log('🎯 JULY 30TH HISTORICAL BETTING LINES ANALYSIS');
  console.log('===============================================');
  console.log('Attempting to fetch actual betting lines from July 30th...\n');

  // Try to get historical lines
  const historicalLines = await fetchHistoricalLines('2025-07-30');
  
  if (historicalLines.length === 0) {
    console.log('❌ No historical betting lines found for July 30th');
    console.log('\n💡 ALTERNATIVE APPROACHES:');
    console.log('=====================================');
    console.log('1. 📊 Use typical line ranges (8.5-10.5) for estimation');
    console.log('2. 🎯 Manual input of remembered lines');
    console.log('3. 📈 Focus on prediction accuracy vs actual outcomes');
    console.log('4. 💰 Upgrade to premium Odds API for historical data');
    
    console.log('\n🔍 WHAT WE KNOW:');
    console.log('- Yankees line was Over 9 (resulted in 9 runs = PUSH)');
    console.log('- Most MLB lines range 7.5-11.5 depending on matchup');
    console.log('- Our predictions averaged 8.8 runs');
    console.log('- Actual results averaged 8.3 runs');
    
    return;
  }

  // Get actual game results
  console.log('📈 Fetching actual game results...');
  const gameResults = await getJuly30Results();
  
  // Combine lines with results
  const combinedData: HistoricalBettingLine[] = historicalLines.map(line => {
    const result = gameResults.find(r => 
      r.homeTeam.includes(line.homeTeam.split(' ')[0]) ||
      r.awayTeam.includes(line.awayTeam.split(' ')[0])
    );
    
    if (result && line.overUnderLine !== null) {
      const actualResult = result.actualTotal > line.overUnderLine ? 'Over' : 
                          result.actualTotal < line.overUnderLine ? 'Under' : 'Push';
      
      return {
        ...line,
        actualTotal: result.actualTotal,
        actualResult
      };
    }
    
    return line;
  });

  console.log('📊 HISTORICAL LINES vs ACTUAL RESULTS');
  console.log('======================================');

  combinedData.forEach((data, index) => {
    console.log(`${index + 1}. ${data.game}`);
    
    if (data.overUnderLine !== null) {
      console.log(`   📈 Line: Over/Under ${data.overUnderLine} (${data.bookmaker})`);
      
      if (data.actualTotal !== undefined) {
        const resultIcon = data.actualResult === 'Over' ? '📈' : 
                          data.actualResult === 'Under' ? '📉' : '🔄';
        console.log(`   ${resultIcon} Result: ${data.actualTotal} runs (${data.actualResult})`);
      }
    } else {
      console.log(`   ⚠️ No line data available`);
    }
    console.log('');
  });

  // Summary statistics
  const linesWithResults = combinedData.filter(d => d.overUnderLine !== null && d.actualTotal !== undefined);
  
  if (linesWithResults.length > 0) {
    const overHits = linesWithResults.filter(d => d.actualResult === 'Over').length;
    const underHits = linesWithResults.filter(d => d.actualResult === 'Under').length;
    const pushes = linesWithResults.filter(d => d.actualResult === 'Push').length;
    
    console.log('📊 BETTING RESULTS SUMMARY');
    console.log('===========================');
    console.log(`📈 Overs: ${overHits}/${linesWithResults.length} (${(overHits/linesWithResults.length*100).toFixed(1)}%)`);
    console.log(`📉 Unders: ${underHits}/${linesWithResults.length} (${(underHits/linesWithResults.length*100).toFixed(1)}%)`);
    console.log(`🔄 Pushes: ${pushes}/${linesWithResults.length} (${(pushes/linesWithResults.length*100).toFixed(1)}%)`);
    
    const avgLine = linesWithResults.reduce((sum, d) => sum + (d.overUnderLine || 0), 0) / linesWithResults.length;
    const avgActual = linesWithResults.reduce((sum, d) => sum + (d.actualTotal || 0), 0) / linesWithResults.length;
    
    console.log(`📏 Average Line: ${avgLine.toFixed(1)} runs`);
    console.log(`📊 Average Actual: ${avgActual.toFixed(1)} runs`);
    console.log(`📐 Difference: ${(avgActual - avgLine).toFixed(1)} runs`);
  }
}

// Main execution
analyzeHistoricalLines().catch(console.error);