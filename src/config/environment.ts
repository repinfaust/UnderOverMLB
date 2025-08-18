import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface EnvironmentConfig {
  node: {
    env: string;
    port: number;
  };
  apis: {
    oddsApiKey: string;
    weatherApiKey: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  cache: {
    ttlMinutes: number;
  };
  rateLimit: {
    requestsPerMinute: number;
  };
  logging: {
    level: string;
    file: string;
  };
  monitoring: {
    enableMetrics: boolean;
    healthCheckInterval: number;
  };
  prediction: {
    maxConcurrent: number;
    confidenceThreshold: number;
    maxAgeHours: number;
    enableBacktesting: boolean;
  };
  betting: {
    maxBetSizePercentage: number;
    kellyCriterionFactor: number;
    minimumEdgeThreshold: number;
  };
}

export const config: EnvironmentConfig = {
  node: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  apis: {
    oddsApiKey: process.env.ODDS_API_KEY || '',
    weatherApiKey: process.env.WEATHER_API_KEY || '',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'mlb_predictions',
    user: process.env.DB_USER || 'mlb_user',
    password: process.env.DB_PASSWORD || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  cache: {
    ttlMinutes: parseInt(process.env.CACHE_TTL_MINUTES || '30', 10),
  },
  rateLimit: {
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'data/logs/mlb-predictions.log',
  },
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '300000', 10),
  },
  prediction: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_PREDICTIONS || '3', 10),
    confidenceThreshold: parseFloat(process.env.DEFAULT_CONFIDENCE_THRESHOLD || '0.65'),
    maxAgeHours: parseInt(process.env.MAX_PREDICTION_AGE_HOURS || '24', 10),
    enableBacktesting: process.env.ENABLE_BACKTESTING === 'true',
  },
  betting: {
    maxBetSizePercentage: parseFloat(process.env.MAX_BET_SIZE_PERCENTAGE || '5'),
    kellyCriterionFactor: parseFloat(process.env.KELLY_CRITERION_FACTOR || '0.25'),
    minimumEdgeThreshold: parseFloat(process.env.MINIMUM_EDGE_THRESHOLD || '0.3'),
  },
};

export const validateConfig = (): string[] => {
  const errors: string[] = [];

  if (!config.apis.oddsApiKey) {
    errors.push('ODDS_API_KEY is required');
  }

  if (!config.apis.weatherApiKey) {
    errors.push('WEATHER_API_KEY is required');
  }

  if (config.node.port < 1000 || config.node.port > 65535) {
    errors.push('PORT must be between 1000 and 65535');
  }

  if (config.prediction.confidenceThreshold < 0 || config.prediction.confidenceThreshold > 1) {
    errors.push('DEFAULT_CONFIDENCE_THRESHOLD must be between 0 and 1');
  }

  if (config.betting.maxBetSizePercentage < 0 || config.betting.maxBetSizePercentage > 100) {
    errors.push('MAX_BET_SIZE_PERCENTAGE must be between 0 and 100');
  }

  return errors;
};