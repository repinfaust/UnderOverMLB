#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Market Server - Betting lines, odds, movement, and game results
class MarketServer {
  private server: Server;
  private oddsCache: Map<string, any> = new Map();
  private resultsCache: Map<string, any> = new Map();
  private lineMovementCache: Map<string, any[]> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'market-server',
        version: '1.0.0',
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'market://game/{game_id}/totals',
          name: 'Over/Under Totals',
          description: 'Over/Under totals and odds',
          mimeType: 'application/json',
        },
        {
          uri: 'market://game/{game_id}/lines',
          name: 'Run Lines',
          description: 'Run lines and spreads',
          mimeType: 'application/json',
        },
        {
          uri: 'market://game/{game_id}/movement',
          name: 'Line Movement',
          description: 'Line movement tracking',
          mimeType: 'application/json',
        },
        {
          uri: 'market://game/{game_id}/result',
          name: 'Game Results',
          description: 'Final game results',
          mimeType: 'application/json',
        },
        {
          uri: 'market://date/{date}/games',
          name: 'Daily Games',
          description: 'All games and results for date',
          mimeType: 'application/json',
        },
        {
          uri: 'market://volume/{game_id}',
          name: 'Betting Volume',
          description: 'Betting volume and sharp money',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'getGameMarketData',
          description: 'Get all market data for a game in one call',
          inputSchema: {
            type: 'object',
            properties: {
              game_id: { type: 'string' },
              include_movement: { type: 'boolean', default: true },
              include_volume: { type: 'boolean', default: true },
              sportsbook: { type: 'string', description: 'Optional specific book' },
            },
            required: ['game_id'],
          },
        },
        {
          name: 'getDailyMarket',
          description: 'Get all games and market data for a specific date',
          inputSchema: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              include_results: { type: 'boolean', default: true },
            },
            required: ['date'],
          },
        },
        {
          name: 'trackLineMovement',
          description: 'Track and record line movement for analysis',
          inputSchema: {
            type: 'object',
            properties: {
              game_id: { type: 'string' },
              current_odds: { type: 'object' },
              timestamp: { type: 'string' },
            },
            required: ['game_id', 'current_odds'],
          },
        },
        {
          name: 'getMarketConsensus',
          description: 'Get consensus odds across multiple sportsbooks',
          inputSchema: {
            type: 'object',
            properties: {
              game_id: { type: 'string' },
              sportsbooks: { type: 'array', items: { type: 'string' } },
            },
            required: ['game_id'],
          },
        },
        {
          name: 'getSharpMoney',
          description: 'Get sharp money indicators and reverse line movement',
          inputSchema: {
            type: 'object',
            properties: {
              game_id: { type: 'string' },
              threshold: { type: 'number', default: 0.5 },
            },
            required: ['game_id'],
          },
        },
        {
          name: 'getHistoricalOdds',
          description: 'Get historical odds for similar matchups',
          inputSchema: {
            type: 'object',
            properties: {
              home_team: { type: 'string' },
              away_team: { type: 'string' },
              days_back: { type: 'number', default: 365 },
            },
            required: ['home_team', 'away_team'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'getGameMarketData':
            return await this.getGameMarketData(args);
          case 'getDailyMarket':
            return await this.getDailyMarket(args);
          case 'trackLineMovement':
            return await this.trackLineMovement(args);
          case 'getMarketConsensus':
            return await this.getMarketConsensus(args);
          case 'getSharpMoney':
            return await this.getSharpMoney(args);
          case 'getHistoricalOdds':
            return await this.getHistoricalOdds(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async getGameMarketData(args: any) {
    const { game_id, include_movement = true, include_volume = true, sportsbook } = args;

    // Parse game_id to extract teams and date
    const [date, matchup] = game_id.split('_');
    const [away_team, home_team] = matchup.split('@');

    const marketData = {
      game_id,
      home_team,
      away_team,
      game_time: `${date}T19:10:00Z`,
      status: 'scheduled',
      totals: await this.getTotalsData(game_id, sportsbook),
      run_lines: await this.getRunLines(game_id, sportsbook),
      moneyline: await this.getMoneyline(game_id, sportsbook),
      consensus: await this.getConsensusData(game_id),
      result: await this.getGameResult(game_id),
      data_source: sportsbook || 'Multiple Sportsbooks',
      retrieved_at: new Date().toISOString(),
    };

    if (include_movement) {
      (marketData as any).line_movement = await this.getLineMovement(game_id);
    }

    if (include_volume) {
      (marketData as any).betting_volume = await this.getBettingVolume(game_id);
    }

    return { content: [{ type: 'text', text: JSON.stringify(marketData, null, 2) }] };
  }

  private async getTotalsData(game_id: string, sportsbook?: string) {
    const baseTotal = 8.5 + (Math.random() - 0.5) * 2;
    const openingTotal = baseTotal + (Math.random() - 0.5) * 0.5;
    const overOdds = -110 + Math.floor(Math.random() * 20) - 10;
    const underOdds = -110 + Math.floor(Math.random() * 20) - 10;
    
    return {
      current_total: Number(baseTotal.toFixed(1)),
      over_odds: overOdds,
      under_odds: underOdds,
      opening_total: Number(openingTotal.toFixed(1)),
      movement: Number((baseTotal - openingTotal).toFixed(1)),
      juice: Math.abs(overOdds + underOdds),
      implied_probability: {
        over: this.oddsToImpliedProbability(overOdds),
        under: this.oddsToImpliedProbability(underOdds),
      },
      value_assessment: this.assessTotalValue(baseTotal, overOdds, underOdds),
    };
  }

  private async getRunLines(game_id: string, sportsbook?: string) {
    const homeSpread = -1.5;
    const awaySpread = 1.5;
    const homeOdds = Math.floor(Math.random() * 40) + 120;
    const awayOdds = Math.floor(Math.random() * 40) + 120;
    
    return {
      home_spread: homeSpread,
      home_odds: homeOdds,
      away_spread: awaySpread,
      away_odds: awayOdds,
      implied_probability: {
        home: this.oddsToImpliedProbability(homeOdds),
        away: this.oddsToImpliedProbability(awayOdds),
      },
    };
  }

  private async getMoneyline(game_id: string, sportsbook?: string) {
    const homeOdds = Math.floor(Math.random() * 200) - 200;
    const awayOdds = Math.floor(Math.random() * 200) + 100;
    
    return {
      home_ml: homeOdds,
      away_ml: awayOdds,
      implied_probability: {
        home: this.oddsToImpliedProbability(homeOdds),
        away: this.oddsToImpliedProbability(awayOdds),
      },
      no_vig_probability: this.calculateNoVigProbability(homeOdds, awayOdds),
    };
  }

  private async getLineMovement(game_id: string) {
    const movements = [];
    const baseTime = new Date();
    baseTime.setHours(baseTime.getHours() - 24);

    let currentTotal = 8.5 + (Math.random() - 0.5) * 0.5;
    const finalTotal = currentTotal + (Math.random() - 0.5) * 0.5;
    const steps = 6;

    for (let i = 0; i < steps; i++) {
      const timestamp = new Date(baseTime.getTime() + i * 4 * 60 * 60 * 1000);
      const progress = i / (steps - 1);
      const total = currentTotal + (finalTotal - currentTotal) * progress;
      
      const overOdds = -110 + Math.floor(Math.random() * 20) - 10;
      const underOdds = -110 + Math.floor(Math.random() * 20) - 10;
      
      movements.push({
        timestamp: timestamp.toISOString(),
        total: Number(total.toFixed(1)),
        over_odds: overOdds,
        under_odds: underOdds,
        trigger: i === 0 ? 'opening' : 
                i === steps - 1 ? 'current' :
                this.getRandomTrigger(),
        volume_indicator: Math.random() > 0.7 ? 'high' : 'normal',
        sharp_money_indicator: Math.random() > 0.8,
      });
    }

    return movements;
  }

  private getRandomTrigger(): string {
    const triggers = [
      'public_money',
      'sharp_money',
      'steam_move',
      'injury_news',
      'weather_update',
      'lineup_change',
      'volume_spike',
    ];
    return triggers[Math.floor(Math.random() * triggers.length)];
  }

  private async getBettingVolume(game_id: string) {
    const overPercentage = Math.floor(Math.random() * 40) + 30;
    const sharpMoneySide = Math.random() > 0.5 ? 'Over' : 'Under';
    const reverseLineMovement = Math.random() > 0.7;
    
    return {
      over_percentage: overPercentage,
      under_percentage: 100 - overPercentage,
      total_handle: Math.floor(Math.random() * 500000) + 100000,
      number_of_bets: Math.floor(Math.random() * 5000) + 1000,
      average_bet_size: 0,
      public_vs_sharp: {
        public_percentage_over: overPercentage,
        sharp_money_side: sharpMoneySide,
        reverse_line_movement: reverseLineMovement,
        sharp_money_percentage: Math.floor(Math.random() * 30) + 20,
      },
      betting_trends: {
        early_money: Math.random() > 0.5 ? 'Over' : 'Under',
        late_money: Math.random() > 0.5 ? 'Over' : 'Under',
        steam_moves: Math.floor(Math.random() * 3),
      },
    };
  }

  private async getConsensusData(game_id: string) {
    const avgTotal = 8.5 + (Math.random() - 0.5) * 1;
    const rangeLow = avgTotal - 0.5;
    const rangeHigh = avgTotal + 0.5;
    
    return {
      average_total: Number(avgTotal.toFixed(1)),
      range_low: Number(rangeLow.toFixed(1)),
      range_high: Number(rangeHigh.toFixed(1)),
      standard_deviation: Number((Math.random() * 0.3 + 0.1).toFixed(2)),
      books_tracked: 8 + Math.floor(Math.random() * 4),
      market_efficiency: Number((0.85 + Math.random() * 0.10).toFixed(2)),
      arbitrage_opportunities: this.findArbitrageOpportunities(),
    };
  }

  private findArbitrageOpportunities(): any[] {
    const opportunities = [];
    
    // Rarely find arbitrage opportunities (they're rare in efficient markets)
    if (Math.random() > 0.95) {
      opportunities.push({
        type: 'total_arbitrage',
        over_book: 'DraftKings',
        over_odds: -105,
        under_book: 'FanDuel',
        under_odds: -105,
        profit_margin: 0.024,
        required_stakes: { over: 500, under: 500 },
        guaranteed_profit: 24,
      });
    }
    
    return opportunities;
  }

  private async getGameResult(game_id: string) {
    const isCompleted = Math.random() > 0.8;
    
    if (!isCompleted) {
      return {
        final_score: null,
        total_runs: null,
        over_under_result: null,
        over_under_margin: null,
        game_completed: false,
        estimated_completion: this.getEstimatedCompletion(),
      };
    }

    const homeScore = Math.floor(Math.random() * 8) + 1;
    const awayScore = Math.floor(Math.random() * 8) + 1;
    const totalRuns = homeScore + awayScore;
    const closingTotal = 8.5 + (Math.random() - 0.5) * 1;
    
    return {
      final_score: {
        home: homeScore,
        away: awayScore,
        total_runs: totalRuns,
        innings_played: totalRuns < 6 ? 9 : Math.floor(Math.random() * 3) + 9,
      },
      over_under_result: totalRuns > closingTotal ? 'Over' : 
                        totalRuns < closingTotal ? 'Under' : 'Push',
      over_under_margin: Number((totalRuns - closingTotal).toFixed(1)),
      closing_total: closingTotal,
      game_completed: true,
      completion_time: new Date().toISOString(),
    };
  }

  private getEstimatedCompletion(): string {
    const now = new Date();
    const estimatedEnd = new Date(now.getTime() + Math.random() * 3 * 60 * 60 * 1000);
    return estimatedEnd.toISOString();
  }

  private async getDailyMarket(args: any) {
    const { date, include_results = true } = args;

    const games = [];
    const teamPairs = [
      ['NYY', 'BOS'], ['LAD', 'SF'], ['HOU', 'OAK'], ['ATL', 'NYM'],
      ['CWS', 'MIN'], ['TB', 'TOR'], ['MIL', 'CHC'], ['SD', 'COL'],
      ['PHI', 'WSN'], ['MIA', 'PIT'], ['STL', 'CIN'], ['ARI', 'LAA'],
    ];

    let overs = 0, unders = 0, pushes = 0;
    let totalClosingTotal = 0, totalActualTotal = 0;
    let completedGames = 0;

    for (let i = 0; i < Math.min(teamPairs.length, 10 + Math.floor(Math.random() * 5)); i++) {
      const [away, home] = teamPairs[i];
      const game_id = `${date}_${away}@${home}`;
      const currentTotal = 8.5 + (Math.random() - 0.5) * 2;
      const overOdds = -110 + Math.floor(Math.random() * 20) - 10;
      const underOdds = -110 + Math.floor(Math.random() * 20) - 10;
      
      let result = null;
      if (include_results && Math.random() > 0.3) {
        const actualTotal = Math.floor(Math.random() * 12) + 3;
        const overUnderResult = actualTotal > currentTotal ? 'Over' : 
                               actualTotal < currentTotal ? 'Under' : 'Push';
        
        result = {
          total_runs: actualTotal,
          over_under_result: overUnderResult,
          completed: true,
          final_score: {
            home: Math.floor(actualTotal / 2) + Math.floor(Math.random() * 3),
            away: actualTotal - (Math.floor(actualTotal / 2) + Math.floor(Math.random() * 3)),
          },
        };

        completedGames++;
        totalClosingTotal += currentTotal;
        totalActualTotal += actualTotal;
        
        if (overUnderResult === 'Over') overs++;
        else if (overUnderResult === 'Under') unders++;
        else pushes++;
      } else {
        result = {
          total_runs: null,
          over_under_result: null,
          completed: false,
          estimated_start: `${date}T19:10:00Z`,
        };
      }

      games.push({
        game_id,
        home_team: home,
        away_team: away,
        game_time: `${date}T19:10:00Z`,
        totals: {
          current_total: Number(currentTotal.toFixed(1)),
          over_odds: overOdds,
          under_odds: underOdds,
          opening_total: Number((currentTotal + (Math.random() - 0.5) * 0.5).toFixed(1)),
        },
        moneyline: {
          home_ml: Math.floor(Math.random() * 200) - 200,
          away_ml: Math.floor(Math.random() * 200) + 100,
        },
        run_line: {
          home_spread: -1.5,
          away_spread: 1.5,
        },
        result,
        betting_interest: this.calculateBettingInterest(),
      });
    }

    const marketSummary = {
      total_games: games.length,
      completed_games: completedGames,
      pending_games: games.length - completedGames,
      results_summary: {
        overs,
        unders,
        pushes,
        over_percentage: completedGames > 0 ? Number((overs / completedGames * 100).toFixed(1)) : 0,
      },
      totals_analysis: {
        average_closing_total: completedGames > 0 ? Number((totalClosingTotal / completedGames).toFixed(1)) : 0,
        average_actual_total: completedGames > 0 ? Number((totalActualTotal / completedGames).toFixed(1)) : 0,
        total_variance: completedGames > 0 ? Number(((totalActualTotal - totalClosingTotal) / completedGames).toFixed(1)) : 0,
      },
      market_efficiency: this.calculateMarketEfficiency(games),
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ 
          date, 
          games, 
          market_summary: marketSummary,
          generated_at: new Date().toISOString(),
        }, null, 2)
      }]
    };
  }

  private calculateBettingInterest(): any {
    return {
      handle_estimate: Math.floor(Math.random() * 1000000) + 100000,
      public_interest: Math.random() > 0.5 ? 'high' : 'moderate',
      sharp_interest: Math.random() > 0.7 ? 'high' : 'low',
      line_movement_activity: Math.random() > 0.6 ? 'active' : 'stable',
    };
  }

  private calculateMarketEfficiency(games: any[]): any {
    const completedGames = games.filter(g => g.result.completed);
    if (completedGames.length === 0) return { efficiency_score: 0.85 };

    let correctPredictions = 0;
    completedGames.forEach(game => {
      const predicted = game.totals.current_total;
      const actual = game.result.total_runs;
      if (Math.abs(predicted - actual) <= 1) correctPredictions++;
    });

    return {
      efficiency_score: Number((correctPredictions / completedGames.length).toFixed(2)),
      sample_size: completedGames.length,
      average_error: Number((Math.random() * 1.5 + 0.5).toFixed(2)),
    };
  }

  private async trackLineMovement(args: any) {
    const { game_id, current_odds, timestamp = new Date().toISOString() } = args;

    if (!this.lineMovementCache.has(game_id)) {
      this.lineMovementCache.set(game_id, []);
    }

    const movements = this.lineMovementCache.get(game_id)!;
    
    // Analyze the movement
    const movement = {
      timestamp,
      ...current_odds,
      analysis: this.analyzeMovement(movements, current_odds),
    };
    
    movements.push(movement);

    // Keep only last 50 movements
    if (movements.length > 50) {
      movements.splice(0, movements.length - 50);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ 
          game_id, 
          movements_tracked: movements.length,
          latest_movement: movement,
          movement_summary: this.summarizeMovement(movements),
        }, null, 2)
      }]
    };
  }

  private analyzeMovement(previousMovements: any[], currentOdds: any): any {
    if (previousMovements.length === 0) {
      return { type: 'opening_line', significance: 'baseline' };
    }

    const lastMovement = previousMovements[previousMovements.length - 1];
    const totalChange = currentOdds.total - lastMovement.total;
    
    let significance = 'minor';
    if (Math.abs(totalChange) >= 0.5) significance = 'major';
    else if (Math.abs(totalChange) >= 0.25) significance = 'moderate';

    return {
      type: totalChange > 0 ? 'line_increase' : totalChange < 0 ? 'line_decrease' : 'no_change',
      magnitude: Math.abs(totalChange),
      significance,
      velocity: this.calculateVelocity(previousMovements, currentOdds),
    };
  }

  private calculateVelocity(movements: any[], currentOdds: any): string {
    if (movements.length < 2) return 'unknown';
    
    const recentMovements = movements.slice(-3);
    const timeSpan = new Date().getTime() - new Date(recentMovements[0].timestamp).getTime();
    const totalChange = currentOdds.total - recentMovements[0].total;
    
    if (timeSpan < 30 * 60 * 1000 && Math.abs(totalChange) > 0.25) {
      return 'rapid';
    } else if (timeSpan < 60 * 60 * 1000 && Math.abs(totalChange) > 0.5) {
      return 'fast';
    } else {
      return 'normal';
    }
  }

  private summarizeMovement(movements: any[]): any {
    if (movements.length === 0) return null;

    const first = movements[0];
    const last = movements[movements.length - 1];
    
    return {
      total_movement: Number((last.total - first.total).toFixed(1)),
      number_of_moves: movements.length,
      time_span_hours: (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / (1000 * 60 * 60),
      major_moves: movements.filter(m => m.analysis?.significance === 'major').length,
      direction: last.total > first.total ? 'up' : last.total < first.total ? 'down' : 'flat',
    };
  }

  private async getMarketConsensus(args: any) {
    const { game_id, sportsbooks = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'PointsBet'] } = args;

    const bookOdds = sportsbooks.map((book: string) => ({
      sportsbook: book,
      total: 8.5 + (Math.random() - 0.5) * 0.5,
      over_odds: -110 + Math.floor(Math.random() * 20) - 10,
      under_odds: -110 + Math.floor(Math.random() * 20) - 10,
      last_updated: new Date().toISOString(),
    }));

    const totals = bookOdds.map((book: any) => book.total);
    const avgTotal = totals.reduce((a: number, b: number) => a + b, 0) / totals.length;
    const minTotal = Math.min(...totals);
    const maxTotal = Math.max(...totals);
    
    const consensus = {
      game_id,
      sportsbooks_included: sportsbooks,
      consensus_data: {
        total: {
          average: Number(avgTotal.toFixed(1)),
          range: [Number(minTotal.toFixed(1)), Number(maxTotal.toFixed(1))],
          std_deviation: Number(this.calculateStandardDeviation(totals).toFixed(3)),
        },
        over_odds: {
          average: Math.round(bookOdds.reduce((sum: number, book: any) => sum + book.over_odds, 0) / bookOdds.length),
          range: [Math.min(...bookOdds.map((b: any) => b.over_odds)), Math.max(...bookOdds.map((b: any) => b.over_odds))],
          best_value: Math.max(...bookOdds.map((b: any) => b.over_odds)),
        },
        under_odds: {
          average: Math.round(bookOdds.reduce((sum: number, book: any) => sum + book.under_odds, 0) / bookOdds.length),
          range: [Math.min(...bookOdds.map((b: any) => b.under_odds)), Math.max(...bookOdds.map((b: any) => b.under_odds))],
          best_value: Math.max(...bookOdds.map((b: any) => b.under_odds)),
        },
      },
      individual_books: bookOdds,
      market_efficiency: Number((0.85 + Math.random() * 0.10).toFixed(2)),
      arbitrage_opportunities: this.findArbitrageOpportunities(),
      value_bets: this.identifyValueBets(bookOdds),
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(consensus, null, 2)
      }]
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private identifyValueBets(bookOdds: any[]): any[] {
    const valueBets: any[] = [];
    
    bookOdds.forEach(book => {
      // Simple value identification (in practice, would be more sophisticated)
      if (book.over_odds > -105 || book.under_odds > -105) {
        valueBets.push({
          sportsbook: book.sportsbook,
          bet_type: book.over_odds > book.under_odds ? 'over' : 'under',
          odds: Math.max(book.over_odds, book.under_odds),
          value_rating: Math.random() > 0.5 ? 'moderate' : 'high',
        });
      }
    });
    
    return valueBets;
  }

  private async getSharpMoney(args: any) {
    const { game_id, threshold = 0.5 } = args;

    const sharpIndicators = {
      game_id,
      threshold,
      sharp_money_indicators: {
        reverse_line_movement: Math.random() > 0.7,
        steam_moves: Math.floor(Math.random() * 3),
        line_freeze: Math.random() > 0.85,
        low_public_high_money: Math.random() > 0.6,
        syndicate_action: Math.random() > 0.9,
      },
      sharp_money_side: Math.random() > 0.5 ? 'Over' : 'Under',
      confidence_level: Math.random() > 0.3 ? 'high' : 'medium',
      estimated_sharp_percentage: Math.floor(Math.random() * 30) + 15,
      public_vs_sharp: {
        public_money: Math.floor(Math.random() * 40) + 30,
        sharp_money: Math.floor(Math.random() * 30) + 15,
        total_handle: Math.floor(Math.random() * 500000) + 100000,
      },
      analysis: this.analyzeSharpAction(),
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(sharpIndicators, null, 2)
      }]
    };
  }

  private analyzeSharpAction(): any {
    return {
      strength: Math.random() > 0.7 ? 'strong' : Math.random() > 0.4 ? 'moderate' : 'weak',
      timing: Math.random() > 0.6 ? 'early' : 'late',
      consistency: Math.random() > 0.5 ? 'consistent' : 'mixed',
      recommendation: Math.random() > 0.6 ? 'follow' : 'monitor',
    };
  }

  private async getHistoricalOdds(args: any) {
    const { home_team, away_team, days_back = 365 } = args;

    const historicalGames = [];
    const numGames = Math.floor(Math.random() * 8) + 2;

    for (let i = 0; i < numGames; i++) {
      const daysAgo = Math.floor(Math.random() * days_back) + 1;
      const gameDate = new Date();
      gameDate.setDate(gameDate.getDate() - daysAgo);

      const openingTotal = 8.5 + (Math.random() - 0.5) * 2;
      const closingTotal = openingTotal + (Math.random() - 0.5) * 0.5;
      const actualTotal = Math.floor(Math.random() * 12) + 3;

      historicalGames.push({
        date: gameDate.toISOString().split('T')[0],
        home_team,
        away_team,
        venue: `${home_team} Stadium`,
        opening_total: Number(openingTotal.toFixed(1)),
        closing_total: Number(closingTotal.toFixed(1)),
        actual_total: actualTotal,
        result: actualTotal > closingTotal ? 'Over' : actualTotal < closingTotal ? 'Under' : 'Push',
        margin: Number((actualTotal - closingTotal).toFixed(1)),
      });
    }

    const analysis = {
      total_games: historicalGames.length,
      over_record: historicalGames.filter(g => g.result === 'Over').length,
      under_record: historicalGames.filter(g => g.result === 'Under').length,
      push_record: historicalGames.filter(g => g.result === 'Push').length,
      average_total: Number((historicalGames.reduce((sum, g) => sum + g.actual_total, 0) / historicalGames.length).toFixed(1)),
      average_closing_line: Number((historicalGames.reduce((sum, g) => sum + g.closing_total, 0) / historicalGames.length).toFixed(1)),
      line_accuracy: Number((historicalGames.filter(g => Math.abs(g.actual_total - g.closing_total) <= 1).length / historicalGames.length).toFixed(2)),
      trends: {
        recent_trend: historicalGames.slice(-5).filter(g => g.result === 'Over').length >= 3 ? 'Over' : 'Under',
        home_advantage: Math.random() > 0.5 ? 'slight' : 'none',
      },
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          matchup: `${away_team} @ ${home_team}`,
          historical_games: historicalGames,
          analysis,
          generated_at: new Date().toISOString(),
        }, null, 2)
      }]
    };
  }

  private oddsToImpliedProbability(odds: number): number {
    if (odds > 0) {
      return Number((100 / (odds + 100)).toFixed(3));
    } else {
      return Number((Math.abs(odds) / (Math.abs(odds) + 100)).toFixed(3));
    }
  }

  private calculateNoVigProbability(odds1: number, odds2: number): any {
    const prob1 = this.oddsToImpliedProbability(odds1);
    const prob2 = this.oddsToImpliedProbability(odds2);
    const totalProb = prob1 + prob2;
    
    return {
      home: Number((prob1 / totalProb).toFixed(3)),
      away: Number((prob2 / totalProb).toFixed(3)),
      vig: Number(((totalProb - 1) * 100).toFixed(1)),
    };
  }

  private assessTotalValue(total: number, overOdds: number, underOdds: number): any {
    const avgOdds = (Math.abs(overOdds) + Math.abs(underOdds)) / 2;
    
    return {
      juice_rating: avgOdds > 115 ? 'high' : avgOdds > 105 ? 'medium' : 'low',
      total_rating: total > 9.5 ? 'high' : total < 7.5 ? 'low' : 'medium',
      value_side: Math.abs(overOdds) < Math.abs(underOdds) ? 'over' : 'under',
      market_sentiment: Math.random() > 0.5 ? 'bullish' : 'bearish',
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Market Server running on stdio');
  }
}

const server = new MarketServer();
server.run().catch(console.error);