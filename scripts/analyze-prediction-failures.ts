// Analysis of prediction failures to identify systematic patterns
// August 18-19, 2025 data

interface GameResult {
  date: string;
  teams: string;
  actual: number;
  v4_pred: number;
  v5_pred: number;
  v4_direction: string;
  v5_direction: string;
  v4_result: string;
  v5_result: string;
  market_line: number;
  venue: string;
  weather_temp?: number;
  weather_conditions?: string;
}

const gameResults: GameResult[] = [
  // August 18, 2025
  { date: '2025-08-18', teams: 'Brewers @ Cubs', actual: 7, v4_pred: 7.77, v5_pred: 7.74, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'WIN', market_line: 7.0, venue: 'Wrigley Field' },
  { date: '2025-08-18', teams: 'Astros @ Tigers', actual: 10, v4_pred: 8.4, v5_pred: 7.7, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'LOSS', market_line: 6.5, venue: 'Comerica Park' },
  { date: '2025-08-18', teams: 'Jays @ Pirates', actual: 7, v4_pred: 8.59, v5_pred: 8.03, v4_direction: 'Over', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'WIN', market_line: 8.0, venue: 'PNC Park' },
  { date: '2025-08-18', teams: 'Cardinals @ Marlins', actual: 11, v4_pred: 8.5, v5_pred: 7.97, v4_direction: 'Over', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'LOSS', market_line: 8.0, venue: 'loanDepot park' },
  { date: '2025-08-18', teams: 'Mariners @ Phillies', actual: 19, v4_pred: 7.72, v5_pred: 8.5, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'LOSS', market_line: 8.0, venue: 'Citizens Bank Park' },
  { date: '2025-08-18', teams: 'Orioles @ Sox', actual: 9, v4_pred: 7.85, v5_pred: 8.5, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'LOSS', market_line: 9.5, venue: 'Fenway Park' },
  { date: '2025-08-18', teams: 'White Sox @ Braves', actual: 22, v4_pred: 8.99, v5_pred: 8.82, v4_direction: 'Over', v5_direction: 'Over', v4_result: 'WIN', v5_result: 'WIN', market_line: 9.0, venue: 'Truist Park' },
  { date: '2025-08-18', teams: 'Rangers @ Royals', actual: 7, v4_pred: 9.16, v5_pred: 8.27, v4_direction: 'Over', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'WIN', market_line: 8.5, venue: 'Kauffman Stadium' },
  { date: '2025-08-18', teams: 'Dodgers @ Rockies', actual: 7, v4_pred: 9.64, v5_pred: 9.9, v4_direction: 'Over', v5_direction: 'Over', v4_result: 'LOSS', v5_result: 'LOSS', market_line: 12.0, venue: 'Coors Field' },
  { date: '2025-08-18', teams: 'Reds @ Angels', actual: 5, v4_pred: 7.75, v5_pred: 7.74, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'WIN', market_line: 9.0, venue: 'Angel Stadium' },
  { date: '2025-08-18', teams: 'Guardians @ Diamondbacks', actual: 4, v4_pred: 8.68, v5_pred: 8.46, v4_direction: 'Over', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'WIN', market_line: 9.0, venue: 'Chase Field' },
  { date: '2025-08-18', teams: 'Giants @ Padres', actual: 7, v4_pred: 7.58, v5_pred: 7.5, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'WIN', market_line: 8.0, venue: 'Petco Park' },

  // August 19, 2025
  { date: '2025-08-19', teams: 'Brewers @ Cubs', actual: 5, v4_pred: 7.61, v5_pred: 7.5, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'WIN', market_line: 6.5, venue: 'Wrigley Field' },
  { date: '2025-08-19', teams: 'Astros @ Tigers', actual: 1, v4_pred: 8.2, v5_pred: 7.5, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'WIN', market_line: 7.0, venue: 'Comerica Park' },
  { date: '2025-08-19', teams: 'Jays @ Pirates', actual: 10, v4_pred: 9.16, v5_pred: 8.16, v4_direction: 'Over', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'LOSS', market_line: 7.5, venue: 'PNC Park' },
  { date: '2025-08-19', teams: 'Cardinals @ Marlins', actual: 11, v4_pred: 8.4, v5_pred: 7.77, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'LOSS', market_line: 7.5, venue: 'loanDepot park' },
  { date: '2025-08-19', teams: 'Mets @ Nationals', actual: 9, v4_pred: 7.61, v5_pred: 7.9, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'LOSS', market_line: 9.0, venue: 'Nationals Park' },
  { date: '2025-08-19', teams: 'Mariners @ Phillies', actual: 10, v4_pred: 7.76, v5_pred: 8.3, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'LOSS', market_line: 8.0, venue: 'Citizens Bank Park' },
  { date: '2025-08-19', teams: 'Orioles @ Sox', actual: 7, v4_pred: 8.04, v5_pred: 8.3, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'WIN', market_line: 9.0, venue: 'Fenway Park' },
  { date: '2025-08-19', teams: 'White Sox @ Braves', actual: 21, v4_pred: 7.84, v5_pred: 8.97, v4_direction: 'Under', v5_direction: 'Over', v4_result: 'LOSS', v5_result: 'WIN', market_line: 8.5, venue: 'Truist Park' },
  { date: '2025-08-19', teams: 'Yankees @ Rays', actual: 16, v4_pred: 8.81, v5_pred: 8.05, v4_direction: 'Over', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'LOSS', market_line: 8.5, venue: 'George M. Steinbrenner Field' },
  { date: '2025-08-19', teams: 'Rangers @ Royals', actual: 7, v4_pred: 8.12, v5_pred: 8.05, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'WIN', market_line: 8.5, venue: 'Kauffman Stadium' },
  { date: '2025-08-19', teams: 'Athletics @ Twins', actual: 9, v4_pred: 8.35, v5_pred: 7.5, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'LOSS', market_line: 8.5, venue: 'Target Field' },
  { date: '2025-08-19', teams: 'Dodgers @ Rockies', actual: 15, v4_pred: 9.48, v5_pred: 10.49, v4_direction: 'Over', v5_direction: 'Over', v4_result: 'WIN', v5_result: 'WIN', market_line: 12.0, venue: 'Coors Field' },
  { date: '2025-08-19', teams: 'Reds @ Angels', actual: 10, v4_pred: 7.67, v5_pred: 7.74, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'LOSS', v5_result: 'LOSS', market_line: 8.5, venue: 'Angel Stadium' },
  { date: '2025-08-19', teams: 'Guardians @ Diamondbacks', actual: 11, v4_pred: 8.51, v5_pred: 8.46, v4_direction: 'Over', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'LOSS', market_line: 8.5, venue: 'Chase Field' },
  { date: '2025-08-19', teams: 'Giants @ Padres', actual: 6, v4_pred: 6.8, v5_pred: 7.5, v4_direction: 'Under', v5_direction: 'Under', v4_result: 'WIN', v5_result: 'WIN', market_line: 8.0, venue: 'Petco Park' }
];

console.log('🔍 SYSTEMATIC FAILURE PATTERN ANALYSIS');
console.log('=====================================');

// Get all losses
const v4Losses = gameResults.filter(game => game.v4_result === 'LOSS');
const v5Losses = gameResults.filter(game => game.v5_result === 'LOSS');

console.log(`\nV4 LOSSES: ${v4Losses.length}/26 games`);
console.log(`V5 LOSSES: ${v5Losses.length}/26 games`);

// Analyze patterns in losses
function analyzeFailurePatterns(losses: GameResult[], modelName: string) {
  console.log(`\n📊 ${modelName} FAILURE PATTERNS:`);
  console.log('================================');
  
  // Pattern 1: Direction of failures
  const underFailures = losses.filter(g => {
    return modelName === 'V4' ? g.v4_direction === 'Under' : g.v5_direction === 'Under';
  });
  const overFailures = losses.filter(g => {
    return modelName === 'V4' ? g.v4_direction === 'Over' : g.v5_direction === 'Over';
  });
  
  console.log(`Under predictions that failed: ${underFailures.length}/${losses.length} (${((underFailures.length/losses.length)*100).toFixed(1)}%)`);
  console.log(`Over predictions that failed: ${overFailures.length}/${losses.length} (${((overFailures.length/losses.length)*100).toFixed(1)}%)`);
  
  // Pattern 2: Magnitude of errors
  const errors = losses.map(g => {
    const pred = modelName === 'V4' ? g.v4_pred : g.v5_pred;
    return Math.abs(g.actual - pred);
  });
  const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const largeErrors = errors.filter(e => e > 3).length;
  
  console.log(`Average error on losses: ${avgError.toFixed(1)} runs`);
  console.log(`Large errors (>3 runs): ${largeErrors}/${errors.length} (${((largeErrors/errors.length)*100).toFixed(1)}%)`);
  
  // Pattern 3: Venue analysis
  const venueFailures: {[key: string]: number} = {};
  losses.forEach(game => {
    venueFailures[game.venue] = (venueFailures[game.venue] || 0) + 1;
  });
  
  console.log('\nVenue failure frequency:');
  Object.entries(venueFailures)
    .sort(([,a], [,b]) => b - a)
    .forEach(([venue, count]) => {
      console.log(`  ${venue}: ${count} failures`);
    });
  
  // Pattern 4: Specific failure cases
  console.log('\nSpecific failure cases:');
  losses.forEach(game => {
    const pred = modelName === 'V4' ? game.v4_pred : game.v5_pred;
    const direction = modelName === 'V4' ? game.v4_direction : game.v5_direction;
    const error = Math.abs(game.actual - pred);
    console.log(`  ${game.teams}: Predicted ${direction} ${pred}, Actual ${game.actual} (Error: ${error.toFixed(1)})`);
  });
}

analyzeFailurePatterns(v4Losses, 'V4');
analyzeFailurePatterns(v5Losses, 'V5');

// Cross-model analysis
console.log('\n🔄 CROSS-MODEL ANALYSIS');
console.log('=======================');

// Games both models got wrong
const bothWrong = gameResults.filter(g => g.v4_result === 'LOSS' && g.v5_result === 'LOSS');
console.log(`\nGames BOTH models failed: ${bothWrong.length}/26`);
bothWrong.forEach(game => {
  const v4_error = Math.abs(game.actual - game.v4_pred);
  const v5_error = Math.abs(game.actual - game.v5_pred);
  console.log(`  ${game.teams}: V4 ${game.v4_direction} ${game.v4_pred} (err: ${v4_error.toFixed(1)}), V5 ${game.v5_direction} ${game.v5_pred} (err: ${v5_error.toFixed(1)}), Actual: ${game.actual}`);
});

// Systematic under-prediction pattern
const underPredictionGames = bothWrong.filter(g => g.v4_direction === 'Under' && g.v5_direction === 'Under');
console.log(`\nBoth predicted Under but were wrong: ${underPredictionGames.length}/${bothWrong.length}`);

// High-scoring games (10+ runs) analysis
const highScoringGames = gameResults.filter(g => g.actual >= 10);
console.log(`\n🔥 HIGH-SCORING GAMES (10+ runs): ${highScoringGames.length}/26`);
highScoringGames.forEach(game => {
  const v4_correct = game.v4_result === 'WIN' ? '✅' : '❌';
  const v5_correct = game.v5_result === 'WIN' ? '✅' : '❌';
  console.log(`  ${game.teams}: ${game.actual} runs - V4 ${v4_correct} (${game.v4_direction} ${game.v4_pred}), V5 ${v5_correct} (${game.v5_direction} ${game.v5_pred})`);
});

// Market line comparison
console.log(`\n💰 MARKET LINE COMPARISON`);
console.log('========================');

const marketBeatsV4 = gameResults.filter(g => {
  if (g.v4_direction === 'Under') return g.actual < g.market_line && g.actual > g.v4_pred;
  else return g.actual > g.market_line && g.actual < g.v4_pred;
}).length;

const marketBeatsV5 = gameResults.filter(g => {
  if (g.v5_direction === 'Under') return g.actual < g.market_line && g.actual > g.v5_pred;
  else return g.actual > g.market_line && g.actual < g.v5_pred;
}).length;

console.log(`Market line closer than V4: ${marketBeatsV4} times`);
console.log(`Market line closer than V5: ${marketBeatsV5} times`);

console.log('\n🎯 SYSTEMATIC PATTERNS IDENTIFIED:');
console.log('==================================');
console.log('1. BOTH models struggle with Under predictions in high-scoring environments');
console.log('2. Multiple venue-specific failures suggest park factor miscalibration');
console.log('3. Large error games indicate explosion detection needs improvement');
console.log('4. Market lines often more accurate than model predictions');
console.log('5. Need better detection of offensive breakout games');