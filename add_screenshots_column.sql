-- Add screenshots_data column to booking_videos table
ALTER TABLE booking_videos 
ADD COLUMN IF NOT EXISTS screenshots_data JSONB;

-- Add screenshot_count column if it doesn't exist
ALTER TABLE booking_videos 
ADD COLUMN IF NOT EXISTS screenshot_count INTEGER DEFAULT 0;

-- Add session time columns if they don't exist
ALTER TABLE booking_videos 
ADD COLUMN IF NOT EXISTS session_start_time TIMESTAMPTZ;

ALTER TABLE booking_videos 
ADD COLUMN IF NOT EXISTS session_end_time TIMESTAMPTZ;

-- Add duration column if it doesn't exist
ALTER TABLE booking_videos 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- Optional: Add an index on booking_id for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_videos_booking_id ON booking_videos(booking_id);

-- Optional: Add an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_videos_user_id ON booking_videos(user_id);