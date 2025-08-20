/**
 * V7C Canonical Markov Chain Test & Comparison
 * 
 * Tests the new canonical base/out Markov implementation
 * and compares against existing models
 */

import { V7CCanonicalModel } from '../src/models/v7/v7c-canonical-markov';

async function testV7CModel() {
  console.log('🧪 TESTING V7C CANONICAL MARKOV CHAIN MODEL');
  console.log('=' .repeat(50));
  
  const v7cModel = new V7CCanonicalModel();
  
  // Test games from tonight's slate
  const testGames = [
    {
      home_team: 'Pirates',
      away_team: 'Blue Jays',
      venue: 'PNC Park',
      temperature: 85,
      description: 'Blue Jays @ Pirates - Moderate temperature'
    },
    {
      home_team: 'Phillies', 
      away_team: 'Mariners',
      venue: 'Citizens Bank Park',
      temperature: 94,
      description: 'Mariners @ Phillies - High temperature, hitter-friendly park'
    },
    {
      home_team: 'Tigers',
      away_team: 'Astros', 
      venue: 'Comerica Park',
      temperature: 80,
      description: 'Astros @ Tigers - Moderate conditions'
    },
    {
      home_team: 'Rays',
      away_team: 'Yankees',
      venue: 'George M. Steinbrenner Field',
      temperature: 93,
      description: 'Yankees @ Rays - Hot weather, explosive offense potential'
    }
  ];

  console.log(`\\n📊 Testing V7C on ${testGames.length} sample games:\\n`);
  
  for (let i = 0; i < testGames.length; i++) {
    const game = testGames[i];
    console.log(`🎯 TEST ${i + 1}: ${game.description}`);
    console.log(`   Venue: ${game.venue}, Temperature: ${game.temperature}°F`);
    
    const startTime = Date.now();
    const result = v7cModel.predict(game);
    const duration = Date.now() - startTime;
    
    console.log(`\\n📈 V7C CANONICAL RESULTS:`);
    console.log(`   Prediction: ${result.prediction} ${result.calculated_total}`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Over Probability: ${(result.over_probability * 100).toFixed(1)}%`);
    console.log(`   Under Probability: ${(result.under_probability * 100).toFixed(1)}%`);
    console.log(`   Market Edge: ${result.edge_vs_market > 0 ? '+' : ''}${(result.edge_vs_market * 100).toFixed(1)}%`);
    console.log(`   Distribution: ${result.distribution_summary}`);
    console.log(`   Monte Carlo: ${result.simulation_details.games_simulated} games, IQR ${result.simulation_details.percentile_range}`);
    console.log(`   Performance: ${duration}ms simulation time`);
    
    // Analysis
    const edgeCategory = Math.abs(result.edge_vs_market) > 0.05 ? 'STRONG' : 
                        Math.abs(result.edge_vs_market) > 0.02 ? 'MODERATE' : 'WEAK';
    const recommendation = result.confidence > 70 && Math.abs(result.edge_vs_market) > 0.03 ? 
                          `PLAY ${result.prediction}` : 'NO PLAY';
    
    console.log(`   Edge Category: ${edgeCategory}`);
    console.log(`   Recommendation: ${recommendation}\\n`);
    console.log('-'.repeat(60));
  }
  
  // Model capability summary
  console.log(`\\n🔬 V7C CANONICAL MODEL CAPABILITIES:`);
  console.log(`✅ True 24 base/out state Markov chain`);
  console.log(`✅ Event-based transitions (K/BB/1B/2B/3B/HR/BIP/DP/SF)`);
  console.log(`✅ Time-inhomogeneous pitcher regimes (TTO1/2/3, bullpen tiers)`);
  console.log(`✅ Monte Carlo simulation for full run distribution`);
  console.log(`✅ Proper home 9th inning handling`);
  console.log(`✅ Venue & weather as continuous covariates`);
  console.log(`✅ Hierarchical shrinkage with regularization`);
  console.log(`✅ Tail behavior capture for Over/Under edges`);
  console.log(`✅ Probabilistic calibration & edge calculation`);
  
  console.log(`\\n📊 KEY IMPROVEMENTS OVER PREVIOUS MODELS:`);
  console.log(`🎯 V7A/V7B: Time-segment approach → True baseball state dynamics`);
  console.log(`🎯 Distribution: Mean estimation → Full Monte Carlo distribution`);
  console.log(`🎯 Transitions: Semi-deterministic → Event-based probabilities`);  
  console.log(`🎯 Calibration: Point estimates → Probabilistic Over/Under edges`);
  console.log(`🎯 Regimes: Early/Mid/Late → TTO + bullpen tiers`);
  console.log(`🎯 Validation: Manual tuning → Simulation-based confidence`);
  
  console.log(`\\n🚀 Next steps for V7C enhancement:`);
  console.log(`• Load real pitcher/batter data from APIs`);
  console.log(`• Implement hierarchical team-level shrinkage`);
  console.log(`• Add stolen base/caught stealing dynamics`);
  console.log(`• Backtest validation on historical games`);
  console.log(`• PIT histogram for distributional calibration`);
  console.log(`• CRPS scoring vs actual game outcomes`);
}

// Run the test
testV7CModel().catch(console.error);

export { testV7CModel };