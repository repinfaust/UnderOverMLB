import {
  APIDataValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  MLBStatsGameData,
  OddsAPIData,
  WeatherAPIData,
} from '../types/api-validation.js';

abstract class BaseValidator implements APIDataValidator {
  protected createError(
    field: string,
    message: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    expectedType?: string,
    actualType?: string,
    actualValue?: any
  ): ValidationError {
    return {
      field,
      message,
      severity,
      expectedType,
      actualType,
      actualValue,
    };
  }

  protected createWarning(
    field: string,
    message: string,
    impact: 'high' | 'medium' | 'low',
    suggestion?: string
  ): ValidationWarning {
    return {
      field,
      message,
      impact,
      suggestion,
    };
  }

  protected validateFieldType(
    data: any,
    field: string,
    expectedType: string,
    required: boolean = true
  ): ValidationError | null {
    const value = this.getNestedValue(data, field);
    
    if (value === undefined || value === null) {
      if (required) {
        return this.createError(
          field,
          `Required field '${field}' is missing`,
          'critical',
          expectedType,
          'undefined'
        );
      }
      return null;
    }

    const actualType = typeof value;
    if (expectedType === 'array' && !Array.isArray(value)) {
      return this.createError(
        field,
        `Field '${field}' must be an array`,
        'high',
        'array',
        actualType,
        value
      );
    }

    if (expectedType !== 'array' && actualType !== expectedType) {
      return this.createError(
        field,
        `Field '${field}' has incorrect type`,
        'high',
        expectedType,
        actualType,
        value
      );
    }

    return null;
  }

  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  protected validateDateFormat(value: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    return iso8601Regex.test(value) || dateOnlyRegex.test(value);
  }

  protected validateNumericRange(
    value: number,
    min?: number,
    max?: number
  ): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }

  abstract validate(data: any): ValidationResult;
  abstract getRequiredFields(): string[];
  abstract getOptionalFields(): string[];
  abstract getFieldValidators(): Record<string, (value: any) => ValidationError | null>;
}

export class MLBStatsValidator extends BaseValidator {
  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const requiredFields = this.getRequiredFields();
    const validators = this.getFieldValidators();

    // Check required fields
    for (const field of requiredFields) {
      const error = this.validateFieldType(data, field, this.getFieldType(field), true);
      if (error) errors.push(error);
    }

    // Run custom validators
    for (const [field, validator] of Object.entries(validators)) {
      const value = this.getNestedValue(data, field);
      if (value !== undefined && value !== null) {
        const error = validator(value);
        if (error) errors.push(error);
      }
    }

    // Specific MLB Stats validations
    this.validateMLBSpecificRules(data, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validatedAt: new Date().toISOString(),
        apiSource: 'MLB Stats API',
        dataType: 'game_data',
      },
    };
  }

  private validateMLBSpecificRules(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate game ID format
    if (data.gamePk && typeof data.gamePk === 'number') {
      if (data.gamePk < 100000 || data.gamePk > 999999999) {
        warnings.push(
          this.createWarning(
            'gamePk',
            'Game ID outside expected range',
            'medium',
            'MLB game IDs are typically 6-9 digits'
          )
        );
      }
    }

    // Validate team structure
    if (data.teams) {
      if (!data.teams.home || !data.teams.away) {
        errors.push(
          this.createError(
            'teams',
            'Both home and away teams must be present',
            'critical'
          )
        );
      }

      // Check for same team playing itself
      if (
        data.teams.home?.team?.id &&
        data.teams.away?.team?.id &&
        data.teams.home.team.id === data.teams.away.team.id
      ) {
        errors.push(
          this.createError(
            'teams',
            'Home and away teams cannot be the same',
            'critical'
          )
        );
      }
    }

    // Validate game status
    if (data.status?.abstractGameState) {
      const validStates = ['Preview', 'Live', 'Final'];
      if (!validStates.includes(data.status.abstractGameState)) {
        warnings.push(
          this.createWarning(
            'status.abstractGameState',
            `Unexpected game state: ${data.status.abstractGameState}`,
            'low',
            `Expected one of: ${validStates.join(', ')}`
          )
        );
      }
    }

    // Validate scores (if game is final)
    if (data.status?.abstractGameState === 'Final') {
      if (
        data.teams?.home?.score === undefined ||
        data.teams?.away?.score === undefined
      ) {
        errors.push(
          this.createError(
            'teams.score',
            'Final games must have scores for both teams',
            'high'
          )
        );
      }
    }
  }

  getRequiredFields(): string[] {
    return [
      'gamePk',
      'gameDate',
      'teams.home.team.id',
      'teams.home.team.name',
      'teams.away.team.id',
      'teams.away.team.name',
      'status.abstractGameState',
      'venue.id',
      'venue.name',
    ];
  }

  getOptionalFields(): string[] {
    return [
      'teams.home.score',
      'teams.away.score',
      'status.codedGameState',
      'status.detailedState',
      'linescore',
      'weather',
    ];
  }

  getFieldValidators(): Record<string, (value: any) => ValidationError | null> {
    return {
      gamePk: (value: number) => {
        if (!Number.isInteger(value) || value <= 0) {
          return this.createError(
            'gamePk',
            'Game ID must be a positive integer',
            'critical'
          );
        }
        return null;
      },
      gameDate: (value: string) => {
        if (!this.validateDateFormat(value)) {
          return this.createError(
            'gameDate',
            'Game date must be in ISO 8601 format',
            'high'
          );
        }
        return null;
      },
      'teams.home.score': (value: number) => {
        if (!Number.isInteger(value) || value < 0) {
          return this.createError(
            'teams.home.score',
            'Score must be a non-negative integer',
            'medium'
          );
        }
        return null;
      },
      'teams.away.score': (value: number) => {
        if (!Number.isInteger(value) || value < 0) {
          return this.createError(
            'teams.away.score',
            'Score must be a non-negative integer',
            'medium'
          );
        }
        return null;
      },
    };
  }

  private getFieldType(field: string): string {
    const typeMap: Record<string, string> = {
      gamePk: 'number',
      gameDate: 'string',
      'teams.home.team.id': 'number',
      'teams.home.team.name': 'string',
      'teams.away.team.id': 'number',
      'teams.away.team.name': 'string',
      'teams.home.score': 'number',
      'teams.away.score': 'number',
      'status.abstractGameState': 'string',
      'venue.id': 'number',
      'venue.name': 'string',
    };
    return typeMap[field] || 'string';
  }
}

export class OddsAPIValidator extends BaseValidator {
  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const requiredFields = this.getRequiredFields();
    const validators = this.getFieldValidators();

    // Check required fields
    for (const field of requiredFields) {
      const error = this.validateFieldType(data, field, this.getFieldType(field), true);
      if (error) errors.push(error);
    }

    // Run custom validators
    for (const [field, validator] of Object.entries(validators)) {
      const value = this.getNestedValue(data, field);
      if (value !== undefined && value !== null) {
        const error = validator(value);
        if (error) errors.push(error);
      }
    }

    // Specific Odds API validations
    this.validateOddsSpecificRules(data, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validatedAt: new Date().toISOString(),
        apiSource: 'Odds API',
        dataType: 'odds_data',
      },
    };
  }

  private validateOddsSpecificRules(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate commence time is in the future (for upcoming games)
    if (data.commence_time) {
      const commenceTime = new Date(data.commence_time);
      const now = new Date();
      
      if (commenceTime < now) {
        warnings.push(
          this.createWarning(
            'commence_time',
            'Game commence time is in the past',
            'medium',
            'This may be expected for live or completed games'
          )
        );
      }
    }

    // Validate bookmaker data
    if (data.bookmakers && Array.isArray(data.bookmakers)) {
      if (data.bookmakers.length === 0) {
        warnings.push(
          this.createWarning(
            'bookmakers',
            'No bookmaker data available',
            'high',
            'Without odds data, betting analysis cannot be performed'
          )
        );
      }

      // Check for totals market specifically
      const hasTotalsMarket = data.bookmakers.some((bookmaker: any) =>
        bookmaker.markets?.some((market: any) => market.key === 'totals')
      );

      if (!hasTotalsMarket) {
        errors.push(
          this.createError(
            'bookmakers.markets',
            'No totals market found in odds data',
            'critical'
          )
        );
      }

      // Validate odds values
      data.bookmakers.forEach((bookmaker: any, bookmakerIndex: number) => {
        if (bookmaker.markets) {
          bookmaker.markets.forEach((market: any, marketIndex: number) => {
            if (market.outcomes) {
              market.outcomes.forEach((outcome: any, outcomeIndex: number) => {
                if (typeof outcome.price === 'number') {
                  // American odds validation
                  if (outcome.price > -100 && outcome.price < 100 && outcome.price !== 0) {
                    warnings.push(
                      this.createWarning(
                        `bookmakers[${bookmakerIndex}].markets[${marketIndex}].outcomes[${outcomeIndex}].price`,
                        'Unusual odds value detected',
                        'medium',
                        'American odds are typically <= -100 or >= +100'
                      )
                    );
                  }
                }
              });
            }
          });
        }
      });
    }

    // Validate sport key
    if (data.sport_key && data.sport_key !== 'baseball_mlb') {
      warnings.push(
        this.createWarning(
          'sport_key',
          `Unexpected sport key: ${data.sport_key}`,
          'medium',
          'Expected "baseball_mlb" for MLB games'
        )
      );
    }
  }

  getRequiredFields(): string[] {
    return [
      'id',
      'sport_key',
      'commence_time',
      'home_team',
      'away_team',
      'bookmakers',
    ];
  }

  getOptionalFields(): string[] {
    return ['sport_title'];
  }

  getFieldValidators(): Record<string, (value: any) => ValidationError | null> {
    return {
      commence_time: (value: string) => {
        if (!this.validateDateFormat(value)) {
          return this.createError(
            'commence_time',
            'Commence time must be in ISO 8601 format',
            'high'
          );
        }
        return null;
      },
      bookmakers: (value: any[]) => {
        if (!Array.isArray(value)) {
          return this.createError(
            'bookmakers',
            'Bookmakers must be an array',
            'critical'
          );
        }
        return null;
      },
    };
  }

  private getFieldType(field: string): string {
    const typeMap: Record<string, string> = {
      id: 'string',
      sport_key: 'string',
      sport_title: 'string',
      commence_time: 'string',
      home_team: 'string',
      away_team: 'string',
      bookmakers: 'array',
    };
    return typeMap[field] || 'string';
  }
}

export class WeatherAPIValidator extends BaseValidator {
  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const requiredFields = this.getRequiredFields();
    const validators = this.getFieldValidators();

    // Check required fields
    for (const field of requiredFields) {
      const error = this.validateFieldType(data, field, this.getFieldType(field), true);
      if (error) errors.push(error);
    }

    // Run custom validators
    for (const [field, validator] of Object.entries(validators)) {
      const value = this.getNestedValue(data, field);
      if (value !== undefined && value !== null) {
        const error = validator(value);
        if (error) errors.push(error);
      }
    }

    // Specific Weather API validations
    this.validateWeatherSpecificRules(data, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validatedAt: new Date().toISOString(),
        apiSource: 'Weather API',
        dataType: 'weather_data',
      },
    };
  }

  private validateWeatherSpecificRules(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate temperature ranges
    if (data.current?.temp_f) {
      if (!this.validateNumericRange(data.current.temp_f, -50, 150)) {
        warnings.push(
          this.createWarning(
            'current.temp_f',
            'Temperature outside reasonable range',
            'medium',
            'Temperature should typically be between -50°F and 150°F'
          )
        );
      }
    }

    // Validate humidity
    if (data.current?.humidity) {
      if (!this.validateNumericRange(data.current.humidity, 0, 100)) {
        errors.push(
          this.createError(
            'current.humidity',
            'Humidity must be between 0 and 100',
            'medium'
          )
        );
      }
    }

    // Validate wind speed
    if (data.current?.wind_mph) {
      if (!this.validateNumericRange(data.current.wind_mph, 0, 200)) {
        warnings.push(
          this.createWarning(
            'current.wind_mph',
            'Wind speed outside typical range',
            'low',
            'Wind speeds above 200 mph are extremely rare'
          )
        );
      }
    }

    // Validate coordinates
    if (data.location?.lat && data.location?.lon) {
      if (!this.validateNumericRange(data.location.lat, -90, 90)) {
        errors.push(
          this.createError(
            'location.lat',
            'Latitude must be between -90 and 90',
            'high'
          )
        );
      }
      if (!this.validateNumericRange(data.location.lon, -180, 180)) {
        errors.push(
          this.createError(
            'location.lon',
            'Longitude must be between -180 and 180',
            'high'
          )
        );
      }
    }

    // Validate precipitation
    if (data.current?.precip_in) {
      if (data.current.precip_in < 0) {
        errors.push(
          this.createError(
            'current.precip_in',
            'Precipitation cannot be negative',
            'medium'
          )
        );
      }
    }
  }

  getRequiredFields(): string[] {
    return [
      'location.name',
      'location.lat',
      'location.lon',
      'current.temp_f',
      'current.condition.text',
      'current.wind_mph',
      'current.wind_dir',
      'current.humidity',
    ];
  }

  getOptionalFields(): string[] {
    return [
      'location.region',
      'location.country',
      'current.temp_c',
      'current.pressure_mb',
      'current.precip_mm',
      'current.precip_in',
      'current.cloud',
      'current.feelslike_f',
      'current.vis_miles',
      'current.uv',
      'current.gust_mph',
      'forecast',
    ];
  }

  getFieldValidators(): Record<string, (value: any) => ValidationError | null> {
    return {
      'current.temp_f': (value: number) => {
        if (typeof value !== 'number' || isNaN(value)) {
          return this.createError(
            'current.temp_f',
            'Temperature must be a valid number',
            'high'
          );
        }
        return null;
      },
      'current.humidity': (value: number) => {
        if (typeof value !== 'number' || value < 0 || value > 100) {
          return this.createError(
            'current.humidity',
            'Humidity must be a number between 0 and 100',
            'medium'
          );
        }
        return null;
      },
      'current.wind_mph': (value: number) => {
        if (typeof value !== 'number' || value < 0) {
          return this.createError(
            'current.wind_mph',
            'Wind speed must be a non-negative number',
            'medium'
          );
        }
        return null;
      },
    };
  }

  private getFieldType(field: string): string {
    const typeMap: Record<string, string> = {
      'location.name': 'string',
      'location.lat': 'number',
      'location.lon': 'number',
      'current.temp_f': 'number',
      'current.condition.text': 'string',
      'current.wind_mph': 'number',
      'current.wind_dir': 'string',
      'current.humidity': 'number',
    };
    return typeMap[field] || 'string';
  }
}