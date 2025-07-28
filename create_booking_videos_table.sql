-- Create booking_videos table if it doesn't exist
CREATE TABLE IF NOT EXISTS booking_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_url TEXT, -- This will just store a reference ID, not actual video URL
    session_start_time TIMESTAMPTZ,
    session_end_time TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    screenshot_count INTEGER DEFAULT 0,
    screenshots_data JSONB, -- Stores array of screenshot metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_videos_booking_id ON booking_videos(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_videos_user_id ON booking_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_videos_created_at ON booking_videos(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE booking_videos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own video sessions
CREATE POLICY "Users can view own video sessions" ON booking_videos
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own video sessions
CREATE POLICY "Users can create own video sessions" ON booking_videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own video sessions
CREATE POLICY "Users can update own video sessions" ON booking_videos
    FOR UPDATE USING (auth.uid() = user_id);

-- Optional: Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_booking_videos_updated_at BEFORE UPDATE
    ON booking_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();