-- VisionRoot Service Request Management System
-- Migration 001: Create service_requests table and indexes
-- Aligned with docs/data-model.md

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(120) NOT NULL CHECK (char_length(trim(title)) >= 5),
    description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10 AND char_length(description) <= 2000),
    category VARCHAR(20) NOT NULL CHECK (category IN ('IT', 'Facilities', 'Other')),
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create compound index for status filtering and created_at sorting
CREATE INDEX IF NOT EXISTS idx_service_requests_status_created_at ON service_requests (status, created_at DESC);

-- Create fallback index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests (created_at DESC);
