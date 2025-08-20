/**
 * V7B Standalone Markov Model
 * 
 * Pure Markov chain-based predictions using:
 * - Historical team scoring patterns (early/middle/late innings)
 * - Venue-specific run progression analysis 
 * - Weather impact on scoring transitions
 * - Probabilistic state-based predictions
 */

import { MLBMarkovChain } from '../markov/mlb-markov-chain';

interface V7BModelResult {
  prediction: 'Over' | 'Under';
  calculated_total: number;
  confidence: number;
  markov_breakdown: {
    team_patterns: {
      home_total: number;
      away_total: number;
      combined_base: number;
    };
    venue_adjustment: number;
    weather_multiplier: number;
    historical_confidence: number;
    data_quality_score: number;
  };
  risk_assessment: {
    explosion_probability: number;
    low_scoring_probability: number;
    variance_estimate: number;
  };
  pattern_details: {
    home_inning_pattern: number[];
    away_inning_pattern: number[];
    venue_historical_avg: number;
    similar_games_count: number;
  };
}

interface GameContext {
  home_team: string;
  away_team: string;
  venue: string;
  date: string;
  temperature?: number;
  weather_conditions?: string;
}

class V7BMarkovModel {
  private markovChain: MLBMarkovChain;
  private historicalPatterns: any;
  private realMarkovData: any = null;

  constructor() {
    this.markovChain = new MLBMarkovChain();
    this.loadRealHistoricalData();
    this.loadHistoricalPatterns();
    console.log('⛓️  V7B Standalone Markov Model initialized with real API data');
  }

  private loadRealHistoricalData(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataPath = path.join(process.cwd(), 'data', 'markov-patterns.json');
      
      if (fs.existsSync(dataPath)) {
        this.realMarkovData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log('✅ V7B: Loaded real Markov patterns from API data');
      } else {
        console.log('⚠️  V7B: No saved Markov data found, using embedded patterns');
      }
    } catch (error) {
      console.warn('⚠️  V7B: Error loading real Markov data:', error);
    }
  }

  private loadHistoricalPatterns(): void {
    // Load the patterns we learned from our 980-game analysis
    // Fallback simplified version with key patterns embedded
    this.historicalPatterns = {
      teams: {
        'Phillies': { early: 1.4, middle: 1.5, late: 1.6, total: 4.5, games: 28 },
        'Astros': { early: 1.4, middle: 1.9, late: 1.2, total: 5.5, games: 34 },
        'Braves': { early: 1.2, middle: 1.8, late: 1.4, total: 4.4, games: 34 },
        'Yankees': { early: 1.6, middle: 1.7, late: 1.5, total: 4.8, games: 32 },
        'Red Sox': { early: 1.8, middle: 1.9, late: 1.6, total: 5.3, games: 33 },
        'Orioles': { early: 1.6, middle: 1.5, late: 1.6, total: 4.7, games: 33 },
        'Dodgers': { early: 1.5, middle: 1.5, late: 1.5, total: 4.5, games: 32 },
        'Rockies': { early: 1.3, middle: 1.6, late: 1.4, total: 4.3, games: 29 },
        'Giants': { early: 1.4, middle: 1.4, late: 1.2, total: 4.0, games: 31 },
        'Padres': { early: 1.4, middle: 1.1, late: 1.6, total: 4.1, games: 29 },
        'Tigers': { early: 1.4, middle: 1.6, late: 1.6, total: 4.6, games: 34 },
        'Mariners': { early: 1.5, middle: 1.4, late: 1.7, total: 4.6, games: 28 },
        'DEFAULT': { early: 1.4, middle: 1.5, late: 1.5, total: 4.4, games: 15 }
      },
      venues: {
        'Citizens Bank Park': { avg: 9.11, adjustment: 0.61, games: 28 },
        'Coors Field': { avg: 12.16, adjustment: 3.66, games: 32 },
        'Petco Park': { avg: 8.24, adjustment: -0.26, games: 29 },
        'Truist Park': { avg: 9.32, adjustment: 0.82, games: 34 },
        'Fenway Park': { avg: 8.88, adjustment: 0.38, games: 33 },
        'Comerica Park': { avg: 10.24, adjustment: 1.74, games: 34 },
        'Wrigley Field': { avg: 8.9, adjustment: 0.4, games: 30 },
        'Angel Stadium': { avg: 8.1, adjustment: -0.4, games: 28 },
        'DEFAULT': { avg: 8.5, adjustment: 0.0, games: 10 }
      },
      weather: {
        hot: { multiplier: 1.0, confidence_boost: 0.05 },
        mild: { multiplier: 1.0, confidence_boost: 0.0 },
        cold: { multiplier: 0.95, confidence_boost: 0.02 }
      }
    };
  }

  private getTeamPattern(teamName: string): any {
    // First try to use real API data if available
    if (this.realMarkovData && this.realMarkovData.team_patterns) {
      for (const [realTeamName, realPattern] of this.realMarkovData.team_patterns) {
        if (teamName.includes(realTeamName) || realTeamName.includes(teamName)) {
          // Convert real API data format to our expected format
          return {
            early: realPattern.early_game_avg,
            middle: realPattern.middle_game_avg,
            late: realPattern.late_game_avg,
            total: realPattern.early_game_avg + realPattern.middle_game_avg + realPattern.late_game_avg,
            games: realPattern.total_games,
            venue_performance: realPattern.venue_performance,
            weather_performance: realPattern.weather_performance
          };
        }
      }
    }
    
    // Fallback to embedded patterns
    for (const [pattern, data] of Object.entries(this.historicalPatterns.teams)) {
      if (teamName.includes(pattern)) {
        return data;
      }
    }
    return this.historicalPatterns.teams['DEFAULT'];
  }

  private getVenuePattern(venue: string): any {
    // First try to use real API data if available
    if (this.realMarkovData && this.realMarkovData.venue_patterns) {
      for (const [realVenueName, realPattern] of this.realMarkovData.venue_patterns) {
        if (venue.includes(realVenueName) || realVenueName.includes(venue)) {
          // Convert real API data format to our expected format
          return {
            avg: realPattern.avg_total_runs,
            adjustment: realPattern.avg_total_runs - 8.5, // Relative to league average
            games: realPattern.total_games,
            weather_multipliers: realPattern.weather_multipliers
          };
        }
      }
    }
    
    // Fallback to embedded patterns
    for (const [pattern, data] of Object.entries(this.historicalPatterns.venues)) {
      if (venue.includes(pattern)) {
        return data;
      }
    }
    return this.historicalPatterns.venues['DEFAULT'];
  }

  private classifyWeather(temperature?: number): 'hot' | 'mild' | 'cold' {
    if (!temperature) return 'mild';
    if (temperature < 60) return 'cold';
    if (temperature > 80) return 'hot';
    return 'mild';
  }

  // Enhanced method to fetch live historical data for specific teams/venues
  async fetchLiveTeamData(teamName: string, daysBack: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      // Use the Markov chain's API fetching capability
      const games = await this.markovChain.fetchHistoricalGames(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      // Filter games for this specific team
      const teamGames = games.filter(game => 
        game.teams?.home?.team?.name?.includes(teamName) || 
        game.teams?.away?.team?.name?.includes(teamName)
      );
      
      if (teamGames.length > 0) {
        console.log(`📊 V7B: Fetched ${teamGames.length} recent games for ${teamName}`);
        return this.analyzeRecentTeamPerformance(teamGames, teamName);
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️  V7B: Error fetching live data for ${teamName}:`, error);
      return null;
    }
  }

  private analyzeRecentTeamPerformance(games: any[], teamName: string): any {
    let totalRuns = 0;
    let earlyRuns = 0;
    let midRuns = 0;
    let lateRuns = 0;
    let validGames = 0;

    games.forEach(game => {
      if (game.linescore && game.status.abstractGameState === 'Final') {
        const isHome = game.teams.home.team.name.includes(teamName);
        const innings = game.linescore.innings || [];
        
        let gameEarly = 0, gameMid = 0, gameLate = 0;
        
        innings.forEach((inning: any, idx: number) => {
          const inningNum = idx + 1;
          const runs = isHome ? (inning.home?.runs || 0) : (inning.away?.runs || 0);
          
          if (inningNum <= 3) gameEarly += runs;
          else if (inningNum <= 6) gameMid += runs;
          else gameLate += runs;
        });
        
        earlyRuns += gameEarly;
        midRuns += gameMid;
        lateRuns += gameLate;
        totalRuns += (gameEarly + gameMid + gameLate);
        validGames++;
      }
    });

    if (validGames === 0) return null;

    return {
      early: earlyRuns / validGames,
      middle: midRuns / validGames,
      late: lateRuns / validGames,
      total: totalRuns / validGames,
      games: validGames,
      recency_boost: 0.15 // Boost confidence for recent data
    };
  }

  private calculateExplosionProbability(context: GameContext, predictedTotal: number): number {
    let explosionProb = 0.05; // Base 5% chance

    // Venue factors
    if (context.venue.includes('Coors')) explosionProb += 0.15;
    else if (context.venue.includes('Citizens Bank')) explosionProb += 0.08;
    else if (context.venue.includes('Truist')) explosionProb += 0.06;

    // Weather factors
    const weather = this.classifyWeather(context.temperature);
    if (weather === 'hot' && context.temperature && context.temperature > 85) {
      explosionProb += 0.05;
    }

    // Team factors (based on our analysis)
    const explosiveTeams = ['Phillies', 'Yankees', 'Braves', 'Astros'];
    const homeExplosive = explosiveTeams.some(team => context.home_team.includes(team));
    const awayExplosive = explosiveTeams.some(team => context.away_team.includes(team));
    
    if (homeExplosive && awayExplosive) explosionProb += 0.08;
    else if (homeExplosive || awayExplosive) explosionProb += 0.04;

    // High predicted total increases explosion risk
    if (predictedTotal > 10) explosionProb += 0.05;
    if (predictedTotal > 12) explosionProb += 0.10;

    return Math.min(0.40, explosionProb);
  }

  private calculateVarianceEstimate(homePattern: any, awayPattern: any, venuePattern: any): number {
    // Estimate prediction variance based on data quality and patterns
    const dataQuality = Math.min(homePattern.games, awayPattern.games, venuePattern.games);
    const baseVariance = 2.5; // Base uncertainty in runs
    
    // Lower data quality = higher variance
    const qualityAdjustment = Math.max(0.5, dataQuality / 30);
    
    return baseVariance / qualityAdjustment;
  }

  predict(context: GameContext): V7BModelResult {
    // Get historical patterns (now enhanced with real API data)
    const homePattern = this.getTeamPattern(context.home_team);
    const awayPattern = this.getTeamPattern(context.away_team);
    const venuePattern = this.getVenuePattern(context.venue);
    const weather = this.classifyWeather(context.temperature);
    const weatherData = this.historicalPatterns.weather[weather];

    // Calculate base prediction from team patterns
    const homeTotal = homePattern.total;
    const awayTotal = awayPattern.total;
    const combinedBase = homeTotal + awayTotal;

    // Apply venue adjustment
    const venueAdjustment = venuePattern.adjustment;
    
    // Apply weather multiplier
    const weatherMultiplier = weatherData.multiplier;
    
    // Final prediction calculation
    let calculatedTotal = (combinedBase + venueAdjustment) * weatherMultiplier;

    // Try to use full Markov chain prediction if teams/venue data is sufficient
    let markovPrediction = null;
    if (homePattern.games > 20 && awayPattern.games > 20 && venuePattern.games > 15) {
      try {
        markovPrediction = this.markovChain.predictGameTotal(
          context.home_team, 
          context.away_team, 
          context.venue, 
          weather
        );
        
        if (markovPrediction && !markovPrediction.breakdown.error) {
          console.log(`🔗 V7B: Using enhanced Markov prediction for ${context.home_team} vs ${context.away_team}`);
          // Use Markov prediction with slight adjustment
          const markovTotal = markovPrediction.predicted_total;
          
          // Blend our calculation with Markov for best result (favor Markov for high-data teams)
          calculatedTotal = (calculatedTotal * 0.4) + (markovTotal * 0.6);
        }
      } catch (error) {
        console.warn('V7B: Markov chain prediction failed, using pattern-based approach');
      }
    }

    // Calculate confidence based on data quality and agreement
    const dataQualityScore = Math.min(homePattern.games, awayPattern.games, venuePattern.games) / 35;
    let baseConfidence = 35 + (dataQualityScore * 25) + (weatherData.confidence_boost * 100);
    
    // Boost confidence if we used real API data
    if (this.realMarkovData) {
      baseConfidence += 10; // Real data confidence boost
    }
    
    // Additional boost if we used full Markov prediction
    if (markovPrediction && !markovPrediction.breakdown.error) {
      baseConfidence += 15; // Enhanced Markov confidence boost
    }
    
    // Adjust confidence based on how "normal" the prediction is
    const normalRange = Math.abs(calculatedTotal - 8.5);
    const normalityAdjustment = Math.max(-5, -normalRange);
    
    const finalConfidence = Math.min(85, Math.max(25, baseConfidence + normalityAdjustment));

    // Risk assessments
    const explosionProb = this.calculateExplosionProbability(context, calculatedTotal);
    const lowScoringProb = calculatedTotal < 7 ? 0.15 : (calculatedTotal < 8 ? 0.08 : 0.03);
    const varianceEstimate = this.calculateVarianceEstimate(homePattern, awayPattern, venuePattern);

    // Determine Over/Under
    const prediction: 'Over' | 'Under' = calculatedTotal > 8.5 ? 'Over' : 'Under';

    // Pattern details
    const homeInningPattern = [homePattern.early, homePattern.middle, homePattern.late];
    const awayInningPattern = [awayPattern.early, awayPattern.middle, awayPattern.late];
    const similarGamesCount = Math.min(homePattern.games, awayPattern.games);

    return {
      prediction,
      calculated_total: Math.round(calculatedTotal * 100) / 100,
      confidence: Math.round(finalConfidence),
      markov_breakdown: {
        team_patterns: {
          home_total: homeTotal,
          away_total: awayTotal,
          combined_base: combinedBase
        },
        venue_adjustment: venueAdjustment,
        weather_multiplier: weatherMultiplier,
        historical_confidence: Math.round(baseConfidence),
        data_quality_score: Math.round(dataQualityScore * 100) / 100
      },
      risk_assessment: {
        explosion_probability: Math.round(explosionProb * 100),
        low_scoring_probability: Math.round(lowScoringProb * 100),
        variance_estimate: Math.round(varianceEstimate * 100) / 100
      },
      pattern_details: {
        home_inning_pattern: homeInningPattern.map(x => Math.round(x * 100) / 100),
        away_inning_pattern: awayInningPattern.map(x => Math.round(x * 100) / 100),
        venue_historical_avg: venuePattern.avg,
        similar_games_count: similarGamesCount
      }
    };
  }
}

export { V7BMarkovModel, V7BModelResult };