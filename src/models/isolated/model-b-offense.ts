import {
  IsolatedModel,
  ModelInputData,
  ModelPrediction,
  ModelValidationResult,
  ModelParameters,
  OffenseModelData,
} from '../../types/model-interfaces.js';

export class ModelBOffense implements IsolatedModel {
  public readonly modelName = 'Model_B_Offense';
  public readonly version = '1.0.0';
  public readonly description = 'Offense-focused prediction model analyzing team hitting metrics and matchups';

  private readonly parameters: ModelParameters = {
    baseTotal: 8.0,
    confidenceThreshold: 0.5,
    weightFactors: {
      recentRunsPerGame: 0.40,
      teamOPS: 0.25,
      wOBA: 0.20,
      powerFactor: 0.10,
      discipline: 0.05,
    },
    adjustmentRanges: {
      recentFormAdjustment: { min: -2.0, max: 3.0 },
      opsAdjustment: { min: -1.0, max: 1.5 },
      wobaAdjustment: { min: -0.8, max: 1.0 },
      powerAdjustment: { min: -0.5, max: 0.8 },
      disciplineAdjustment: { min: -0.3, max: 0.3 },
    },
  };

  async predict(input: ModelInputData, modelSpecificData: OffenseModelData): Promise<ModelPrediction> {
    const validationResult = await this.validate(input, modelSpecificData);
    if (!validationResult.isValid) {
      throw new Error(`Model B validation failed: ${validationResult.errors.join(', ')}`);
    }

    const prediction = this.calculateOffensePrediction(modelSpecificData);
    
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

  async validate(input: ModelInputData, modelSpecificData: OffenseModelData): Promise<ModelValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // Validate required input data
    if (!input.gameId) missingFields.push('gameId');
    if (!input.homeTeam) missingFields.push('homeTeam');
    if (!input.awayTeam) missingFields.push('awayTeam');

    // Validate offense data structure
    if (!modelSpecificData) {
      errors.push('No offense data provided');
      return {
        isValid: false,
        errors,
        warnings,
        missingRequiredFields: missingFields,
        dataQualityScore: 0,
      };
    }

    // Validate home team offense data
    const homeOffense = modelSpecificData.homeTeamOffense;
    if (!homeOffense) {
      missingFields.push('homeTeamOffense');
    } else {
      this.validateTeamOffenseData(homeOffense, 'home', errors, warnings);
    }

    // Validate away team offense data
    const awayOffense = modelSpecificData.awayTeamOffense;
    if (!awayOffense) {
      missingFields.push('awayTeamOffense');
    } else {
      this.validateTeamOffenseData(awayOffense, 'away', errors, warnings);
    }

    // Cross-team validation warnings
    if (homeOffense && awayOffense) {
      const combinedRPG = homeOffense.runsPerGame + awayOffense.runsPerGame;
      if (combinedRPG < 6.0) {
        warnings.push('Low-scoring offensive matchup detected');
      } else if (combinedRPG > 12.0) {
        warnings.push('High-powered offensive matchup detected');
      }

      const avgOPS = (homeOffense.ops + awayOffense.ops) / 2;
      if (avgOPS < 0.650) {
        warnings.push('Below-average offensive production expected');
      } else if (avgOPS > 0.850) {
        warnings.push('Elite offensive capabilities present');
      }
    }

    // Calculate data quality score
    let qualityScore = 1.0;
    if (missingFields.length > 0) qualityScore -= 0.2 * missingFields.length;
    if (errors.length > 0) qualityScore -= 0.3 * errors.length;
    if (warnings.length > 0) qualityScore -= 0.05 * warnings.length;
    qualityScore = Math.max(0, Math.min(1, qualityScore));

    return {
      isValid: errors.length === 0 && missingFields.length === 0,
      errors,
      warnings,
      missingRequiredFields: missingFields,
      dataQualityScore: qualityScore,
    };
  }

  private validateTeamOffenseData(teamData: any, teamType: string, errors: string[], warnings: string[]): void {
    // Validate runs per game
    if (typeof teamData.runsPerGame !== 'number' || teamData.runsPerGame < 0 || teamData.runsPerGame > 15) {
      errors.push(`Invalid ${teamType} team runs per game`);
    }

    if (typeof teamData.recentRunsPerGame !== 'number' || teamData.recentRunsPerGame < 0 || teamData.recentRunsPerGame > 20) {
      errors.push(`Invalid ${teamType} team recent runs per game`);
    }

    // Validate OPS
    if (typeof teamData.ops !== 'number' || teamData.ops < 0.400 || teamData.ops > 1.200) {
      errors.push(`Invalid ${teamType} team OPS`);
    }

    // Validate wOBA
    if (typeof teamData.woba !== 'number' || teamData.woba < 0.250 || teamData.woba > 0.450) {
      errors.push(`Invalid ${teamType} team wOBA`);
    }

    // Validate batting average
    if (typeof teamData.battingAverage !== 'number' || teamData.battingAverage < 0.150 || teamData.battingAverage > 0.400) {
      errors.push(`Invalid ${teamType} team batting average`);
    }

    // Validate on-base percentage
    if (typeof teamData.onBasePercentage !== 'number' || teamData.onBasePercentage < 0.200 || teamData.onBasePercentage > 0.500) {
      errors.push(`Invalid ${teamType} team on-base percentage`);
    }

    // Validate slugging percentage
    if (typeof teamData.sluggingPercentage !== 'number' || teamData.sluggingPercentage < 0.250 || teamData.sluggingPercentage > 0.700) {
      errors.push(`Invalid ${teamType} team slugging percentage`);
    }

    // Warnings for unusual values
    if (teamData.homeRunsPerGame > 2.5) {
      warnings.push(`${teamType} team has exceptionally high home run rate`);
    }

    if (teamData.strikeoutsPerGame > 12) {
      warnings.push(`${teamType} team has very high strikeout rate`);
    }
  }

  getRequiredDataFields(): string[] {
    return [
      'homeTeamOffense.runsPerGame',
      'homeTeamOffense.recentRunsPerGame',
      'homeTeamOffense.ops',
      'homeTeamOffense.woba',
      'homeTeamOffense.battingAverage',
      'homeTeamOffense.onBasePercentage',
      'homeTeamOffense.sluggingPercentage',
      'awayTeamOffense.runsPerGame',
      'awayTeamOffense.recentRunsPerGame',
      'awayTeamOffense.ops',
      'awayTeamOffense.woba',
      'awayTeamOffense.battingAverage',
      'awayTeamOffense.onBasePercentage',
      'awayTeamOffense.sluggingPercentage',
    ];
  }

  getOptionalDataFields(): string[] {
    return [
      'homeTeamOffense.homeRunsPerGame',
      'homeTeamOffense.walksPerGame',
      'homeTeamOffense.strikeoutsPerGame',
      'homeTeamOffense.stolenBases',
      'homeTeamOffense.leftOnBase',
      'homeTeamOffense.risp',
      'homeTeamOffense.vsLeftyOps',
      'homeTeamOffense.vsRightyOps',
      'homeTeamOffense.homeVsAwayOps',
      'awayTeamOffense.homeRunsPerGame',
      'awayTeamOffense.walksPerGame',
      'awayTeamOffense.strikeoutsPerGame',
      'awayTeamOffense.stolenBases',
      'awayTeamOffense.leftOnBase',
      'awayTeamOffense.risp',
      'awayTeamOffense.vsLeftyOps',
      'awayTeamOffense.vsRightyOps',
      'awayTeamOffense.homeVsAwayOps',
      'matchupFactors',
    ];
  }

  getModelParameters(): ModelParameters {
    return { ...this.parameters }; // Return a copy to prevent mutation
  }

  private calculateOffensePrediction(data: OffenseModelData): {
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

    const homeOffense = data.homeTeamOffense;
    const awayOffense = data.awayTeamOffense;

    // Recent form analysis (highest weight)
    const homeRecentRPG = homeOffense.recentRunsPerGame;
    const awayRecentRPG = awayOffense.recentRunsPerGame;
    const combinedRecentRPG = homeRecentRPG + awayRecentRPG;
    
    const recentFormAdjustment = this.calculateRecentFormImpact(combinedRecentRPG);
    projectedTotal = combinedRecentRPG * 0.8 + projectedTotal * 0.2; // Heavy weight on recent form
    factorsUsed.push('recent_runs_per_game');
    
    if (combinedRecentRPG > 11.0) {
      insights.push('High-powered recent offensive production');
      confidenceAdjustments += 0.15;
    } else if (combinedRecentRPG < 6.0) {
      insights.push('Struggling recent offensive output');
      confidenceAdjustments += 0.10;
    }

    // OPS analysis
    const homeOPS = homeOffense.ops;
    const awayOPS = awayOffense.ops;
    const avgOPS = (homeOPS + awayOPS) / 2;
    
    const opsAdjustment = this.calculateOPSImpact(avgOPS);
    projectedTotal += opsAdjustment;
    factorsUsed.push('team_ops');
    
    if (avgOPS > 0.850) {
      insights.push('Elite offensive capabilities present');
      confidenceAdjustments += 0.12;
    } else if (avgOPS < 0.650) {
      insights.push('Below-average offensive production expected');
      confidenceAdjustments += 0.08;
    }

    // wOBA analysis (more predictive than OPS)
    const homeWOBA = homeOffense.woba;
    const awayWOBA = awayOffense.woba;
    const avgWOBA = (homeWOBA + awayWOBA) / 2;
    
    const wobaAdjustment = this.calculateWOBAImpact(avgWOBA);
    projectedTotal += wobaAdjustment;
    factorsUsed.push('woba');

    // Power factor analysis
    if (homeOffense.homeRunsPerGame !== undefined && awayOffense.homeRunsPerGame !== undefined) {
      const totalHRPerGame = homeOffense.homeRunsPerGame + awayOffense.homeRunsPerGame;
      const powerAdjustment = this.calculatePowerImpact(totalHRPerGame);
      projectedTotal += powerAdjustment;
      factorsUsed.push('home_runs_per_game');
      
      if (totalHRPerGame > 3.0) {
        insights.push('Significant power potential in matchup');
      }
    }

    // Plate discipline analysis
    if (homeOffense.walksPerGame !== undefined && awayOffense.walksPerGame !== undefined &&
        homeOffense.strikeoutsPerGame !== undefined && awayOffense.strikeoutsPerGame !== undefined) {
      
      const totalWalks = homeOffense.walksPerGame + awayOffense.walksPerGame;
      const totalStrikeouts = homeOffense.strikeoutsPerGame + awayOffense.strikeoutsPerGame;
      const disciplineFactor = totalWalks / totalStrikeouts;
      
      const disciplineAdjustment = this.calculateDisciplineImpact(disciplineFactor);
      projectedTotal += disciplineAdjustment;
      factorsUsed.push('plate_discipline');
      
      if (disciplineFactor > 0.5) {
        insights.push('Patient approach should create scoring opportunities');
      } else if (disciplineFactor < 0.3) {
        insights.push('Aggressive hitting may limit rally potential');
      }
    }

    // RISP analysis (clutch hitting)
    if (homeOffense.risp !== undefined && awayOffense.risp !== undefined) {
      const avgRISP = (homeOffense.risp + awayOffense.risp) / 2;
      if (avgRISP > 0.280) {
        projectedTotal += 0.3;
        insights.push('Strong clutch hitting expected');
        confidenceAdjustments += 0.05;
      } else if (avgRISP < 0.230) {
        projectedTotal -= 0.2;
        insights.push('Struggles with runners in scoring position');
      }
      factorsUsed.push('risp_average');
    }

    // Matchup factors (if available)
    if (data.matchupFactors) {
      const matchupAdjustment = this.calculateMatchupImpact(data.matchupFactors);
      projectedTotal += matchupAdjustment;
      factorsUsed.push('matchup_factors');
      confidenceAdjustments += 0.08;
    }

    // Calculate base confidence
    let baseConfidence = this.parameters.confidenceThreshold + 0.15;
    
    // Adjust confidence based on data quality and factors
    const finalConfidence = Math.min(0.95, Math.max(0.50, 
      baseConfidence + confidenceAdjustments + 
      Math.abs(projectedTotal - 8.5) * 0.06
    ));

    // Generate reasoning
    const reasoning = this.generateReasoning(combinedRecentRPG, avgOPS, avgWOBA, projectedTotal);

    return {
      total: Number(projectedTotal.toFixed(1)),
      confidence: Number(finalConfidence.toFixed(2)),
      reasoning,
      factorsUsed,
      insights,
    };
  }

  private calculateRecentFormImpact(combinedRPG: number): number {
    // Recent form has the highest impact in this model
    if (combinedRPG > 12.0) return 1.5;
    if (combinedRPG > 10.0) return 1.0;
    if (combinedRPG > 8.5) return 0.3;
    if (combinedRPG < 5.0) return -1.2;
    if (combinedRPG < 6.5) return -0.8;
    return 0;
  }

  private calculateOPSImpact(avgOPS: number): number {
    if (avgOPS > 0.850) return 1.0;
    if (avgOPS > 0.800) return 0.8;
    if (avgOPS > 0.750) return 0.3;
    if (avgOPS < 0.650) return -0.8;
    if (avgOPS < 0.700) return -0.5;
    return 0;
  }

  private calculateWOBAImpact(avgWOBA: number): number {
    if (avgWOBA > 0.360) return 0.6;
    if (avgWOBA > 0.340) return 0.4;
    if (avgWOBA > 0.320) return 0.1;
    if (avgWOBA < 0.300) return -0.5;
    if (avgWOBA < 0.310) return -0.3;
    return 0;
  }

  private calculatePowerImpact(totalHR: number): number {
    if (totalHR > 3.0) return 0.5;
    if (totalHR > 2.5) return 0.3;
    if (totalHR < 1.5) return -0.3;
    return 0;
  }

  private calculateDisciplineImpact(disciplineFactor: number): number {
    if (disciplineFactor > 0.5) return 0.2;
    if (disciplineFactor < 0.3) return -0.2;
    return 0;
  }

  private calculateMatchupImpact(matchupFactors: any): number {
    let adjustment = 0;
    
    if (matchupFactors.homeTeamRecentForm) {
      adjustment += (matchupFactors.homeTeamRecentForm - 1.0) * 0.3;
    }
    
    if (matchupFactors.awayTeamRecentForm) {
      adjustment += (matchupFactors.awayTeamRecentForm - 1.0) * 0.3;
    }
    
    return Math.max(-0.8, Math.min(0.8, adjustment));
  }

  private generateReasoning(combinedRPG: number, avgOPS: number, avgWOBA: number, total: number): string {
    const recentFormDescription = combinedRPG > 10.0 ? 'explosive' : 
                                  combinedRPG > 8.0 ? 'solid' : 'struggling';
    const opsDescription = avgOPS > 0.800 ? 'strong' : avgOPS < 0.700 ? 'weak' : 'adequate';
    const wobaDescription = avgWOBA > 0.340 ? 'elite' : avgWOBA < 0.310 ? 'poor' : 'average';
    
    return `Offensive analysis projects ${total} total runs. ` +
           `Teams showing ${recentFormDescription} recent production (${combinedRPG.toFixed(1)} combined RPG). ` +
           `${opsDescription} power metrics (${avgOPS.toFixed(3)} OPS) with ${wobaDescription} overall hitting (${avgWOBA.toFixed(3)} wOBA). ` +
           `Recommendation: ${total > 8.5 ? 'Over' : 'Under'} based on offensive matchup analysis.`;
  }
}