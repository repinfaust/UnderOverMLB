// Data Integration Layer - Streamlined for OpenWeatherMap, The Odds API, and MLB Stats API
import axios, { AxiosInstance } from 'axios';

interface APIConfig {
  baseURL: string;
  apiKey?: string;
  rateLimit?: number;
  timeout?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class DataIntegrationLayer {
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimiters: Map<string, number[]> = new Map();
  
  private apis: {
    mlbStats: AxiosInstance;
    oddsAPI: AxiosInstance;
    weather: AxiosInstance;
  };

  constructor(private config: {
    oddsAPI: APIConfig;
    weatherAPI: APIConfig;
  }) {
    this.apis = {
      mlbStats: axios.create({
        baseURL: 'https://statsapi.mlb.com/api/v1',
        timeout: 10000,
      }),
      oddsAPI: axios.create({
        baseURL: config.oddsAPI.baseURL,
        timeout: 15000,
        headers: {
          'X-RapidAPI-Key': config.oddsAPI.apiKey,
        },
      }),
      weather: axios.create({
        baseURL: config.weatherAPI.baseURL,
        timeout: 8000,
        params: {
          appid: config.weatherAPI.apiKey,
        },
      }),
    };

    this.setupRateLimiting();
  }

  private setupRateLimiting() {
    // Initialize rate limiters for each API
    Object.keys(this.apis).forEach(api => {
      this.rateLimiters.set(api, []);
    });
  }

  private async checkRateLimit(apiName: string, limitPerMinute: number = 60): Promise<void> {
    const now = Date.now();
    const calls = this.rateLimiters.get(apiName) || [];
    
    // Remove calls older than 1 minute
    const recentCalls = calls.filter(timestamp => now - timestamp < 60000);
    
    if (recentCalls.length >= limitPerMinute) {
      const oldestCall = Math.min(...recentCalls);
      const waitTime = 60000 - (now - oldestCall);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    recentCalls.push(now);
    this.rateLimiters.set(apiName, recentCalls);
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache(key: string, data: any, ttlMinutes: number = 30): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
    });
  }

  // MLB Statistics Integration
  async getMLBGameData(gameId: string): Promise<any> {
    const cacheKey = this.getCacheKey('mlb_game', { gameId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit('mlbStats', 100);

    try {
      const response = await this.apis.mlbStats.get(`/game/${gameId}/linescore`);
      const gameData = this.transformMLBGameData(response.data);
      this.setCache(cacheKey, gameData, 5); // 5 minute cache for live games
      return gameData;
    } catch (error) {
      console.error('Error fetching MLB game data:', error);
      throw new Error(`Failed to fetch game data: ${error}`);
    }
  }

  async getTeamStats(teamId: number, season: number = 2024): Promise<any> {
    const cacheKey = this.getCacheKey('team_stats', { teamId, season });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit('mlbStats', 100);

    try {
      const [roster, stats] = await Promise.all([
        this.apis.mlbStats.get(`/teams/${teamId}/roster`),
        this.apis.mlbStats.get(`/teams/${teamId}/stats?season=${season}&group=hitting,pitching`)
      ]);

      const teamData = this.transformTeamStats(roster.data, stats.data);
      this.setCache(cacheKey, teamData, 60); // 1 hour cache
      return teamData;
    } catch (error) {
      console.error('Error fetching team stats:', error);
      throw new Error(`Failed to fetch team stats: ${error}`);
    }
  }

  async getPitcherStats(playerId: number, season: number = 2024): Promise<any> {
    const cacheKey = this.getCacheKey('pitcher_stats', { playerId, season });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit('mlbStats', 100);

    try {
      const response = await this.apis.mlbStats.get(
        `/people/${playerId}/stats?stats=season&season=${season}&group=pitching`
      );
      
      const pitcherData = this.transformPitcherStats(response.data);
      this.setCache(cacheKey, pitcherData, 120); // 2 hour cache
      return pitcherData;
    } catch (error) {
      console.error('Error fetching pitcher stats:', error);
      throw new Error(`Failed to fetch pitcher stats: ${error}`);
    }
  }

  // Get today's MLB schedule
  async getTodaysGames(date?: string): Promise<any> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const cacheKey = this.getCacheKey('daily_schedule', { targetDate });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit('mlbStats', 100);

    try {
      const response = await this.apis.mlbStats.get(`/schedule?sportId=1&date=${targetDate}`);
      const scheduleData = this.transformScheduleData(response.data);
      this.setCache(cacheKey, scheduleData, 30); // 30 minute cache
      return scheduleData;
    } catch (error) {
      console.error('Error fetching schedule:', error);
      throw new Error(`Failed to fetch schedule: ${error}`);
    }
  }

  // Odds and Betting Data Integration (The Odds API)
  async getGameOdds(sport: string = 'baseball_mlb', markets: string = 'totals'): Promise<any> {
    const cacheKey = this.getCacheKey('game_odds', { sport, markets });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit('oddsAPI', 500); // The Odds API limit

    try {
      const response = await this.apis.oddsAPI.get('/sports/baseball_mlb/odds', {
        params: {
          regions: 'us',
          markets: markets,
          oddsFormat: 'american',
          dateFormat: 'iso',
        },
      });

      const oddsData = this.transformOddsData(response.data);
      this.setCache(cacheKey, oddsData, 10); // 10 minute cache for odds
      return oddsData;
    } catch (error) {
      console.error('Error fetching odds data:', error);
      throw new Error(`Failed to fetch odds: ${error}`);
    }
  }

  // Weather Data Integration (OpenWeatherMap)
  async getWeatherData(lat: number, lon: number, date?: string): Promise<any> {
    const cacheKey = this.getCacheKey('weather', { lat, lon, date });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit('weather', 1000); // OpenWeatherMap limit

    try {
      let weatherData;
      
      if (date && new Date(date) < new Date()) {
        // Historical weather - OpenWeatherMap has limited free historical data
        // For development, we'll use current weather as fallback
        const response = await this.apis.weather.get('/weather', {
          params: { lat, lon },
        });
        weatherData = this.transformCurrentWeather(response.data);
        weatherData.note = 'Using current weather as historical data not available in free tier';
      } else {
        // Current weather
        const response = await this.apis.weather.get('/weather', {
          params: { lat, lon },
        });
        weatherData = this.transformCurrentWeather(response.data);
      }

      this.setCache(cacheKey, weatherData, date ? 1440 : 30); // 24h for historical, 30min for current
      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error(`Failed to fetch weather: ${error}`);
    }
  }

  async getVenueCoordinates(venueName: string): Promise<{ lat: number; lon: number }> {
    // Hardcoded MLB venue coordinates for reliability
    const venueCoords: Record<string, { lat: number; lon: number }> = {
      'Yankee Stadium': { lat: 40.8296, lon: -73.9262 },
      'Fenway Park': { lat: 42.3467, lon: -71.0972 },
      'Wrigley Field': { lat: 41.9484, lon: -87.6553 },
      'Dodger Stadium': { lat: 34.0739, lon: -118.2400 },
      'Oracle Park': { lat: 37.7786, lon: -122.3893 },
      'Coors Field': { lat: 39.7559, lon: -104.9942 },
      'Minute Maid Park': { lat: 29.7570, lon: -95.3551 },
      'Tropicana Field': { lat: 27.7682, lon: -82.6534 },
      'Rogers Centre': { lat: 43.6414, lon: -79.3894 },
      'loanDepot park': { lat: 25.7781, lon: -80.2197 },
      'Nationals Park': { lat: 38.8730, lon: -77.0074 },
      'Citizens Bank Park': { lat: 39.9061, lon: -75.1665 },
      'PNC Park': { lat: 40.4469, lon: -80.0057 },
      'Great American Ball Park': { lat: 39.0974, lon: -84.5061 },
      'American Family Field': { lat: 43.0280, lon: -87.9712 },
      'Guaranteed Rate Field': { lat: 41.8300, lon: -87.6338 },
      'Progressive Field': { lat: 41.4958, lon: -81.6852 },
      'Comerica Park': { lat: 42.3391, lon: -83.0485 },
      'Target Field': { lat: 44.9817, lon: -93.2775 },
      'Kauffman Stadium': { lat: 39.0517, lon: -94.4803 },
      'Globe Life Field': { lat: 32.7472, lon: -97.0847 },
      'Angel Stadium': { lat: 33.8003, lon: -117.8827 },
      'Oakland Coliseum': { lat: 37.7516, lon: -122.2005 },
      'T-Mobile Park': { lat: 47.5914, lon: -122.3326 },
      'Petco Park': { lat: 32.7073, lon: -117.1566 },
      'Chase Field': { lat: 33.4453, lon: -112.0667 },
      'Citi Field': { lat: 40.7571, lon: -73.8458 },
      'Truist Park': { lat: 33.8901, lon: -84.4677 },
      'Oriole Park at Camden Yards': { lat: 39.2840, lon: -76.6218 },
      'Busch Stadium': { lat: 38.6226, lon: -90.1928 },
    };

    return venueCoords[venueName] || { lat: 39.7391, lon: -104.9847 }; // Default to Denver
  }

  // Data Transformation Methods
  private transformMLBGameData(rawData: any): any {
    return {
      gameId: rawData.gamePk,
      gameDate: rawData.gameDate,
      teams: {
        home: {
          id: rawData.teams?.home?.team?.id,
          name: rawData.teams?.home?.team?.name,
          score: rawData.teams?.home?.runs || 0,
        },
        away: {
          id: rawData.teams?.away?.team?.id,
          name: rawData.teams?.away?.team?.name,
          score: rawData.teams?.away?.runs || 0,
        },
      },
      status: rawData.status?.detailedState,
      inning: rawData.currentInning,
      venue: rawData.venue?.name,
    };
  }

  private transformScheduleData(rawData: any): any {
    const games = rawData.dates?.[0]?.games || [];
    
    return games.map((game: any) => ({
      gameId: game.gamePk,
      gameDate: game.gameDate,
      status: game.status.detailedState,
      teams: {
        home: {
          id: game.teams.home.team.id,
          name: game.teams.home.team.name,
          abbreviation: game.teams.home.team.abbreviation,
        },
        away: {
          id: game.teams.away.team.id,
          name: game.teams.away.team.name,
          abbreviation: game.teams.away.team.abbreviation,
        },
      },
      venue: {
        id: game.venue.id,
        name: game.venue.name,
      },
      gameType: game.gameType,
      season: game.season,
    }));
  }

  private transformTeamStats(roster: any, stats: any): any {
    const hittingStats = stats.stats?.find((s: any) => s.group?.displayName === 'hitting');
    const pitchingStats = stats.stats?.find((s: any) => s.group?.displayName === 'pitching');

    return {
      roster: roster.roster?.map((player: any) => ({
        id: player.person.id,
        name: player.person.fullName,
        position: player.position.abbreviation,
        jerseyNumber: player.jerseyNumber,
      })),
      hitting: hittingStats?.splits?.[0]?.stat || {},
      pitching: pitchingStats?.splits?.[0]?.stat || {},
    };
  }

  private transformPitcherStats(rawData: any): any {
    const seasonStats = rawData.stats?.[0]?.splits?.[0]?.stat;
    
    return {
      playerId: rawData.id,
      season: rawData.stats?.[0]?.season,
      stats: {
        era: parseFloat(seasonStats?.era || '0'),
        whip: parseFloat(seasonStats?.whip || '0'),
        strikeouts: parseInt(seasonStats?.strikeOuts || '0'),
        walks: parseInt(seasonStats?.baseOnBalls || '0'),
        inningsPitched: parseFloat(seasonStats?.inningsPitched || '0'),
        gamesStarted: parseInt(seasonStats?.gamesStarted || '0'),
        wins: parseInt(seasonStats?.wins || '0'),
        losses: parseInt(seasonStats?.losses || '0'),
      },
    };
  }

  private transformOddsData(rawData: any[]): any {
    return rawData.map(game => ({
      gameId: game.id,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      commenceTime: game.commence_time,
      bookmakers: game.bookmakers?.map((book: any) => ({
        name: book.title,
        markets: book.markets?.map((market: any) => ({
          key: market.key,
          outcomes: market.outcomes?.map((outcome: any) => ({
            name: outcome.name,
            price: outcome.price,
            point: outcome.point,
          })),
        })),
      })),
    }));
  }

  private transformCurrentWeather(rawData: any): any {
    const current = rawData;
    
    return {
      temp_f: Math.round((current.main.temp - 273.15) * 9/5 + 32),
      humidity: current.main.humidity,
      wind_speed_mph: Math.round(current.wind?.speed * 2.237 || 0),
      wind_direction: this.getWindDirection(current.wind?.deg || 0),
      conditions: current.weather?.[0]?.description || 'Unknown',
      pressure: current.main.pressure,
      visibility: current.visibility || 10000,
      cloudiness: current.clouds?.all || 0,
      precipitation_chance: 0, // Current weather doesn't include probability
      is_dome: false, // We'll determine this based on venue
    };
  }

  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  // Park Factors and Venue Data
  async getParkFactors(venueName: string): Promise<any> {
    const cacheKey = this.getCacheKey('park_factors', { venueName });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Park factors are relatively static, so we can use hardcoded data
    const parkFactors = this.getStaticParkFactors();
    const venueData = parkFactors[venueName] || parkFactors['Generic'];
    
    this.setCache(cacheKey, venueData, 1440); // 24 hour cache
    return venueData;
  }

  private getStaticParkFactors(): Record<string, any> {
    return {
      'Coors Field': {
        park_factor: 1.15,
        runs_factor: 1.20,
        hr_factor: 1.25,
        foul_territory: 'small',
        altitude: 5200,
        dimensions: { lf: 347, cf: 415, rf: 350 },
        dome: false,
      },
      'Yankee Stadium': {
        park_factor: 1.05,
        runs_factor: 1.08,
        hr_factor: 1.12,
        foul_territory: 'small',
        altitude: 55,
        dimensions: { lf: 318, cf: 408, rf: 314 },
        dome: false,
      },
      'Fenway Park': {
        park_factor: 1.02,
        runs_factor: 1.04,
        hr_factor: 1.18,
        foul_territory: 'small',
        altitude: 20,
        dimensions: { lf: 310, cf: 420, rf: 302 },
        dome: false,
      },
      'Tropicana Field': {
        park_factor: 0.95,
        runs_factor: 0.92,
        hr_factor: 0.88,
        foul_territory: 'large',
        altitude: 10,
        dimensions: { lf: 315, cf: 404, rf: 322 },
        dome: true,
      },
      'Minute Maid Park': {
        park_factor: 1.01,
        runs_factor: 1.03,
        hr_factor: 1.08,
        foul_territory: 'medium',
        altitude: 22,
        dimensions: { lf: 315, cf: 436, rf: 326 },
        dome: true,
      },
      'Chase Field': {
        park_factor: 0.98,
        runs_factor: 0.96,
        hr_factor: 0.94,
        foul_territory: 'medium',
        altitude: 1100,
        dimensions: { lf: 330, cf: 407, rf: 334 },
        dome: true,
      },
      'Rogers Centre': {
        park_factor: 1.00,
        runs_factor: 1.02,
        hr_factor: 1.05,
        foul_territory: 'medium',
        altitude: 568,
        dimensions: { lf: 328, cf: 400, rf: 328 },
        dome: true,
      },
      'Generic': {
        park_factor: 1.00,
        runs_factor: 1.00,
        hr_factor: 1.00,
        foul_territory: 'medium',
        altitude: 500,
        dimensions: { lf: 330, cf: 400, rf: 330 },
        dome: false,
      },
    };
  }

  // Umpire Data Integration (simplified mock data)
  async getUmpireData(umpireName: string): Promise<any> {
    const cacheKey = this.getCacheKey('umpire_data', { umpireName });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Generate consistent umpire data based on name
    const umpireData = this.generateUmpireData(umpireName);
    this.setCache(cacheKey, umpireData, 720); // 12 hour cache
    return umpireData;
  }

  private generateUmpireData(umpireName: string): any {
    // Generate consistent but realistic umpire tendencies
    const hash = this.simpleHash(umpireName);
    const consistency = 0.85 + (hash % 15) / 100; // 0.85-1.00
    const strikeCalls = 0.88 + (hash % 10) / 100; // 0.88-0.98
    const zoneSize = hash % 3; // 0=tight, 1=average, 2=wide
    
    return {
      name: umpireName,
      consistency_score: Number(consistency.toFixed(2)),
      strike_call_percentage: Number(strikeCalls.toFixed(3)),
      zone_modifier: zoneSize === 0 ? 0.95 : zoneSize === 1 ? 1.0 : 1.05,
      zone_description: ['tight', 'average', 'wide'][zoneSize],
      games_analyzed: 45 + (hash % 30),
      tendencies: {
        favors_pitchers: zoneSize === 0,
        consistent_zone: consistency > 0.92,
        high_strike_calls: strikeCalls > 0.95,
      },
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Utility Methods
  async healthCheck(): Promise<Record<string, boolean>> {
    const checks: Record<string, boolean> = {};
    
    try {
      await this.apis.mlbStats.get('/schedule?sportId=1&date=2024-06-01', { timeout: 5000 });
      checks.mlbStats = true;
    } catch {
      checks.mlbStats = false;
    }

    try {
      if (this.config.oddsAPI.apiKey) {
        await this.apis.oddsAPI.get('/sports', { timeout: 5000 });
        checks.oddsAPI = true;
      }
    } catch {
      checks.oddsAPI = false;
    }

    try {
      if (this.config.weatherAPI.apiKey) {
        await this.apis.weather.get('/weather?q=New York', { timeout: 5000 });
        checks.weather = true;
      }
    } catch {
      checks.weather = false;
    }

    return checks;
  }

  getCacheStats(): any {
    const stats = {
      totalEntries: this.cache.size,
      memoryUsage: 0,
      oldestEntry: null as string | null,
      newestEntry: null as string | null,
    };

    let oldestTime = Date.now();
    let newestTime = 0;

    for (const [key, entry] of this.cache.entries()) {
      stats.memoryUsage += JSON.stringify(entry.data).length;
      
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        stats.oldestEntry = key;
      }
      
      if (entry.timestamp > newestTime) {
        newestTime = entry.timestamp;
        stats.newestEntry = key;
      }
    }

    return stats;
  }

  clearCache(pattern?: string): number {
    let cleared = 0;
    
    if (pattern) {
      for (const [key] of this.cache.entries()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          cleared++;
        }
      }
    } else {
      cleared = this.cache.size;
      this.cache.clear();
    }
    
    return cleared;
  }

  // Batch Data Fetching for Performance
  async batchFetchGameData(gameIds: string[]): Promise<any[]> {
    const results = await Promise.allSettled(
      gameIds.map(id => this.getMLBGameData(id))
    );
    
    return results.map((result, index) => ({
      gameId: gameIds[index],
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));
  }

  async batchFetchWeatherData(venues: string[], date?: string): Promise<any[]> {
    const coordPromises = venues.map(venue => this.getVenueCoordinates(venue));
    const coordinates = await Promise.allSettled(coordPromises);
    
    const weatherPromises = coordinates.map((coordResult, index) => {
      if (coordResult.status === 'fulfilled') {
        const { lat, lon } = coordResult.value;
        return this.getWeatherData(lat, lon, date);
      }
      return Promise.reject(new Error(`Failed to get coordinates for ${venues[index]}`));
    });
    
    const results = await Promise.allSettled(weatherPromises);
    
    return results.map((result, index) => ({
      venue: venues[index],
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));
  }
}

// Configuration factory for different environments
export class DataIntegrationConfig {
  static development(): any {
    return {
      oddsAPI: {
        baseURL: 'https://api.the-odds-api.com/v4',
        apiKey: process.env.ODDS_API_KEY || 'demo_key',
        rateLimit: 500,
      },
      weatherAPI: {
        baseURL: 'https://api.openweathermap.org/data/2.5',
        apiKey: process.env.WEATHER_API_KEY || 'demo_key',
        rateLimit: 1000,
      },
    };
  }

  static production(): any {
    return {
      ...this.development(),
      // Production would have higher rate limits if you upgrade plans
      oddsAPI: {
        ...this.development().oddsAPI,
        rateLimit: 500, // Free tier limit
      },
    };
  }

  static testing(): any {
    return {
      oddsAPI: {
        baseURL: 'http://localhost:3001/mock-odds',
        rateLimit: 1000,
      },
      weatherAPI: {
        baseURL: 'http://localhost:3002/mock-weather',
        rateLimit: 1000,
      },
    };
  }
}