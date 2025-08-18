import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Data Processing Unit Tests', () => {
  describe('Statistical Calculations', () => {
    test('should calculate ERA correctly', () => {
      const calculateERA = (earnedRuns: number, inningsPitched: number): number => {
        return (earnedRuns * 9) / inningsPitched;
      };

      expect(calculateERA(27, 180)).toBeCloseTo(1.35, 2);
      expect(calculateERA(54, 162)).toBeCloseTo(3.00, 2);
      expect(calculateERA(72, 180)).toBeCloseTo(3.60, 2);
      expect(calculateERA(0, 9)).toBe(0);
    });

    test('should calculate WHIP correctly', () => {
      const calculateWHIP = (walks: number, hits: number, inningsPitched: number): number => {
        return (walks + hits) / inningsPitched;
      };

      expect(calculateWHIP(36, 144, 180)).toBeCloseTo(1.00, 2);
      expect(calculateWHIP(54, 162, 180)).toBeCloseTo(1.20, 2);
      expect(calculateWHIP(72, 180, 180)).toBeCloseTo(1.40, 2);
    });

    test('should calculate OPS correctly', () => {
      const calculateOBP = (hits: number, walks: number, hbp: number, atBats: number, sacFlies: number): number => {
        return (hits + walks + hbp) / (atBats + walks + hbp + sacFlies);
      };

      const calculateSLG = (totalBases: number, atBats: number): number => {
        return totalBases / atBats;
      };

      const calculateOPS = (obp: number, slg: number): number => {
        return obp + slg;
      };

      const obp = calculateOBP(150, 60, 10, 500, 5);
      const slg = calculateSLG(240, 500);
      const ops = calculateOPS(obp, slg);

      expect(obp).toBeCloseTo(0.383, 3);
      expect(slg).toBeCloseTo(0.480, 3);
      expect(ops).toBeCloseTo(0.863, 3);
    });

    test('should calculate wOBA correctly', () => {
      const calculateWOBA = (
        walks: number,
        hbp: number,
        singles: number,
        doubles: number,
        triples: number,
        homeRuns: number,
        plateAppearances: number
      ): number => {
        // wOBA weights (2024 season)
        const wBB = 0.705;
        const wHBP = 0.72;
        const w1B = 0.885;
        const w2B = 1.255;
        const w3B = 1.605;
        const wHR = 2.065;

        const numerator = 
          walks * wBB + 
          hbp * wHBP + 
          singles * w1B + 
          doubles * w2B + 
          triples * w3B + 
          homeRuns * wHR;

        return numerator / plateAppearances;
      };

      const woba = calculateWOBA(60, 8, 120, 25, 3, 20, 600);
      expect(woba).toBeGreaterThan(0.300);
      expect(woba).toBeLessThan(0.400);
    });

    test('should handle edge cases in statistical calculations', () => {
      const calculateERA = (earnedRuns: number, inningsPitched: number): number => {
        if (inningsPitched === 0) return Infinity;
        return (earnedRuns * 9) / inningsPitched;
      };

      const calculateAverage = (hits: number, atBats: number): number => {
        if (atBats === 0) return 0;
        return hits / atBats;
      };

      expect(calculateERA(5, 0)).toBe(Infinity);
      expect(calculateAverage(0, 0)).toBe(0);
      expect(calculateAverage(10, 0)).toBe(0);
      expect(isNaN(calculateERA(0, 0))).toBe(false);
    });
  });

  describe('Park Factor Calculations', () => {
    test('should calculate park factors correctly', () => {
      const calculateParkFactor = (
        homeRuns: number,
        homeGames: number,
        roadRuns: number,
        roadGames: number
      ): number => {
        const homeRunsPerGame = homeRuns / homeGames;
        const roadRunsPerGame = roadRuns / roadGames;
        
        if (roadRunsPerGame === 0) return 1.0;
        return homeRunsPerGame / roadRunsPerGame;
      };

      // Coors Field-like (high altitude, hitter-friendly)
      expect(calculateParkFactor(450, 81, 350, 81)).toBeCloseTo(1.286, 3);
      
      // Pitcher-friendly park
      expect(calculateParkFactor(300, 81, 400, 81)).toBeCloseTo(0.75, 2);
      
      // Neutral park
      expect(calculateParkFactor(375, 81, 375, 81)).toBe(1.0);
    });

    test('should adjust for altitude effects', () => {
      const altitudeAdjustment = (altitude: number): number => {
        // Altitude effect on ball carry (simplified model)
        const baseAltitude = 1000; // feet
        const effectPerFoot = 0.0001;
        
        if (altitude <= baseAltitude) return 1.0;
        return 1 + (altitude - baseAltitude) * effectPerFoot;
      };

      expect(altitudeAdjustment(5280)).toBeCloseTo(1.428, 3); // Coors Field
      expect(altitudeAdjustment(1000)).toBe(1.0); // Sea level baseline
      expect(altitudeAdjustment(500)).toBe(1.0); // Below baseline
    });

    test('should calculate wind effect on ball flight', () => {
      const windEffect = (windSpeed: number, windDirection: string): number => {
        const windDirectionMultiplier = {
          'out': 1.0,
          'in': -1.0,
          'cross': 0.3,
          'calm': 0.0,
        };

        const multiplier = windDirectionMultiplier[windDirection.toLowerCase() as keyof typeof windDirectionMultiplier] || 0;
        
        // Effect is proportional to wind speed
        const baseEffect = windSpeed * 0.02; // 2% per mph
        return 1 + (baseEffect * multiplier);
      };

      expect(windEffect(20, 'out')).toBeCloseTo(1.4, 1);
      expect(windEffect(20, 'in')).toBeCloseTo(0.6, 1);
      expect(windEffect(20, 'cross')).toBeCloseTo(1.12, 2);
      expect(windEffect(0, 'calm')).toBe(1.0);
    });
  });

  describe('Weather Impact Calculations', () => {
    test('should calculate temperature effects on hitting', () => {
      const temperatureEffect = (tempF: number): number => {
        // Hot weather helps offense, cold hurts it
        const optimalTemp = 75;
        const effect = (tempF - optimalTemp) * 0.005;
        return 1 + Math.max(-0.3, Math.min(0.3, effect));
      };

      expect(temperatureEffect(95)).toBeCloseTo(1.1, 1); // Hot day
      expect(temperatureEffect(45)).toBeCloseTo(0.85, 2); // Cold day
      expect(temperatureEffect(75)).toBe(1.0); // Optimal temperature
    });

    test('should calculate humidity effects', () => {
      const humidityEffect = (humidity: number): number => {
        // High humidity reduces ball carry
        if (humidity > 80) return 0.95;
        if (humidity > 60) return 0.98;
        if (humidity < 30) return 1.03;
        if (humidity < 45) return 1.01;
        return 1.0;
      };

      expect(humidityEffect(90)).toBe(0.95);
      expect(humidityEffect(70)).toBe(0.98);
      expect(humidityEffect(55)).toBe(1.0);
      expect(humidityEffect(25)).toBe(1.03);
    });

    test('should handle extreme weather conditions', () => {
      const extremeWeatherCheck = (temp: number, wind: number, precip: number): boolean => {
        if (temp < 35 || temp > 110) return true; // Extreme temperature
        if (wind > 35) return true; // High wind
        if (precip > 0.5) return true; // Heavy precipitation
        return false;
      };

      expect(extremeWeatherCheck(30, 10, 0)).toBe(true); // Too cold
      expect(extremeWeatherCheck(115, 10, 0)).toBe(true); // Too hot
      expect(extremeWeatherCheck(75, 40, 0)).toBe(true); // Too windy
      expect(extremeWeatherCheck(75, 10, 1.0)).toBe(true); // Too much rain
      expect(extremeWeatherCheck(75, 10, 0)).toBe(false); // Normal conditions
    });
  });

  describe('Market Analysis Calculations', () => {
    test('should calculate implied probability from odds', () => {
      const impliedProbability = (americanOdds: number): number => {
        if (americanOdds > 0) {
          return 100 / (americanOdds + 100);
        } else {
          return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
        }
      };

      expect(impliedProbability(-110)).toBeCloseTo(0.524, 3);
      expect(impliedProbability(110)).toBeCloseTo(0.476, 3);
      expect(impliedProbability(-150)).toBeCloseTo(0.600, 3);
      expect(impliedProbability(150)).toBeCloseTo(0.400, 3);
    });

    test('should calculate vigorish (bookmaker edge)', () => {
      const calculateVigorish = (overOdds: number, underOdds: number): number => {
        const overProb = Math.abs(overOdds) / (Math.abs(overOdds) + 100);
        const underProb = Math.abs(underOdds) / (Math.abs(underOdds) + 100);
        return (overProb + underProb) - 1;
      };

      expect(calculateVigorish(-110, -110)).toBeCloseTo(0.048, 3);
      expect(calculateVigorish(-105, -115)).toBeCloseTo(0.049, 3);
      expect(calculateVigorish(-120, -100)).toBeCloseTo(0.045, 3);
    });

    test('should detect line movement patterns', () => {
      const analyzeLineMovement = (
        openingLine: number,
        currentLine: number,
        timeElapsed: number
      ): { direction: string; magnitude: number; velocity: number } => {
        const movement = currentLine - openingLine;
        const magnitude = Math.abs(movement);
        const velocity = magnitude / timeElapsed; // points per hour

        return {
          direction: movement > 0 ? 'up' : movement < 0 ? 'down' : 'stable',
          magnitude,
          velocity,
        };
      };

      const movement1 = analyzeLineMovement(8.5, 9.0, 4); // 4 hours
      expect(movement1.direction).toBe('up');
      expect(movement1.magnitude).toBe(0.5);
      expect(movement1.velocity).toBe(0.125);

      const movement2 = analyzeLineMovement(9.0, 8.5, 2); // 2 hours
      expect(movement2.direction).toBe('down');
      expect(movement2.magnitude).toBe(0.5);
      expect(movement2.velocity).toBe(0.25);
    });

    test('should calculate Kelly Criterion bet sizing', () => {
      const kellyBetSize = (
        winProbability: number,
        odds: number,
        bankroll: number
      ): number => {
        const b = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
        const p = winProbability;
        const q = 1 - p;
        
        const kellyFraction = (b * p - q) / b;
        const conservativeKelly = kellyFraction * 0.25; // Quarter Kelly for safety
        
        return Math.max(0, Math.min(bankroll * 0.05, bankroll * conservativeKelly));
      };

      const betSize1 = kellyBetSize(0.55, 110, 1000); // 55% chance, +110 odds
      expect(betSize1).toBeGreaterThan(0);
      expect(betSize1).toBeLessThanOrEqual(50); // Max 5% of bankroll

      const betSize2 = kellyBetSize(0.45, 110, 1000); // Negative expected value
      expect(betSize2).toBe(0);
    });
  });

  describe('Data Validation and Sanitization', () => {
    test('should validate numeric ranges', () => {
      const validateNumericRange = (
        value: number,
        min: number,
        max: number,
        fieldName: string
      ): { valid: boolean; error?: string } => {
        if (isNaN(value)) {
          return { valid: false, error: `${fieldName} must be a number` };
        }
        if (value < min || value > max) {
          return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
        }
        return { valid: true };
      };

      expect(validateNumericRange(3.50, 0, 15, 'ERA')).toEqual({ valid: true });
      expect(validateNumericRange(-1, 0, 15, 'ERA')).toEqual({ 
        valid: false, 
        error: 'ERA must be between 0 and 15' 
      });
      expect(validateNumericRange(NaN, 0, 1, 'Confidence')).toEqual({ 
        valid: false, 
        error: 'Confidence must be a number' 
      });
    });

    test('should sanitize string inputs', () => {
      const sanitizeTeamName = (teamName: string): string => {
        return teamName
          .trim()
          .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .substring(0, 50); // Limit length
      };

      expect(sanitizeTeamName('  Los Angeles Angels  ')).toBe('Los Angeles Angels');
      expect(sanitizeTeamName('Team@#$%Name')).toBe('TeamName');
      expect(sanitizeTeamName('Team   With   Spaces')).toBe('Team With Spaces');
      expect(sanitizeTeamName('A'.repeat(100))).toHaveLength(50);
    });

    test('should validate date formats', () => {
      const validateDate = (dateString: string): { valid: boolean; date?: Date; error?: string } => {
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            return { valid: false, error: 'Invalid date format' };
          }
          
          const now = new Date();
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
          
          if (date < oneYearAgo || date > oneYearFromNow) {
            return { valid: false, error: 'Date must be within one year of current date' };
          }
          
          return { valid: true, date };
        } catch (error) {
          return { valid: false, error: 'Invalid date format' };
        }
      };

      expect(validateDate('2024-07-15')).toMatchObject({ valid: true });
      expect(validateDate('2024-07-15T19:07:00Z')).toMatchObject({ valid: true });
      expect(validateDate('invalid-date')).toMatchObject({ valid: false });
      expect(validateDate('2020-01-01')).toMatchObject({ valid: false }); // Too old
    });
  });

  describe('Performance Optimizations', () => {
    test('should memoize expensive calculations', () => {
      const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
        const cache = new Map();
        return ((...args: any[]) => {
          const key = JSON.stringify(args);
          if (cache.has(key)) {
            return cache.get(key);
          }
          const result = fn(...args);
          cache.set(key, result);
          return result;
        }) as T;
      };

      let callCount = 0;
      const expensiveCalculation = memoize((x: number, y: number): number => {
        callCount++;
        return x * y + Math.sqrt(x) * Math.log(y);
      });

      const result1 = expensiveCalculation(10, 20);
      const result2 = expensiveCalculation(10, 20); // Should use cache
      const result3 = expensiveCalculation(15, 25); // Different params, should calculate

      expect(result1).toBe(result2);
      expect(callCount).toBe(2); // Only 2 actual calculations
      expect(result3).not.toBe(result1);
    });

    test('should batch API-like operations', () => {
      const batchProcessor = <T, R>(
        processor: (item: T) => R,
        batchSize: number = 10
      ) => {
        return (items: T[]): R[] => {
          const results: R[] = [];
          
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = batch.map(processor);
            results.push(...batchResults);
          }
          
          return results;
        };
      };

      const processGame = (gameId: number) => ({ gameId, processed: true });
      const batchGameProcessor = batchProcessor(processGame, 3);
      
      const gameIds = [1, 2, 3, 4, 5, 6, 7];
      const results = batchGameProcessor(gameIds);
      
      expect(results).toHaveLength(7);
      expect(results[0]).toEqual({ gameId: 1, processed: true });
      expect(results[6]).toEqual({ gameId: 7, processed: true });
    });

    test('should implement efficient data structures', () => {
      class LRUCache<K, V> {
        private capacity: number;
        private cache: Map<K, V>;
        
        constructor(capacity: number) {
          this.capacity = capacity;
          this.cache = new Map();
        }
        
        get(key: K): V | undefined {
          if (this.cache.has(key)) {
            const value = this.cache.get(key)!;
            this.cache.delete(key);
            this.cache.set(key, value); // Move to end
            return value;
          }
          return undefined;
        }
        
        set(key: K, value: V): void {
          if (this.cache.has(key)) {
            this.cache.delete(key);
          } else if (this.cache.size >= this.capacity) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }
          this.cache.set(key, value);
        }
        
        size(): number {
          return this.cache.size;
        }
      }

      const cache = new LRUCache<string, number>(3);
      
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.size()).toBe(3);
      
      cache.set('d', 4); // Should evict 'a'
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('d')).toBe(4);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle division by zero gracefully', () => {
      const safeCalculateAverage = (numerator: number, denominator: number): number => {
        if (denominator === 0) return 0;
        if (!isFinite(numerator) || !isFinite(denominator)) return 0;
        return numerator / denominator;
      };

      expect(safeCalculateAverage(10, 0)).toBe(0);
      expect(safeCalculateAverage(10, 5)).toBe(2);
      expect(safeCalculateAverage(Infinity, 5)).toBe(0);
      expect(safeCalculateAverage(10, Infinity)).toBe(0);
    });

    test('should provide fallback values for missing data', () => {
      const getValueWithFallback = <T>(
        data: Record<string, any>,
        path: string,
        fallback: T
      ): T => {
        const keys = path.split('.');
        let current = data;
        
        for (const key of keys) {
          if (current === null || current === undefined || !(key in current)) {
            return fallback;
          }
          current = current[key];
        }
        
        return current !== null && current !== undefined ? current : fallback;
      };

      const playerData = {
        stats: {
          batting: {
            average: 0.285,
          },
        },
      };

      expect(getValueWithFallback(playerData, 'stats.batting.average', 0.250)).toBe(0.285);
      expect(getValueWithFallback(playerData, 'stats.pitching.era', 4.50)).toBe(4.50);
      expect(getValueWithFallback(playerData, 'stats.fielding.errors', 0)).toBe(0);
    });

    test('should retry failed operations with exponential backoff', async () => {
      const retryWithBackoff = async <T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 100
      ): Promise<T> => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            if (attempt === maxRetries) {
              throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        throw new Error('Max retries exceeded');
      };

      let attemptCount = 0;
      const flakyOperation = async (): Promise<string> => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Operation failed');
        }
        return 'Success';
      };

      const result = await retryWithBackoff(flakyOperation, 3, 10);
      expect(result).toBe('Success');
      expect(attemptCount).toBe(3);
    });
  });
});