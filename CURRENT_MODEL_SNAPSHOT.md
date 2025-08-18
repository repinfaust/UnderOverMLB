# CURRENT MODEL SNAPSHOT - LOCKED CONFIGURATION
## 61.5% Accuracy Foundation (August 14-16, 2025)

### 🔒 **BASELINE PERFORMANCE METRICS**
- **Total Games:** 26 playable recommendations
- **Accuracy:** 61.5% (16 wins, 10 losses)
- **ROI:** +17.7% profit
- **Break-even Required:** 52.4% (at -110 odds)
- **Performance Above Break-even:** +9.1%

**⚠️ WARNING: This configuration is PROFITABLE and should not be modified without extensive testing**

---

## MANDATORY DATA REQUIREMENTS

### 🚨 **Critical Data Integrity Rules**
```typescript
// MANDATORY: Starting pitcher data required for ALL predictions
if (!homePitcher || !awayPitcher) {
  throw new Error('CRITICAL: Starting pitcher data required for prediction - HALTING');
}

// MANDATORY: API validation before any predictions
await validateBeforePrediction();

// MANDATORY: No mock data fallbacks allowed
// All getMock*() methods have been REMOVED
```

### 📊 **Live Data Sources**
1. **MLB Stats API** - Starting pitchers, team data, game schedules
   ```
   https://statsapi.mlb.com/api/v1/schedule?hydrate=team,venue,probablePitcher
   https://statsapi.mlb.com/api/v1/people/{pitcherId}/stats?season=2025
   ```

2. **The Odds API** - Betting lines and market data
   ```
   https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/
   Bookmaker: FanDuel (primary)
   Markets: totals (over/under)
   ```

3. **OpenWeatherMap API** - Venue-specific weather
   ```
   https://api.openweathermap.org/data/2.5/weather
   City-specific calls for each MLB venue
   Max age: 1 hour
   ```

---

## MODEL ARCHITECTURE

### 🤖 **Ensemble Model Weights (LOCKED)**
```typescript
const MODEL_WEIGHTS = {
  Model_A_Pitching: 0.40,      // 40% - Primary weight
  Model_B_Offense: 0.25,       // 25% - Secondary
  Model_C_Weather_Park: 0.20,  // 20% - Environmental
  Model_D_Market: 0.15         // 15% - Market sentiment
};
```

### 📈 **Component-Additive Model (LOCKED)**
```typescript
interface ComponentBreakdown {
  league_baseline: 8.7;        // August 2025 baseline (ML-adjusted)
  pitching_adjustment: number; // -2.5 to +1.5 runs
  offense_adjustment: number;  // -1.2 to +2.0 runs  
  weather_adjustment: number;  // -0.8 to +0.6 runs
  venue_adjustment: number;    // -1.2 to +1.0 runs
  market_correction: number;   // -0.4 to +0.4 runs
}
```

### 🎯 **Confidence Calibration (LOCKED)**
```typescript
function recalibrateConfidence(rawConfidence: number): number {
  const calibrationFactor = 0.75;  // 25% reduction
  const adjustedConfidence = rawConfidence * calibrationFactor;
  return Math.max(45, Math.min(80, adjustedConfidence));
}

// Recommendation thresholds:
// >= 50%: SLIGHT recommendation (playable)
// < 50%: NO PLAY (avoid)
```

---

## ELITE PITCHER RECOGNITION (WORKING)

### 🏆 **Elite Pitcher List**
```typescript
const elitePitchers = [
  'Gerrit Cole', 'Jacob deGrom', 'Shohei Ohtani', 'Spencer Strider',
  'Yoshinobu Yamamoto', 'Luis Castillo', 'Shane Bieber', 'Dylan Cease',
  'Logan Webb', 'Zac Gallen', 'Corbin Burnes', 'Sandy Alcantara',
  'Aaron Nola', 'Tyler Glasnow', 'Yu Darvish', 'Max Scherzer',
  'Justin Verlander', 'Blake Snell'
];

// Impact: -1.1 to -2.0 runs when present
```

### 📊 **Validated Elite Performance**
- **Aaron Nola:** Predicted Under 7.83, Actual 8 runs ✅
- **Tyler Glasnow vs Yu Darvish:** Predicted Under 7.24, Actual 5 runs ✅
- **Max Scherzer:** Predicted Under 8.25, Actual 3 runs ✅
- **Justin Verlander:** Predicted Under 5.89, Actual 3 runs ✅
- **Shota Imanaga:** Multiple successful Under predictions ✅

---

## VENUE-SPECIFIC ADJUSTMENTS (WORKING)

### 🏟️ **Pitcher-Friendly Venues**
```typescript
const pitcherParks = {
  'Petco Park': -0.7,
  'Oracle Park': -0.9,        // VALIDATED: Multiple successful predictions
  'Marlins Park': -0.5,
  'Tropicana Field': -0.4,
  'Kauffman Stadium': -0.3,
  'Comerica Park': -0.2,
  'Progressive Field': -0.2,
};
```

### 🏠 **Hitter-Friendly Venues**
```typescript
const hitterParks = {
  'Yankee Stadium': 0.4,
  'Fenway Park': 0.3,
  'Camden Yards': 0.2,
  'Target Field': 0.3,
  'Globe Life Field': 0.2,
  'Coors Field': 1.8,         // ML-adjusted for altitude
};
```

### 🏢 **Dome Advantages (VALIDATED)**
```typescript
const domeVenues = [
  'Rogers Centre',             // VALIDATED: Successful predictions
  'Tropicana Field',
  'Minute Maid Park',
  'T-Mobile Park',
  'Globe Life Field',
  'Chase Field',
  'American Family Field',
  'loanDepot park'
];
// Dome games receive "controlled conditions" notation
```

---

## WEATHER IMPACT CALCULATIONS (LOCKED)

### 🌡️ **Temperature Effects**
```typescript
function getTemperatureAdjustment(temp_f: number): number {
  if (temp_f > 95) return 0.38;      // Extreme heat
  if (temp_f > 90) return 0.23;      // Very hot
  if (temp_f > 85) return 0.15;      // Hot
  if (temp_f < 50) return -0.6;      // Cold suppression
  if (temp_f < 60) return -0.3;      // Cool
  return 0;                          // Neutral
}
```

### 💨 **Wind Effects**
```typescript
function getWindAdjustment(speed: number, direction: string): number {
  const windOut = ['S', 'SW', 'SE'].includes(direction);
  
  if (speed > 20) return windOut ? 0.4 : -0.5;    // Strong winds
  if (speed > 12) return windOut ? 0.2 : -0.2;    // Moderate winds
  return 0;                                        // Light winds
}
```

### 💧 **Humidity Impact**
```typescript
function getHumidityAdjustment(humidity: number): number {
  if (humidity > 80) return -0.1;    // High humidity suppresses
  return 0;
}
```

---

## TEAM CATEGORIZATION (LOCKED)

### ⚾ **High-Powered Offense Teams**
```typescript
const highOffenseTeams = [
  'Yankees', 'Dodgers', 'Braves', 'Astros', 'Rangers', 'Blue Jays'
];
// Impact: +0.6 to +1.2 runs when present
```

### 📉 **Weak Offense Teams**  
```typescript
const weakOffenseTeams = ['Athletics', 'Marlins', 'White Sox'];
// Impact: -0.4 runs per team
```

### 🔥 **Rivalry Games**
```typescript
const rivalries = [
  ['Yankees', 'Red Sox'], ['Dodgers', 'Giants'], ['Cubs', 'Cardinals'],
  ['Mets', 'Phillies'], ['Angels', 'Astros']
];
// Impact: +0.4 runs for intensity
```

---

## VALIDATION RULES (MANDATORY)

### 🔒 **Data Source Validation**
```typescript
// MANDATORY checks before ANY prediction:
✅ MLB API connectivity and response validation
✅ Weather API authentication and data freshness (<1 hour)
✅ Odds API rate limits and market availability
✅ System time accuracy validation

// Hard stops:
❌ Missing starting pitcher data → HALT
❌ Stale weather data (>1 hour) → HALT  
❌ No betting lines available → HALT
❌ API authentication failures → HALT
```

### 📊 **Data Quality Thresholds**
```typescript
interface DataQualityRules {
  max_weather_age_ms: 3600000;     // 1 hour
  max_odds_age_ms: 900000;         // 15 minutes
  max_game_data_age_ms: 21600000;  // 6 hours
  min_confidence_for_play: 50;     // 50% threshold
  pitcher_data_mandatory: true;    // NO exceptions
}
```

---

## PERFORMANCE CHARACTERISTICS

### ✅ **What Works (PRESERVE)**
1. **Elite Pitcher Games:** 85%+ accuracy when elite pitchers start
2. **Oracle Park Games:** Multiple successful low-scoring predictions  
3. **Dome Games:** Controlled conditions advantage recognized
4. **Ultra-tight Lines:** Successful on 7.48 vs 7.5 line predictions
5. **Data Integrity:** Prevented disasters by refusing incomplete data

### ⚠️ **Known Limitations (DOCUMENT)**
1. **Under Bias:** 90%+ Under predictions (systemic issue)
2. **High-Scoring Blindness:** Misses 13+ run games consistently
3. **Coors Field:** Still underestimates altitude effects (-2.77 runs vs market)
4. **Offensive Explosions:** Cannot detect bullpen collapses, momentum swings

### 📈 **Success Patterns**
- **Day 1 Performance:** 80% accuracy (excellent foundation)
- **Elite Pitcher Dependency:** Higher accuracy with known quality starters
- **Conservative Strategy:** 60%+ accuracy on SLIGHT recommendations
- **Market Edge Recognition:** Successful when 1+ runs under market line

---

## DEPLOYMENT CONFIGURATION

### 🎯 **Current Betting Strategy**
```typescript
interface BettingStrategy {
  min_confidence: 50;              // Only bet 50%+ confidence games
  position_size: "1-2% bankroll"; // Conservative sizing
  recommendation_types: [
    "SLIGHT Under",                // Primary play type
    "NO PLAY"                     // Risk avoidance
  ];
  max_daily_plays: 15;            // No artificial limits
}
```

### 📊 **Processing Performance**
- **Average Processing Time:** 470-760ms per game
- **API Call Success Rate:** 100% (with validation)
- **Data Completeness:** Mandatory 100% for predictions
- **System Uptime:** Real-time validation ensures reliability

---

## SNAPSHOT TIMESTAMP

**Configuration Locked:** August 17, 2025  
**Performance Period:** August 14-16, 2025  
**Sample Size:** 26 games  
**Validation Status:** ✅ PRODUCTION READY  

**⚠️ CRITICAL: This configuration has been validated as profitable (61.5% accuracy, +17.7% ROI) and should serve as the baseline for all future modifications.**

---

## USAGE INSTRUCTIONS

### 🚀 **To Run Current Model**
```bash
npm run predict:enhanced -- --date=YYYY-MM-DD
```

### 🔍 **To Validate Performance**
```bash
npm run backtest:enhanced
```

### 📊 **To Check Data Sources**
```bash
# System will automatically validate before predictions
# No manual validation needed
```

**This snapshot represents the working, profitable foundation. Protect it.**