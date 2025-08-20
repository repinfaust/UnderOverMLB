/**
 * MLB Markov Chain Analysis System
 * 
 * Implements Markov chains for MLB over/under predictions using:
 * 1. Team-specific scoring patterns (early vs late game tendencies)
 * 2. Venue-specific run progression patterns  
 * 3. Weather/situational state transitions
 * 
 * Uses real MLB API data for historical pattern learning
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// State definitions for Markov chain
interface GameState {
  inning: number;
  total_runs: number;
  home_score: number;
  away_score: number;
  inning_half: 'top' | 'bottom';
  situation: 'early' | 'middle' | 'late';
  weather_factor: 'cold' | 'mild' | 'hot';
  venue_type: 'hitters' | 'pitchers' | 'neutral';
}

interface TransitionData {
  from_state: string;
  to_state: string;
  runs_added: number;
  probability: number;
  count: number;
}

interface TeamPattern {
  team_name: string;
  early_game_avg: number; // Innings 1-3
  middle_game_avg: number; // Innings 4-6  
  late_game_avg: number; // Innings 7-9
  total_games: number;
  venue_performance: { [venue: string]: number };
  weather_performance: { [weather: string]: number };
}

interface VenuePattern {
  venue_name: string;
  avg_total_runs: number;
  inning_progression: number[]; // Expected runs by inning
  weather_multipliers: { [weather: string]: number };
  total_games: number;
}

class MLBMarkovChain {
  private transitionMatrix: Map<string, Map<string, number>> = new Map();
  private teamPatterns: Map<string, TeamPattern> = new Map();
  private venuePatterns: Map<string, VenuePattern> = new Map();
  private historicalData: any[] = [];

  constructor() {
    console.log('🔗 Initializing MLB Markov Chain Analysis System');
  }

  // Fetch historical game data from MLB API
  async fetchHistoricalGames(startDate: string, endDate: string): Promise<any[]> {
    console.log(`📡 Fetching historical games from ${startDate} to ${endDate}`);
    
    const games: any[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Iterate through date range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
          params: {
            sportId: 1,
            date: dateStr,
            hydrate: 'linescore,team,venue,weather'
          }
        });

        if (response.data.dates?.[0]?.games) {
          games.push(...response.data.dates[0].games);
        }

        // Rate limiting
        await this.sleep(100);
      } catch (error: any) {
        console.error(`Error fetching games for ${dateStr}:`, error.message);
      }
    }

    console.log(`✅ Fetched ${games.length} historical games`);
    return games;
  }

  // Convert game to state sequence for Markov analysis
  private gameToStateSequence(game: any): GameState[] {
    const states: GameState[] = [];
    
    if (!game.linescore || game.status.abstractGameState !== 'Final') {
      return states;
    }

    const venue = game.venue?.name || 'Unknown';
    const venueType = this.classifyVenue(venue);
    
    // Process each inning
    for (let inning = 1; inning <= 9; inning++) {
      const inningData = game.linescore.innings?.find((i: any) => i.num === inning);
      
      if (inningData) {
        // Top half
        const topState: GameState = {
          inning: inning,
          total_runs: this.getRunsThroughInning(game.linescore.innings, inning, 'top'),
          home_score: inningData.home?.runs || 0,
          away_score: inningData.away?.runs || 0,
          inning_half: 'top',
          situation: this.classifyGameSituation(inning),
          weather_factor: this.classifyWeather(game.weather),
          venue_type: venueType
        };
        states.push(topState);

        // Bottom half
        const bottomState: GameState = {
          inning: inning,
          total_runs: this.getRunsThroughInning(game.linescore.innings, inning, 'bottom'),
          home_score: inningData.home?.runs || 0,
          away_score: inningData.away?.runs || 0,
          inning_half: 'bottom', 
          situation: this.classifyGameSituation(inning),
          weather_factor: this.classifyWeather(game.weather),
          venue_type: venueType
        };
        states.push(bottomState);
      }
    }

    return states;
  }

  // Build transition matrix from historical data
  private buildTransitionMatrix(games: any[]): void {
    console.log('🔄 Building Markov transition matrix...');
    
    const transitions: Map<string, Map<string, number>> = new Map();
    
    for (const game of games) {
      const stateSequence = this.gameToStateSequence(game);
      
      // Process sequential state transitions
      for (let i = 0; i < stateSequence.length - 1; i++) {
        const fromState = this.stateToKey(stateSequence[i]);
        const toState = this.stateToKey(stateSequence[i + 1]);
        
        if (!transitions.has(fromState)) {
          transitions.set(fromState, new Map());
        }
        
        const fromTransitions = transitions.get(fromState)!;
        const currentCount = fromTransitions.get(toState) || 0;
        fromTransitions.set(toState, currentCount + 1);
      }
    }

    // Convert counts to probabilities
    for (const [fromState, toStates] of transitions) {
      const totalTransitions = Array.from(toStates.values()).reduce((sum, count) => sum + count, 0);
      
      const probabilities = new Map<string, number>();
      for (const [toState, count] of toStates) {
        probabilities.set(toState, count / totalTransitions);
      }
      
      this.transitionMatrix.set(fromState, probabilities);
    }

    console.log(`✅ Built transition matrix with ${transitions.size} states`);
  }

  // Analyze team-specific scoring patterns
  private analyzeTeamPatterns(games: any[]): void {
    console.log('📊 Analyzing team-specific scoring patterns...');
    
    const teamStats: Map<string, any> = new Map();

    for (const game of games) {
      if (!game.linescore || game.status.abstractGameState !== 'Final') continue;

      const homeTeam = game.teams.home.team.name;
      const awayTeam = game.teams.away.team.name;
      const venue = game.venue?.name || 'Unknown';
      const weather = this.classifyWeather(game.weather);

      // Initialize team stats if not exists
      [homeTeam, awayTeam].forEach(team => {
        if (!teamStats.has(team)) {
          teamStats.set(team, {
            early_runs: [],
            middle_runs: [],
            late_runs: [],
            venue_performance: new Map(),
            weather_performance: new Map(),
            total_games: 0
          });
        }
      });

      // Calculate inning-by-inning scoring
      const innings = game.linescore.innings || [];
      let homeEarly = 0, homeMid = 0, homeLate = 0;
      let awayEarly = 0, awayMid = 0, awayLate = 0;

      innings.forEach((inning: any, idx: number) => {
        const inningNum = idx + 1;
        const homeRuns = inning.home?.runs || 0;
        const awayRuns = inning.away?.runs || 0;

        if (inningNum <= 3) {
          homeEarly += homeRuns;
          awayEarly += awayRuns;
        } else if (inningNum <= 6) {
          homeMid += homeRuns;
          awayMid += awayRuns;
        } else {
          homeLate += homeRuns;
          awayLate += awayRuns;
        }
      });

      // Update team statistics
      const homeStats = teamStats.get(homeTeam)!;
      const awayStats = teamStats.get(awayTeam)!;

      homeStats.early_runs.push(homeEarly);
      homeStats.middle_runs.push(homeMid);
      homeStats.late_runs.push(homeLate);
      homeStats.total_games++;

      awayStats.early_runs.push(awayEarly);
      awayStats.middle_runs.push(awayMid);
      awayStats.late_runs.push(awayLate);
      awayStats.total_games++;

      // Venue performance
      const homeVenuePerf = homeStats.venue_performance.get(venue) || [];
      homeVenuePerf.push(homeEarly + homeMid + homeLate);
      homeStats.venue_performance.set(venue, homeVenuePerf);

      const awayVenuePerf = awayStats.venue_performance.get(venue) || [];
      awayVenuePerf.push(awayEarly + awayMid + awayLate);
      awayStats.venue_performance.set(venue, awayVenuePerf);

      // Weather performance
      const homeWeatherPerf = homeStats.weather_performance.get(weather) || [];
      homeWeatherPerf.push(homeEarly + homeMid + homeLate);
      homeStats.weather_performance.set(weather, homeWeatherPerf);

      const awayWeatherPerf = awayStats.weather_performance.get(weather) || [];
      awayWeatherPerf.push(awayEarly + awayMid + awayLate);
      awayStats.weather_performance.set(weather, awayWeatherPerf);
    }

    // Convert to TeamPattern objects
    for (const [teamName, stats] of teamStats) {
      const pattern: TeamPattern = {
        team_name: teamName,
        early_game_avg: this.average(stats.early_runs),
        middle_game_avg: this.average(stats.middle_runs),
        late_game_avg: this.average(stats.late_runs),
        total_games: stats.total_games,
        venue_performance: {},
        weather_performance: {}
      };

      // Calculate venue averages
      for (const [venue, runs] of stats.venue_performance) {
        pattern.venue_performance[venue] = this.average(runs);
      }

      // Calculate weather averages
      for (const [weather, runs] of stats.weather_performance) {
        pattern.weather_performance[weather] = this.average(runs);
      }

      this.teamPatterns.set(teamName, pattern);
    }

    console.log(`✅ Analyzed patterns for ${teamStats.size} teams`);
  }

  // Analyze venue-specific run progression patterns
  private analyzeVenuePatterns(games: any[]): void {
    console.log('🏟️  Analyzing venue-specific patterns...');
    
    const venueStats: Map<string, any> = new Map();

    for (const game of games) {
      if (!game.linescore || game.status.abstractGameState !== 'Final') continue;

      const venue = game.venue?.name || 'Unknown';
      const weather = this.classifyWeather(game.weather);
      const totalRuns = game.linescore.teams.home.runs + game.linescore.teams.away.runs;

      if (!venueStats.has(venue)) {
        venueStats.set(venue, {
          total_runs: [],
          inning_runs: Array(9).fill(0).map(() => []),
          weather_totals: new Map(),
          total_games: 0
        });
      }

      const stats = venueStats.get(venue)!;
      stats.total_runs.push(totalRuns);
      stats.total_games++;

      // Inning-by-inning analysis
      const innings = game.linescore.innings || [];
      innings.forEach((inning: any, idx: number) => {
        if (idx < 9) {
          const inningRuns = (inning.home?.runs || 0) + (inning.away?.runs || 0);
          stats.inning_runs[idx].push(inningRuns);
        }
      });

      // Weather impact
      const weatherTotals = stats.weather_totals.get(weather) || [];
      weatherTotals.push(totalRuns);
      stats.weather_totals.set(weather, weatherTotals);
    }

    // Convert to VenuePattern objects
    for (const [venueName, stats] of venueStats) {
      const pattern: VenuePattern = {
        venue_name: venueName,
        avg_total_runs: this.average(stats.total_runs),
        inning_progression: stats.inning_runs.map((runs: number[]) => this.average(runs)),
        weather_multipliers: {},
        total_games: stats.total_games
      };

      // Calculate weather multipliers (relative to venue average)
      const venueAvg = pattern.avg_total_runs;
      for (const [weather, runs] of stats.weather_totals) {
        const weatherAvg = this.average(runs);
        pattern.weather_multipliers[weather] = weatherAvg / venueAvg;
      }

      this.venuePatterns.set(venueName, pattern);
    }

    console.log(`✅ Analyzed patterns for ${venueStats.size} venues`);
  }

  // Predict game total using Markov chain analysis
  predictGameTotal(homeTeam: string, awayTeam: string, venue: string, weather?: string): {
    predicted_total: number;
    confidence: number;
    breakdown: any;
  } {
    const homePattern = this.teamPatterns.get(homeTeam);
    const awayPattern = this.teamPatterns.get(awayTeam);
    const venuePattern = this.venuePatterns.get(venue);
    
    if (!homePattern || !awayPattern || !venuePattern) {
      return {
        predicted_total: 8.5,
        confidence: 0.3,
        breakdown: { error: 'Insufficient historical data' }
      };
    }

    // Team-based prediction
    const homeTotal = homePattern.early_game_avg + homePattern.middle_game_avg + homePattern.late_game_avg;
    const awayTotal = awayPattern.early_game_avg + awayPattern.middle_game_avg + awayPattern.late_game_avg;
    const teamBasedTotal = homeTotal + awayTotal;

    // Venue adjustment
    const venueAdjustment = venuePattern.avg_total_runs - 8.5; // Relative to league average
    
    // Weather adjustment
    let weatherMultiplier = 1.0;
    if (weather && venuePattern.weather_multipliers[weather]) {
      weatherMultiplier = venuePattern.weather_multipliers[weather];
    }

    // Final prediction
    const predictedTotal = (teamBasedTotal + venueAdjustment) * weatherMultiplier;

    // Calculate confidence based on data quality
    const dataQuality = Math.min(homePattern.total_games, awayPattern.total_games, venuePattern.total_games);
    const confidence = Math.min(0.85, dataQuality / 100);

    return {
      predicted_total: Math.round(predictedTotal * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      breakdown: {
        team_based_total: teamBasedTotal,
        venue_adjustment: venueAdjustment,
        weather_multiplier: weatherMultiplier,
        home_pattern: {
          early: homePattern.early_game_avg,
          middle: homePattern.middle_game_avg,
          late: homePattern.late_game_avg
        },
        away_pattern: {
          early: awayPattern.early_game_avg,
          middle: awayPattern.middle_game_avg,
          late: awayPattern.late_game_avg
        },
        venue_avg: venuePattern.avg_total_runs,
        data_quality: dataQuality
      }
    };
  }

  // Utility functions
  private stateToKey(state: GameState): string {
    return `${state.inning}_${state.inning_half}_${state.situation}_${state.weather_factor}_${state.venue_type}`;
  }

  private getRunsThroughInning(innings: any[], inning: number, half: 'top' | 'bottom'): number {
    let total = 0;
    for (let i = 0; i < inning; i++) {
      if (innings[i]) {
        total += (innings[i].home?.runs || 0) + (innings[i].away?.runs || 0);
        if (half === 'top' && i === inning - 1) {
          total -= (innings[i].home?.runs || 0); // Don't count bottom half of current inning
        }
      }
    }
    return total;
  }

  private classifyGameSituation(inning: number): 'early' | 'middle' | 'late' {
    if (inning <= 3) return 'early';
    if (inning <= 6) return 'middle';
    return 'late';
  }

  private classifyWeather(weather: any): 'cold' | 'mild' | 'hot' {
    const temp = weather?.temperature || 70;
    if (temp < 60) return 'cold';
    if (temp > 80) return 'hot';
    return 'mild';
  }

  private classifyVenue(venue: string): 'hitters' | 'pitchers' | 'neutral' {
    const hitterParks = ['Coors Field', 'Fenway Park', 'Yankee Stadium', 'Citizens Bank Park'];
    const pitcherParks = ['Petco Park', 'Marlins Park', 'Kauffman Stadium', 'Comerica Park'];
    
    if (hitterParks.some(park => venue.includes(park))) return 'hitters';
    if (pitcherParks.some(park => venue.includes(park))) return 'pitchers';
    return 'neutral';
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Save patterns to file
  async savePatterns(): Promise<void> {
    const data = {
      team_patterns: Array.from(this.teamPatterns.entries()),
      venue_patterns: Array.from(this.venuePatterns.entries()),
      transition_matrix_size: this.transitionMatrix.size,
      timestamp: new Date().toISOString()
    };

    const filePath = path.join(process.cwd(), 'data', 'markov-patterns.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved patterns to ${filePath}`);
  }

  // Main analysis pipeline
  async runFullAnalysis(startDate: string, endDate: string): Promise<void> {
    console.log('🚀 Starting MLB Markov Chain Analysis');
    
    // Fetch historical data
    const games = await this.fetchHistoricalGames(startDate, endDate);
    this.historicalData = games;

    // Build analysis components
    this.buildTransitionMatrix(games);
    this.analyzeTeamPatterns(games);
    this.analyzeVenuePatterns(games);

    // Save results
    await this.savePatterns();

    console.log('✅ Markov chain analysis complete');
    console.log(`📊 Processed ${games.length} games`);
    console.log(`🏈 ${this.teamPatterns.size} team patterns`);
    console.log(`🏟️  ${this.venuePatterns.size} venue patterns`);
  }
}

export { MLBMarkovChain, GameState, TeamPattern, VenuePattern };