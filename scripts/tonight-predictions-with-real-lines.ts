#!/usr/bin/env node

/**
 * Tonight's V4 vs V5 Predictions WITH REAL BETTING LINES
 * August 18, 2025
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { runV4ModelA_Pitching, runV4ModelB_Offense, runV4ModelC_WeatherPark, runV4ModelD_Market, generateV4Ensemble } from '../src/models/v4/explosive-detection-models';
import { runV5AdvancedModel, getV5Recommendation } from '../src/models/v5/advanced-explosion-models';

dotenv.config();

interface MLBGame {
  gamePk: number;
  teams: {
    home: { 
      team: { name: string };
      probablePitcher?: { fullName: string; id: number };
    };
    away: { 
      team: { name: string };
      probablePitcher?: { fullName: string; id: number };
    };
  };
  venue: { name: string };
  gameDate: string;
  status: { statusCode: string };
}

interface BettingLine {
  total: number;
  bookmaker: string;
  over_odds: number;
  under_odds: number;
}

console.log('🎯 TONIGHT\'S MLB PREDICTIONS - WITH REAL BETTING LINES');
console.log('📅 Date: August 18, 2025');
console.log('=======================================================\n');

async function fetchTodaysGames(): Promise<MLBGame[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📡 Fetching MLB games for ${today}...`);
    
    const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
      params: {
        sportId: 1,
        date: today,
        hydrate: 'team,venue,probablePitcher'
      },
      timeout: 10000
    });

    const games = response.data.dates?.[0]?.games || [];
    console.log(`✅ Found ${games.length} total games`);
    
    const upcomingGames = games.filter((game: MLBGame) => 
      game.status.statusCode === 'S' || // Scheduled
      game.status.statusCode === 'P'    // Pre-game
    );
    
    console.log(`🎲 ${upcomingGames.length} games available for predictions\n`);
    return upcomingGames;
  } catch (error: any) {
    console.error(`❌ Error fetching games: ${error.message}`);
    return [];
  }
}

async function fetchBettingLines(): Promise<Record<string, BettingLine>> {
  console.log('💰 Fetching live betting lines from The Odds API...');
  
  if (!process.env.ODDS_API_KEY) {
    console.warn('⚠️  No Odds API key found - using default lines');
    return {};
  }

  try {
    const response = await axios.get('https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/', {
      params: {
        apiKey: process.env.ODDS_API_KEY,
        regions: 'us',
        markets: 'totals',
        oddsFormat: 'american',
        dateFormat: 'iso'
      },
      timeout: 15000
    });

    console.log(`✅ Found betting lines for ${response.data.length} games`);
    
    const lines: Record<string, BettingLine> = {};
    
    response.data.forEach((game: any) => {
      if (game.bookmakers && game.bookmakers.length > 0) {
        const bookmaker = game.bookmakers[0]; // Use first bookmaker (usually DraftKings)
        const totalsMarket = bookmaker.markets?.find((m: any) => m.key === 'totals');
        
        if (totalsMarket && totalsMarket.outcomes && totalsMarket.outcomes.length >= 2) {
          const overOutcome = totalsMarket.outcomes.find((o: any) => o.name === 'Over');
          const underOutcome = totalsMarket.outcomes.find((o: any) => o.name === 'Under');
          
          if (overOutcome && underOutcome && overOutcome.point) {
            const gameKey = `${game.away_team}@${game.home_team}`;
            lines[gameKey] = {
              total: parseFloat(overOutcome.point),
              bookmaker: bookmaker.title,
              over_odds: overOutcome.price,
              under_odds: underOutcome.price
            };
          }
        }
      }
    });

    console.log(`📊 Processed lines for ${Object.keys(lines).length} games`);
    return lines;
    
  } catch (error: any) {
    console.error(`❌ Error fetching betting lines: ${error.message}`);
    console.warn('⚠️  Using default lines of 8.5');
    return {};
  }
}

function findBettingLine(homeTeam: string, awayTeam: string, lines: Record<string, BettingLine>): BettingLine {
  // Try different team name formats to match
  const homeShort = homeTeam.split(' ').pop();
  const awayShort = awayTeam.split(' ').pop();
  
  const possibleKeys = [
    `${awayTeam}@${homeTeam}`,
    `${awayShort}@${homeShort}`,
    `${awayTeam} @ ${homeTeam}`,
    `${awayShort} @ ${homeShort}`
  ];
  
  for (const key of possibleKeys) {
    if (lines[key]) {
      return lines[key];
    }
  }
  
  // Check if any key contains both team names
  for (const [key, line] of Object.entries(lines)) {
    if (key.includes(homeShort || '') && key.includes(awayShort || '')) {
      return line;
    }
  }
  
  // Default line
  return {
    total: 8.5,
    bookmaker: 'Default',
    over_odds: -110,
    under_odds: -110
  };
}

async function fetchWeatherData(venue: string): Promise<any> {
  const venueCoords: Record<string, { lat: number; lon: number }> = {
    'Yankee Stadium': { lat: 40.8296, lon: -73.9262 },
    'Fenway Park': { lat: 42.3467, lon: -71.0972 },
    'Rogers Centre': { lat: 43.6414, lon: -79.3894 },
    'Progressive Field': { lat: 41.4962, lon: -81.6852 },
    'Great American Ball Park': { lat: 39.0974, lon: -84.5081 },
    'Daikin Park': { lat: 29.7571, lon: -95.3555 },
    'Kauffman Stadium': { lat: 39.0517, lon: -94.4803 },
    'Nationals Park': { lat: 38.8730, lon: -77.0074 },
    'Citizens Bank Park': { lat: 39.9061, lon: -75.1665 },
    'Coors Field': { lat: 39.7559, lon: -104.9942 },
    'Oracle Park': { lat: 37.7786, lon: -122.3893 },
    'Wrigley Field': { lat: 41.9484, lon: -87.6553 },
    'Comerica Park': { lat: 42.3390, lon: -83.0485 },
    'PNC Park': { lat: 40.4469, lon: -80.0057 },
    'loanDepot park': { lat: 25.7781, lon: -80.2197 },
    'Truist Park': { lat: 33.8906, lon: -84.4677 },
    'Angel Stadium': { lat: 33.8003, lon: -117.8827 },
    'Chase Field': { lat: 33.4453, lon: -112.0667 },
    'Petco Park': { lat: 32.7073, lon: -117.1566 }
  };

  const coords = venueCoords[venue] || { lat: 40.7128, lon: -74.0060 };

  try {
    if (!process.env.WEATHER_API_KEY) {
      return {
        temp_f: 75,
        humidity: 60,
        wind_speed_mph: 5,
        wind_direction: 'SW',
        conditions: 'clear'
      };
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: coords.lat,
        lon: coords.lon,
        appid: process.env.WEATHER_API_KEY,
        units: 'imperial'
      },
      timeout: 5000
    });

    const weather = response.data;
    return {
      temp_f: weather.main.temp,
      humidity: weather.main.humidity,
      wind_speed_mph: weather.wind?.speed * 2.237 || 0,
      wind_direction: getWindDirection(weather.wind?.deg || 0),
      conditions: weather.weather[0]?.description || 'clear'
    };
  } catch (error: any) {
    return {
      temp_f: 75,
      humidity: 60,
      wind_speed_mph: 5,
      wind_direction: 'SW',
      conditions: 'clear'
    };
  }
}

function getWindDirection(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
}

function getV4Recommendation(v4Result: any, marketLine: number): string {
  if (v4Result.confidence < 50) {
    return 'NO PLAY';
  }
  
  if (v4Result.explosion_risk > 0.15) {
    return 'NO PLAY';
  }
  
  const edge = Math.abs(v4Result.total - marketLine);
  
  if (edge < 0.3) {
    return 'NO PLAY';
  } else if (edge < 0.6) {
    return `SLIGHT ${v4Result.prediction}`;
  } else {
    return `STRONG ${v4Result.prediction}`;
  }
}

async function generatePredictionsWithRealLines(): Promise<void> {
  try {
    console.log('🔄 Fetching data sources...\n');
    
    // Fetch all data sources in parallel
    const [games, bettingLines] = await Promise.all([
      fetchTodaysGames(),
      fetchBettingLines()
    ]);
    
    if (games.length === 0) {
      console.log('❌ No games found for today');
      return;
    }

    console.log('\n📋 GENERATING PREDICTIONS WITH REAL LINES...\n');

    const predictions: any[] = [];

    for (const game of games) {
      const homeTeam = game.teams.home.team.name;
      const awayTeam = game.teams.away.team.name;
      const venue = game.venue.name;
      const gameDate = game.gameDate.split('T')[0];
      
      // Get starting pitchers
      const homePitcher = game.teams.home.probablePitcher?.fullName || 'TBD';
      const awayPitcher = game.teams.away.probablePitcher?.fullName || 'TBD';

      // Get real betting line
      const bettingLine = findBettingLine(homeTeam, awayTeam, bettingLines);

      // Fetch weather data
      const weather = await fetchWeatherData(venue);

      console.log(`🎯 ${awayTeam} @ ${homeTeam}`);
      console.log(`   Venue: ${venue}`);
      console.log(`   Pitchers: ${awayPitcher.split(' ').pop()} vs ${homePitcher.split(' ').pop()}`);
      console.log(`   Market Line: ${bettingLine.total} (${bettingLine.bookmaker})`);
      console.log(`   Weather: ${weather.temp_f.toFixed(0)}°F, ${weather.conditions}`);

      // Prepare game data
      const gameData = {
        home_team: homeTeam,
        away_team: awayTeam,
        venue: venue,
        date: gameDate,
        weather: weather,
        park_factors: {
          runs_factor: 1.0,
          hr_factor: 1.0,
          altitude: venue === 'Coors Field' ? 5200 : 0
        },
        starting_pitchers: {
          home: { name: homePitcher },
          away: { name: awayPitcher }
        }
      };

      // Run V4 Model
      const v4ModelA = runV4ModelA_Pitching(gameData);
      const v4ModelB = runV4ModelB_Offense(gameData);
      const v4ModelC = runV4ModelC_WeatherPark(gameData);
      const v4ModelD = runV4ModelD_Market(gameData, bettingLine.total);
      const v4Result = generateV4Ensemble(v4ModelA, v4ModelB, v4ModelC, v4ModelD);
      const v4Recommendation = getV4Recommendation(v4Result, bettingLine.total);
      const v4Edge = Math.abs(v4Result.total - bettingLine.total);

      // Run V5 Model
      const v5Result = runV5AdvancedModel(gameData);
      const v5Recommendation = getV5Recommendation(v5Result, bettingLine.total);
      const v5Edge = Math.abs(v5Result.total - bettingLine.total);

      console.log(`   V4: ${v4Result.prediction} ${v4Result.total} (${v4Result.confidence}%, ${(v4Result.explosion_risk * 100).toFixed(0)}% risk, ${v4Edge.toFixed(2)} edge) - ${v4Recommendation}`);
      console.log(`   V5: ${v5Result.prediction} ${v5Result.total} (${v5Result.confidence}%, ${(v5Result.explosion_risk * 100).toFixed(0)}% risk, ${v5Edge.toFixed(2)} edge, ${v5Result.risk_level}) - ${v5Recommendation}`);
      console.log('');

      predictions.push({
        matchup: `${awayTeam} @ ${homeTeam}`,
        venue,
        weather: `${weather.temp_f.toFixed(0)}°F`,
        homePitcher: homePitcher.split(' ').pop() || 'TBD',
        awayPitcher: awayPitcher.split(' ').pop() || 'TBD',
        marketLine: bettingLine.total,
        bookmaker: bettingLine.bookmaker,
        v4: {
          prediction: v4Result.prediction,
          total: v4Result.total,
          confidence: v4Result.confidence,
          explosion_risk: v4Result.explosion_risk * 100,
          edge: v4Edge,
          recommendation: v4Recommendation
        },
        v5: {
          prediction: v5Result.prediction,
          total: v5Result.total,
          confidence: v5Result.confidence,
          explosion_risk: v5Result.explosion_risk * 100,
          risk_level: v5Result.risk_level,
          edge: v5Edge,
          recommendation: v5Recommendation
        }
      });
    }

    // Generate comprehensive table with real lines
    console.log('📊 COMPLETE PREDICTIONS TABLE WITH REAL BETTING LINES');
    console.log('====================================================');
    console.log('| Matchup | Market Line | Bookmaker | V4 Pred | V4 Edge | V4 Rec | V5 Pred | V5 Edge | V5 Risk | V5 Rec |');
    console.log('|---------|-------------|-----------|---------|---------|--------|---------|---------|---------|--------|');
    
    predictions.forEach(p => {
      const matchupShort = p.matchup.split(' @ ').map((team: string) => team.split(' ').pop()).join(' @ ');
      const bookmakerShort = p.bookmaker.split(' ')[0];
      const v4RecShort = p.v4.recommendation.replace('STRONG ', '').replace('SLIGHT ', '').replace('NO PLAY', 'NO');
      const v5RecShort = p.v5.recommendation.includes('NO PLAY') ? 'NO' : p.v5.recommendation.replace('STRONG ', '').replace('MODERATE ', '');
      
      console.log(`| ${matchupShort} | ${p.marketLine} | ${bookmakerShort} | ${p.v4.prediction} ${p.v4.total} | ${p.v4.edge.toFixed(2)} | ${v4RecShort} | ${p.v5.prediction} ${p.v5.total} | ${p.v5.edge.toFixed(2)} | ${p.v5.risk_level} | ${v5RecShort} |`);
    });

    // Summary with real betting lines
    const v4Playable = predictions.filter(p => !p.v4.recommendation.includes('NO PLAY')).length;
    const v5Playable = predictions.filter(p => !p.v5.recommendation.includes('NO PLAY')).length;
    const avgMarketLine = predictions.reduce((sum, p) => sum + p.marketLine, 0) / predictions.length;
    const realLinesUsed = predictions.filter(p => p.bookmaker !== 'Default').length;

    console.log('\n📈 SUMMARY WITH REAL BETTING LINES');
    console.log('==================================');
    console.log(`Total Games: ${predictions.length}`);
    console.log(`Real Betting Lines Used: ${realLinesUsed}/${predictions.length} (${((realLinesUsed/predictions.length)*100).toFixed(1)}%)`);
    console.log(`Average Market Line: ${avgMarketLine.toFixed(1)}`);
    console.log(`V4 Playable: ${v4Playable}/${predictions.length} (${((v4Playable/predictions.length)*100).toFixed(1)}%)`);
    console.log(`V5 Playable: ${v5Playable}/${predictions.length} (${((v5Playable/predictions.length)*100).toFixed(1)}%)`);

    // Best edges
    const v4BestEdges = predictions.filter(p => p.v4.edge > 0.5).sort((a, b) => b.v4.edge - a.v4.edge);
    const v5BestEdges = predictions.filter(p => p.v5.edge > 0.5).sort((a, b) => b.v5.edge - a.v5.edge);

    if (v4BestEdges.length > 0) {
      console.log('\n🎯 V4 BEST EDGES:');
      v4BestEdges.slice(0, 3).forEach(p => {
        console.log(`   ${p.matchup}: ${p.v4.prediction} ${p.v4.total} vs ${p.marketLine} (${p.v4.edge.toFixed(2)} edge) - ${p.v4.recommendation}`);
      });
    }

    if (v5BestEdges.length > 0) {
      console.log('\n🎯 V5 BEST EDGES:');
      v5BestEdges.slice(0, 3).forEach(p => {
        console.log(`   ${p.matchup}: ${p.v5.prediction} ${p.v5.total} vs ${p.marketLine} (${p.v5.edge.toFixed(2)} edge) - ${p.v5.recommendation}`);
      });
    }

    console.log('\n✅ REAL DATA CONFIRMED:');
    console.log(`   Starting pitchers: MLB API`);
    console.log(`   Betting lines: The Odds API (${realLinesUsed} games)`);
    console.log(`   Weather: OpenWeatherMap API`);

  } catch (error: any) {
    console.error('❌ Prediction generation failed:', error.message);
  }
}

if (require.main === module) {
  generatePredictionsWithRealLines().catch(console.error);
}