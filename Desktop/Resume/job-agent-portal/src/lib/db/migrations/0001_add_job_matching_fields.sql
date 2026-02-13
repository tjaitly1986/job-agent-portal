-- Migration: Add AI matching fields to jobs table
-- Created: 2026-02-12

ALTER TABLE jobs ADD COLUMN match_score real;
ALTER TABLE jobs ADD COLUMN match_reasons text;

-- Create index on match_score for faster sorting by relevance
CREATE INDEX idx_jobs_match_score ON jobs (match_score DESC);
