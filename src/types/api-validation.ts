export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    validatedAt: string;
    apiSource: string;
    dataType: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  expectedType?: string;
  actualType?: string;
  actualValue?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  suggestion?: string;
}

export interface APIDataValidator {
  validate(data: any): ValidationResult;
  getRequiredFields(): string[];
  getOptionalFields(): string[];
  getFieldValidators(): Record<string, (value: any) => ValidationError | null>;
}

export interface MLBStatsGameData {
  gamePk: number;
  gameDate: string;
  teams: {
    away: {
      team: {
        id: number;
        name: string;
      };
      score?: number;
    };
    home: {
      team: {
        id: number;
        name: string;
      };
      score?: number;
    };
  };
  status: {
    abstractGameState: string;
    codedGameState: string;
    detailedState: string;
  };
  venue: {
    id: number;
    name: string;
  };
  linescore?: {
    currentInning?: number;
    inningState?: string;
    innings?: Array<{
      num: number;
      ordinalNum: string;
      home: { runs?: number; hits?: number; errors?: number };
      away: { runs?: number; hits?: number; errors?: number };
    }>;
  };
  weather?: {
    condition: string;
    temp: string;
    wind: string;
  };
}

export interface OddsAPIData {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string;
      last_update: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

export interface WeatherAPIData {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
  };
  current: {
    temp_f: number;
    temp_c: number;
    condition: {
      text: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    precip_in: number;
    humidity: number;
    cloud: number;
    feelslike_f: number;
    feelslike_c: number;
    vis_miles: number;
    vis_km: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_f: number;
        mintemp_f: number;
        avgtemp_f: number;
        maxwind_mph: number;
        totalprecip_mm: number;
        totalprecip_in: number;
        avghumidity: number;
        daily_will_it_rain: number;
        daily_chance_of_rain: number;
        condition: {
          text: string;
          code: number;
        };
      };
      astro: {
        sunrise: string;
        sunset: string;
        moonrise: string;
        moonset: string;
        moon_phase: string;
        moon_illumination: string;
      };
      hour: Array<{
        time: string;
        temp_f: number;
        condition: {
          text: string;
          code: number;
        };
        wind_mph: number;
        wind_dir: string;
        pressure_mb: number;
        precip_mm: number;
        humidity: number;
        cloud: number;
        feelslike_f: number;
        chance_of_rain: number;
      }>;
    }>;
  };
}