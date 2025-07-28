# Booking Videos Table Setup

This document contains the SQL commands needed to create the `booking_videos` table in Supabase for storing video session metadata and screenshots.

## Create Table SQL

```sql
-- Create booking_videos table
CREATE TABLE booking_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_url TEXT, -- Stores a reference ID, not actual video URL
    session_start_time TIMESTAMPTZ,
    session_end_time TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    screenshot_count INTEGER DEFAULT 0,
    screenshots_data JSONB, -- Stores array of screenshot metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_booking_videos_booking_id ON booking_videos(booking_id);
CREATE INDEX idx_booking_videos_user_id ON booking_videos(user_id);
CREATE INDEX idx_booking_videos_created_at ON booking_videos(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE booking_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own video sessions
CREATE POLICY "Users can view own video sessions" ON booking_videos
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own video sessions
CREATE POLICY "Users can create own video sessions" ON booking_videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own video sessions
CREATE POLICY "Users can update own video sessions" ON booking_videos
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at column
CREATE TRIGGER update_booking_videos_updated_at 
    BEFORE UPDATE ON booking_videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## Table Structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `booking_id` | UUID | Foreign key to service_bookings table |
| `user_id` | UUID | Foreign key to auth.users table |
| `video_url` | TEXT | Reference ID for the session (e.g., "session_1234567890") |
| `session_start_time` | TIMESTAMPTZ | When the video session started |
| `session_end_time` | TIMESTAMPTZ | When the video session ended |
| `duration_seconds` | INTEGER | Duration of the session in seconds |
| `screenshot_count` | INTEGER | Number of screenshots captured |
| `screenshots_data` | JSONB | JSON array containing screenshot metadata |
| `created_at` | TIMESTAMPTZ | When the record was created |
| `updated_at` | TIMESTAMPTZ | When the record was last updated |

## Screenshots Data Format

The `screenshots_data` column stores a JSON array with the following structure:

```json
[
  {
    "index": 0,
    "timestamp": "2024-01-20T10:30:00.000Z",
    "relative_time": "00:03",
    "thumbnail_url": "https://your-project.supabase.co/storage/v1/object/public/booking-screenshots/booking_id/session_id/screenshot_1.jpg",
    "width": 480,
    "height": 360
  },
  {
    "index": 1,
    "timestamp": "2024-01-20T10:30:03.000Z",
    "relative_time": "00:06",
    "thumbnail_url": "https://your-project.supabase.co/storage/v1/object/public/booking-screenshots/booking_id/session_id/screenshot_2.jpg",
    "width": 480,
    "height": 360
  }
]
```

## Storage Bucket Setup

You also need to create a storage bucket for screenshots:

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create a new bucket called `booking-screenshots`
4. Set it as a public bucket (or configure RLS policies as needed)

## How to Apply

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL code above
4. Click "Run" to execute the commands
5. Verify the table was created in the Table Editor

## Notes

- The table uses Row Level Security (RLS) to ensure users can only access their own video sessions
- The `video_url` field stores only a reference ID, not the actual video file
- Screenshots are stored in Supabase Storage, with metadata in the `screenshots_data` JSON column
- The `updated_at` column is automatically updated via a trigger whenever a row is modified