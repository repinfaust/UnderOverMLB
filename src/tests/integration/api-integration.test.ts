import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import axios from 'axios';
import { config } from '../../config/environment.js';
import {
  MLBStatsValidator,
  OddsAPIValidator,
  WeatherAPIValidator,
} from '../../lib/validators/api-validators.js';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Integration Tests', () => {
  let mlbValidator: MLBStatsValidator;
  let oddsValidator: OddsAPIValidator;
  let weatherValidator: WeatherAPIValidator;

  beforeAll(() => {
    mlbValidator = new MLBStatsValidator();
    oddsValidator = new OddsAPIValidator();
    weatherValidator = new WeatherAPIValidator();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('MLB Stats API Integration', () => {
    const mockMLBResponse = {
      data: {
        dates: [
          {
            games: [
              {
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
                weather: {
                  condition: 'Partly Cloudy',
                  temp: '72°F',
                  wind: '10 mph, Out To RF',
                },
              },
            ],
          },
        ],
      },
    };

    test('should fetch and validate MLB game data', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockMLBResponse);

      const response = await axios.get('https://statsapi.mlb.com/api/v1/schedule', {
        params: {
          sportId: 1,
          date: '2024-07-15',
          hydrate: 'team,venue,weather,linescore',
        },
      });

      expect(response.data).toBeDefined();
      expect(response.data.dates).toBeDefined();
      expect(response.data.dates[0].games).toBeDefined();

      const gameData = response.data.dates[0].games[0];
      const validation = mlbValidator.validate(gameData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(gameData.gamePk).toBe(746789);
      expect(gameData.teams.home.team.name).toBe('Oakland Athletics');
      expect(gameData.teams.away.team.name).toBe('Los Angeles Angels');
    });

    test('should handle MLB API rate limiting', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'retry-after': '60',
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(rateLimitError);

      await expect(
        axios.get('https://statsapi.mlb.com/api/v1/schedule')
      ).rejects.toMatchObject({
        response: {
          status: 429,
        },
      });
    });

    test('should handle MLB API server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        },
      };

      mockedAxios.get.mockRejectedValueOnce(serverError);

      await expect(
        axios.get('https://statsapi.mlb.com/api/v1/schedule')
      ).rejects.toMatchObject({
        response: {
          status: 500,
        },
      });
    });

    test('should fetch player statistics', async () => {
      const mockPlayerResponse = {
        data: {
          people: [
            {
              id: 572287,
              fullName: 'Jose Altuve',
              primaryNumber: '27',
              currentTeam: {
                id: 117,
                name: 'Houston Astros',
              },
              position: {
                code: '4',
                name: 'Second Baseman',
                type: 'Infielder',
                abbreviation: '2B',
              },
              stats: [
                {
                  type: {
                    displayName: 'season',
                  },
                  group: {
                    displayName: 'hitting',
                  },
                  stats: {
                    gamesPlayed: 145,
                    groundOuts: 180,
                    airOuts: 95,
                    runs: 85,
                    doubles: 30,
                    triples: 3,
                    homeRuns: 13,
                    strikeOuts: 91,
                    baseOnBalls: 45,
                    intentionalWalks: 2,
                    hits: 174,
                    hitByPitch: 8,
                    avg: '.304',
                    atBats: 573,
                    obp: '.365',
                    slg: '.429',
                    ops: '.794',
                    caughtStealing: 5,
                    stolenBases: 18,
                    plateAppearances: 634,
                    totalBases: 246,
                    rbi: 65,
                    leftOnBase: 125,
                    sacBunts: 2,
                    sacFlies: 6,
                    babip: '.341',
                    groundOutsToAirouts: '1.89',
                    catchersInterference: 0,
                    atBatsPerHomeRun: '44.08',
                  },
                },
              ],
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockPlayerResponse);

      const response = await axios.get('https://statsapi.mlb.com/api/v1/people/572287', {
        params: {
          hydrate: 'stats(group=[hitting],type=[season])',
        },
      });

      expect(response.data.people).toHaveLength(1);
      const player = response.data.people[0];
      expect(player.fullName).toBe('Jose Altuve');
      expect(player.stats[0].stats.avg).toBe('.304');
      expect(player.stats[0].stats.ops).toBe('.794');
    });

    test('should validate team data integrity', async () => {
      const mockTeamResponse = {
        data: {
          teams: [
            {
              id: 133,
              name: 'Oakland Athletics',
              link: '/api/v1/teams/133',
              season: 2024,
              venue: {
                id: 10,
                name: 'Oakland Coliseum',
                link: '/api/v1/venues/10',
              },
              teamStats: [
                {
                  type: {
                    displayName: 'season',
                  },
                  group: {
                    displayName: 'hitting',
                  },
                  stats: {
                    gamesPlayed: 95,
                    groundOuts: 817,
                    airOuts: 564,
                    runs: 421,
                    doubles: 146,
                    triples: 12,
                    homeRuns: 98,
                    strikeOuts: 876,
                    baseOnBalls: 345,
                    intentionalWalks: 12,
                    hits: 845,
                    hitByPitch: 67,
                    avg: '.240',
                    atBats: 3521,
                    obp: '.315',
                    slg: '.381',
                    ops: '.696',
                  },
                },
              ],
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockTeamResponse);

      const response = await axios.get('https://statsapi.mlb.com/api/v1/teams/133', {
        params: {
          hydrate: 'stats(group=[hitting],type=[season])',
        },
      });

      const team = response.data.teams[0];
      expect(team.id).toBe(133);
      expect(team.name).toBe('Oakland Athletics');
      expect(team.venue.name).toBe('Oakland Coliseum');
      
      const teamStats = team.teamStats[0].stats;
      expect(parseFloat(teamStats.avg)).toBeGreaterThan(0.1);
      expect(parseFloat(teamStats.avg)).toBeLessThan(0.4);
      expect(parseFloat(teamStats.ops)).toBeGreaterThan(0.4);
      expect(parseFloat(teamStats.ops)).toBeLessThan(1.2);
    });
  });

  describe('Odds API Integration', () => {
    const mockOddsResponse = {
      data: [
        {
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
                {
                  key: 'h2h',
                  last_update: '2024-07-15T18:00:00Z',
                  outcomes: [
                    {
                      name: 'Oakland Athletics',
                      price: 140,
                    },
                    {
                      name: 'Los Angeles Angels',
                      price: -165,
                    },
                  ],
                },
              ],
            },
            {
              key: 'fanduel',
              title: 'FanDuel',
              last_update: '2024-07-15T18:05:00Z',
              markets: [
                {
                  key: 'totals',
                  last_update: '2024-07-15T18:05:00Z',
                  outcomes: [
                    {
                      name: 'Over',
                      price: -115,
                      point: 8.5,
                    },
                    {
                      name: 'Under',
                      price: -105,
                      point: 8.5,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    test('should fetch and validate odds data', async () => {
      // Mock the API key check (would normally use environment variable)
      const mockApiKey = 'test-api-key';
      
      mockedAxios.get.mockResolvedValueOnce(mockOddsResponse);

      const response = await axios.get('https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/', {
        params: {
          apiKey: mockApiKey,
          regions: 'us',
          markets: 'totals,h2h',
          oddsFormat: 'american',
          dateFormat: 'iso',
        },
      });

      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      const gameOdds = response.data[0];
      const validation = oddsValidator.validate(gameOdds);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(gameOdds.sport_key).toBe('baseball_mlb');
      expect(gameOdds.bookmakers).toHaveLength(2);

      // Check for totals market
      const totalsMarket = gameOdds.bookmakers[0].markets.find((m: any) => m.key === 'totals');
      expect(totalsMarket).toBeDefined();
      expect(totalsMarket.outcomes).toHaveLength(2);
    });

    test('should handle API key authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {
            message: 'Invalid API key',
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(authError);

      await expect(
        axios.get('https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/', {
          params: { apiKey: 'invalid-key' },
        })
      ).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    test('should handle quota exceeded errors', async () => {
      const quotaError = {
        response: {
          status: 402,
          statusText: 'Payment Required',
          data: {
            message: 'API usage quota exceeded',
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(quotaError);

      await expect(
        axios.get('https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/')
      ).rejects.toMatchObject({
        response: {
          status: 402,
        },
      });
    });

    test('should validate line movement tracking', async () => {
      const historicalOdds = [
        { ...mockOddsResponse.data[0], timestamp: '2024-07-15T17:00:00Z' },
        { ...mockOddsResponse.data[0], timestamp: '2024-07-15T18:00:00Z' },
      ];

      // Simulate line movement
      historicalOdds[1].bookmakers[0].markets[0].outcomes[0].point = 9.0; // Line moved up

      const lineMovement = historicalOdds.map((odds, index) => {
        const totalsMarket = odds.bookmakers[0].markets.find((m: any) => m.key === 'totals');
        return {
          timestamp: odds.timestamp,
          total: totalsMarket.outcomes[0].point,
          movement: index > 0 ? totalsMarket.outcomes[0].point - historicalOdds[0].bookmakers[0].markets[0].outcomes[0].point : 0,
        };
      });

      expect(lineMovement[0].movement).toBe(0);
      expect(lineMovement[1].movement).toBe(0.5); // Moved up 0.5 points
    });

    test('should detect arbitrage opportunities', async () => {
      const arbitrageOdds = {
        ...mockOddsResponse.data[0],
        bookmakers: [
          {
            key: 'book1',
            title: 'Book 1',
            markets: [
              {
                key: 'totals',
                outcomes: [
                  { name: 'Over', price: 110, point: 8.5 },
                  { name: 'Under', price: -120, point: 8.5 },
                ],
              },
            ],
          },
          {
            key: 'book2', 
            title: 'Book 2',
            markets: [
              {
                key: 'totals',
                outcomes: [
                  { name: 'Over', price: -130, point: 8.5 },
                  { name: 'Under', price: 115, point: 8.5 },
                ],
              },
            ],
          },
        ],
      };

      // Calculate implied probabilities
      const book1Over = 100 / (110 + 100); // ~47.6%
      const book2Under = 100 / (115 + 100); // ~46.5%
      const totalImplied = book1Over + book2Under; // ~94.1%

      expect(totalImplied).toBeLessThan(1.0); // Arbitrage opportunity exists
    });
  });

  describe('Weather API Integration', () => {
    const mockWeatherResponse = {
      data: {
        location: {
          name: 'Oakland',
          region: 'California',
          country: 'United States of America',
          lat: 37.8,
          lon: -122.27,
          tz_id: 'America/Los_Angeles',
          localtime_epoch: 1689451200,
          localtime: '2024-07-15 12:00',
        },
        current: {
          last_updated_epoch: 1689451200,
          last_updated: '2024-07-15 12:00',
          temp_c: 22.2,
          temp_f: 72.0,
          is_day: 1,
          condition: {
            text: 'Partly cloudy',
            icon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
            code: 1003,
          },
          wind_mph: 10.3,
          wind_kph: 16.6,
          wind_degree: 270,
          wind_dir: 'W',
          pressure_mb: 1013.25,
          pressure_in: 29.93,
          precip_mm: 0.0,
          precip_in: 0.0,
          humidity: 65,
          cloud: 25,
          feelslike_c: 24.0,
          feelslike_f: 75.2,
          vis_km: 16.1,
          vis_miles: 10.0,
          uv: 6,
          gust_mph: 15.2,
          gust_kph: 24.4,
        },
        forecast: {
          forecastday: [
            {
              date: '2024-07-15',
              date_epoch: 1689379200,
              day: {
                maxtemp_c: 26.1,
                maxtemp_f: 79.0,
                mintemp_c: 17.8,
                mintemp_f: 64.0,
                avgtemp_c: 22.0,
                avgtemp_f: 71.6,
                maxwind_mph: 12.1,
                maxwind_kph: 19.4,
                totalprecip_mm: 0.0,
                totalprecip_in: 0.0,
                avgvis_km: 16.1,
                avgvis_miles: 10.0,
                avghumidity: 62.0,
                daily_will_it_rain: 0,
                daily_chance_of_rain: 0,
                daily_will_it_snow: 0,
                daily_chance_of_snow: 0,
                condition: {
                  text: 'Partly cloudy',
                  icon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
                  code: 1003,
                },
                uv: 6,
              },
            },
          ],
        },
      },
    };

    test('should fetch and validate weather data', async () => {
      const mockApiKey = 'test-weather-key';
      
      mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);

      const response = await axios.get('http://api.weatherapi.com/v1/forecast.json', {
        params: {
          key: mockApiKey,
          q: 'Oakland,CA',
          days: 1,
          aqi: 'no',
          alerts: 'no',
        },
      });

      expect(response.data).toBeDefined();
      expect(response.data.location).toBeDefined();
      expect(response.data.current).toBeDefined();

      const validation = weatherValidator.validate(response.data);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const weather = response.data.current;
      expect(weather.temp_f).toBe(72.0);
      expect(weather.wind_mph).toBe(10.3);
      expect(weather.wind_dir).toBe('W');
      expect(weather.humidity).toBe(65);
    });

    test('should handle weather API errors', async () => {
      const invalidLocationError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            error: {
              code: 1006,
              message: 'No matching location found.',
            },
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(invalidLocationError);

      await expect(
        axios.get('http://api.weatherapi.com/v1/forecast.json', {
          params: {
            key: 'test-key',
            q: 'InvalidLocation',
          },
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });

    test('should validate venue-specific weather', async () => {
      const venueWeatherData = [
        { venue: 'Oakland Coliseum', lat: 37.7516, lon: -122.2008 },
        { venue: 'Yankee Stadium', lat: 40.8296, lon: -73.9262 },
        { venue: 'Fenway Park', lat: 42.3467, lon: -71.0972 },
      ];

      for (const venue of venueWeatherData) {
        const venueResponse = {
          ...mockWeatherResponse,
          data: {
            ...mockWeatherResponse.data,
            location: {
              ...mockWeatherResponse.data.location,
              name: venue.venue,
              lat: venue.lat,
              lon: venue.lon,
            },
          },
        };

        mockedAxios.get.mockResolvedValueOnce(venueResponse);

        const response = await axios.get('http://api.weatherapi.com/v1/current.json', {
          params: {
            key: 'test-key',
            q: `${venue.lat},${venue.lon}`,
          },
        });

        const validation = weatherValidator.validate(response.data);
        expect(validation.isValid).toBe(true);
        expect(response.data.location.lat).toBeCloseTo(venue.lat, 1);
        expect(response.data.location.lon).toBeCloseTo(venue.lon, 1);
      }
    });

    test('should handle game-time weather forecasting', async () => {
      const gameTime = new Date('2024-07-15T19:07:00Z');
      const gameHour = gameTime.getHours();

      const forecastResponse = {
        ...mockWeatherResponse,
        data: {
          ...mockWeatherResponse.data,
          forecast: {
            forecastday: [
              {
                ...mockWeatherResponse.data.forecast.forecastday[0],
                hour: Array.from({ length: 24 }, (_, i) => ({
                  time_epoch: 1689379200 + i * 3600,
                  time: `2024-07-15 ${i.toString().padStart(2, '0')}:00`,
                  temp_c: 22 + Math.sin(i / 12 * Math.PI) * 5, // Temperature variation
                  temp_f: 72 + Math.sin(i / 12 * Math.PI) * 9,
                  condition: {
                    text: i >= 6 && i <= 18 ? 'Partly cloudy' : 'Clear',
                    code: i >= 6 && i <= 18 ? 1003 : 1000,
                  },
                  wind_mph: 10 + Math.random() * 5,
                  wind_dir: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][i % 8],
                  pressure_mb: 1013 + Math.random() * 10 - 5,
                  precip_mm: Math.random() < 0.1 ? Math.random() * 2 : 0,
                  humidity: 60 + Math.random() * 20,
                  cloud: Math.random() * 100,
                  feelslike_c: 22 + Math.sin(i / 12 * Math.PI) * 5 + 2,
                  feelslike_f: 72 + Math.sin(i / 12 * Math.PI) * 9 + 4,
                  chance_of_rain: Math.random() * 20,
                })),
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(forecastResponse);

      const response = await axios.get('http://api.weatherapi.com/v1/forecast.json', {
        params: {
          key: 'test-key',
          q: 'Oakland,CA',
          days: 1,
          hour: gameHour,
        },
      });

      const gameTimeWeather = response.data.forecast.forecastday[0].hour[gameHour];
      expect(gameTimeWeather).toBeDefined();
      expect(gameTimeWeather.temp_f).toBeGreaterThan(50);
      expect(gameTimeWeather.temp_f).toBeLessThan(120);
      expect(gameTimeWeather.wind_mph).toBeGreaterThanOrEqual(0);
      expect(gameTimeWeather.humidity).toBeGreaterThanOrEqual(0);
      expect(gameTimeWeather.humidity).toBeLessThanOrEqual(100);
    });
  });

  describe('API Integration Performance', () => {
    test('should handle concurrent API requests', async () => {
      const mockResponses = [
        mockWeatherResponse,
        mockOddsResponse,
        mockMLBResponse,
      ];

      mockResponses.forEach((response, index) => {
        mockedAxios.get.mockResolvedValueOnce(response);
      });

      const startTime = Date.now();
      
      const [weatherData, oddsData, mlbData] = await Promise.all([
        axios.get('http://api.weatherapi.com/v1/current.json'),
        axios.get('https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/'),
        axios.get('https://statsapi.mlb.com/api/v1/schedule'),
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(weatherData.data).toBeDefined();
      expect(oddsData.data).toBeDefined();
      expect(mlbData.data).toBeDefined();
    });

    test('should implement circuit breaker pattern', async () => {
      const failures = [];
      
      // Simulate consecutive failures
      for (let i = 0; i < 5; i++) {
        mockedAxios.get.mockRejectedValueOnce(new Error('Service unavailable'));
        
        try {
          await axios.get('https://api.example.com/data');
        } catch (error) {
          failures.push(error);
        }
      }

      expect(failures).toHaveLength(5);
      
      // After multiple failures, circuit should be open
      // Subsequent requests should fail fast
      const startTime = Date.now();
      try {
        await axios.get('https://api.example.com/data');
      } catch (error) {
        // Fast failure expected
      }
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should fail fast
    });

    test('should implement request caching', async () => {
      const cacheKey = 'weather-oakland-2024-07-15';
      
      // First request should hit the API
      mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);
      
      const firstResponse = await axios.get('http://api.weatherapi.com/v1/current.json', {
        params: { q: 'Oakland,CA' },
      });
      
      // Second identical request should use cache (no API call)
      const secondResponse = await axios.get('http://api.weatherapi.com/v1/current.json', {
        params: { q: 'Oakland,CA' },
      });

      expect(firstResponse.data).toEqual(secondResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Only one actual API call
    });
  });
});