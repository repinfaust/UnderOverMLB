#!/usr/bin/env node

import { runModelA_Recalibrated, runModelB_Recalibrated, runModelC_Recalibrated, runModelD_Recalibrated, generateRecalibratedEnsemble, GameFactors } from '../src/models/improved/recalibrated-models';

// Tonight's remaining games (July 28th/29th)
const upcomingGames = [
  { home: "Cleveland Guardians", away: "Colorado Rockies", venue: "Progressive Field", temp: 75 },
  { home: "Houston Astros", away: "Washington Nationals", venue: "Daikin Park", temp: 85 },
  { home: "Los Angeles Angels", away: "Texas Rangers", venue: "Angel Stadium", temp: 78 },
  { home: "San Diego Padres", away: "New York Mets", venue: "Petco Park", temp: 72 },
  { home: "San Francisco Giants", away: "Pittsburgh Pirates", venue: "Oracle Park", temp: 65 },
  { home: "Athletics", away: "Seattle Mariners", venue: "Sutter Health Park", temp: 85 }
];

console.log('🚀 TONIGHT\'S MLB PREDICTIONS - Enhanced System');
console.log('==============================================');
console.log('⚡ Using balanced models with 52/48 Over/Under distribution\n');

let totalOvers = 0, totalUnders = 0;

upcomingGames.forEach(game => {
  const gameFactors: GameFactors = {
    home_team: game.home,
    away_team: game.away,
    venue: game.venue,
    date: '2025-07-28',
    weather: {
      temp_f: game.temp,
      humidity: 60,
      wind_speed_mph: 8,
      wind_direction: 'SW',
      conditions: 'clear'
    },
    park_factors: {
      runs_factor: 1.0,
      hr_factor: 1.0,
      altitude: 500
    }
  };

  const modelA = runModelA_Recalibrated(gameFactors);
  const modelB = runModelB_Recalibrated(gameFactors);
  const modelC = runModelC_Recalibrated(gameFactors);
  const modelD = runModelD_Recalibrated(gameFactors, 8.5);
  const ensemble = generateRecalibratedEnsemble(modelA, modelB, modelC, modelD);

  if (ensemble.prediction === 'Over') totalOvers++; else totalUnders++;

  const recommendation = ensemble.confidence >= 50 ? 
    (ensemble.confidence >= 55 ? '🔥 STRONG' : '📈 LEAN') : '❌ NO PLAY';

  console.log(`📊 ${game.away} @ ${game.home}`);
  console.log(`   🎯 Prediction: ${ensemble.prediction} ${ensemble.total}`);
  console.log(`   📈 Confidence: ${ensemble.confidence}%`);
  console.log(`   💡 Recommendation: ${recommendation} ${ensemble.prediction}`);
  console.log(`   🌡️  Temperature: ${game.temp}°F\n`);
});

console.log(`📊 DISTRIBUTION: ${Math.round(totalOvers/upcomingGames.length*100)}% Over, ${Math.round(totalUnders/upcomingGames.length*100)}% Under`);
console.log(`✅ Balance Status: ${Math.abs(50 - totalOvers/upcomingGames.length*100) < 10 ? 'GOOD' : 'NEEDS ADJUSTMENT'}`);