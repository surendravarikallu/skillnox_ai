-- Performance Optimization Indexes
-- Run this migration to add indexes for faster queries

-- Interviews table indexes
CREATE INDEX IF NOT EXISTS idx_interviews_userid_created 
ON interviews(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interviews_status 
ON interviews(status);

CREATE INDEX IF NOT EXISTS idx_interviews_created 
ON interviews(created_at DESC);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Interview questions indexes
CREATE INDEX IF NOT EXISTS idx_questions_interview_order 
ON interview_questions(interview_id, order_index);

-- Job descriptions indexes (for skill gap analysis)
CREATE INDEX IF NOT EXISTS idx_jd_userid_created 
ON job_descriptions(user_id, created_at DESC);

-- GD sessions indexes
CREATE INDEX IF NOT EXISTS idx_gd_userid_created 
ON gd_sessions(user_id, created_at DESC);

-- Personality assessments indexes
CREATE INDEX IF NOT EXISTS idx_personality_userid 
ON personality_assessments(user_id);

-- Placement probabilities indexes
CREATE INDEX IF NOT EXISTS idx_placement_userid 
ON placement_probabilities(user_id);

-- Resumes indexes
CREATE INDEX IF NOT EXISTS idx_resumes_userid 
ON resumes(user_id);

-- Global settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_key 
ON global_settings(key);

-- Performance note: These indexes will speed up:
-- 1. User interview lookups (most common query)
-- 2. Admin dashboard statistics
-- 3. Filtering by status (in-progress, completed)
-- 4. Recent interviews sorting
-- 5. Email-based user lookups
