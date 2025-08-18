/**
 * Data Validation and Health Check Module
 * 
 * CRITICAL: This module implements hard stops for data integrity failures.
 * NO fallbacks to dummy/sample data are permitted in production.
 */

import axios from 'axios';
import { config } from '../config/environment';

export interface DataSourceHealth {
  source: string;
  healthy: boolean;
  lastChecked: Date;
  responseTime?: number;
  error?: string;
  dataAge?: number;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

export interface ValidationResult {
  allHealthy: boolean;
  sources: DataSourceHealth[];
  criticalFailures: string[];
  warnings: string[];
}

export class DataValidator {
  private readonly MAX_WEATHER_AGE_MS = 3600000; // 1 hour
  private readonly MAX_ODDS_AGE_MS = 900000; // 15 minutes
  private readonly MAX_GAME_DATA_AGE_MS = 21600000; // 6 hours

  /**
   * MANDATORY: Validate all data sources before predictions
   * Throws error if any critical validation fails
   */
  async validateAllDataSources(): Promise<ValidationResult> {
    console.log('🔍 CRITICAL: Validating all data sources...');
    
    const healthChecks = await Promise.allSettled([
      this.validateMLBAPI(),
      this.validateWeatherAPI(),
      this.validateOddsAPI(),
      this.validateSystemTime()
    ]);

    const sources: DataSourceHealth[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];

    healthChecks.forEach((result, index) => {
      const sourceNames = ['MLB API', 'Weather API', 'Odds API', 'System Time'];
      const sourceName = sourceNames[index];

      if (result.status === 'fulfilled') {
        sources.push(result.value);
        if (!result.value.healthy) {
          criticalFailures.push(`${sourceName}: ${result.value.error}`);
        }
      } else {
        const failedSource: DataSourceHealth = {
          source: sourceName,
          healthy: false,
          lastChecked: new Date(),
          error: result.reason?.message || 'Unknown error'
        };
        sources.push(failedSource);
        criticalFailures.push(`${sourceName}: ${result.reason?.message || 'Validation failed'}`);
      }
    });

    const allHealthy = criticalFailures.length === 0;

    if (!allHealthy) {
      const errorMessage = `CRITICAL DATA VALIDATION FAILURES:\n${criticalFailures.join('\n')}`;
      console.error('❌', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('✅ All data sources validated successfully');
    return { allHealthy, sources, criticalFailures, warnings };
  }

  /**
   * Validate MLB Stats API connectivity and data freshness
   */
  async validateMLBAPI(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    
    try {
      // Test API connectivity with today's schedule
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}`,
        { timeout: 10000 }
      );

      const responseTime = Date.now() - startTime;

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.data.dates || response.data.dates.length === 0) {
        return {
          source: 'MLB API',
          healthy: false,
          lastChecked: new Date(),
          responseTime,
          error: `No games found for ${today} - verify date or season status`
        };
      }

      // Validate data structure
      const games = response.data.dates[0]?.games || [];
      if (games.length > 0) {
        const sampleGame = games[0];
        if (!sampleGame.teams?.home?.team?.name || !sampleGame.teams?.away?.team?.name) {
          throw new Error('Invalid game data structure - missing team information');
        }
      }

      return {
        source: 'MLB API',
        healthy: true,
        lastChecked: new Date(),
        responseTime
      };

    } catch (error: any) {
      return {
        source: 'MLB API',
        healthy: false,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        error: `MLB API validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate Weather API authentication and data freshness
   */
  async validateWeatherAPI(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    
    try {
      if (!config.apis.weatherApiKey) {
        throw new Error('Weather API key not configured');
      }

      // Test API with a known location
      const response = await axios.get(
        'https://api.openweathermap.org/data/2.5/weather',
        {
          params: {
            q: 'Oakland,CA,US',
            appid: config.apis.weatherApiKey,
            units: 'imperial'
          },
          timeout: 8000
        }
      );

      const responseTime = Date.now() - startTime;

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Validate data freshness
      const dataTimestamp = response.data.dt * 1000; // Convert to milliseconds
      const dataAge = Date.now() - dataTimestamp;
      
      if (dataAge > this.MAX_WEATHER_AGE_MS) {
        throw new Error(`Weather data too old: ${Math.round(dataAge / 60000)} minutes (max: ${this.MAX_WEATHER_AGE_MS / 60000})`);
      }

      // Validate required fields
      if (!response.data.main?.temp || !response.data.wind?.speed) {
        throw new Error('Invalid weather data structure - missing required fields');
      }

      return {
        source: 'Weather API',
        healthy: true,
        lastChecked: new Date(),
        responseTime,
        dataAge
      };

    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          source: 'Weather API',
          healthy: false,
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          error: 'AUTHENTICATION FAILED: Invalid Weather API key'
        };
      }

      return {
        source: 'Weather API',
        healthy: false,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        error: `Weather API validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate Odds API authentication and data freshness
   */
  async validateOddsAPI(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    
    try {
      if (!config.apis.oddsApiKey) {
        throw new Error('Odds API key not configured');
      }

      // Test API connectivity
      const response = await axios.get(
        'https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/',
        {
          params: {
            apiKey: config.apis.oddsApiKey,
            regions: 'us',
            markets: 'totals',
            oddsFormat: 'american'
          },
          timeout: 15000
        }
      );

      const responseTime = Date.now() - startTime;

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Check rate limits from headers
      const remainingRequests = parseInt(response.headers['x-requests-remaining'] || '0');
      const rateLimit = {
        remaining: remainingRequests,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Approximate daily reset
      };

      if (remainingRequests < 10) {
        console.warn(`⚠️ Low odds API requests remaining: ${remainingRequests}`);
      }

      // Validate data exists and structure
      if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('No odds data available - verify MLB season is active');
      }

      // Check data freshness for first game
      const sampleGame = response.data[0];
      if (sampleGame.commence_time) {
        const gameTime = new Date(sampleGame.commence_time);
        const timeDiff = Math.abs(Date.now() - gameTime.getTime());
        
        // If games are more than 7 days old/future, likely stale data
        if (timeDiff > 7 * 24 * 60 * 60 * 1000) {
          console.warn(`⚠️ Odds data may be stale - sample game time: ${gameTime.toISOString()}`);
        }
      }

      return {
        source: 'Odds API',
        healthy: true,
        lastChecked: new Date(),
        responseTime,
        rateLimit
      };

    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          source: 'Odds API',
          healthy: false,
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          error: 'AUTHENTICATION FAILED: Invalid Odds API key'
        };
      }

      if (error.response?.status === 429) {
        return {
          source: 'Odds API',
          healthy: false,
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          error: 'RATE LIMIT EXCEEDED: Odds API requests exhausted'
        };
      }

      return {
        source: 'Odds API',
        healthy: false,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        error: `Odds API validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate system time accuracy
   */
  async validateSystemTime(): Promise<DataSourceHealth> {
    try {
      // Check if system time is reasonable (not way off)
      const now = new Date();
      const currentYear = now.getFullYear();
      
      if (currentYear < 2024 || currentYear > 2030) {
        throw new Error(`System time appears incorrect: year ${currentYear}`);
      }

      // Verify timezone handling
      const utcTime = now.toISOString();
      const localTime = now.toString();
      
      if (!utcTime || !localTime) {
        throw new Error('Unable to generate proper timestamps');
      }

      return {
        source: 'System Time',
        healthy: true,
        lastChecked: new Date()
      };

    } catch (error: any) {
      return {
        source: 'System Time',
        healthy: false,
        lastChecked: new Date(),
        error: `System time validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate data is not stale beyond acceptable limits
   */
  isDataStale(dataTimestamp: number, maxAgeMs: number): boolean {
    const dataAge = Date.now() - dataTimestamp;
    return dataAge > maxAgeMs;
  }

  /**
   * Create validation error for stale data
   */
  createDataStaleError(dataType: string, ageMs: number, maxAgeMs: number): Error {
    const ageMinutes = Math.round(ageMs / 60000);
    const maxAgeMinutes = Math.round(maxAgeMs / 60000);
    
    return new Error(
      `FATAL: ${dataType} data is stale (${ageMinutes} minutes old, max allowed: ${maxAgeMinutes} minutes) - STOPPING predictions`
    );
  }

  /**
   * Fast connectivity check for critical path
   */
  async quickHealthCheck(): Promise<boolean> {
    try {
      const checks = await Promise.allSettled([
        axios.get('https://statsapi.mlb.com/api/v1/teams', { timeout: 5000 }),
        axios.get(`https://api.openweathermap.org/data/2.5/weather?q=Oakland,CA&appid=${config.apis.weatherApiKey}`, { timeout: 5000 })
      ]);

      const mlbHealthy = checks[0].status === 'fulfilled' && (checks[0].value as any).status === 200;
      const weatherHealthy = checks[1].status === 'fulfilled' && (checks[1].value as any).status === 200;

      return mlbHealthy && weatherHealthy;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const dataValidator = new DataValidator();

/**
 * Convenience function for mandatory validation before predictions
 */
export async function validateBeforePrediction(): Promise<ValidationResult> {
  console.log('🔒 MANDATORY: Validating data sources before prediction...');
  return await dataValidator.validateAllDataSources();
}