-- Add map_image_url column to tracking table
ALTER TABLE tracking 
ADD COLUMN IF NOT EXISTS map_image_url TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN tracking.map_image_url IS 'URL of the generated map image showing the tracked session path';