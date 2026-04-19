-- Add rejection_reason column to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
