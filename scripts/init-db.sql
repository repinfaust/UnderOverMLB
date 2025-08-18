-- MLB Prediction System Database Initialization

-- Create tables for storing prediction data
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL,
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    game_date TIMESTAMP NOT NULL,
    prediction_type VARCHAR(50) NOT NULL,
    predicted_value DECIMAL(10,2) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actual_result DECIMAL(10,2),
    is_correct BOOLEAN,
    UNIQUE(game_id, prediction_type, model_name)
);

-- Create table for storing game data
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(255) UNIQUE NOT NULL,
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    game_date TIMESTAMP NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    total_runs INTEGER,
    is_final BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for storing model performance metrics
CREATE TABLE IF NOT EXISTS model_performance (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    accuracy DECIMAL(5,4),
    avg_confidence DECIMAL(5,4),
    profit_loss DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_name, date)
);

-- Create table for storing betting analysis
CREATE TABLE IF NOT EXISTS betting_analysis (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    recommended_bet VARCHAR(50),
    bet_size DECIMAL(10,2),
    expected_value DECIMAL(10,4),
    kelly_criterion DECIMAL(10,4),
    odds DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actual_profit DECIMAL(10,2),
    FOREIGN KEY (game_id) REFERENCES games(game_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_predictions_game_date ON predictions(game_date);
CREATE INDEX IF NOT EXISTS idx_predictions_model ON predictions(model_name);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_model_performance_date ON model_performance(date);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for games table
CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();