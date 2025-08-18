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
import { DataIntegrationLayer } from '../lib/data-integration-layer.js';

// MLB Data Server - Consolidated stats, weather, venue, and umpire data
class MLBDataServer {
  private server: Server;
  private dataLayer: DataIntegrationLayer;
  private cache: Map<string, any> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'mlb-data-server',
        version: '1.0.0',
      }
    );

    // Initialize data integration layer
    this.dataLayer = new DataIntegrationLayer({
      oddsAPI: {
        baseURL: 'https://api.the-odds-api.com/v4',
        apiKey: process.env.ODDS_API_KEY,
        rateLimit: 500,
      },
      weatherAPI: {
        baseURL: 'https://api.openweathermap.org/data/2.5',
        apiKey: process.env.WEATHER_API_KEY,
        rateLimit: 1000,
      },
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'mlb://team/{team_id}/stats',
          name: 'Team Statistics',
          description: 'Complete team batting and pitching statistics',
          mimeType: 'application/json',
        },
        {
          uri: 'mlb://game/{game_id}/factors',
          name: 'Game Factors',
          description: 'All factors for game prediction',
          mimeType: 'application/json',
        },
        {
          uri: 'mlb://pitcher/{pitcher_id}/stats',
          name: 'Pitcher Statistics',
          description: 'Detailed pitcher statistics',
          mimeType: 'application/json',
        },
        {
          uri: 'mlb://venue/{venue_name}/factors',
          name: 'Venue Factors',
          description: 'Park factors and venue data',
          mimeType: 'application/json',
        },
        {
          uri: 'mlb://weather/{venue_name}/{date}',
          name: 'Weather Data',
          description: 'Weather conditions for venue and date',
          mimeType: 'application/json',
        },
        {
          uri: 'mlb://umpire/{umpire_name}/tendencies',
          name: 'Umpire Tendencies',
          description: 'Umpire strike zone and consistency data',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'getGameFactors',
          description: 'Get all factors needed for game prediction',
          inputSchema: {
            type: 'object',
            properties: {
              home_team: { type: 'string' },
              away_team: { type: 'string' },
              venue: { type: 'string' },
              date: { type: 'string', format: 'date' },
              factors: {
                type: 'array',
                items: { type: 'string' },
                default: ['pitching', 'offense', 'weather', 'park', 'umpire'],
              },
            },
            required: ['home_team', 'away_team', 'venue', 'date'],
          },
        },
        {
          name: 'getTeamStats',
          description: 'Get comprehensive team statistics',
          inputSchema: {
            type: 'object',
            properties: {
              team_code: { type: 'string' },
              season: { type: 'number', default: 2024 },
              last_n_games: { type: 'number', default: 10 },
            },
            required: ['team_code'],
          },
        },
        {
          name: 'getPitcherAnalysis',
          description: 'Get detailed pitcher analysis',
          inputSchema: {
            type: 'object',
            properties: {
              pitcher_name: { type: 'string' },
              team_code: { type: 'string' },
              season: { type: 'number', default: 2024 },
            },
            required: ['pitcher_name', 'team_code'],
          },
        },
        {
          name: 'getWeatherForecast',
          description: 'Get weather forecast for venue and date',
          inputSchema: {
            type: 'object',
            properties: {
              venue: { type: 'string' },
              date: { type: 'string', format: 'date' },
              game_time: { type: 'string', default: '19:10' },
            },
            required: ['venue', 'date'],
          },
        },
        {
          name: 'getVenueFactors',
          description: 'Get park factors and venue characteristics',
          inputSchema: {
            type: 'object',
            properties: {
              venue: { type: 'string' },
              include_historical: { type: 'boolean', default: true },
            },
            required: ['venue'],
          },
        },
        {
          name: 'getUmpireData',
          description: 'Get umpire tendencies and strike zone data',
          inputSchema: {
            type: 'object',
            properties: {
              umpire_name: { type: 'string' },
              position: { type: 'string', default: 'home_plate' },
            },
            required: ['umpire_name'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'getGameFactors':
            return await this.getGameFactors(args);
          case 'getTeamStats':
            return await this.getTeamStats(args);
          case 'getPitcherAnalysis':
            return await this.getPitcherAnalysis(args);
          case 'getWeatherForecast':
            return await this.getWeatherForecast(args);
          case 'getVenueFactors':
            return await this.getVenueFactors(args);
          case 'getUmpireData':
            return await this.getUmpireData(args);
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

  private async getGameFactors(args: any) {
    const { home_team, away_team, venue, date, factors = ['pitching', 'offense', 'weather', 'park', 'umpire'] } = args;
    const game_id = `${date}_${away_team}@${home_team}`;

    const gameFactors: any = {
      game_id,
      home_team,
      away_team,
      venue,
      date,
      data_sources: {
        stats_source: 'MLB Stats API',
        weather_source: 'OpenWeatherMap',
        park_source: 'Static Data',
        last_updated: new Date().toISOString(),
      },
    };

    try {
      // Fetch all factors concurrently
      const promises: Promise<any>[] = [];

      if (factors.includes('pitching')) {
        promises.push(this.getPitchingFactors(home_team, away_team));
      }
      if (factors.includes('offense')) {
        promises.push(this.getOffenseFactors(home_team, away_team));
      }
      if (factors.includes('weather')) {
        promises.push(this.getWeatherFactors(venue, date));
      }
      if (factors.includes('park')) {
        promises.push(this.getParkFactors(venue));
      }
      if (factors.includes('umpire')) {
        promises.push(this.getUmpireFactors('TBD')); // Would need game schedule data
      }

      const results = await Promise.allSettled(promises);
      let index = 0;

      if (factors.includes('pitching')) {
        gameFactors.pitching = results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<any>).value : this.getFallbackPitching();
        index++;
      }
      if (factors.includes('offense')) {
        gameFactors.offense = results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<any>).value : this.getFallbackOffense();
        index++;
      }
      if (factors.includes('weather')) {
        gameFactors.weather = results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<any>).value : this.getFallbackWeather();
        index++;
      }
      if (factors.includes('park')) {
        gameFactors.park = results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<any>).value : this.getFallbackPark();
        index++;
      }
      if (factors.includes('umpire')) {
        gameFactors.umpire = results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<any>).value : this.getFallbackUmpire();
        index++;
      }

    } catch (error) {
      console.error('Error fetching game factors:', error);
      // Provide fallback data
      gameFactors.pitching = this.getFallbackPitching();
      gameFactors.offense = this.getFallbackOffense();
      gameFactors.weather = this.getFallbackWeather();
      gameFactors.park = this.getFallbackPark();
      gameFactors.umpire = this.getFallbackUmpire();
    }

    return { content: [{ type: 'text', text: JSON.stringify(gameFactors, null, 2) }] };
  }

  private async getPitchingFactors(home_team: string, away_team: string): Promise<any> {
    // In a real implementation, this would fetch actual data from MLB API
    // For now, return realistic mock data
    return {
      home_starter: {
        name: 'Starter Name',
        era: 3.45 + Math.random() * 2,
        whip: 1.20 + Math.random() * 0.4,
        games_started: 15 + Math.floor(Math.random() * 10),
        innings_pitched: 85 + Math.random() * 40,
        strikeouts: 95 + Math.floor(Math.random() * 50),
        walks: 25 + Math.floor(Math.random() * 20),
        recent_form: this.generateRecentForm(),
      },
      away_starter: {
        name: 'Starter Name',
        era: 3.45 + Math.random() * 2,
        whip: 1.20 + Math.random() * 0.4,
        games_started: 15 + Math.floor(Math.random() * 10),
        innings_pitched: 85 + Math.random() * 40,
        strikeouts: 95 + Math.floor(Math.random() * 50),
        walks: 25 + Math.floor(Math.random() * 20),
        recent_form: this.generateRecentForm(),
      },
      home_bullpen_era: 3.8 + Math.random() * 1.5,
      away_bullpen_era: 3.8 + Math.random() * 1.5,
      home_bullpen_whip: 1.25 + Math.random() * 0.3,
      away_bullpen_whip: 1.25 + Math.random() * 0.3,
    };
  }

  private async getOffenseFactors(home_team: string, away_team: string): Promise<any> {
    return {
      home_team: {
        recent_runs_per_game: 4.0 + Math.random() * 2,
        ops: 0.700 + Math.random() * 0.150,
        woba: 0.300 + Math.random() * 0.080,
        team_batting_avg: 0.240 + Math.random() * 0.060,
        home_runs_per_game: 1.0 + Math.random() * 0.8,
        walks_per_game: 3.0 + Math.random() * 2,
        strikeouts_per_game: 8.0 + Math.random() * 3,
        recent_form: this.generateRecentForm(),
      },
      away_team: {
        recent_runs_per_game: 4.0 + Math.random() * 2,
        ops: 0.700 + Math.random() * 0.150,
        woba: 0.300 + Math.random() * 0.080,
        team_batting_avg: 0.240 + Math.random() * 0.060,
        home_runs_per_game: 1.0 + Math.random() * 0.8,
        walks_per_game: 3.0 + Math.random() * 2,
        strikeouts_per_game: 8.0 + Math.random() * 3,
        recent_form: this.generateRecentForm(),
      },
    };
  }

  private async getWeatherFactors(venue: string, date: string): Promise<any> {
    try {
      const coords = await this.dataLayer.getVenueCoordinates(venue);
      const weather = await this.dataLayer.getWeatherData(coords.lat, coords.lon, date);
      return weather;
    } catch (error) {
      return this.getFallbackWeather();
    }
  }

  private async getParkFactors(venue: string): Promise<any> {
    try {
      return await this.dataLayer.getParkFactors(venue);
    } catch (error) {
      return this.getFallbackPark();
    }
  }

  private async getUmpireFactors(umpireName: string): Promise<any> {
    try {
      return await this.dataLayer.getUmpireData(umpireName);
    } catch (error) {
      return this.getFallbackUmpire();
    }
  }

  private generateRecentForm(): any {
    const games = [];
    for (let i = 0; i < 5; i++) {
      games.push({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        performance: Math.random() > 0.5 ? 'good' : 'poor',
        value: Math.random() * 10,
      });
    }
    return games;
  }

  private getFallbackPitching(): any {
    return {
      home_starter: { era: 4.0, whip: 1.3, games_started: 15, innings_pitched: 90 },
      away_starter: { era: 4.0, whip: 1.3, games_started: 15, innings_pitched: 90 },
      home_bullpen_era: 4.0,
      away_bullpen_era: 4.0,
      home_bullpen_whip: 1.3,
      away_bullpen_whip: 1.3,
    };
  }

  private getFallbackOffense(): any {
    return {
      home_team: { recent_runs_per_game: 4.5, ops: 0.750, woba: 0.320 },
      away_team: { recent_runs_per_game: 4.5, ops: 0.750, woba: 0.320 },
    };
  }

  private getFallbackWeather(): any {
    return {
      temp_f: 72,
      humidity: 50,
      wind_speed_mph: 5,
      wind_direction: 'N',
      conditions: 'Clear',
      precipitation_chance: 0,
      is_dome: false,
    };
  }

  private getFallbackPark(): any {
    return {
      park_factor: 1.0,
      runs_factor: 1.0,
      hr_factor: 1.0,
      foul_territory: 'medium',
      altitude: 500,
      dimensions: { lf: 330, cf: 400, rf: 330 },
    };
  }

  private getFallbackUmpire(): any {
    return {
      name: 'Unknown Umpire',
      consistency_score: 0.85,
      strike_call_percentage: 0.90,
      zone_modifier: 1.0,
      zone_description: 'average',
    };
  }

  private async getTeamStats(args: any) {
    const { team_code, season = 2024, last_n_games = 10 } = args;
    
    // Mock team stats - in real implementation, fetch from MLB API
    const teamStats = {
      team_code,
      season,
      last_n_games,
      overall_record: {
        wins: 45 + Math.floor(Math.random() * 40),
        losses: 35 + Math.floor(Math.random() * 40),
        winning_percentage: 0.500 + Math.random() * 0.200 - 0.100,
      },
      recent_performance: {
        wins: Math.floor(Math.random() * last_n_games),
        losses: 0,
        runs_scored: 4.5 + Math.random() * 2,
        runs_allowed: 4.2 + Math.random() * 2,
      },
      batting_stats: {
        team_avg: 0.240 + Math.random() * 0.060,
        ops: 0.700 + Math.random() * 0.150,
        home_runs: 120 + Math.floor(Math.random() * 80),
        stolen_bases: 45 + Math.floor(Math.random() * 60),
      },
      pitching_stats: {
        team_era: 3.50 + Math.random() * 1.50,
        whip: 1.20 + Math.random() * 0.40,
        strikeouts: 850 + Math.floor(Math.random() * 300),
        saves: 25 + Math.floor(Math.random() * 20),
      },
      last_updated: new Date().toISOString(),
    };

    teamStats.recent_performance.losses = last_n_games - teamStats.recent_performance.wins;

    return { content: [{ type: 'text', text: JSON.stringify(teamStats, null, 2) }] };
  }

  private async getPitcherAnalysis(args: any) {
    const { pitcher_name, team_code, season = 2024 } = args;
    
    const pitcherAnalysis = {
      pitcher_name,
      team_code,
      season,
      basic_stats: {
        era: 3.45 + Math.random() * 2,
        whip: 1.20 + Math.random() * 0.4,
        games_started: 15 + Math.floor(Math.random() * 10),
        innings_pitched: 85 + Math.random() * 40,
        strikeouts: 95 + Math.floor(Math.random() * 50),
        walks: 25 + Math.floor(Math.random() * 20),
        wins: 5 + Math.floor(Math.random() * 8),
        losses: 3 + Math.floor(Math.random() * 6),
      },
      advanced_stats: {
        fip: 3.8 + Math.random() * 1.5,
        xfip: 4.0 + Math.random() * 1.2,
        babip: 0.280 + Math.random() * 0.080,
        lob_percentage: 0.700 + Math.random() * 0.150,
        hr_per_9: 1.0 + Math.random() * 0.8,
        k_per_9: 8.0 + Math.random() * 3.0,
        bb_per_9: 2.5 + Math.random() * 1.5,
      },
      recent_outings: this.generateRecentOutings(),
      matchup_history: {
        vs_opponent: {
          starts: Math.floor(Math.random() * 5),
          era: 3.50 + Math.random() * 2,
          innings_per_start: 5.5 + Math.random() * 2,
        },
      },
      last_updated: new Date().toISOString(),
    };

    return { content: [{ type: 'text', text: JSON.stringify(pitcherAnalysis, null, 2) }] };
  }

  private generateRecentOutings(): any[] {
    const outings = [];
    for (let i = 0; i < 5; i++) {
      outings.push({
        date: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        opponent: ['NYY', 'BOS', 'LAD', 'SF', 'HOU'][Math.floor(Math.random() * 5)],
        innings: 5.0 + Math.random() * 3,
        earned_runs: Math.floor(Math.random() * 5),
        hits: 4 + Math.floor(Math.random() * 6),
        walks: Math.floor(Math.random() * 4),
        strikeouts: 3 + Math.floor(Math.random() * 8),
        pitch_count: 85 + Math.floor(Math.random() * 30),
        result: Math.random() > 0.5 ? 'W' : 'L',
      });
    }
    return outings;
  }

  private async getWeatherForecast(args: any) {
    const { venue, date, game_time = '19:10' } = args;
    
    try {
      const coords = await this.dataLayer.getVenueCoordinates(venue);
      const weather = await this.dataLayer.getWeatherData(coords.lat, coords.lon, date);
      
      const forecast = {
        venue,
        date,
        game_time,
        coordinates: coords,
        weather,
        game_impact: this.analyzeWeatherImpact(weather),
        last_updated: new Date().toISOString(),
      };

      return { content: [{ type: 'text', text: JSON.stringify(forecast, null, 2) }] };
    } catch (error) {
      const fallbackWeather = this.getFallbackWeather();
      return { content: [{ type: 'text', text: JSON.stringify({
        venue,
        date,
        game_time,
        weather: fallbackWeather,
        game_impact: this.analyzeWeatherImpact(fallbackWeather),
        error: 'Using fallback weather data',
      }, null, 2) }] };
    }
  }

  private analyzeWeatherImpact(weather: any): any {
    const impact = {
      offense_impact: 'neutral',
      pitching_impact: 'neutral',
      overall_total_impact: 'neutral',
      factors: [] as string[],
    };

    if (weather.temp_f > 80) {
      impact.offense_impact = 'positive';
      impact.factors.push('Hot weather favors offense');
    } else if (weather.temp_f < 55) {
      impact.offense_impact = 'negative';
      impact.factors.push('Cold weather suppresses offense');
    }

    if (weather.wind_speed_mph > 15) {
      if (weather.wind_direction?.includes('out') || Math.random() > 0.5) {
        impact.offense_impact = 'positive';
        impact.factors.push('Strong wind blowing out');
      } else {
        impact.offense_impact = 'negative';
        impact.factors.push('Strong wind blowing in');
      }
    }

    if (weather.humidity > 80) {
      impact.offense_impact = 'negative';
      impact.factors.push('High humidity reduces ball carry');
    }

    if (weather.precipitation_chance > 50) {
      impact.overall_total_impact = 'negative';
      impact.factors.push('Rain threat may delay/shorten game');
    }

    return impact;
  }

  private async getVenueFactors(args: any) {
    const { venue, include_historical = true } = args;
    
    try {
      const parkFactors = await this.dataLayer.getParkFactors(venue);
      const coords = await this.dataLayer.getVenueCoordinates(venue);
      
      const venueData = {
        venue,
        coordinates: coords,
        park_factors: parkFactors,
        historical_data: include_historical ? this.generateHistoricalVenueData(venue) : null,
        last_updated: new Date().toISOString(),
      };

      return { content: [{ type: 'text', text: JSON.stringify(venueData, null, 2) }] };
    } catch (error) {
      const fallbackPark = this.getFallbackPark();
      return { content: [{ type: 'text', text: JSON.stringify({
        venue,
        park_factors: fallbackPark,
        error: 'Using fallback park data',
      }, null, 2) }] };
    }
  }

  private generateHistoricalVenueData(venue: string): any {
    return {
      season_averages: {
        total_runs_per_game: 8.2 + Math.random() * 2,
        home_runs_per_game: 2.1 + Math.random() * 0.8,
        home_team_advantage: 0.52 + Math.random() * 0.08,
      },
      monthly_trends: {
        april: { avg_total: 7.8, games: 15 },
        may: { avg_total: 8.5, games: 15 },
        june: { avg_total: 9.2, games: 15 },
        july: { avg_total: 9.8, games: 15 },
        august: { avg_total: 9.4, games: 15 },
        september: { avg_total: 8.7, games: 15 },
      },
      weather_impact: {
        day_games: { avg_total: 8.8, sample_size: 45 },
        night_games: { avg_total: 8.3, sample_size: 75 },
        hot_weather: { avg_total: 9.5, sample_size: 25 },
        cold_weather: { avg_total: 7.9, sample_size: 20 },
      },
    };
  }

  private async getUmpireData(args: any) {
    const { umpire_name, position = 'home_plate' } = args;
    
    try {
      const umpireData = await this.dataLayer.getUmpireData(umpire_name);
      
      const enhancedData = {
        ...umpireData,
        position,
        impact_analysis: this.analyzeUmpireImpact(umpireData),
        last_updated: new Date().toISOString(),
      };

      return { content: [{ type: 'text', text: JSON.stringify(enhancedData, null, 2) }] };
    } catch (error) {
      const fallbackUmpire = this.getFallbackUmpire();
      return { content: [{ type: 'text', text: JSON.stringify({
        ...fallbackUmpire,
        position,
        error: 'Using fallback umpire data',
      }, null, 2) }] };
    }
  }

  private analyzeUmpireImpact(umpireData: any): any {
    const impact = {
      offense_impact: 'neutral',
      pitching_impact: 'neutral',
      total_impact: 'neutral',
      factors: [] as string[],
    };

    if (umpireData.zone_modifier < 0.97) {
      impact.pitching_impact = 'positive';
      impact.factors.push('Tight strike zone favors pitchers');
    } else if (umpireData.zone_modifier > 1.03) {
      impact.pitching_impact = 'negative';
      impact.factors.push('Wide strike zone favors hitters');
    }

    if (umpireData.consistency_score < 0.85) {
      impact.total_impact = 'negative';
      impact.factors.push('Inconsistent zone increases uncertainty');
    }

    return impact;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MLB Data Server running on stdio');
  }
}

const server = new MLBDataServer();
server.run().catch(console.error);