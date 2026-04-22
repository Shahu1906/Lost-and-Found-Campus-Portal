-- Migration 005: Found Reports and Handover details
-- Refined for robustness, performance, and transaction safety

BEGIN;

-- 1. Update items table status CHECK constraint robustly
-- This ensures the 'found' status is allowed even if the constraint was previously set
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN 
    -- Dynamically find the constraint name for the status column to avoid "constraint does not exist" errors
    SELECT conname INTO constraint_name
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'items' AND att.attname = 'status' AND con.contype = 'c';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE items DROP CONSTRAINT ' || constraint_name;
    END IF;

    ALTER TABLE items ADD CONSTRAINT items_status_check CHECK (status IN ('pending', 'verified_by_admin', 'claimed', 'returned', 'found'));
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Notice: Could not update items status constraint: %. It might have already been updated.', SQLERRM;
END $$;

-- 2. Create found_reports table
CREATE TABLE IF NOT EXISTS found_reports (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT,
    submitted_location TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_found_reports_item_id ON found_reports(item_id);
CREATE INDEX IF NOT EXISTS idx_found_reports_user_id ON found_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_found_reports_status ON found_reports(status);

-- 3. Add handover columns to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS handover_lat DECIMAL(9,6);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS handover_lng DECIMAL(9,6);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS handover_photo_url TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS handed_over_at TIMESTAMP WITH TIME ZONE;

-- Add index for handed_over_at for handover tracking/reports
CREATE INDEX IF NOT EXISTS idx_claims_handed_over_at ON claims(handed_over_at);

COMMIT;

