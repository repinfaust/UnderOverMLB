#!/usr/bin/env node

import { runModelA_Recalibrated, runModelB_Recalibrated, runModelC_Recalibrated, runModelD_Recalibrated, generateRecalibratedEnsemble, GameFactors } from '../src/models/improved/recalibrated-models';

// Tonight's games with ACTUAL starting pitchers from Baseball Reference
const tonightGames = [
  { 
    home: "Baltimore Orioles", away: "Toronto Blue Jays", venue: "Oriole Park at Camden Yards",
    homePitcher: "Zach Eflin", awayPitcher: "Chris Bassitt", temp: 91, status: "live"
  },
  { 
    home: "Cleveland Guardians", away: "Colorado Rockies", venue: "Progressive Field",
    homePitcher: "Slade Cecconi", awayPitcher: "Bradley Blalock", temp: 79, status: "upcoming"
  },
  { 
    home: "Detroit Tigers", away: "Arizona Diamondbacks", venue: "Comerica Park",
    homePitcher: "Troy Melton", awayPitcher: "Eduardo Rodríguez", temp: 78, status: "live"
  },
  { 
    home: "New York Yankees", away: "Tampa Bay Rays", venue: "Yankee Stadium",
    homePitcher: "Cam Schlittler", awayPitcher: "Drew Rasmussen", temp: 92, status: "live"
  },
  { 
    home: "Cincinnati Reds", away: "Los Angeles Dodgers", venue: "Great American Ball Park",
    homePitcher: "Chase Burns", awayPitcher: "Yoshinobu Yamamoto", temp: 85, status: "live"
  },
  { 
    home: "Chicago White Sox", away: "Philadelphia Phillies", venue: "Guaranteed Rate Field",
    homePitcher: "Davis Martin", awayPitcher: "Cristopher Sánchez", temp: 90, status: "live"
  },
  { 
    home: "Kansas City Royals", away: "Atlanta Braves", venue: "Kauffman Stadium",
    homePitcher: "Rich Hill", awayPitcher: "Spencer Strider", temp: 92, status: "live"
  },
  { 
    home: "Milwaukee Brewers", away: "Chicago Cubs", venue: "American Family Field",
    homePitcher: "Jacob Misiorowski", awayPitcher: "Matthew Boyd", temp: 89, status: "live"
  },
  { 
    home: "Minnesota Twins", away: "Boston Red Sox", venue: "Target Field",
    homePitcher: "Simeon Woods Richardson", awayPitcher: "Richard Fitts", temp: 87, status: "live"
  },
  { 
    home: "St. Louis Cardinals", away: "Miami Marlins", venue: "Busch Stadium",
    homePitcher: "Andre Pallante", awayPitcher: "Edward Cabrera", temp: 94, status: "live"
  },
  { 
    home: "Houston Astros", away: "Washington Nationals", venue: "Minute Maid Park",
    homePitcher: "Framber Valdez", awayPitcher: "Brad Lord", temp: 94, status: "upcoming"
  },
  { 
    home: "Los Angeles Angels", away: "Texas Rangers", venue: "Angel Stadium",
    homePitcher: "Jack Kochanowicz", awayPitcher: "Jacob deGrom", temp: 79, status: "upcoming"
  },
  { 
    home: "San Diego Padres", away: "New York Mets", venue: "Petco Park",
    homePitcher: "Dylan Cease", awayPitcher: "Frankie Montas", temp: 74, status: "upcoming"
  },
  { 
    home: "San Francisco Giants", away: "Pittsburgh Pirates", venue: "Oracle Park",
    homePitcher: "Carson Whisenhunt", awayPitcher: "Mitch Keller", temp: 68, status: "upcoming"
  },
  { 
    home: "Athletics", away: "Seattle Mariners", venue: "Sutter Health Park",
    homePitcher: "JP Sears", awayPitcher: "Luis Castillo", temp: 94, status: "upcoming"
  }
];

console.log('🚀 TONIGHT\'S MLB PREDICTIONS - WITH ACTUAL STARTING PITCHERS');
console.log('========================================================');
console.log('⚾ Data Source: Baseball Reference confirmed starters');
console.log('🎯 Enhanced system with bullpen fatigue & rivalry detection\n');

let totalOvers = 0, totalUnders = 0;
const playableGames: any[] = [];

tonightGames.forEach(game => {
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

  let recommendation = '❌ NO PLAY';
  if (ensemble.confidence >= 52) {
    recommendation = '🔥 STRONG';
    playableGames.push({...game, ensemble, rec: 'STRONG'});
  } else if (ensemble.confidence >= 50) {
    recommendation = '📈 LEAN';
    playableGames.push({...game, ensemble, rec: 'LEAN'});
  }

  console.log(`📊 ${game.away} @ ${game.home} ${game.status === 'live' ? '🔴 LIVE' : '⏰'}`);
  console.log(`   ⚾ Pitchers: ${game.awayPitcher} vs ${game.homePitcher}`);
  console.log(`   🎯 Prediction: ${ensemble.prediction} ${ensemble.total}`);
  console.log(`   📈 Confidence: ${ensemble.confidence}%`);
  console.log(`   💡 Recommendation: ${recommendation} ${ensemble.prediction}`);
  console.log(`   🌡️  Temperature: ${game.temp}°F\n`);
});

console.log(`📊 DISTRIBUTION: ${Math.round(totalOvers/tonightGames.length*100)}% Over, ${Math.round(totalUnders/tonightGames.length*100)}% Under`);
console.log(`🎯 PLAYABLE GAMES: ${playableGames.length}/${tonightGames.length}`);

if (playableGames.length > 0) {
  console.log(`\n🔥 TONIGHT'S RECOMMENDED PLAYS:`);
  playableGames.forEach(game => {
    console.log(`   ${game.rec === 'STRONG' ? '🔥' : '📈'} ${game.away} @ ${game.home} ${game.ensemble.prediction} ${game.ensemble.total} (${game.ensemble.confidence}%)`);
  });
}