-- Initial Schema for Lost & Found College API

-- 1. Profiles Table (Users)
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    reg_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    dob DATE,
    department VARCHAR(100),
    division VARCHAR(50),
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Items Table (Lost/Found Posts)
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('lost', 'found')),
    category VARCHAR(50) CHECK (category IN ('electronics', 'jewelry', 'keys', 'others')),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    location_found TEXT, -- Also used for 'lost_place'
    lost_date DATE DEFAULT CURRENT_DATE,
    geotag_lat DECIMAL(9,6),
    geotag_lng DECIMAL(9,6),
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified_by_admin', 'claimed', 'returned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Claims Table
CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    proof_type VARCHAR(50) CHECK (proof_type IN ('bill', 'photo', 'in_person_meet')),
    proof_details TEXT, -- Cloudinary URL for photo/bill or meeting preference
    status VARCHAR(50) DEFAULT 'applied' CHECK (status IN ('applied', 'pending_verification', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
