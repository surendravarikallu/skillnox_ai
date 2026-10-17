-- Add Agentic & Proctoring Columns to Interviews Table
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS integrity_score real DEFAULT 100;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS skill_graph jsonb;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS evidence_quotes jsonb;

-- Create Proctoring Logs Table
CREATE TABLE IF NOT EXISTS proctoring_logs (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id varchar NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    event_type varchar NOT NULL,
    timestamp_seconds integer NOT NULL,
    duration_seconds real,
    severity varchar NOT NULL DEFAULT 'low',
    metadata jsonb,
    created_at timestamp DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_interview_id ON proctoring_logs(interview_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_event_type ON proctoring_logs(event_type);
