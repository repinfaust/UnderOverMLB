import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Model-Specific Logic Unit Tests', () => {
  describe('Model A (Pitching) Specific Tests', () => {
    const calculatePitchingImpact = (
      homeERA: number,
      awayERA: number,
      homeWHIP: number,
      awayWHIP: number,
      homeBullpenERA: number,
      awayBullpenERA: number
    ): { total: number; confidence: number; factors: string[] } => {
      const baseTotal = 9.0;
      let adjustedTotal = baseTotal;
      const factors: string[] = [];
      let confidenceBonus = 0;

      // Starter ERA impact
      const avgERA = (homeERA + awayERA) / 2;
      if (avgERA < 2.5) {
        adjustedTotal -= 2.0;
        confidenceBonus += 0.15;
        factors.push('elite_starters');
      } else if (avgERA < 3.0) {
        adjustedTotal -= 1.5;
        factors.push('strong_starters');
      } else if (avgERA > 5.5) {
        adjustedTotal += 1.8;
        confidenceBonus += 0.10;
        factors.push('weak_starters');
      }

      // WHIP impact
      const avgWHIP = (homeWHIP + awayWHIP) / 2;
      if (avgWHIP < 1.0) {
        adjustedTotal -= 0.5;
        factors.push('elite_command');
      } else if (avgWHIP > 1.5) {
        adjustedTotal += 0.5;
        factors.push('poor_command');
      }

      // Bullpen impact
      const avgBullpenERA = (homeBullpenERA + awayBullpenERA) / 2;
      if (avgBullpenERA > 5.0) {
        adjustedTotal += 0.8;
        factors.push('weak_bullpen');
      } else if (avgBullpenERA < 3.0) {
        adjustedTotal -= 0.5;
        factors.push('strong_bullpen');
      }

      const baseConfidence = 0.65;
      const finalConfidence = Math.min(0.95, baseConfidence + confidenceBonus);

      return {
        total: Number(adjustedTotal.toFixed(1)),
        confidence: Number(finalConfidence.toFixed(2)),
        factors,
      };
    };

    test('should heavily favor under with elite pitching', () => {
      const result = calculatePitchingImpact(2.1, 2.3, 0.95, 1.05, 2.8, 2.9);
      
      expect(result.total).toBeLessThan(8.0);
      expect(result.confidence).toBeGreaterThan(0.75);
      expect(result.factors).toContain('elite_starters');
      expect(result.factors).toContain('elite_command');
      expect(result.factors).toContain('strong_bullpen');
    });

    test('should favor over with poor pitching across the board', () => {
      const result = calculatePitchingImpact(6.2, 5.8, 1.65, 1.55, 5.5, 5.2);
      
      expect(result.total).toBeGreaterThan(10.0);
      expect(result.confidence).toBeGreaterThan(0.70);
      expect(result.factors).toContain('weak_starters');
      expect(result.factors).toContain('poor_command');
      expect(result.factors).toContain('weak_bullpen');
    });

    test('should handle mixed pitching scenarios', () => {
      // Good starters, poor bullpen
      const result1 = calculatePitchingImpact(2.8, 3.1, 1.15, 1.22, 5.8, 4.9);
      expect(result1.factors).toContain('strong_starters');
      expect(result1.factors).toContain('weak_bullpen');

      // Poor starters, good bullpen
      const result2 = calculatePitchingImpact(5.8, 5.3, 1.45, 1.52, 2.5, 2.8);
      expect(result2.factors).toContain('weak_starters');
      expect(result2.factors).toContain('strong_bullpen');
    });

    test('should validate pitching model consistency', () => {
      const scenarios = [
        { homeERA: 3.0, awayERA: 3.0, homeWHIP: 1.2, awayWHIP: 1.2, homeBullpen: 3.5, awayBullpen: 3.5 },
        { homeERA: 2.0, awayERA: 2.0, homeWHIP: 0.9, awayWHIP: 0.9, homeBullpen: 2.5, awayBullpen: 2.5 },
        { homeERA: 6.0, awayERA: 6.0, homeWHIP: 1.6, awayWHIP: 1.6, homeBullpen: 5.5, awayBullpen: 5.5 },
      ];

      const results = scenarios.map(s => 
        calculatePitchingImpact(s.homeERA, s.awayERA, s.homeWHIP, s.awayWHIP, s.homeBullpen, s.awayBullpen)
      );

      // Better pitching should always result in lower totals
      expect(results[1].total).toBeLessThan(results[0].total);
      expect(results[0].total).toBeLessThan(results[2].total);
      
      // Confidence should be higher for extreme scenarios
      expect(results[1].confidence).toBeGreaterThan(results[0].confidence);
      expect(results[2].confidence).toBeGreaterThan(results[0].confidence);
    });

    test('should factor in recent pitcher performance', () => {
      const assessRecentForm = (
        lastFiveStarts: Array<{ era: number; inningsPitched: number }>
      ): { adjustment: number; factor: string } => {
        if (lastFiveStarts.length < 3) {
          return { adjustment: 0, factor: 'insufficient_data' };
        }

        const recentERA = lastFiveStarts.reduce((sum, start) => sum + start.era, 0) / lastFiveStarts.length;
        const avgInnings = lastFiveStarts.reduce((sum, start) => sum + start.inningsPitched, 0) / lastFiveStarts.length;

        let adjustment = 0;
        let factor = 'neutral_form';

        if (recentERA < 2.0 && avgInnings > 6.0) {
          adjustment = -0.4;
          factor = 'dominant_form';
        } else if (recentERA > 6.0 || avgInnings < 4.0) {
          adjustment = 0.5;
          factor = 'struggling_form';
        }

        return { adjustment, factor };
      };

      const dominantForm = [
        { era: 1.5, inningsPitched: 7.0 },
        { era: 1.8, inningsPitched: 6.5 },
        { era: 1.2, inningsPitched: 8.0 },
        { era: 2.1, inningsPitched: 7.5 },
        { era: 1.9, inningsPitched: 6.0 },
      ];

      const strugglingForm = [
        { era: 7.2, inningsPitched: 3.5 },
        { era: 6.8, inningsPitched: 4.0 },
        { era: 8.1, inningsPitched: 2.5 },
        { era: 5.9, inningsPitched: 5.0 },
        { era: 7.5, inningsPitched: 3.0 },
      ];

      const dominantResult = assessRecentForm(dominantForm);
      const strugglingResult = assessRecentForm(strugglingForm);

      expect(dominantResult.adjustment).toBeLessThan(0);
      expect(dominantResult.factor).toBe('dominant_form');
      expect(strugglingResult.adjustment).toBeGreaterThan(0);
      expect(strugglingResult.factor).toBe('struggling_form');
    });
  });

  describe('Model B (Offense) Specific Tests', () => {
    const calculateOffenseImpact = (
      homeRPG: number,
      awayRPG: number,
      homeRecentRPG: number,
      awayRecentRPG: number,
      homeOPS: number,
      awayOPS: number,
      homeWOBA: number,
      awayWOBA: number
    ): { total: number; confidence: number; factors: string[] } => {
      const baseTotal = 8.0;
      let adjustedTotal = baseTotal;
      const factors: string[] = [];
      let confidenceBonus = 0;

      // Recent form (heavily weighted)
      const combinedRecentRPG = homeRecentRPG + awayRecentRPG;
      adjustedTotal = combinedRecentRPG * 0.8 + adjustedTotal * 0.2;
      
      if (combinedRecentRPG > 11.0) {
        confidenceBonus += 0.15;
        factors.push('hot_offense');
      } else if (combinedRecentRPG < 6.0) {
        confidenceBonus += 0.10;
        factors.push('cold_offense');
      }

      // OPS impact
      const avgOPS = (homeOPS + awayOPS) / 2;
      if (avgOPS > 0.850) {
        adjustedTotal += 1.0;
        factors.push('elite_power');
      } else if (avgOPS > 0.800) {
        adjustedTotal += 0.8;
        factors.push('strong_power');
      } else if (avgOPS < 0.650) {
        adjustedTotal -= 0.8;
        factors.push('weak_offense');
      }

      // wOBA impact (more predictive)
      const avgWOBA = (homeWOBA + awayWOBA) / 2;
      if (avgWOBA > 0.360) {
        adjustedTotal += 0.6;
        factors.push('elite_hitting');
      } else if (avgWOBA < 0.300) {
        adjustedTotal -= 0.5;
        factors.push('poor_hitting');
      }

      const baseConfidence = 0.65;
      const finalConfidence = Math.min(0.95, baseConfidence + confidenceBonus);

      return {
        total: Number(adjustedTotal.toFixed(1)),
        confidence: Number(finalConfidence.toFixed(2)),
        factors,
      };
    };

    test('should heavily favor over with hot offense', () => {
      const result = calculateOffenseImpact(5.5, 6.2, 7.8, 8.1, 0.865, 0.882, 0.375, 0.368);
      
      expect(result.total).toBeGreaterThan(12.0);
      expect(result.confidence).toBeGreaterThan(0.75);
      expect(result.factors).toContain('hot_offense');
      expect(result.factors).toContain('elite_power');
      expect(result.factors).toContain('elite_hitting');
    });

    test('should favor under with struggling offense', () => {
      const result = calculateOffenseImpact(3.2, 2.8, 2.1, 3.4, 0.615, 0.635, 0.285, 0.295);
      
      expect(result.total).toBeLessThan(7.0);
      expect(result.confidence).toBeGreaterThan(0.70);
      expect(result.factors).toContain('cold_offense');
      expect(result.factors).toContain('weak_offense');
      expect(result.factors).toContain('poor_hitting');
    });

    test('should weight recent form heavily', () => {
      // Same season stats, different recent form
      const hotResult = calculateOffenseImpact(4.5, 4.5, 8.0, 7.5, 0.750, 0.750, 0.330, 0.330);
      const coldResult = calculateOffenseImpact(4.5, 4.5, 2.5, 3.0, 0.750, 0.750, 0.330, 0.330);
      
      expect(hotResult.total).toBeGreaterThan(coldResult.total + 3.0);
      expect(hotResult.factors).toContain('hot_offense');
      expect(coldResult.factors).toContain('cold_offense');
    });

    test('should validate offensive consistency', () => {
      const scenarios = [
        { homeRPG: 4.0, awayRPG: 4.0, homeRecent: 4.0, awayRecent: 4.0, homeOPS: 0.700, awayOPS: 0.700, homeWOBA: 0.320, awayWOBA: 0.320 },
        { homeRPG: 5.5, awayRPG: 5.5, homeRecent: 7.0, awayRecent: 7.0, homeOPS: 0.850, awayOPS: 0.850, homeWOBA: 0.370, awayWOBA: 0.370 },
        { homeRPG: 3.0, awayRPG: 3.0, homeRecent: 2.5, awayRecent: 2.8, homeOPS: 0.620, awayOPS: 0.630, homeWOBA: 0.290, awayWOBA: 0.295 },
      ];

      const results = scenarios.map(s => 
        calculateOffenseImpact(s.homeRPG, s.awayRPG, s.homeRecent, s.awayRecent, s.homeOPS, s.awayOPS, s.homeWOBA, s.awayWOBA)
      );

      // Better offense should result in higher totals
      expect(results[1].total).toBeGreaterThan(results[0].total);
      expect(results[0].total).toBeGreaterThan(results[2].total);
    });

    test('should factor in situational hitting', () => {
      const calculateRISPImpact = (
        homeRISP: number,
        awayRISP: number,
        homeLOB: number,
        awayLOB: number
      ): { adjustment: number; factor: string } => {
        const avgRISP = (homeRISP + awayRISP) / 2;
        const avgLOB = (homeLOB + awayLOB) / 2;
        
        let adjustment = 0;
        let factor = 'neutral_clutch';

        if (avgRISP > 0.280 && avgLOB < 7.0) {
          adjustment = 0.4;
          factor = 'clutch_hitting';
        } else if (avgRISP < 0.230 || avgLOB > 8.5) {
          adjustment = -0.3;
          factor = 'poor_clutch';
        }

        return { adjustment, factor };
      };

      const clutchResult = calculateRISPImpact(0.295, 0.287, 6.2, 6.8);
      const poorClutchResult = calculateRISPImpact(0.215, 0.225, 9.1, 8.7);

      expect(clutchResult.adjustment).toBeGreaterThan(0);
      expect(clutchResult.factor).toBe('clutch_hitting');
      expect(poorClutchResult.adjustment).toBeLessThan(0);
      expect(poorClutchResult.factor).toBe('poor_clutch');
    });
  });

  describe('Model C (Weather/Park) Specific Tests', () => {
    const calculateEnvironmentalImpact = (
      parkFactor: number,
      altitude: number,
      tempF: number,
      windSpeedMph: number,
      windDirection: string,
      humidity: number,
      isDome: boolean
    ): { total: number; confidence: number; factors: string[] } => {
      const baseTotal = 8.5;
      let adjustedTotal = baseTotal;
      const factors: string[] = [];
      let confidenceBonus = 0;

      // Park factor (most important)
      adjustedTotal *= parkFactor;
      if (parkFactor > 1.05) {
        factors.push('hitter_friendly_park');
      } else if (parkFactor < 0.95) {
        factors.push('pitcher_friendly_park');
      }

      // Altitude effects
      if (altitude > 3000) {
        adjustedTotal += 0.8;
        confidenceBonus += 0.10;
        factors.push('high_altitude');
      }

      if (!isDome) {
        // Temperature effects
        if (tempF > 85) {
          adjustedTotal += 0.4;
          factors.push('hot_weather');
        } else if (tempF < 55) {
          adjustedTotal -= 0.3;
          factors.push('cold_weather');
        }

        // Wind effects
        if (windSpeedMph > 20) {
          if (windDirection === 'out' || windDirection === 'out_rf' || windDirection === 'out_lf') {
            adjustedTotal += 0.5;
            factors.push('strong_wind_out');
          } else {
            adjustedTotal -= 0.4;
            factors.push('strong_wind_in');
          }
          confidenceBonus += 0.08;
        }

        // Humidity effects
        if (humidity > 85) {
          adjustedTotal -= 0.3;
          factors.push('high_humidity');
        } else if (humidity < 30) {
          adjustedTotal += 0.2;
          factors.push('low_humidity');
        }
      } else {
        factors.push('dome_game');
      }

      const baseConfidence = 0.60;
      const finalConfidence = Math.min(0.95, baseConfidence + confidenceBonus);

      return {
        total: Number(adjustedTotal.toFixed(1)),
        confidence: Number(finalConfidence.toFixed(2)),
        factors,
      };
    };

    test('should heavily favor over at Coors Field', () => {
      const coorsResult = calculateEnvironmentalImpact(1.15, 5280, 82, 8, 'out_rf', 25, false);
      
      expect(coorsResult.total).toBeGreaterThan(10.0);
      expect(coorsResult.confidence).toBeGreaterThan(0.70);
      expect(coorsResult.factors).toContain('hitter_friendly_park');
      expect(coorsResult.factors).toContain('high_altitude');
      expect(coorsResult.factors).toContain('hot_weather');
      expect(coorsResult.factors).toContain('low_humidity');
    });

    test('should favor under in pitcher-friendly conditions', () => {
      const pitcherFriendlyResult = calculateEnvironmentalImpact(0.88, 50, 48, 25, 'in', 90, false);
      
      expect(pitcherFriendlyResult.total).toBeLessThan(7.5);
      expect(pitcherFriendlyResult.confidence).toBeGreaterThan(0.65);
      expect(pitcherFriendlyResult.factors).toContain('pitcher_friendly_park');
      expect(pitcherFriendlyResult.factors).toContain('cold_weather');
      expect(pitcherFriendlyResult.factors).toContain('strong_wind_in');
      expect(pitcherFriendlyResult.factors).toContain('high_humidity');
    });

    test('should neutralize weather effects in domes', () => {
      const domeResult = calculateEnvironmentalImpact(1.02, 600, 72, 0, 'calm', 50, true);
      const outdoorResult = calculateEnvironmentalImpact(1.02, 600, 72, 0, 'calm', 50, false);
      
      expect(domeResult.factors).toContain('dome_game');
      expect(domeResult.total).toBeCloseTo(outdoorResult.total, 1);
      expect(domeResult.factors).not.toContain('hot_weather');
      expect(domeResult.factors).not.toContain('cold_weather');
    });

    test('should validate environmental consistency', () => {
      const scenarios = [
        { park: 1.0, alt: 1000, temp: 72, wind: 5, dir: 'calm', humid: 50, dome: false }, // Neutral
        { park: 1.12, alt: 5280, temp: 88, wind: 12, dir: 'out', humid: 20, dome: false }, // Hitter-friendly
        { park: 0.85, alt: 50, temp: 45, wind: 22, dir: 'in', humid: 88, dome: false }, // Pitcher-friendly
      ];

      const results = scenarios.map(s => 
        calculateEnvironmentalImpact(s.park, s.alt, s.temp, s.wind, s.dir, s.humid, s.dome)
      );

      expect(results[1].total).toBeGreaterThan(results[0].total);
      expect(results[0].total).toBeGreaterThan(results[2].total);
    });

    test('should handle extreme weather conditions', () => {
      const extremeHeatResult = calculateEnvironmentalImpact(1.0, 1000, 105, 5, 'calm', 10, false);
      const extremeColdResult = calculateEnvironmentalImpact(1.0, 1000, 35, 5, 'calm', 80, false);
      const hurricaneWindResult = calculateEnvironmentalImpact(1.0, 1000, 72, 45, 'in', 50, false);

      expect(extremeHeatResult.factors).toContain('hot_weather');
      expect(extremeColdResult.factors).toContain('cold_weather');
      expect(hurricaneWindResult.factors).toContain('strong_wind_in');
      expect(hurricaneWindResult.confidence).toBeGreaterThan(0.65);
    });
  });

  describe('Model D (Market Sentiment) Specific Tests', () => {
    const calculateMarketImpact = (
      currentTotal: number,
      openingTotal: number,
      lineMovement: Array<{ timestamp: string; total: number; trigger?: string }>,
      publicOverPercent: number,
      sharpMoneySide: 'Over' | 'Under' | 'Neither',
      reversLineMovement: boolean
    ): { total: number; confidence: number; factors: string[] } => {
      let adjustedTotal = currentTotal;
      const factors: string[] = [];
      let confidenceBonus = 0;

      // Line movement analysis
      const totalMovement = currentTotal - openingTotal;
      if (Math.abs(totalMovement) > 0.5) {
        confidenceBonus += 0.25;
        if (totalMovement > 0) {
          adjustedTotal += 0.4;
          factors.push('significant_upward_movement');
        } else {
          adjustedTotal -= 0.4;
          factors.push('significant_downward_movement');
        }
      }

      // Steam move detection
      const steamMoves = lineMovement.filter(move => move.trigger === 'steam_move').length;
      if (steamMoves > 0) {
        confidenceBonus += 0.1 * steamMoves;
        adjustedTotal += steamMoves > 1 ? 0.3 : 0.2;
        factors.push('steam_move_detected');
      }

      // Sharp money indicators
      if (sharpMoneySide !== 'Neither') {
        confidenceBonus += 0.15;
        if (sharpMoneySide === 'Over') {
          adjustedTotal += 0.2;
          factors.push('sharp_money_over');
        } else {
          adjustedTotal -= 0.2;
          factors.push('sharp_money_under');
        }
      }

      // Reverse line movement (key indicator)
      if (reversLineMovement) {
        confidenceBonus += 0.2;
        if (publicOverPercent > 65) {
          adjustedTotal -= 0.3;
          factors.push('fade_public_over');
        } else if (publicOverPercent < 35) {
          adjustedTotal += 0.3;
          factors.push('fade_public_under');
        }
      }

      // Public vs sharp divergence
      if (publicOverPercent > 70 && sharpMoneySide === 'Under') {
        adjustedTotal -= 0.25;
        factors.push('public_over_sharp_under');
      } else if (publicOverPercent < 30 && sharpMoneySide === 'Over') {
        adjustedTotal += 0.25;
        factors.push('public_under_sharp_over');
      }

      const baseConfidence = 0.60;
      const finalConfidence = Math.min(0.95, baseConfidence + confidenceBonus);

      return {
        total: Number(adjustedTotal.toFixed(1)),
        confidence: Number(finalConfidence.toFixed(2)),
        factors,
      };
    };

    test('should follow sharp money with high confidence', () => {
      const lineMovement = [
        { timestamp: '2024-07-15T10:00:00Z', total: 8.5 },
        { timestamp: '2024-07-15T11:00:00Z', total: 8.5 },
        { timestamp: '2024-07-15T12:00:00Z', total: 9.0, trigger: 'steam_move' },
        { timestamp: '2024-07-15T13:00:00Z', total: 9.0 },
      ];

      const result = calculateMarketImpact(9.0, 8.5, lineMovement, 45, 'Over', false);
      
      expect(result.total).toBeGreaterThan(9.0);
      expect(result.confidence).toBeGreaterThan(0.80);
      expect(result.factors).toContain('significant_upward_movement');
      expect(result.factors).toContain('steam_move_detected');
      expect(result.factors).toContain('sharp_money_over');
    });

    test('should fade public money with reverse line movement', () => {
      const lineMovement = [
        { timestamp: '2024-07-15T10:00:00Z', total: 8.5 },
        { timestamp: '2024-07-15T14:00:00Z', total: 8.0 },
      ];

      const result = calculateMarketImpact(8.0, 8.5, lineMovement, 78, 'Under', true);
      
      expect(result.total).toBeLessThan(8.0);
      expect(result.confidence).toBeGreaterThan(0.75);
      expect(result.factors).toContain('significant_downward_movement');
      expect(result.factors).toContain('sharp_money_under');
      expect(result.factors).toContain('fade_public_over');
    });

    test('should detect market inefficiencies', () => {
      const detectArbitrage = (odds1: number, odds2: number): { hasArbitrage: boolean; profit: number } => {
        const prob1 = Math.abs(odds1) / (Math.abs(odds1) + 100);
        const prob2 = Math.abs(odds2) / (Math.abs(odds2) + 100);
        const totalProb = prob1 + prob2;
        
        if (totalProb < 1.0) {
          return { hasArbitrage: true, profit: (1 - totalProb) * 100 };
        }
        return { hasArbitrage: false, profit: 0 };
      };

      const arbitrageOpportunity = detectArbitrage(110, 115);
      const noArbitrage = detectArbitrage(-110, -110);

      expect(arbitrageOpportunity.hasArbitrage).toBe(true);
      expect(arbitrageOpportunity.profit).toBeGreaterThan(0);
      expect(noArbitrage.hasArbitrage).toBe(false);
    });

    test('should validate market sentiment consistency', () => {
      const scenarios = [
        { 
          current: 8.5, opening: 8.5, movement: [], public: 50, sharp: 'Neither' as const, reverse: false 
        },
        { 
          current: 9.0, opening: 8.5, movement: [{ timestamp: '1', total: 9.0, trigger: 'steam_move' }], 
          public: 35, sharp: 'Over' as const, reverse: false 
        },
        { 
          current: 8.0, opening: 8.5, movement: [{ timestamp: '1', total: 8.0 }], 
          public: 75, sharp: 'Under' as const, reverse: true 
        },
      ];

      const results = scenarios.map(s => 
        calculateMarketImpact(s.current, s.opening, s.movement, s.public, s.sharp, s.reverse)
      );

      expect(results[1].confidence).toBeGreaterThan(results[0].confidence);
      expect(results[2].confidence).toBeGreaterThan(results[0].confidence);
      expect(results[1].total).toBeGreaterThan(results[0].total);
      expect(results[2].total).toBeLessThan(results[0].total);
    });

    test('should calculate market efficiency scores', () => {
      const calculateMarketEfficiency = (
        bookmakerCount: number,
        lineVariation: number,
        volumeHandle: number,
        timeToGame: number
      ): number => {
        let efficiency = 1.0;
        
        // More bookmakers = more efficient
        if (bookmakerCount < 5) efficiency -= 0.1;
        if (bookmakerCount > 15) efficiency += 0.05;
        
        // Lower line variation = more efficient
        if (lineVariation > 0.5) efficiency -= 0.15;
        if (lineVariation > 1.0) efficiency -= 0.25;
        
        // Higher volume = more efficient
        if (volumeHandle > 1000000) efficiency += 0.05;
        if (volumeHandle < 100000) efficiency -= 0.1;
        
        // Closer to game time = more efficient
        if (timeToGame < 2) efficiency += 0.1;
        if (timeToGame > 24) efficiency -= 0.05;
        
        return Math.max(0, Math.min(1, efficiency));
      };

      const highEfficiency = calculateMarketEfficiency(20, 0.2, 2000000, 1);
      const lowEfficiency = calculateMarketEfficiency(3, 1.2, 50000, 48);

      expect(highEfficiency).toBeGreaterThan(0.9);
      expect(lowEfficiency).toBeLessThan(0.7);
    });
  });
});