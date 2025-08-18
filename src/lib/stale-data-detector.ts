/**
 * Stale Data Detection and Alert System
 * 
 * Monitors data freshness across all sources and provides alerts
 * when cached/stale data is being used in predictions
 */

export interface DataFreshnessCheck {
  source: string;
  data_type: string;
  timestamp: number;
  age_minutes: number;
  max_age_minutes: number;
  is_stale: boolean;
  severity: 'info' | 'warning' | 'critical';
  impact_on_prediction: 'low' | 'medium' | 'high';
}

export interface StaleDataReport {
  timestamp: number;
  total_sources_checked: number;
  stale_sources: number;
  critical_issues: number;
  warning_issues: number;
  checks: DataFreshnessCheck[];
  overall_status: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
}

export class StaleDataDetector {
  private readonly DATA_FRESHNESS_LIMITS = {
    weather: { max_age_minutes: 60, impact: 'high' as const },
    odds: { max_age_minutes: 15, impact: 'high' as const },
    game_data: { max_age_minutes: 360, impact: 'medium' as const }, // 6 hours
    pitcher_stats: { max_age_minutes: 1440, impact: 'medium' as const }, // 24 hours
    team_stats: { max_age_minutes: 1440, impact: 'low' as const }, // 24 hours
    injury_reports: { max_age_minutes: 720, impact: 'medium' as const }, // 12 hours
    lineup_data: { max_age_minutes: 180, impact: 'high' as const }, // 3 hours
    umpire_assignments: { max_age_minutes: 1440, impact: 'low' as const } // 24 hours
  };

  /**
   * Check data freshness for a single source
   */
  checkDataFreshness(
    source: string,
    dataType: keyof typeof this.DATA_FRESHNESS_LIMITS,
    dataTimestamp: number
  ): DataFreshnessCheck {
    const now = Date.now();
    const ageMs = now - dataTimestamp;
    const ageMinutes = Math.floor(ageMs / 60000);
    
    const limits = this.DATA_FRESHNESS_LIMITS[dataType];
    const isStale = ageMinutes > limits.max_age_minutes;
    
    let severity: 'info' | 'warning' | 'critical' = 'info';
    
    if (isStale) {
      if (limits.impact === 'high') {
        severity = 'critical';
      } else if (limits.impact === 'medium') {
        severity = 'warning';
      } else {
        severity = 'info';
      }
    }

    return {
      source,
      data_type: dataType,
      timestamp: dataTimestamp,
      age_minutes: ageMinutes,
      max_age_minutes: limits.max_age_minutes,
      is_stale: isStale,
      severity,
      impact_on_prediction: limits.impact
    };
  }

  /**
   * Check multiple data sources and generate comprehensive report
   */
  generateStaleDataReport(dataSources: Array<{
    source: string;
    type: keyof typeof this.DATA_FRESHNESS_LIMITS;
    timestamp: number;
  }>): StaleDataReport {
    const checks = dataSources.map(ds => 
      this.checkDataFreshness(ds.source, ds.type, ds.timestamp)
    );

    const staleChecks = checks.filter(check => check.is_stale);
    const criticalIssues = checks.filter(check => check.severity === 'critical').length;
    const warningIssues = checks.filter(check => check.severity === 'warning').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (criticalIssues > 0) {
      overallStatus = 'critical';
    } else if (warningIssues > 0 || staleChecks.length > 2) {
      overallStatus = 'degraded';
    }

    const recommendations = this.generateRecommendations(checks);

    return {
      timestamp: Date.now(),
      total_sources_checked: dataSources.length,
      stale_sources: staleChecks.length,
      critical_issues: criticalIssues,
      warning_issues: warningIssues,
      checks,
      overall_status: overallStatus,
      recommendations
    };
  }

  /**
   * Generate actionable recommendations based on stale data findings
   */
  private generateRecommendations(checks: DataFreshnessCheck[]): string[] {
    const recommendations: string[] = [];
    const criticalChecks = checks.filter(c => c.severity === 'critical');
    const warningChecks = checks.filter(c => c.severity === 'warning');

    if (criticalChecks.length > 0) {
      recommendations.push('🚨 STOP PREDICTIONS: Critical data sources are stale');
      
      criticalChecks.forEach(check => {
        if (check.data_type === 'weather') {
          recommendations.push(`• Refresh weather data for ${check.source} (${check.age_minutes}min old)`);
        } else if (check.data_type === 'odds') {
          recommendations.push(`• Refresh betting odds data (${check.age_minutes}min old)`);
        } else if (check.data_type === 'lineup_data') {
          recommendations.push(`• Verify starting lineups are current (${check.age_minutes}min old)`);
        }
      });
    }

    if (warningChecks.length > 0) {
      recommendations.push('⚠️ REDUCE CONFIDENCE: Some data sources are aging');
      recommendations.push(`• Apply ${warningChecks.length * 5}% confidence penalty`);
    }

    if (checks.some(c => c.data_type === 'weather' && c.is_stale)) {
      recommendations.push('• Consider using backup weather service');
      recommendations.push('• Add dome game preference until weather data improves');
    }

    if (checks.some(c => c.data_type === 'odds' && c.is_stale)) {
      recommendations.push('• Disable market-based predictions');
      recommendations.push('• Use historical closing line estimates');
    }

    return recommendations;
  }

  /**
   * Format stale data report for console output
   */
  formatReportForConsole(report: StaleDataReport): string {
    const lines: string[] = [];
    
    lines.push('📊 DATA FRESHNESS REPORT');
    lines.push('========================');
    lines.push(`🕐 Generated: ${new Date(report.timestamp).toLocaleString()}`);
    lines.push(`📈 Overall Status: ${this.getStatusEmoji(report.overall_status)} ${report.overall_status.toUpperCase()}`);
    lines.push(`🔍 Sources Checked: ${report.total_sources_checked}`);
    lines.push(`⚠️  Stale Sources: ${report.stale_sources}`);
    lines.push(`🚨 Critical Issues: ${report.critical_issues}`);
    lines.push(`⚠️  Warning Issues: ${report.warning_issues}`);
    lines.push('');

    if (report.checks.some(c => c.is_stale)) {
      lines.push('🔍 STALE DATA DETAILS:');
      lines.push('───────────────────────');
      
      report.checks
        .filter(c => c.is_stale)
        .sort((a, b) => b.age_minutes - a.age_minutes)
        .forEach(check => {
          const severityEmoji = check.severity === 'critical' ? '🚨' : 
                               check.severity === 'warning' ? '⚠️' : 'ℹ️';
          lines.push(`${severityEmoji} ${check.source} (${check.data_type})`);
          lines.push(`   Age: ${check.age_minutes}min (max: ${check.max_age_minutes}min)`);
          lines.push(`   Impact: ${check.impact_on_prediction.toUpperCase()}`);
          lines.push('');
        });
    }

    if (report.recommendations.length > 0) {
      lines.push('💡 RECOMMENDATIONS:');
      lines.push('───────────────────');
      report.recommendations.forEach(rec => lines.push(rec));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Check if predictions should be halted due to stale data
   */
  shouldHaltPredictions(report: StaleDataReport): boolean {
    return report.overall_status === 'critical';
  }

  /**
   * Calculate confidence penalty based on data staleness
   */
  calculateConfidencePenalty(report: StaleDataReport): number {
    let penalty = 0;
    
    report.checks.forEach(check => {
      if (check.is_stale) {
        if (check.impact_on_prediction === 'high') {
          penalty += 15;
        } else if (check.impact_on_prediction === 'medium') {
          penalty += 8;
        } else {
          penalty += 3;
        }
      }
    });

    // Cap penalty at 50%
    return Math.min(penalty, 50);
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  }
}

export const staleDataDetector = new StaleDataDetector();