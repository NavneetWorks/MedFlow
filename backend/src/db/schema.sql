-- MEDFLOW Patients Table Schema

CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    critical_level INT NOT NULL CHECK (critical_level BETWEEN 0 AND 100),
    deterioration_rate INT NOT NULL CHECK (deterioration_rate BETWEEN 0 AND 100),
    treatment_duration INT NOT NULL,
    arrival_time INT NOT NULL,
    waiting_start_time INT,
    treatment_start_time INT,
    treatment_end_time INT,
    status VARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
    priority_score NUMERIC(10, 2) NOT NULL,
    required_resources JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
