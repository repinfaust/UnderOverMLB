import { jest } from '@jest/globals';

// Global test setup and configuration

// Set up global test environment
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce noise during tests
  
  // Mock console methods to reduce test output noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  
  // Allow console.error for debugging test failures
  const originalConsoleError = console.error;
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Only show errors in tests if they contain specific keywords
    const message = args.join(' ');
    if (message.includes('CRITICAL') || message.includes('FATAL') || message.includes('Test Error')) {
      originalConsoleError(...args);
    }
  });
});

afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global test utilities
export const TestUtils = {
  // Generate random test data
  randomFloat: (min: number = 0, max: number = 1): number => {
    return Math.random() * (max - min) + min;
  },

  randomInt: (min: number = 0, max: number = 100): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomTeamName: (): string => {
    const teams = [
      'New York Yankees', 'Boston Red Sox', 'Los Angeles Dodgers', 'San Francisco Giants',
      'Chicago Cubs', 'St. Louis Cardinals', 'Atlanta Braves', 'Philadelphia Phillies',
      'Houston Astros', 'Los Angeles Angels', 'Oakland Athletics', 'Seattle Mariners',
      'Texas Rangers', 'Minnesota Twins', 'Cleveland Guardians', 'Detroit Tigers',
    ];
    return teams[Math.floor(Math.random() * teams.length)];
  },

  randomDate: (daysFromNow: number = 0): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  },

  // Generate realistic baseball statistics
  generateRealisticERA: (): number => {
    // Most ERAs fall between 2.50 and 6.00
    return TestUtils.randomFloat(2.5, 6.0);
  },

  generateRealisticWHIP: (): number => {
    // Most WHIPs fall between 1.00 and 1.60
    return TestUtils.randomFloat(1.0, 1.6);
  },

  generateRealisticOPS: (): number => {
    // Most team OPS fall between 0.650 and 0.850
    return TestUtils.randomFloat(0.65, 0.85);
  },

  generateRealisticWOBA: (): number => {
    // Most wOBA values fall between 0.290 and 0.370
    return TestUtils.randomFloat(0.29, 0.37);
  },

  generateRealisticBattingAverage: (): number => {
    // Most batting averages fall between 0.220 and 0.320
    return TestUtils.randomFloat(0.22, 0.32);
  },

  // Generate test game data
  generateTestGameData: (gameId?: string) => {
    const homeTeam = TestUtils.randomTeamName();
    let awayTeam = TestUtils.randomTeamName();
    while (awayTeam === homeTeam) {
      awayTeam = TestUtils.randomTeamName();
    }

    return {
      gameId: gameId || `${TestUtils.randomDate()}_${awayTeam.replace(/\s+/g, '')}@${homeTeam.replace(/\s+/g, '')}`,
      homeTeam,
      awayTeam,
      venue: `${homeTeam} Stadium`,
      gameDate: TestUtils.randomDate(TestUtils.randomInt(0, 7)),
    };
  },

  generateTestPitchingData: () => ({
    homeStarter: {
      era: TestUtils.generateRealisticERA(),
      whip: TestUtils.generateRealisticWHIP(),
      inningsPitched: TestUtils.randomFloat(50, 200),
      strikeoutRate: TestUtils.randomFloat(6, 12),
      walkRate: TestUtils.randomFloat(2, 5),
      homeRunRate: TestUtils.randomFloat(0.8, 2.0),
      babip: TestUtils.randomFloat(0.250, 0.350),
      fip: TestUtils.randomFloat(2.5, 5.5),
    },
    awayStarter: {
      era: TestUtils.generateRealisticERA(),
      whip: TestUtils.generateRealisticWHIP(),
      inningsPitched: TestUtils.randomFloat(50, 200),
      strikeoutRate: TestUtils.randomFloat(6, 12),
      walkRate: TestUtils.randomFloat(2, 5),
      homeRunRate: TestUtils.randomFloat(0.8, 2.0),
      babip: TestUtils.randomFloat(0.250, 0.350),
      fip: TestUtils.randomFloat(2.5, 5.5),
    },
    homeBullpen: {
      era: TestUtils.randomFloat(3.0, 5.5),
      whip: TestUtils.randomFloat(1.1, 1.5),
      k9: TestUtils.randomFloat(7, 11),
      bb9: TestUtils.randomFloat(2.5, 4.5),
      hr9: TestUtils.randomFloat(0.8, 1.8),
      saves: TestUtils.randomInt(5, 35),
      blownSaves: TestUtils.randomInt(1, 8),
    },
    awayBullpen: {
      era: TestUtils.randomFloat(3.0, 5.5),
      whip: TestUtils.randomFloat(1.1, 1.5),
      k9: TestUtils.randomFloat(7, 11),
      bb9: TestUtils.randomFloat(2.5, 4.5),
      hr9: TestUtils.randomFloat(0.8, 1.8),
      saves: TestUtils.randomInt(5, 35),
      blownSaves: TestUtils.randomInt(1, 8),
    },
  }),

  generateTestOffenseData: () => ({
    homeTeamOffense: {
      runsPerGame: TestUtils.randomFloat(3.5, 6.0),
      recentRunsPerGame: TestUtils.randomFloat(2.0, 8.0),
      ops: TestUtils.generateRealisticOPS(),
      woba: TestUtils.generateRealisticWOBA(),
      homeRunsPerGame: TestUtils.randomFloat(0.8, 2.2),
      walksPerGame: TestUtils.randomFloat(2.5, 4.5),
      strikeoutsPerGame: TestUtils.randomFloat(7.0, 11.0),
      battingAverage: TestUtils.generateRealisticBattingAverage(),
      onBasePercentage: TestUtils.randomFloat(0.280, 0.380),
      sluggingPercentage: TestUtils.randomFloat(0.350, 0.500),
      stolenBases: TestUtils.randomInt(30, 120),
      leftOnBase: TestUtils.randomFloat(6.5, 8.5),
      risp: TestUtils.randomFloat(0.220, 0.280),
    },
    awayTeamOffense: {
      runsPerGame: TestUtils.randomFloat(3.5, 6.0),
      recentRunsPerGame: TestUtils.randomFloat(2.0, 8.0),
      ops: TestUtils.generateRealisticOPS(),
      woba: TestUtils.generateRealisticWOBA(),
      homeRunsPerGame: TestUtils.randomFloat(0.8, 2.2),
      walksPerGame: TestUtils.randomFloat(2.5, 4.5),
      strikeoutsPerGame: TestUtils.randomFloat(7.0, 11.0),
      battingAverage: TestUtils.generateRealisticBattingAverage(),
      onBasePercentage: TestUtils.randomFloat(0.280, 0.380),
      sluggingPercentage: TestUtils.randomFloat(0.350, 0.500),
      stolenBases: TestUtils.randomInt(30, 120),
      leftOnBase: TestUtils.randomFloat(6.5, 8.5),
      risp: TestUtils.randomFloat(0.220, 0.280),
    },
  }),

  // Assertion helpers
  assertValidPrediction: (prediction: any) => {
    expect(prediction).toBeDefined();
    expect(prediction.modelName).toBeTruthy();
    expect(['Over', 'Under']).toContain(prediction.prediction);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0.5);
    expect(prediction.confidence).toBeLessThanOrEqual(1.0);
    expect(prediction.calculatedTotal).toBeGreaterThan(0);
    expect(prediction.calculatedTotal).toBeLessThan(30);
    expect(Array.isArray(prediction.factorsUsed)).toBe(true);
    expect(Array.isArray(prediction.keyInsights)).toBe(true);
    expect(prediction.reasoning).toBeTruthy();
    expect(prediction.gameId).toBeTruthy();
    expect(prediction.predictionTime).toBeTruthy();
  },

  assertValidValidationResult: (result: any) => {
    expect(result).toBeDefined();
    expect(typeof result.isValid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.missingRequiredFields)).toBe(true);
    expect(typeof result.dataQualityScore).toBe('number');
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.dataQualityScore).toBeLessThanOrEqual(1);
  },

  // Time helpers for testing
  sleep: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Mock API response generators
  generateMockMLBResponse: () => ({
    data: {
      dates: [{
        games: [{
          gamePk: TestUtils.randomInt(100000, 999999),
          gameDate: new Date().toISOString(),
          teams: {
            away: {
              team: { id: 108, name: TestUtils.randomTeamName() },
              score: TestUtils.randomInt(0, 15),
            },
            home: {
              team: { id: 133, name: TestUtils.randomTeamName() },
              score: TestUtils.randomInt(0, 15),
            },
          },
          status: {
            abstractGameState: 'Final',
            codedGameState: 'F',
            detailedState: 'Final',
          },
          venue: {
            id: TestUtils.randomInt(1, 50),
            name: 'Test Stadium',
          },
        }],
      }],
    },
  }),

  generateMockOddsResponse: () => ({
    data: [{
      id: 'test-game-' + TestUtils.randomInt(1000, 9999),
      sport_key: 'baseball_mlb',
      sport_title: 'MLB',
      commence_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      home_team: TestUtils.randomTeamName(),
      away_team: TestUtils.randomTeamName(),
      bookmakers: [{
        key: 'test-book',
        title: 'Test Sportsbook',
        last_update: new Date().toISOString(),
        markets: [{
          key: 'totals',
          last_update: new Date().toISOString(),
          outcomes: [
            { name: 'Over', price: -110, point: TestUtils.randomFloat(7.5, 10.5) },
            { name: 'Under', price: -110, point: TestUtils.randomFloat(7.5, 10.5) },
          ],
        }],
      }],
    }],
  }),

  generateMockWeatherResponse: () => ({
    data: {
      location: {
        name: 'Test City',
        region: 'Test State',
        country: 'United States',
        lat: TestUtils.randomFloat(25, 48),
        lon: TestUtils.randomFloat(-125, -70),
        tz_id: 'America/New_York',
      },
      current: {
        temp_f: TestUtils.randomFloat(40, 95),
        temp_c: TestUtils.randomFloat(4, 35),
        condition: {
          text: 'Partly cloudy',
          code: 1003,
        },
        wind_mph: TestUtils.randomFloat(0, 25),
        wind_kph: TestUtils.randomFloat(0, 40),
        wind_dir: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][TestUtils.randomInt(0, 7)],
        pressure_mb: TestUtils.randomFloat(1005, 1025),
        pressure_in: TestUtils.randomFloat(29.5, 30.5),
        precip_mm: TestUtils.randomFloat(0, 5),
        precip_in: TestUtils.randomFloat(0, 0.2),
        humidity: TestUtils.randomInt(30, 90),
        cloud: TestUtils.randomInt(0, 100),
        feelslike_f: TestUtils.randomFloat(40, 100),
        feelslike_c: TestUtils.randomFloat(4, 38),
        vis_miles: TestUtils.randomFloat(5, 15),
        vis_km: TestUtils.randomFloat(8, 24),
        uv: TestUtils.randomInt(1, 10),
        gust_mph: TestUtils.randomFloat(0, 35),
        gust_kph: TestUtils.randomFloat(0, 56),
      },
    },
  }),
};

// Global constants for testing
export const TEST_CONSTANTS = {
  TIMEOUT_SHORT: 1000,
  TIMEOUT_MEDIUM: 5000,
  TIMEOUT_LONG: 10000,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.5,
  DEFAULT_BASE_TOTAL: 8.5,
  MAX_REASONABLE_TOTAL: 25,
  MIN_REASONABLE_TOTAL: 2,
  VALID_PREDICTIONS: ['Over', 'Under'],
  VALID_MODEL_NAMES: ['Model_A_Pitching', 'Model_B_Offense', 'Model_C_Weather_Park', 'Model_D_Market_Sentiment'],
};

export default TestUtils;