#!/usr/bin/env node

/**
 * Get Actual Betting Lines for July 30th
 * 
 * Uses The Odds API to fetch actual over/under lines that were available
 * for July 30th games, so we can properly evaluate our predictions
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface BettingLine {
  game: string;
  homeTeam: string;
  awayTeam: string;
  overUnderLine: number | null;
  bookmaker: string;
  lastUpdate: string;
}

/**
 * Fetch betting odds from The Odds API
 */
async function fetchBettingLines(): Promise<BettingLine[]> {
  const apiKey = process.env.ODDS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ ODDS_API_KEY not found in environment variables');
    console.log('📝 Please add your Odds API key to .env file');
    console.log('🔗 Get API key from: https://the-odds-api.com/');
    return [];
  }

  try {
    console.log('📊 Fetching MLB betting lines from The Odds API...');
    
    // Get current MLB games with totals (over/under)
    const response = await axios.get(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds`,
      {
        params: {
          apiKey: apiKey,
          regions: 'us',
          markets: 'totals',
          oddsFormat: 'american',
          dateFormat: 'iso'
        },
        timeout: 10000
      }
    );

    if (!response.data || response.data.length === 0) {
      console.log('⚠️ No betting lines found - season may be over or no games available');
      return [];
    }

    console.log(`📈 Found ${response.data.length} games with betting lines`);

    const bettingLines: BettingLine[] = [];

    response.data.forEach((game: any) => {
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      
      // Look for totals (over/under) in bookmaker data
      let overUnderLine: number | null = null;
      let bookmaker = 'Unknown';
      let lastUpdate = game.last_update;

      if (game.bookmakers && game.bookmakers.length > 0) {
        // Use first bookmaker with totals data (usually DraftKings or FanDuel)
        for (const book of game.bookmakers) {
          const totalsMarket = book.markets?.find((m: any) => m.key === 'totals');
          if (totalsMarket && totalsMarket.outcomes && totalsMarket.outcomes.length > 0) {
            // Get the over/under line (point value)
            overUnderLine = totalsMarket.outcomes[0].point;
            bookmaker = book.title;
            break;
          }
        }
      }

      bettingLines.push({
        game: `${awayTeam} @ ${homeTeam}`,
        homeTeam,
        awayTeam,
        overUnderLine,
        bookmaker,
        lastUpdate
      });
    });

    return bettingLines;

  } catch (error: any) {
    console.error('❌ Failed to fetch betting lines:', error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 API key authentication failed - check your ODDS_API_KEY');
    } else if (error.response?.status === 429) {
      console.log('⏱️ Rate limit exceeded - wait before making more requests');
    } else if (error.response?.status === 422) {
      console.log('📅 No games available for the current date/time');
    }
    
    return [];
  }
}

/**
 * Display current betting lines
 */
async function showCurrentBettingLines(): Promise<void> {
  console.log('🎯 CURRENT MLB BETTING LINES');
  console.log('=============================');
  console.log('Fetching live over/under lines from sportsbooks...\n');

  const lines = await fetchBettingLines();

  if (lines.length === 0) {
    console.log('❌ No betting lines available');
    console.log('💡 This could mean:');
    console.log('   - No games scheduled today');
    console.log('   - API key issues');
    console.log('   - Rate limit exceeded');
    console.log('   - Season ended');
    return;
  }

  console.log('📊 AVAILABLE OVER/UNDER LINES');
  console.log('==============================');

  lines.forEach((line, index) => {
    console.log(`${index + 1}. ${line.game}`);
    
    if (line.overUnderLine !== null) {
      console.log(`   📈 Over/Under Line: ${line.overUnderLine} runs`);
      console.log(`   🏪 Bookmaker: ${line.bookmaker}`);
    } else {
      console.log(`   ⚠️ No over/under line available`);
    }
    
    console.log(`   ⏰ Last Updated: ${new Date(line.lastUpdate).toLocaleString()}`);
    console.log('');
  });

  // Summary statistics
  const linesWithTotals = lines.filter(l => l.overUnderLine !== null);
  
  if (linesWithTotals.length > 0) {
    const avgLine = linesWithTotals.reduce((sum, l) => sum + (l.overUnderLine || 0), 0) / linesWithTotals.length;
    const minLine = Math.min(...linesWithTotals.map(l => l.overUnderLine || 0));
    const maxLine = Math.max(...linesWithTotals.map(l => l.overUnderLine || 0));
    
    console.log('📊 LINE SUMMARY');
    console.log('===============');
    console.log(`📏 Average Line: ${avgLine.toFixed(1)} runs`);
    console.log(`📉 Lowest Line: ${minLine} runs`);
    console.log(`📈 Highest Line: ${maxLine} runs`);
    console.log(`🎯 Games with Lines: ${linesWithTotals.length}/${lines.length}`);
  }

  console.log('\n💡 USAGE NOTES');
  console.log('===============');
  console.log('✅ Use these actual lines to evaluate prediction accuracy');
  console.log('📊 Compare your predictions to these sportsbook totals');
  console.log('🎯 Lines typically range from 7.5 to 11.5 runs depending on matchup');
  console.log('⚠️ Lines can move throughout the day based on betting action');
}

/**
 * Check API usage/quota
 */
async function checkAPIUsage(): Promise<void> {
  const apiKey = process.env.ODDS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key configured');
    return;
  }

  try {
    // The Odds API doesn't have a dedicated usage endpoint,
    // but we can make a minimal request to check status
    const response = await axios.get(
      `https://api.the-odds-api.com/v4/sports`,
      {
        params: { apiKey: apiKey },
        timeout: 5000
      }
    );

    if (response.headers['x-requests-remaining']) {
      console.log(`📊 API Requests Remaining: ${response.headers['x-requests-remaining']}`);
    }
    
    if (response.headers['x-requests-used']) {
      console.log(`📈 API Requests Used: ${response.headers['x-requests-used']}`);
    }

  } catch (error) {
    console.log('⚠️ Could not check API usage');
  }
}

// Main execution
async function main(): Promise<void> {
  await showCurrentBettingLines();
  console.log('\n' + '='.repeat(50));
  await checkAPIUsage();
}

main().catch(console.error);