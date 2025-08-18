import {
  IsolatedModel,
  ModelInputData,
  ModelPrediction,
  ModelValidationResult,
  ModelParameters,
  PitchingModelData,
} from '../../types/model-interfaces.js';

export class ModelAPitching implements IsolatedModel {
  public readonly modelName = 'Model_A_Pitching';
  public readonly version = '1.0.0';
  public readonly description = 'Pitching-focused prediction model analyzing starter and bullpen metrics';

  private readonly parameters: ModelParameters = {
    baseTotal: 9.0,
    confidenceThreshold: 0.5,
    weightFactors: {
      starterERA: 0.35,
      starterWHIP: 0.25,
      bullpenERA: 0.20,
      starterInnings: 0.10,
      recentForm: 0.10,
    },
    adjustmentRanges: {
      eraAdjustment: { min: -2.5, max: 2.5 },
      whipAdjustment: { min: -1.0, max: 1.0 },
      bullpenAdjustment: { min: -1.0, max: 1.0 },
      fatigueAdjustment: { min: -0.3, max: 0.3 },
    },
  };

  async predict(input: ModelInputData, modelSpecificData: PitchingModelData): Promise<ModelPrediction> {
    const validationResult = await this.validate(input, modelSpecificData);
    if (!validationResult.isValid) {
      throw new Error(`Model A validation failed: ${validationResult.errors.join(', ')}`);
    }

    const prediction = this.calculatePitchingPrediction(modelSpecificData);
    
    return {
      modelName: this.modelName,
      prediction: prediction.total > 8.5 ? 'Over' : 'Under',
      confidence: prediction.confidence,
      calculatedTotal: prediction.total,
      reasoning: prediction.reasoning,
      factorsUsed: prediction.factorsUsed,
      keyInsights: prediction.insights,
      predictionTime: new Date().toISOString(),
      gameId: input.gameId,
    };
  }

  async validate(input: ModelInputData, modelSpecificData: PitchingModelData): Promise<ModelValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // Validate required input data
    if (!input.gameId) missingFields.push('gameId');
    if (!input.homeTeam) missingFields.push('homeTeam');
    if (!input.awayTeam) missingFields.push('awayTeam');

    // Validate pitching data structure
    if (!modelSpecificData) {
      errors.push('No pitching data provided');
      return {
        isValid: false,
        errors,
        warnings,
        missingRequiredFields: missingFields,
        dataQualityScore: 0,
      };
    }

    // Validate home starter data
    const homeStarter = modelSpecificData.homeStarter;
    if (!homeStarter) {
      missingFields.push('homeStarter');
    } else {
      if (typeof homeStarter.era !== 'number' || homeStarter.era < 0 || homeStarter.era > 15) {
        errors.push('Invalid home starter ERA');
      }
      if (typeof homeStarter.whip !== 'number' || homeStarter.whip < 0.5 || homeStarter.whip > 3.0) {
        errors.push('Invalid home starter WHIP');
      }
      if (typeof homeStarter.inningsPitched !== 'number' || homeStarter.inningsPitched < 0) {
        errors.push('Invalid home starter innings pitched');
      }
    }

    // Validate away starter data
    const awayStarter = modelSpecificData.awayStarter;
    if (!awayStarter) {
      missingFields.push('awayStarter');
    } else {
      if (typeof awayStarter.era !== 'number' || awayStarter.era < 0 || awayStarter.era > 15) {
        errors.push('Invalid away starter ERA');
      }
      if (typeof awayStarter.whip !== 'number' || awayStarter.whip < 0.5 || awayStarter.whip > 3.0) {
        errors.push('Invalid away starter WHIP');
      }
      if (typeof awayStarter.inningsPitched !== 'number' || awayStarter.inningsPitched < 0) {
        errors.push('Invalid away starter innings pitched');
      }
    }

    // Validate bullpen data
    if (!modelSpecificData.homeBullpen) {
      missingFields.push('homeBullpen');
    } else if (typeof modelSpecificData.homeBullpen.era !== 'number') {
      errors.push('Invalid home bullpen ERA');
    }

    if (!modelSpecificData.awayBullpen) {
      missingFields.push('awayBullpen');
    } else if (typeof modelSpecificData.awayBullpen.era !== 'number') {
      errors.push('Invalid away bullpen ERA');
    }

    // Data quality warnings
    if (homeStarter?.era && awayStarter?.era) {
      const eraSum = homeStarter.era + awayStarter.era;
      if (eraSum < 4.0) {
        warnings.push('Exceptionally strong pitching matchup detected');
      } else if (eraSum > 12.0) {
        warnings.push('Exceptionally weak pitching matchup detected');
      }
    }

    // Calculate data quality score
    let qualityScore = 1.0;
    if (missingFields.length > 0) qualityScore -= 0.2 * missingFields.length;
    if (errors.length > 0) qualityScore -= 0.3 * errors.length;
    if (warnings.length > 0) qualityScore -= 0.1 * warnings.length;
    qualityScore = Math.max(0, Math.min(1, qualityScore));

    return {
      isValid: errors.length === 0 && missingFields.length === 0,
      errors,
      warnings,
      missingRequiredFields: missingFields,
      dataQualityScore: qualityScore,
    };
  }

  getRequiredDataFields(): string[] {
    return [
      'homeStarter.era',
      'homeStarter.whip',
      'homeStarter.inningsPitched',
      'awayStarter.era',
      'awayStarter.whip',
      'awayStarter.inningsPitched',
      'homeBullpen.era',
      'awayBullpen.era',
    ];
  }

  getOptionalDataFields(): string[] {
    return [
      'homeStarter.strikeoutRate',
      'homeStarter.walkRate',
      'homeStarter.homeRunRate',
      'homeStarter.babip',
      'homeStarter.fip',
      'homeStarter.recentForm',
      'awayStarter.strikeoutRate',
      'awayStarter.walkRate',
      'awayStarter.homeRunRate',
      'awayStarter.babip',
      'awayStarter.fip',
      'awayStarter.recentForm',
      'homeBullpen.whip',
      'homeBullpen.k9',
      'homeBullpen.bb9',
      'homeBullpen.recentUsage',
      'awayBullpen.whip',
      'awayBullpen.k9',
      'awayBullpen.bb9',
      'awayBullpen.recentUsage',
    ];
  }

  getModelParameters(): ModelParameters {
    return { ...this.parameters }; // Return a copy to prevent mutation
  }

  private calculatePitchingPrediction(data: PitchingModelData): {
    total: number;
    confidence: number;
    reasoning: string;
    factorsUsed: string[];
    insights: string[];
  } {
    let projectedTotal = this.parameters.baseTotal;
    const factorsUsed: string[] = [];
    const insights: string[] = [];
    let confidenceAdjustments = 0;

    // Starter ERA Analysis
    const homeERA = data.homeStarter.era;
    const awayERA = data.awayStarter.era;
    const avgStarterERA = (homeERA + awayERA) / 2;
    
    const eraAdjustment = this.calculateERAImpact(avgStarterERA);
    projectedTotal += eraAdjustment;
    factorsUsed.push('starter_era');
    
    if (avgStarterERA < 2.5) {
      insights.push('Elite starting pitching matchup');
      confidenceAdjustments += 0.15;
    } else if (avgStarterERA > 5.5) {
      insights.push('Vulnerable starting pitching');
      confidenceAdjustments += 0.10;
    }

    // WHIP Analysis
    const homeWHIP = data.homeStarter.whip;
    const awayWHIP = data.awayStarter.whip;
    const avgWHIP = (homeWHIP + awayWHIP) / 2;
    
    const whipAdjustment = this.calculateWHIPImpact(avgWHIP);
    projectedTotal += whipAdjustment;
    factorsUsed.push('starter_whip');
    
    if (avgWHIP < 1.0) {
      insights.push('Exceptional command expected');
      confidenceAdjustments += 0.10;
    } else if (avgWHIP > 1.5) {
      insights.push('High baserunner volume likely');
      confidenceAdjustments += 0.08;
    }

    // Bullpen Analysis
    const homeBullpenERA = data.homeBullpen.era;
    const awayBullpenERA = data.awayBullpen.era;
    const avgBullpenERA = (homeBullpenERA + awayBullpenERA) / 2;
    
    const bullpenAdjustment = this.calculateBullpenImpact(avgBullpenERA);
    projectedTotal += bullpenAdjustment;
    factorsUsed.push('bullpen_era');
    
    if (avgBullpenERA > 5.0) {
      insights.push('Weak bullpen advantage for late-game scoring');
      confidenceAdjustments += 0.08;
    }

    // Fatigue Analysis
    const homeInnings = data.homeStarter.inningsPitched;
    const awayInnings = data.awayStarter.inningsPitched;
    
    const fatigueAdjustment = this.calculateFatigueImpact(homeInnings, awayInnings);
    projectedTotal += fatigueAdjustment;
    factorsUsed.push('innings_pitched');

    // Recent Form Analysis (if available)
    if (data.homeStarter.recentForm && data.awayStarter.recentForm) {
      const formAdjustment = this.calculateFormImpact(
        data.homeStarter.recentForm,
        data.awayStarter.recentForm
      );
      projectedTotal += formAdjustment;
      factorsUsed.push('recent_form');
      confidenceAdjustments += 0.05;
    }

    // Calculate base confidence
    let baseConfidence = this.parameters.confidenceThreshold + 0.15;
    
    // Adjust confidence based on data quality and factors
    const finalConfidence = Math.min(0.95, Math.max(0.50, 
      baseConfidence + confidenceAdjustments + 
      Math.abs(projectedTotal - 8.5) * 0.08
    ));

    // Generate reasoning
    const reasoning = this.generateReasoning(avgStarterERA, avgWHIP, avgBullpenERA, projectedTotal);

    return {
      total: Number(projectedTotal.toFixed(1)),
      confidence: Number(finalConfidence.toFixed(2)),
      reasoning,
      factorsUsed,
      insights,
    };
  }

  private calculateERAImpact(avgERA: number): number {
    if (avgERA < 2.5) return -2.0;
    if (avgERA < 3.0) return -1.5;
    if (avgERA < 3.5) return -0.8;
    if (avgERA < 4.0) return -0.3;
    if (avgERA > 5.5) return 1.8;
    if (avgERA > 5.0) return 1.2;
    if (avgERA > 4.5) return 0.6;
    return 0;
  }

  private calculateWHIPImpact(avgWHIP: number): number {
    if (avgWHIP < 1.0) return -0.5;
    if (avgWHIP < 1.15) return -0.3;
    if (avgWHIP > 1.5) return 0.5;
    if (avgWHIP > 1.35) return 0.3;
    return 0;
  }

  private calculateBullpenImpact(avgBullpenERA: number): number {
    if (avgBullpenERA > 5.0) return 0.8;
    if (avgBullpenERA > 4.5) return 0.5;
    if (avgBullpenERA < 3.0) return -0.5;
    if (avgBullpenERA < 3.5) return -0.3;
    return 0;
  }

  private calculateFatigueImpact(homeInnings: number, awayInnings: number): number {
    let adjustment = 0;
    if (homeInnings > 180 || awayInnings > 180) adjustment += 0.2;
    if (homeInnings < 50 || awayInnings < 50) adjustment -= 0.1;
    return adjustment;
  }

  private calculateFormImpact(homeForm: any, awayForm: any): number {
    // Calculate recent form impact if data is available
    if (!homeForm.lastFiveStarts || !awayForm.lastFiveStarts) return 0;
    
    const homeRecentERA = homeForm.lastFiveStarts.reduce((sum: number, start: any) => 
      sum + start.era, 0) / homeForm.lastFiveStarts.length;
    const awayRecentERA = awayForm.lastFiveStarts.reduce((sum: number, start: any) => 
      sum + start.era, 0) / awayForm.lastFiveStarts.length;
    
    const avgRecentERA = (homeRecentERA + awayRecentERA) / 2;
    
    if (avgRecentERA < 2.5) return -0.3;
    if (avgRecentERA > 6.0) return 0.4;
    return 0;
  }

  private generateReasoning(avgERA: number, avgWHIP: number, avgBullpenERA: number, total: number): string {
    const eraDescription = avgERA < 3.5 ? 'strong' : avgERA > 4.5 ? 'weak' : 'average';
    const whipDescription = avgWHIP < 1.2 ? 'excellent' : avgWHIP > 1.4 ? 'poor' : 'solid';
    const bullpenDescription = avgBullpenERA < 3.5 ? 'elite' : avgBullpenERA > 4.5 ? 'vulnerable' : 'adequate';
    
    return `Pitching analysis projects ${total} total runs. ` +
           `Starters show ${eraDescription} ERAs (${avgERA.toFixed(2)}) with ${whipDescription} command (WHIP ${avgWHIP.toFixed(2)}). ` +
           `Bullpens are ${bullpenDescription} (${avgBullpenERA.toFixed(2)} ERA). ` +
           `Recommendation: ${total > 8.5 ? 'Over' : 'Under'} based on pitching matchup analysis.`;
  }
}