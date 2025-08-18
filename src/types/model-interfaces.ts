export interface ModelPrediction {
  readonly modelName: string;
  readonly prediction: 'Over' | 'Under';
  readonly confidence: number;
  readonly calculatedTotal: number;
  readonly reasoning: string;
  readonly factorsUsed: string[];
  readonly keyInsights: string[];
  readonly predictionTime: string;
  readonly gameId: string;
}

export interface ModelInputData {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly venue: string;
  readonly gameDate: string;
}

export interface IsolatedModel {
  readonly modelName: string;
  readonly version: string;
  readonly description: string;
  
  predict(input: ModelInputData, modelSpecificData: any): Promise<ModelPrediction>;
  validate(input: ModelInputData, modelSpecificData: any): Promise<ModelValidationResult>;
  getRequiredDataFields(): string[];
  getOptionalDataFields(): string[];
  getModelParameters(): ModelParameters;
}

export interface ModelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequiredFields: string[];
  dataQualityScore: number; // 0-1
}

export interface ModelParameters {
  readonly baseTotal: number;
  readonly confidenceThreshold: number;
  readonly weightFactors: Record<string, number>;
  readonly adjustmentRanges: Record<string, { min: number; max: number }>;
}

// Model A: Pitching-Focused Model Interface
export interface PitchingModelData {
  readonly homeStarter: {
    readonly era: number;
    readonly whip: number;
    readonly inningsPitched: number;
    readonly strikeoutRate: number;
    readonly walkRate: number;
    readonly homeRunRate: number;
    readonly babip: number;
    readonly fip: number;
    readonly recentForm?: {
      readonly lastFiveStarts: Array<{
        readonly era: number;
        readonly inningsPitched: number;
        readonly strikeouts: number;
        readonly walks: number;
        readonly hits: number;
      }>;
    };
  };
  readonly awayStarter: {
    readonly era: number;
    readonly whip: number;
    readonly inningsPitched: number;
    readonly strikeoutRate: number;
    readonly walkRate: number;
    readonly homeRunRate: number;
    readonly babip: number;
    readonly fip: number;
    readonly recentForm?: {
      readonly lastFiveStarts: Array<{
        readonly era: number;
        readonly inningsPitched: number;
        readonly strikeouts: number;
        readonly walks: number;
        readonly hits: number;
      }>;
    };
  };
  readonly homeBullpen: {
    readonly era: number;
    readonly whip: number;
    readonly k9: number;
    readonly bb9: number;
    readonly hr9: number;
    readonly saves: number;
    readonly blownSaves: number;
    readonly recentUsage?: {
      readonly gamesUsedLastWeek: number;
      readonly inningsPitchedLastWeek: number;
    };
  };
  readonly awayBullpen: {
    readonly era: number;
    readonly whip: number;
    readonly k9: number;
    readonly bb9: number;
    readonly hr9: number;
    readonly saves: number;
    readonly blownSaves: number;
    readonly recentUsage?: {
      readonly gamesUsedLastWeek: number;
      readonly inningsPitchedLastWeek: number;
    };
  };
}

// Model B: Offense-Focused Model Interface
export interface OffenseModelData {
  readonly homeTeamOffense: {
    readonly runsPerGame: number;
    readonly recentRunsPerGame: number; // Last 10 games
    readonly ops: number;
    readonly woba: number;
    readonly homeRunsPerGame: number;
    readonly walksPerGame: number;
    readonly strikeoutsPerGame: number;
    readonly battingAverage: number;
    readonly onBasePercentage: number;
    readonly sluggingPercentage: number;
    readonly stolenBases: number;
    readonly leftOnBase: number;
    readonly risp: number; // Runners in scoring position average
    readonly vsLeftyOps?: number;
    readonly vsRightyOps?: number;
    readonly homeVsAwayOps?: {
      readonly home: number;
      readonly away: number;
    };
  };
  readonly awayTeamOffense: {
    readonly runsPerGame: number;
    readonly recentRunsPerGame: number; // Last 10 games
    readonly ops: number;
    readonly woba: number;
    readonly homeRunsPerGame: number;
    readonly walksPerGame: number;
    readonly strikeoutsPerGame: number;
    readonly battingAverage: number;
    readonly onBasePercentage: number;
    readonly sluggingPercentage: number;
    readonly stolenBases: number;
    readonly leftOnBase: number;
    readonly risp: number;
    readonly vsLeftyOps?: number;
    readonly vsRightyOps?: number;
    readonly homeVsAwayOps?: {
      readonly home: number;
      readonly away: number;
    };
  };
  readonly matchupFactors?: {
    readonly homeTeamVsPitcherType: number; // vs LHP/RHP
    readonly awayTeamVsPitcherType: number;
    readonly homeTeamRecentForm: number; // Last 10 games performance
    readonly awayTeamRecentForm: number;
  };
}

// Model C: Weather/Park Factor Model Interface
export interface WeatherParkModelData {
  readonly parkFactors: {
    readonly parkFactor: number; // Overall park factor
    readonly runsFactor: number;
    readonly homeRunFactor: number;
    readonly altitude: number; // Feet above sea level
    readonly foulTerritory: 'small' | 'medium' | 'large';
    readonly wallDistances: {
      readonly leftField: number;
      readonly centerField: number;
      readonly rightField: number;
    };
    readonly wallHeights: {
      readonly leftField: number;
      readonly centerField: number;
      readonly rightField: number;
    };
    readonly isDome: boolean;
    readonly surfaceType: 'grass' | 'turf';
  };
  readonly weather: {
    readonly tempF: number;
    readonly humidity: number;
    readonly windSpeedMph: number;
    readonly windDirection: string; // N, NE, E, SE, S, SW, W, NW
    readonly pressureMb: number;
    readonly precipitationChance: number;
    readonly visibility: number;
    readonly uvIndex: number;
    readonly dewPoint: number;
    readonly gameTimeWeather?: {
      readonly expectedTempF: number;
      readonly expectedWindSpeedMph: number;
      readonly expectedWindDirection: string;
    };
  };
  readonly historicalData?: {
    readonly parkTotalAverage: number; // Historical average total at this park
    readonly weatherSimilarGames?: Array<{
      readonly date: string;
      readonly temp: number;
      readonly wind: number;
      readonly totalRuns: number;
    }>;
  };
}

// Model D: Market Sentiment Model Interface
export interface MarketSentimentModelData {
  readonly currentOdds: {
    readonly currentTotal: number;
    readonly overOdds: number;
    readonly underOdds: number;
    readonly openingTotal?: number;
    readonly openingOverOdds?: number;
    readonly openingUnderOdds?: number;
  };
  readonly lineMovement: Array<{
    readonly timestamp: string;
    readonly total: number;
    readonly overOdds: number;
    readonly underOdds: number;
    readonly trigger?: 'steam_move' | 'sharp_money' | 'public_money' | 'injury' | 'weather';
    readonly source: string;
  }>;
  readonly bettingVolume: {
    readonly overPercentage: number; // % of bets on Over
    readonly underPercentage: number;
    readonly overMoneyPercentage: number; // % of money on Over
    readonly underMoneyPercentage: number;
    readonly totalHandle?: number;
    readonly numberOfBets?: number;
    readonly averageBetSize?: number;
    readonly reversLineMovement?: boolean;
    readonly sharpMoneySide?: 'Over' | 'Under' | 'Neither';
    readonly sharpMoneyPercentage?: number;
  };
  readonly consensus: {
    readonly bookmakerConsensus: number; // Average total across books
    readonly lineVariation: number; // Standard deviation of totals
    readonly marketEfficiency: number; // 0-1 score
    readonly arbitrageOpportunities?: Array<{
      readonly book1: string;
      readonly book2: string;
      readonly profit: number;
      readonly book1Bet: string;
      readonly book2Bet: string;
    }>;
  };
  readonly steamMoves?: Array<{
    readonly timestamp: string;
    readonly direction: 'Over' | 'Under';
    readonly magnitude: number;
    readonly bookmakerCount: number;
  }>;
}

// Model execution context to ensure isolation
export interface ModelExecutionContext {
  readonly executionId: string;
  readonly modelName: string;
  readonly startTime: Date;
  readonly inputHash: string; // Hash of input data for caching
  readonly isolation: {
    readonly preventCrossTalk: boolean;
    readonly sandboxed: boolean;
    readonly memoryLimit?: number;
    readonly timeoutMs: number;
  };
}

// Model registry for managing isolated instances
export interface ModelRegistry {
  registerModel(model: IsolatedModel): void;
  getModel(modelName: string): IsolatedModel | null;
  getAllModels(): IsolatedModel[];
  validateModelIsolation(modelName: string): Promise<boolean>;
  executeModelSafely(
    modelName: string,
    input: ModelInputData,
    modelSpecificData: any,
    context: ModelExecutionContext
  ): Promise<ModelPrediction>;
}