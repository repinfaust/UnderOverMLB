import { describe, test, expect, beforeEach } from '@jest/globals';
import { ModelAPitching } from '../models/isolated/model-a-pitching.js';
import { ModelBOffense } from '../models/isolated/model-b-offense.js';
import { SafeModelRegistry } from '../models/isolated/model-registry.js';
import {
  ModelInputData,
  PitchingModelData,
  OffenseModelData,
  ModelExecutionContext,
} from '../types/model-interfaces.js';

describe('Model Validation and Isolation Tests', () => {
  let registry: SafeModelRegistry;
  let modelA: ModelAPitching;
  let modelB: ModelBOffense;
  
  const baseInput: ModelInputData = {
    gameId: '2024-07-15_LAA@OAK',
    homeTeam: 'Oakland Athletics',
    awayTeam: 'Los Angeles Angels',
    venue: 'Oakland Coliseum',
    gameDate: '2024-07-15',
  };

  beforeEach(() => {
    registry = new SafeModelRegistry();
    modelA = new ModelAPitching();
    modelB = new ModelBOffense();
  });

  describe('Model A (Pitching) Validation', () => {
    const validPitchingData: PitchingModelData = {
      homeStarter: {
        era: 3.45,
        whip: 1.25,
        inningsPitched: 125.2,
        strikeoutRate: 9.2,
        walkRate: 2.8,
        homeRunRate: 1.1,
        babip: 0.285,
        fip: 3.22,
      },
      awayStarter: {
        era: 4.12,
        whip: 1.38,
        inningsPitched: 98.1,
        strikeoutRate: 8.7,
        walkRate: 3.2,
        homeRunRate: 1.4,
        babip: 0.302,
        fip: 4.05,
      },
      homeBullpen: {
        era: 3.89,
        whip: 1.31,
        k9: 9.1,
        bb9: 3.4,
        hr9: 1.2,
        saves: 15,
        blownSaves: 3,
      },
      awayBullpen: {
        era: 4.45,
        whip: 1.42,
        k9: 8.3,
        bb9: 3.8,
        hr9: 1.5,
        saves: 12,
        blownSaves: 5,
      },
    };

    test('should validate correct pitching data', async () => {
      const result = await modelA.validate(baseInput, validPitchingData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dataQualityScore).toBeGreaterThan(0.8);
    });

    test('should reject missing required fields', async () => {
      const invalidData = { ...validPitchingData };
      delete (invalidData as any).homeStarter;

      const result = await modelA.validate(baseInput, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.missingRequiredFields).toContain('homeStarter');
    });

    test('should reject invalid ERA values', async () => {
      const invalidData = {
        ...validPitchingData,
        homeStarter: { ...validPitchingData.homeStarter, era: -1.0 },
      };

      const result = await modelA.validate(baseInput, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('ERA'))).toBe(true);
    });

    test('should reject invalid WHIP values', async () => {
      const invalidData = {
        ...validPitchingData,
        homeStarter: { ...validPitchingData.homeStarter, whip: 5.0 },
      };

      const result = await modelA.validate(baseInput, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('WHIP'))).toBe(true);
    });

    test('should generate warnings for extreme values', async () => {
      const extremeData = {
        ...validPitchingData,
        homeStarter: { ...validPitchingData.homeStarter, era: 1.50 },
        awayStarter: { ...validPitchingData.awayStarter, era: 1.80 },
      };

      const result = await modelA.validate(baseInput, extremeData);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('strong pitching'))).toBe(true);
    });

    test('should produce consistent predictions with same input', async () => {
      const prediction1 = await modelA.predict(baseInput, validPitchingData);
      const prediction2 = await modelA.predict(baseInput, validPitchingData);

      expect(prediction1.calculatedTotal).toBe(prediction2.calculatedTotal);
      expect(prediction1.confidence).toBe(prediction2.confidence);
      expect(prediction1.prediction).toBe(prediction2.prediction);
    });

    test('should include all required prediction fields', async () => {
      const prediction = await modelA.predict(baseInput, validPitchingData);

      expect(prediction.modelName).toBe('Model_A_Pitching');
      expect(['Over', 'Under']).toContain(prediction.prediction);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0.5);
      expect(prediction.confidence).toBeLessThanOrEqual(1.0);
      expect(prediction.calculatedTotal).toBeGreaterThan(0);
      expect(prediction.reasoning).toBeTruthy();
      expect(Array.isArray(prediction.factorsUsed)).toBe(true);
      expect(Array.isArray(prediction.keyInsights)).toBe(true);
      expect(prediction.gameId).toBe(baseInput.gameId);
    });

    test('should enforce model-specific business rules', async () => {
      // Test that ERA heavily influences the prediction
      const lowERAData = {
        ...validPitchingData,
        homeStarter: { ...validPitchingData.homeStarter, era: 2.00 },
        awayStarter: { ...validPitchingData.awayStarter, era: 2.10 },
      };

      const highERAData = {
        ...validPitchingData,
        homeStarter: { ...validPitchingData.homeStarter, era: 6.00 },
        awayStarter: { ...validPitchingData.awayStarter, era: 6.20 },
      };

      const lowERAPrediction = await modelA.predict(baseInput, lowERAData);
      const highERAPrediction = await modelA.predict(baseInput, highERAData);

      expect(lowERAPrediction.calculatedTotal).toBeLessThan(highERAPrediction.calculatedTotal);
    });
  });

  describe('Model B (Offense) Validation', () => {
    const validOffenseData: OffenseModelData = {
      homeTeamOffense: {
        runsPerGame: 4.8,
        recentRunsPerGame: 5.2,
        ops: 0.745,
        woba: 0.325,
        homeRunsPerGame: 1.3,
        walksPerGame: 3.2,
        strikeoutsPerGame: 8.9,
        battingAverage: 0.265,
        onBasePercentage: 0.335,
        sluggingPercentage: 0.410,
        stolenBases: 85,
        leftOnBase: 7.2,
        risp: 0.255,
      },
      awayTeamOffense: {
        runsPerGame: 4.2,
        recentRunsPerGame: 3.8,
        ops: 0.715,
        woba: 0.315,
        homeRunsPerGame: 1.1,
        walksPerGame: 2.9,
        strikeoutsPerGame: 9.4,
        battingAverage: 0.248,
        onBasePercentage: 0.318,
        sluggingPercentage: 0.397,
        stolenBases: 72,
        leftOnBase: 7.8,
        risp: 0.238,
      },
    };

    test('should validate correct offense data', async () => {
      const result = await modelB.validate(baseInput, validOffenseData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dataQualityScore).toBeGreaterThan(0.8);
    });

    test('should reject invalid OPS values', async () => {
      const invalidData = {
        ...validOffenseData,
        homeTeamOffense: { ...validOffenseData.homeTeamOffense, ops: 1.5 },
      };

      const result = await modelB.validate(baseInput, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('OPS'))).toBe(true);
    });

    test('should reject invalid batting averages', async () => {
      const invalidData = {
        ...validOffenseData,
        homeTeamOffense: { ...validOffenseData.homeTeamOffense, battingAverage: 0.5 },
      };

      const result = await modelB.validate(baseInput, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('batting average'))).toBe(true);
    });

    test('should generate warnings for extreme offensive values', async () => {
      const extremeData = {
        ...validOffenseData,
        homeTeamOffense: { ...validOffenseData.homeTeamOffense, homeRunsPerGame: 3.0 },
      };

      const result = await modelB.validate(baseInput, extremeData);
      expect(result.warnings.some(w => w.includes('high home run rate'))).toBe(true);
    });

    test('should prioritize recent form in predictions', async () => {
      const hotOffenseData = {
        ...validOffenseData,
        homeTeamOffense: { ...validOffenseData.homeTeamOffense, recentRunsPerGame: 8.5 },
        awayTeamOffense: { ...validOffenseData.awayTeamOffense, recentRunsPerGame: 7.2 },
      };

      const coldOffenseData = {
        ...validOffenseData,
        homeTeamOffense: { ...validOffenseData.homeTeamOffense, recentRunsPerGame: 2.1 },
        awayTeamOffense: { ...validOffenseData.awayTeamOffense, recentRunsPerGame: 2.5 },
      };

      const hotPrediction = await modelB.predict(baseInput, hotOffenseData);
      const coldPrediction = await modelB.predict(baseInput, coldOffenseData);

      expect(hotPrediction.calculatedTotal).toBeGreaterThan(coldPrediction.calculatedTotal);
      expect(hotPrediction.factorsUsed).toContain('recent_runs_per_game');
    });
  });

  describe('Model Registry and Isolation', () => {
    test('should register models successfully', () => {
      expect(() => registry.registerModel(modelA)).not.toThrow();
      expect(() => registry.registerModel(modelB)).not.toThrow();
      
      expect(registry.getModel('Model_A_Pitching')).toBe(modelA);
      expect(registry.getModel('Model_B_Offense')).toBe(modelB);
    });

    test('should prevent duplicate model registration', () => {
      registry.registerModel(modelA);
      expect(() => registry.registerModel(modelA)).toThrow();
    });

    test('should validate model isolation', async () => {
      registry.registerModel(modelA);
      
      const isIsolated = await registry.validateModelIsolation('Model_A_Pitching');
      expect(isIsolated).toBe(true);
    });

    test('should execute models safely with isolation', async () => {
      registry.registerModel(modelA);
      
      const context: ModelExecutionContext = {
        executionId: 'test-exec-1',
        modelName: 'Model_A_Pitching',
        startTime: new Date(),
        inputHash: 'test-hash',
        isolation: {
          preventCrossTalk: true,
          sandboxed: true,
          timeoutMs: 5000,
        },
      };

      const validPitchingData: PitchingModelData = {
        homeStarter: { era: 3.45, whip: 1.25, inningsPitched: 125.2, strikeoutRate: 9.2, walkRate: 2.8, homeRunRate: 1.1, babip: 0.285, fip: 3.22 },
        awayStarter: { era: 4.12, whip: 1.38, inningsPitched: 98.1, strikeoutRate: 8.7, walkRate: 3.2, homeRunRate: 1.4, babip: 0.302, fip: 4.05 },
        homeBullpen: { era: 3.89, whip: 1.31, k9: 9.1, bb9: 3.4, hr9: 1.2, saves: 15, blownSaves: 3 },
        awayBullpen: { era: 4.45, whip: 1.42, k9: 8.3, bb9: 3.8, hr9: 1.5, saves: 12, blownSaves: 5 },
      };

      const prediction = await registry.executeModelSafely(
        'Model_A_Pitching',
        baseInput,
        validPitchingData,
        context
      );

      expect(prediction.modelName).toBe('Model_A_Pitching');
      expect(prediction.gameId).toBe(baseInput.gameId);
    });

    test('should enforce execution timeout', async () => {
      registry.registerModel(modelA);
      
      const context: ModelExecutionContext = {
        executionId: 'test-timeout',
        modelName: 'Model_A_Pitching',
        startTime: new Date(),
        inputHash: 'test-hash',
        isolation: {
          preventCrossTalk: true,
          sandboxed: true,
          timeoutMs: 1, // Very short timeout
        },
      };

      const validPitchingData: PitchingModelData = {
        homeStarter: { era: 3.45, whip: 1.25, inningsPitched: 125.2, strikeoutRate: 9.2, walkRate: 2.8, homeRunRate: 1.1, babip: 0.285, fip: 3.22 },
        awayStarter: { era: 4.12, whip: 1.38, inningsPitched: 98.1, strikeoutRate: 8.7, walkRate: 3.2, homeRunRate: 1.4, babip: 0.302, fip: 4.05 },
        homeBullpen: { era: 3.89, whip: 1.31, k9: 9.1, bb9: 3.4, hr9: 1.2, saves: 15, blownSaves: 3 },
        awayBullpen: { era: 4.45, whip: 1.42, k9: 8.3, bb9: 3.8, hr9: 1.5, saves: 12, blownSaves: 5 },
      };

      await expect(
        registry.executeModelSafely('Model_A_Pitching', baseInput, validPitchingData, context)
      ).rejects.toThrow('timed out');
    });

    test('should reject execution without isolation', async () => {
      registry.registerModel(modelA);
      
      const unsafeContext: ModelExecutionContext = {
        executionId: 'test-unsafe',
        modelName: 'Model_A_Pitching',
        startTime: new Date(),
        inputHash: 'test-hash',
        isolation: {
          preventCrossTalk: false, // Not isolated
          sandboxed: false,
          timeoutMs: 5000,
        },
      };

      await expect(
        registry.executeModelSafely('Model_A_Pitching', baseInput, {}, unsafeContext)
      ).rejects.toThrow('must be executed with isolation enabled');
    });
  });

  describe('Model Cross-Contamination Prevention', () => {
    test('should prevent models from accessing each other', async () => {
      registry.registerModel(modelA);
      registry.registerModel(modelB);

      // Simulate concurrent execution
      const contextA: ModelExecutionContext = {
        executionId: 'test-a',
        modelName: 'Model_A_Pitching',
        startTime: new Date(),
        inputHash: 'hash-a',
        isolation: { preventCrossTalk: true, sandboxed: true, timeoutMs: 5000 },
      };

      const contextB: ModelExecutionContext = {
        executionId: 'test-b',
        modelName: 'Model_B_Offense',
        startTime: new Date(),
        inputHash: 'hash-b',
        isolation: { preventCrossTalk: true, sandboxed: true, timeoutMs: 5000 },
      };

      const validPitchingData: PitchingModelData = {
        homeStarter: { era: 3.45, whip: 1.25, inningsPitched: 125.2, strikeoutRate: 9.2, walkRate: 2.8, homeRunRate: 1.1, babip: 0.285, fip: 3.22 },
        awayStarter: { era: 4.12, whip: 1.38, inningsPitched: 98.1, strikeoutRate: 8.7, walkRate: 3.2, homeRunRate: 1.4, babip: 0.302, fip: 4.05 },
        homeBullpen: { era: 3.89, whip: 1.31, k9: 9.1, bb9: 3.4, hr9: 1.2, saves: 15, blownSaves: 3 },
        awayBullpen: { era: 4.45, whip: 1.42, k9: 8.3, bb9: 3.8, hr9: 1.5, saves: 12, blownSaves: 5 },
      };

      const validOffenseData: OffenseModelData = {
        homeTeamOffense: { runsPerGame: 4.8, recentRunsPerGame: 5.2, ops: 0.745, woba: 0.325, homeRunsPerGame: 1.3, walksPerGame: 3.2, strikeoutsPerGame: 8.9, battingAverage: 0.265, onBasePercentage: 0.335, sluggingPercentage: 0.410, stolenBases: 85, leftOnBase: 7.2, risp: 0.255 },
        awayTeamOffense: { runsPerGame: 4.2, recentRunsPerGame: 3.8, ops: 0.715, woba: 0.315, homeRunsPerGame: 1.1, walksPerGame: 2.9, strikeoutsPerGame: 9.4, battingAverage: 0.248, onBasePercentage: 0.318, sluggingPercentage: 0.397, stolenBases: 72, leftOnBase: 7.8, risp: 0.238 },
      };

      // Execute both models concurrently
      const [predictionA, predictionB] = await Promise.all([
        registry.executeModelSafely('Model_A_Pitching', baseInput, validPitchingData, contextA),
        registry.executeModelSafely('Model_B_Offense', baseInput, validOffenseData, contextB),
      ]);

      // Ensure each model only used its own data
      expect(predictionA.modelName).toBe('Model_A_Pitching');
      expect(predictionB.modelName).toBe('Model_B_Offense');
      
      // Models should have different reasoning based on their focus
      expect(predictionA.reasoning).toContain('Pitching');
      expect(predictionB.reasoning).toContain('Offensive');
      
      // Factor usage should be model-specific
      expect(predictionA.factorsUsed).not.toEqual(predictionB.factorsUsed);
    });

    test('should maintain model parameter isolation', () => {
      const paramsA = modelA.getModelParameters();
      const paramsB = modelB.getModelParameters();

      // Modify returned parameters (should not affect original)
      paramsA.baseTotal = 999;
      paramsB.baseTotal = 888;

      // Get fresh copies
      const freshParamsA = modelA.getModelParameters();
      const freshParamsB = modelB.getModelParameters();

      expect(freshParamsA.baseTotal).not.toBe(999);
      expect(freshParamsB.baseTotal).not.toBe(888);
      expect(freshParamsA.baseTotal).toBe(9.0); // Model A default
      expect(freshParamsB.baseTotal).toBe(8.0); // Model B default
    });
  });
});