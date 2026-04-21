-- Migration 005: Found Reports and Handover details

-- 1. Update items table status CHECK constraint
-- We need to handle the case where the constraint name might be different or not exist
DO $$ 
BEGIN 
    ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
    ALTER TABLE items ADD CONSTRAINT items_status_check CHECK (status IN ('pending', 'verified_by_admin', 'claimed', 'returned', 'found'));
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Could not update items status constraint: %', SQLERRM;
END $$;

-- 2. Create found_reports table
CREATE TABLE IF NOT EXISTS found_reports (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT,
    submitted_location TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add handover columns to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS handover_lat DECIMAL(9,6);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS handover_lng DECIMAL(9,6);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS handover_photo_url TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS handed_over_at TIMESTAMP WITH TIME ZONE;
