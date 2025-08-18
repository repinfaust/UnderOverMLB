import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  MLBStatsValidator,
  OddsAPIValidator,
  WeatherAPIValidator,
} from '../lib/validators/api-validators.js';
import {
  MLBStatsGameData,
  OddsAPIData,
  WeatherAPIData,
} from '../types/api-validation.js';

describe('API Data Validation Tests', () => {
  let mlbValidator: MLBStatsValidator;
  let oddsValidator: OddsAPIValidator;
  let weatherValidator: WeatherAPIValidator;

  beforeEach(() => {
    mlbValidator = new MLBStatsValidator();
    oddsValidator = new OddsAPIValidator();
    weatherValidator = new WeatherAPIValidator();
  });

  describe('MLB Stats API Validation', () => {
    const validMLBData: MLBStatsGameData = {
      gamePk: 746789,
      gameDate: '2024-07-15T19:07:00Z',
      teams: {
        away: {
          team: {
            id: 108,
            name: 'Los Angeles Angels',
          },
          score: 4,
        },
        home: {
          team: {
            id: 133,
            name: 'Oakland Athletics',
          },
          score: 7,
        },
      },
      status: {
        abstractGameState: 'Final',
        codedGameState: 'F',
        detailedState: 'Final',
      },
      venue: {
        id: 10,
        name: 'Oakland Coliseum',
      },
      linescore: {
        currentInning: 9,
        inningState: 'Bottom',
        innings: [
          {
            num: 1,
            ordinalNum: '1st',
            home: { runs: 2, hits: 3, errors: 0 },
            away: { runs: 1, hits: 2, errors: 0 },
          },
        ],
      },
      weather: {
        condition: 'Partly Cloudy',
        temp: '72°F',
        wind: '10 mph, Out To RF',
      },
    };

    test('should validate correct MLB data', () => {
      const result = mlbValidator.validate(validMLBData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.apiSource).toBe('MLB Stats API');
    });

    test('should reject missing required fields', () => {
      const invalidData = { ...validMLBData };
      delete (invalidData as any).gamePk;

      const result = mlbValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'gamePk')).toBe(true);
      expect(result.errors.some(e => e.severity === 'critical')).toBe(true);
    });

    test('should reject invalid game ID format', () => {
      const invalidData = {
        ...validMLBData,
        gamePk: -123,
      };

      const result = mlbValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'gamePk')).toBe(true);
    });

    test('should reject invalid date format', () => {
      const invalidData = {
        ...validMLBData,
        gameDate: 'not-a-date',
      };

      const result = mlbValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'gameDate')).toBe(true);
    });

    test('should detect same team playing itself', () => {
      const invalidData = {
        ...validMLBData,
        teams: {
          away: {
            team: { id: 108, name: 'Los Angeles Angels' },
          },
          home: {
            team: { id: 108, name: 'Los Angeles Angels' }, // Same ID
          },
        },
      };

      const result = mlbValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('same'))).toBe(true);
    });

    test('should require scores for final games', () => {
      const invalidData = {
        ...validMLBData,
        status: { abstractGameState: 'Final', codedGameState: 'F', detailedState: 'Final' },
        teams: {
          away: { team: { id: 108, name: 'Los Angeles Angels' } }, // No score
          home: { team: { id: 133, name: 'Oakland Athletics' } }, // No score
        },
      };

      const result = mlbValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Final games must have scores'))).toBe(true);
    });

    test('should generate warnings for unusual game IDs', () => {
      const dataWithUnusualId = {
        ...validMLBData,
        gamePk: 12345, // Too short
      };

      const result = mlbValidator.validate(dataWithUnusualId);
      expect(result.warnings.some(w => w.field === 'gamePk')).toBe(true);
    });

    test('should validate negative scores', () => {
      const invalidData = {
        ...validMLBData,
        teams: {
          ...validMLBData.teams,
          home: {
            ...validMLBData.teams.home,
            score: -1,
          },
        },
      };

      const result = mlbValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'teams.home.score')).toBe(true);
    });
  });

  describe('Odds API Validation', () => {
    const validOddsData: OddsAPIData = {
      id: 'abcd1234567890',
      sport_key: 'baseball_mlb',
      sport_title: 'MLB',
      commence_time: '2024-07-15T19:07:00Z',
      home_team: 'Oakland Athletics',
      away_team: 'Los Angeles Angels',
      bookmakers: [
        {
          key: 'draftkings',
          title: 'DraftKings',
          last_update: '2024-07-15T18:00:00Z',
          markets: [
            {
              key: 'totals',
              last_update: '2024-07-15T18:00:00Z',
              outcomes: [
                {
                  name: 'Over',
                  price: -110,
                  point: 8.5,
                },
                {
                  name: 'Under',
                  price: -110,
                  point: 8.5,
                },
              ],
            },
          ],
        },
      ],
    };

    test('should validate correct odds data', () => {
      const result = oddsValidator.validate(validOddsData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.apiSource).toBe('Odds API');
    });

    test('should reject missing totals market', () => {
      const invalidData = {
        ...validOddsData,
        bookmakers: [
          {
            ...validOddsData.bookmakers[0],
            markets: [
              {
                key: 'h2h', // Not totals
                last_update: '2024-07-15T18:00:00Z',
                outcomes: [],
              },
            ],
          },
        ],
      };

      const result = oddsValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('totals market'))).toBe(true);
    });

    test('should warn about empty bookmaker data', () => {
      const invalidData = {
        ...validOddsData,
        bookmakers: [],
      };

      const result = oddsValidator.validate(invalidData);
      expect(result.warnings.some(w => w.message.includes('No bookmaker data'))).toBe(true);
    });

    test('should warn about unusual odds values', () => {
      const dataWithUnusualOdds = {
        ...validOddsData,
        bookmakers: [
          {
            ...validOddsData.bookmakers[0],
            markets: [
              {
                ...validOddsData.bookmakers[0].markets[0],
                outcomes: [
                  {
                    name: 'Over',
                    price: -50, // Unusual odds
                    point: 8.5,
                  },
                  {
                    name: 'Under',
                    price: -50,
                    point: 8.5,
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = oddsValidator.validate(dataWithUnusualOdds);
      expect(result.warnings.some(w => w.message.includes('Unusual odds'))).toBe(true);
    });

    test('should warn about past commence times', () => {
      const pastTimeData = {
        ...validOddsData,
        commence_time: '2020-01-01T00:00:00Z', // Past date
      };

      const result = oddsValidator.validate(pastTimeData);
      expect(result.warnings.some(w => w.field === 'commence_time')).toBe(true);
    });

    test('should validate sport key for MLB', () => {
      const wrongSportData = {
        ...validOddsData,
        sport_key: 'basketball_nba',
      };

      const result = oddsValidator.validate(wrongSportData);
      expect(result.warnings.some(w => w.field === 'sport_key')).toBe(true);
    });
  });

  describe('Weather API Validation', () => {
    const validWeatherData: WeatherAPIData = {
      location: {
        name: 'Oakland',
        region: 'California',
        country: 'United States of America',
        lat: 37.8,
        lon: -122.27,
        tz_id: 'America/Los_Angeles',
      },
      current: {
        temp_f: 72.0,
        temp_c: 22.2,
        condition: {
          text: 'Partly cloudy',
          code: 1003,
        },
        wind_mph: 10.3,
        wind_kph: 16.6,
        wind_dir: 'W',
        pressure_mb: 1013.25,
        pressure_in: 29.93,
        precip_mm: 0.0,
        precip_in: 0.0,
        humidity: 65,
        cloud: 25,
        feelslike_f: 75.2,
        feelslike_c: 24.0,
        vis_miles: 10.0,
        vis_km: 16.1,
        uv: 6,
        gust_mph: 15.2,
        gust_kph: 24.4,
      },
    };

    test('should validate correct weather data', () => {
      const result = weatherValidator.validate(validWeatherData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.apiSource).toBe('Weather API');
    });

    test('should reject invalid coordinates', () => {
      const invalidData = {
        ...validWeatherData,
        location: {
          ...validWeatherData.location,
          lat: 100, // Invalid latitude
        },
      };

      const result = weatherValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'location.lat')).toBe(true);
    });

    test('should reject invalid humidity values', () => {
      const invalidData = {
        ...validWeatherData,
        current: {
          ...validWeatherData.current,
          humidity: 150, // Invalid humidity
        },
      };

      const result = weatherValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'current.humidity')).toBe(true);
    });

    test('should warn about extreme temperatures', () => {
      const extremeData = {
        ...validWeatherData,
        current: {
          ...validWeatherData.current,
          temp_f: 200, // Very hot
        },
      };

      const result = weatherValidator.validate(extremeData);
      expect(result.warnings.some(w => w.field === 'current.temp_f')).toBe(true);
    });

    test('should warn about extreme wind speeds', () => {
      const windyData = {
        ...validWeatherData,
        current: {
          ...validWeatherData.current,
          wind_mph: 250, // Hurricane-force winds
        },
      };

      const result = weatherValidator.validate(windyData);
      expect(result.warnings.some(w => w.field === 'current.wind_mph')).toBe(true);
    });

    test('should reject negative precipitation', () => {
      const invalidData = {
        ...validWeatherData,
        current: {
          ...validWeatherData.current,
          precip_in: -0.5, // Negative precipitation
        },
      };

      const result = weatherValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'current.precip_in')).toBe(true);
    });

    test('should validate longitude bounds', () => {
      const invalidData = {
        ...validWeatherData,
        location: {
          ...validWeatherData.location,
          lon: -200, // Invalid longitude
        },
      };

      const result = weatherValidator.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'location.lon')).toBe(true);
    });
  });

  describe('Cross-Validator Behavior', () => {
    test('should maintain validator isolation', () => {
      const mlbResult = mlbValidator.validate({});
      const oddsResult = oddsValidator.validate({});
      const weatherResult = weatherValidator.validate({});

      // Each validator should only validate its own data type
      expect(mlbResult.metadata.apiSource).toBe('MLB Stats API');
      expect(oddsResult.metadata.apiSource).toBe('Odds API');
      expect(weatherResult.metadata.apiSource).toBe('Weather API');

      // Validators should not interfere with each other
      expect(mlbValidator.getRequiredFields()).not.toEqual(oddsValidator.getRequiredFields());
      expect(oddsValidator.getRequiredFields()).not.toEqual(weatherValidator.getRequiredFields());
    });

    test('should produce consistent validation results', () => {
      const testData = { gamePk: 746789, gameDate: '2024-07-15' };
      
      const result1 = mlbValidator.validate(testData);
      const result2 = mlbValidator.validate(testData);

      expect(result1.isValid).toBe(result2.isValid);
      expect(result1.errors.length).toBe(result2.errors.length);
      expect(result1.warnings.length).toBe(result2.warnings.length);
    });

    test('should handle malformed data gracefully', () => {
      const malformedData = {
        nonsense: 'invalid',
        nested: { deeply: { invalid: true } },
        nullValue: null,
        undefinedValue: undefined,
      };

      expect(() => mlbValidator.validate(malformedData)).not.toThrow();
      expect(() => oddsValidator.validate(malformedData)).not.toThrow();
      expect(() => weatherValidator.validate(malformedData)).not.toThrow();
    });

    test('should provide detailed error information', () => {
      const invalidData = { gamePk: 'not-a-number' };
      const result = mlbValidator.validate(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const error = result.errors[0];
      expect(error.field).toBeTruthy();
      expect(error.message).toBeTruthy();
      expect(error.severity).toBeTruthy();
      expect(['critical', 'high', 'medium', 'low']).toContain(error.severity);
    });
  });
});