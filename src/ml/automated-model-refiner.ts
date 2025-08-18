#!/usr/bin/env node

/**
 * Automated Model Refinement System
 * 
 * Automatically applies model adjustments based on validation analysis
 * with safety controls and gradual implementation.
 * 
 * Features:
 * - Gradual parameter adjustment (prevents over-correction)
 * - Risk-based implementation (low risk = auto, high risk = manual approval)
 * - A/B testing capability for parameter changes
 * - Rollback functionality if performance degrades
 * - Comprehensive change logging
 */

import * as fs from 'fs';
import { HistoricalValidationEngine, ModelAdjustment, ValidationReport } from './historical-validation-engine';
import { HolisticModelAnalyzer } from '../scripts/holistic-impact-analyzer';

interface RefinementSession {
  sessionId: string;
  timestamp: string;
  validationReportId: string;
  adjustmentsApplied: AppliedAdjustment[];
  preRefinementMetrics: {
    mae: number;
    accuracy: number;
    bias: number;
  };
  postRefinementMetrics?: {
    mae: number;
    accuracy: number;
    bias: number;
  };
  status: 'Pending' | 'Applied' | 'Testing' | 'Successful' | 'Rolled Back';
  testingPeriodEnd?: string;
}

interface AppliedAdjustment {
  adjustmentId: string;
  parameter: string;
  component: string;
  oldValue: number;
  newValue: number;
  implementationMethod: 'Immediate' | 'Gradual' | 'A/B_Test' | 'Manual_Approval_Required';
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  appliedAt: string;
  expectedImprovement: number;
  actualImprovement?: number;
}

interface ModelParameters {
  // Baseline parameters
  august_baseline: number;
  
  // Pitching parameters
  elite_pitcher_adjustment: number;
  august_pitcher_dominance: number;
  
  // Weather parameters
  hot_weather_coefficient: number;
  extreme_heat_coefficient: number;
  wind_adjustment_factor: number;
  
  // Venue parameters
  coors_field_adjustment: number;
  pitcher_friendly_multiplier: number;
  
  // Offense parameters
  high_offense_team_boost: number;
  weak_offense_penalty: number;
  
  lastUpdated: string;
  version: string;
}

class AutomatedModelRefiner {
  private validationEngine: HistoricalValidationEngine;
  private holisticAnalyzer: HolisticModelAnalyzer;
  private refinementSessions: RefinementSession[] = [];
  private currentParameters: ModelParameters;
  private readonly parametersPath = '/Users/davidloake/Downloads/mlb/data/model-parameters.json';
  private readonly sessionsPath = '/Users/davidloake/Downloads/mlb/data/refinement-sessions.json';
  
  constructor() {
    this.validationEngine = new HistoricalValidationEngine();
    this.holisticAnalyzer = new HolisticModelAnalyzer();
    this.loadCurrentParameters();
    this.loadRefinementSessions();
  }
  
  /**
   * Main refinement workflow - analyzes validation results and applies improvements
   */
  async refineModel(): Promise<RefinementSession> {
    console.log('🤖 AUTOMATED MODEL REFINEMENT');
    console.log('==============================');
    
    // Step 1: Run validation analysis
    const validationReport = this.validationEngine.runValidationAnalysis();
    
    if (validationReport.gamesAnalyzed < 10) {
      console.log('⚠️ Insufficient data for refinement');
      return this.createEmptySession(validationReport);
    }
    
    // Step 2: Filter adjustments by risk and confidence
    const safeAdjustments = this.filterSafeAdjustments(validationReport.suggestedAdjustments);
    const riskyAdjustments = validationReport.suggestedAdjustments.filter(adj => 
      !safeAdjustments.includes(adj)
    );
    
    console.log(`\n📊 REFINEMENT ANALYSIS`);
    console.log(`======================`);
    console.log(`Total suggested adjustments: ${validationReport.suggestedAdjustments.length}`);
    console.log(`Safe for auto-implementation: ${safeAdjustments.length}`);
    console.log(`Require manual approval: ${riskyAdjustments.length}`);
    
    // Step 3: Create refinement session
    const session: RefinementSession = {
      sessionId: `refinement_${Date.now()}`,
      timestamp: new Date().toISOString(),
      validationReportId: validationReport.reportId,
      adjustmentsApplied: [],
      preRefinementMetrics: {
        mae: validationReport.overallMetrics.meanAbsoluteError,
        accuracy: validationReport.overallMetrics.accuracy,
        bias: validationReport.overallMetrics.bias
      },
      status: 'Pending'
    };
    
    // Step 4: Apply safe adjustments automatically
    for (const adjustment of safeAdjustments) {
      await this.applySafeAdjustment(adjustment, session);
    }
    
    // Step 5: Log risky adjustments for manual review
    if (riskyAdjustments.length > 0) {
      console.log(`\n⚠️ HIGH RISK ADJUSTMENTS - MANUAL APPROVAL REQUIRED`);
      console.log(`==================================================`);
      riskyAdjustments.forEach(adj => {
        console.log(`${adj.component}.${adj.parameter}: ${adj.currentValue} → ${adj.suggestedValue.toFixed(2)}`);
        console.log(`  Risk: ${adj.riskLevel}, Confidence: ${adj.confidence}%`);
        console.log(`  Rationale: ${adj.rationale}`);
        console.log(`  Expected improvement: ${adj.expectedImprovement.toFixed(2)} runs\n`);
      });
    }
    
    // Step 6: Set testing period if adjustments were made
    if (session.adjustmentsApplied.length > 0) {
      session.status = 'Testing';
      const testingEnd = new Date();
      testingEnd.setDate(testingEnd.getDate() + 7); // 7-day testing period
      session.testingPeriodEnd = testingEnd.toISOString();
      
      console.log(`\n⏰ TESTING PERIOD INITIATED`);
      console.log(`==========================`);
      console.log(`Testing until: ${testingEnd.toISOString().split('T')[0]}`);
      console.log(`Will automatically evaluate results after testing period`);
    }
    
    this.refinementSessions.push(session);
    this.saveRefinementSessions();
    
    return session;
  }
  
  /**
   * Filter adjustments that are safe for automatic implementation
   */
  private filterSafeAdjustments(adjustments: ModelAdjustment[]): ModelAdjustment[] {
    return adjustments.filter(adj => {
      // Auto-implement if:
      // 1. Low risk AND high confidence (>80%)
      // 2. OR Medium risk AND very high confidence (>90%) AND small change
      
      if (adj.riskLevel === 'Low' && adj.confidence >= 80) {
        return true;
      }
      
      if (adj.riskLevel === 'Medium' && adj.confidence >= 90) {
        const changeSize = Math.abs(adj.suggestedValue - adj.currentValue);
        return changeSize <= 0.5; // Small change threshold
      }
      
      return false;
    });
  }
  
  /**
   * Apply a safe adjustment with gradual implementation
   */
  private async applySafeAdjustment(adjustment: ModelAdjustment, session: RefinementSession): Promise<void> {
    console.log(`\n🔧 APPLYING SAFE ADJUSTMENT`);
    console.log(`===========================`);
    console.log(`Parameter: ${adjustment.component}.${adjustment.parameter}`);
    console.log(`Change: ${adjustment.currentValue} → ${adjustment.suggestedValue.toFixed(2)}`);
    console.log(`Method: Gradual implementation`);
    
    // Calculate gradual change (50% of suggested change initially)
    const changeAmount = (adjustment.suggestedValue - adjustment.currentValue) * 0.5;
    const newValue = adjustment.currentValue + changeAmount;
    
    // Run holistic impact analysis first
    const holisticAnalysis = this.holisticAnalyzer.analyzeProposedChange(
      adjustment.component,
      adjustment.parameter,
      adjustment.currentValue,
      newValue,
      `Automated refinement: ${adjustment.rationale} (50% gradual implementation)`
    );
    
    // Only proceed if holistic analysis approves
    if (holisticAnalysis.recommendation === 'Proceed' || 
        holisticAnalysis.recommendation === 'Proceed with Caution') {
      
      // Update parameter
      this.updateParameter(adjustment.parameter, newValue);
      
      // Record the applied adjustment
      const appliedAdjustment: AppliedAdjustment = {
        adjustmentId: `adj_${Date.now()}`,
        parameter: adjustment.parameter,
        component: adjustment.component,
        oldValue: adjustment.currentValue,
        newValue: newValue,
        implementationMethod: 'Gradual',
        confidence: adjustment.confidence,
        riskLevel: adjustment.riskLevel,
        appliedAt: new Date().toISOString(),
        expectedImprovement: adjustment.expectedImprovement
      };
      
      session.adjustmentsApplied.push(appliedAdjustment);
      
      // Record in holistic tracking system
      this.holisticAnalyzer.recordModelChange(holisticAnalysis, true);
      
      console.log(`✅ Applied gradual adjustment: ${adjustment.parameter} = ${newValue.toFixed(2)}`);
      
    } else {
      console.log(`⚠️ Holistic analysis rejected adjustment: ${holisticAnalysis.recommendation}`);
    }
  }
  
  /**
   * Update a specific model parameter
   */
  private updateParameter(parameter: string, value: number): void {
    (this.currentParameters as any)[parameter] = value;
    this.currentParameters.lastUpdated = new Date().toISOString();
    this.currentParameters.version = `v${Date.now()}`;
    this.saveCurrentParameters();
  }
  
  /**
   * Evaluate completed testing periods and determine success/failure
   */
  evaluateTestingSessions(): void {
    const testingSessions = this.refinementSessions.filter(session => 
      session.status === 'Testing' && 
      session.testingPeriodEnd && 
      new Date(session.testingPeriodEnd) <= new Date()
    );
    
    if (testingSessions.length === 0) {
      console.log('No testing sessions ready for evaluation');
      return;
    }
    
    console.log(`\n🧪 EVALUATING TESTING SESSIONS`);
    console.log(`==============================`);
    
    testingSessions.forEach(session => {
      console.log(`\nEvaluating session: ${session.sessionId}`);
      
      // Run new validation to get post-refinement metrics
      const currentValidation = this.validationEngine.runValidationAnalysis();
      
      session.postRefinementMetrics = {
        mae: currentValidation.overallMetrics.meanAbsoluteError,
        accuracy: currentValidation.overallMetrics.accuracy,
        bias: currentValidation.overallMetrics.bias
      };
      
      // Evaluate success
      const maeImprovement = session.preRefinementMetrics.mae - session.postRefinementMetrics.mae;
      const accuracyImprovement = session.postRefinementMetrics.accuracy - session.preRefinementMetrics.accuracy;
      
      console.log(`MAE change: ${session.preRefinementMetrics.mae.toFixed(2)} → ${session.postRefinementMetrics.mae.toFixed(2)} (${maeImprovement >= 0 ? '+' : ''}${maeImprovement.toFixed(2)})`);
      console.log(`Accuracy change: ${session.preRefinementMetrics.accuracy.toFixed(1)}% → ${session.postRefinementMetrics.accuracy.toFixed(1)}% (${accuracyImprovement >= 0 ? '+' : ''}${accuracyImprovement.toFixed(1)}%)`);
      
      // Success criteria: MAE improvement >= 0.1 OR accuracy improvement >= 2%
      if (maeImprovement >= 0.1 || accuracyImprovement >= 2.0) {
        session.status = 'Successful';
        console.log(`✅ Session successful - improvements maintained`);
        
        // Apply remaining 50% of gradual adjustments
        this.applyRemainingGradualAdjustments(session);
        
      } else if (maeImprovement < -0.2 || accuracyImprovement < -3.0) {
        session.status = 'Rolled Back';
        console.log(`❌ Session failed - rolling back changes`);
        
        // Rollback all adjustments
        this.rollbackSession(session);
        
      } else {
        session.status = 'Applied';
        console.log(`➡️ Session marginally successful - keeping current changes`);
      }
    });
    
    this.saveRefinementSessions();
  }
  
  /**
   * Apply the remaining 50% of gradual adjustments for successful sessions
   */
  private applyRemainingGradualAdjustments(session: RefinementSession): void {
    console.log(`\n🔧 APPLYING REMAINING GRADUAL ADJUSTMENTS`);
    console.log(`========================================`);
    
    session.adjustmentsApplied.forEach(applied => {
      if (applied.implementationMethod === 'Gradual') {
        // Calculate the remaining 50%
        const remainingChange = (applied.newValue - applied.oldValue);
        const finalValue = applied.newValue + remainingChange;
        
        console.log(`Completing ${applied.parameter}: ${applied.newValue.toFixed(2)} → ${finalValue.toFixed(2)}`);
        
        this.updateParameter(applied.parameter, finalValue);
        applied.newValue = finalValue; // Update the record
      }
    });
  }
  
  /**
   * Rollback all changes from a failed session
   */
  private rollbackSession(session: RefinementSession): void {
    console.log(`\n🔄 ROLLING BACK SESSION ${session.sessionId}`);
    console.log(`=====================================`);
    
    session.adjustmentsApplied.forEach(applied => {
      console.log(`Reverting ${applied.parameter}: ${applied.newValue.toFixed(2)} → ${applied.oldValue}`);
      this.updateParameter(applied.parameter, applied.oldValue);
    });
  }
  
  /**
   * Generate refinement summary report
   */
  generateRefinementReport(): void {
    console.log(`\n📈 MODEL REFINEMENT SUMMARY`);
    console.log(`===========================`);
    
    const totalSessions = this.refinementSessions.length;
    const successfulSessions = this.refinementSessions.filter(s => s.status === 'Successful').length;
    const rolledBackSessions = this.refinementSessions.filter(s => s.status === 'Rolled Back').length;
    const testingSessions = this.refinementSessions.filter(s => s.status === 'Testing').length;
    
    console.log(`Total refinement sessions: ${totalSessions}`);
    console.log(`Successful: ${successfulSessions}`);
    console.log(`Rolled back: ${rolledBackSessions}`);
    console.log(`Currently testing: ${testingSessions}`);
    
    if (totalSessions > 0) {
      const successRate = (successfulSessions / totalSessions) * 100;
      console.log(`Success rate: ${successRate.toFixed(1)}%`);
    }
    
    console.log(`\nCurrent model version: ${this.currentParameters.version}`);
    console.log(`Last updated: ${this.currentParameters.lastUpdated}`);
    
    // Show recent parameter changes
    const recentSessions = this.refinementSessions.slice(-3);
    if (recentSessions.length > 0) {
      console.log(`\n🔧 RECENT PARAMETER CHANGES`);
      console.log(`===========================`);
      recentSessions.forEach(session => {
        session.adjustmentsApplied.forEach(adj => {
          console.log(`${adj.appliedAt.split('T')[0]}: ${adj.parameter} = ${adj.newValue.toFixed(2)} (was ${adj.oldValue.toFixed(2)})`);
        });
      });
    }
  }
  
  private createEmptySession(validationReport: ValidationReport): RefinementSession {
    return {
      sessionId: `refinement_empty_${Date.now()}`,
      timestamp: new Date().toISOString(),
      validationReportId: validationReport.reportId,
      adjustmentsApplied: [],
      preRefinementMetrics: {
        mae: 0,
        accuracy: 0,
        bias: 0
      },
      status: 'Pending'
    };
  }
  
  private loadCurrentParameters(): void {
    try {
      if (fs.existsSync(this.parametersPath)) {
        const data = fs.readFileSync(this.parametersPath, 'utf8');
        this.currentParameters = JSON.parse(data);
      } else {
        // Initialize with current model defaults
        this.currentParameters = {
          august_baseline: 7.6,
          elite_pitcher_adjustment: -1.5,
          august_pitcher_dominance: -0.2,
          hot_weather_coefficient: 0.35,
          extreme_heat_coefficient: 0.38,
          wind_adjustment_factor: 0.2,
          coors_field_adjustment: 4.0,
          pitcher_friendly_multiplier: 1.0,
          high_offense_team_boost: 0.6,
          weak_offense_penalty: -0.4,
          lastUpdated: new Date().toISOString(),
          version: 'v1.0.0'
        };
        this.saveCurrentParameters();
      }
    } catch (error) {
      console.error('Failed to load parameters:', error);
    }
  }
  
  private saveCurrentParameters(): void {
    try {
      fs.writeFileSync(this.parametersPath, JSON.stringify(this.currentParameters, null, 2));
    } catch (error) {
      console.error('Failed to save parameters:', error);
    }
  }
  
  private loadRefinementSessions(): void {
    try {
      if (fs.existsSync(this.sessionsPath)) {
        const data = fs.readFileSync(this.sessionsPath, 'utf8');
        this.refinementSessions = JSON.parse(data);
      }
    } catch (error) {
      console.log('Starting with empty refinement sessions');
      this.refinementSessions = [];
    }
  }
  
  private saveRefinementSessions(): void {
    try {
      fs.writeFileSync(this.sessionsPath, JSON.stringify(this.refinementSessions, null, 2));
    } catch (error) {
      console.error('Failed to save refinement sessions:', error);
    }
  }
}

export { AutomatedModelRefiner, RefinementSession, AppliedAdjustment, ModelParameters };