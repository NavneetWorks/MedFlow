-- MEDFLOW Supabase Database Schema & Migrations

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL DEFAULT 30,
    department VARCHAR(64) NOT NULL DEFAULT 'EMERGENCY_ER',
    vitals JSONB,
    symptoms JSONB,
    critical_level NUMERIC(10, 2) NOT NULL DEFAULT 0,
    deterioration_rate NUMERIC(10, 2) NOT NULL DEFAULT 15,
    treatment_duration INT NOT NULL DEFAULT 30,
    arrival_time INT NOT NULL DEFAULT 0,
    waiting_start_time INT,
    treatment_start_time INT,
    treatment_end_time INT,
    status VARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
    priority_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    required_resources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INT NOT NULL DEFAULT 30;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS department VARCHAR(64) NOT NULL DEFAULT 'EMERGENCY_ER';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS vitals JSONB;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS symptoms JSONB;
ALTER TABLE patients ALTER COLUMN critical_level TYPE NUMERIC(10, 2);
ALTER TABLE patients ALTER COLUMN deterioration_rate TYPE NUMERIC(10, 2);

-- 2. Physical Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    specialization VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    current_patient_id VARCHAR(64),
    total_busy_time INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Resource Allocations Audit Log Table
CREATE TABLE IF NOT EXISTS resource_allocations (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    allocated_at_sim_time INT NOT NULL,
    released_at_sim_time INT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Simulation Metrics Time-Series Table (Sampled every 10 sim mins)
CREATE TABLE IF NOT EXISTS simulation_metrics (
    id SERIAL PRIMARY KEY,
    sim_time_minutes INT NOT NULL,
    waiting_count INT NOT NULL,
    active_treatment_count INT NOT NULL,
    completed_count INT NOT NULL,
    avg_wait_time_minutes NUMERIC(10, 2) NOT NULL DEFAULT 0,
    icu_occupancy_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
