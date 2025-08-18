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
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
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
      marketData.line_movement = await this.getLineMovement(game_id);
    }

    if (include_volume) {
      marketData.betting_volume = await this.getBettingVolume(game_id);
    }

    return { content: [{ type: 'text', text: JSON.stringify(marketData, null, 2) }] };
  }

  private async getTotalsData(game_id: string, sportsbook?: string) {
    // This would integrate with odds APIs
    const baseTotal = 8.5 + (Math.random() - 0.5) * 2; // Mock variation
    const openingTotal = baseTotal + (Math.random() - 0.5) * 0.5;
    
    return {
      current_total: Number(baseTotal.toFixed(1)),
      over_odds: -110 + Math.floor(Math.random() * 20) - 10,
      under_odds: -110 + Math.floor(Math.random() * 20) - 10,
      opening_total: Number(openingTotal.toFixed(1)),
      movement: Number((baseTotal - openingTotal).toFixed(1)),
    };
  }

  private async getRunLines(game_id: string, sportsbook?: string) {
    return {
      home_spread: -1.5,
      home_odds: Math.floor(Math.random() * 40) + 120,
      away_spread: 1.5,
      away_odds: Math.floor(Math.random() * 40) + 120,
    };
  }

  private async getMoneyline(game_id: string, sportsbook?: string) {
    const homeOdds = Math.floor(Math.random() * 200) - 200;
    const awayOdds = Math.floor(Math.random() * 200) + 100;
    
    return {
      home_ml: homeOdds,
      away_ml: awayOdds,
    };
  }

  private async getLineMovement(game_id: string) {
    // Generate mock line movement data
    const movements = [];
    const baseTime = new Date();
    baseTime.setHours(baseTime.getHours() - 24); // Start 24 hours ago

    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(baseTime.getTime() + i * 4 * 60 * 60 * 1000); // 4-hour intervals
      movements.push({
        timestamp: timestamp.toISOString(),
        total: 8.5 + (Math.random() - 0.5) * 0.5,
        over_odds: -110 + Math.floor(Math.random() * 20) - 10,
        under_odds: -110 + Math.floor(Math.random() * 20) - 10,
        trigger: i === 0 ? 'opening' : ['public_money', 'sharp_money', 'steam_move', 'injury_news'][Math.floor(Math.random() * 4)],
      });
    }

    return movements;
  }

  private async getBettingVolume(game_id: string) {
    const overPercentage = Math.floor(Math.random() * 40) + 30; // 30-70%
    
    return {
      over_percentage: overPercentage,
      under_percentage: 100 - overPercentage,
      public_vs_sharp: {
        public_percentage_over: overPercentage,
        sharp_money_side: Math.random() > 0.5 ? 'Over' : 'Under',
        reverse_line_movement: Math.random() > 0.7,
      },
    };
  }

  private async getConsensusData(game_id: string) {
    const avgTotal = 8.5 + (Math.random() - 0.5) * 1;
    
    return {
      average_total: Number(avgTotal.toFixed(1)),
      range_low: Number((avgTotal - 0.5).toFixed(1)),
      range_high: Number((avgTotal + 0.5).toFixed(1)),
    };
  }

  private async getGameResult(game_id: string) {
    // Check if game is completed (mock logic)
    const isCompleted = Math.random() > 0.8; // 20% chance game is completed
    
    if (!isCompleted) {
      return {
        final_score: null,
        total_runs: null,
        over_under_result: null,
        over_under_margin: null,
        game_completed: false,
      };
    }

    const homeScore = Math.floor(Math.random() * 8) + 1;
    const awayScore = Math.floor(Math.random() * 8) + 1;
    const totalRuns = homeScore + awayScore;
    const closingTotal = 8.5;
    
    return {
      final_score: {
        home: homeScore,
        away: awayScore,
        total_runs: totalRuns,
      },
      over_under_result: totalRuns > closingTotal ? 'Over' : totalRuns < closingTotal ? 'Under' : 'Push',
      over_under_margin: Number((totalRuns - closingTotal).toFixed(1)),
      game_completed: true,
    };
  }

  private async getDailyMarket(args: any) {
    const { date, include_results = true } = args;

    // Generate mock daily market data
    const games = [];
    const teamPairs = [
      ['NYY', 'BOS'], ['LAD', 'SF'], ['HOU', 'OAK'], ['ATL', 'NYM'],
      ['CWS', 'MIN'], ['TB', 'TOR'], ['MIL', 'CHC'], ['SD', 'COL']
    ];

    let overs = 0, unders = 0, pushes = 0;
    let totalClosingTotal = 0, totalActualTotal = 0;
    let completedGames = 0;

    for (let i = 0; i < teamPairs.length; i++) {
      const [away, home] = teamPairs[i];
      const game_id = `${date}_${away}@${home}`;
      const currentTotal = 8.5 + (Math.random() - 0.5) * 2;
      
      let result = null;
      if (include_results && Math.random() > 0.3) { // 70% of games completed
        const actualTotal = Math.floor(Math.random() * 12) + 3; // 3-14 runs
        const overUnderResult = actualTotal > currentTotal ? 'Over' : 
                               actualTotal < currentTotal ? 'Under' : 'Push';
        
        result = {
          total_runs: actualTotal,
          over_under_result: overUnderResult,
          completed: true,
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
        };
      }

      games.push({
        game_id,
        home_team: home,
        away_team: away,
        totals: {
          current_total: Number(currentTotal.toFixed(1)),
          over_odds: -110,
          under_odds: -110,
        },
        result,
      });
    }

    const marketSummary = {
      total_games: games.length,
      completed_games: completedGames,
      overs,
      unders,
      pushes,
      average_closing_total: completedGames > 0 ? Number((totalClosingTotal / completedGames).toFixed(1)) : 0,
      average_actual_total: completedGames > 0 ? Number((totalActualTotal / completedGames).toFixed(1)) : 0,
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ date, games, market_summary: marketSummary }, null, 2)
      }]
    };
  }

  private async trackLineMovement(args: any) {
    const { game_id, current_odds, timestamp = new Date().toISOString() } = args;

    if (!this.lineMovementCache.has(game_id)) {
      this.lineMovementCache.set(game_id, []);
    }

    const movements = this.lineMovementCache.get(game_id)!;
    movements.push({
      timestamp,
      ...current_odds,
    });

    // Keep only last 50 movements
    if (movements.length > 50) {
      movements.splice(0, movements.length - 50);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ game_id, movements_tracked: movements.length }, null, 2)
      }]
    };
  }

  private async getMarketConsensus(args: any) {
    const { game_id, sportsbooks = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars'] } = args;

    const consensus = {
      game_id,
      sportsbooks_included: sportsbooks,
      consensus_data: {
        total: {
          average: 8.5,
          range: [8.0, 9.0],
          std_deviation: 0.2,
        },
        over_odds: {
          average: -108,
          range: [-115, -105],
          best_value: -105,
        },
        under_odds: {
          average: -112,
          range: [-115, -105],
          best_value: -105,
        },
      },
      market_efficiency: 0.85, // How consistent odds are across books
      arbitrage_opportunities: [],
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(consensus, null, 2)
      }]
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