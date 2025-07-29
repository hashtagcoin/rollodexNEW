const { createClient } = require('@supabase/supabase-js');

// Use the service key for full access
const SUPABASE_URL = 'https://smtckdlpdfvdycocwoip.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGNrZGxwZGZ2ZHljb2N3b2lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkxMDcwOCwiZXhwIjoyMDU5NDg2NzA4fQ.91mR4_igHgBbTUJOkG8yoO1kGhQgueLpglh9ok0AwxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyMapImageUrlColumn() {
  console.log('Verifying map_image_url column in tracking table...\n');
  
  try {
    // Try to select the specific column
    const { data, error } = await supabase
      .from('tracking')
      .select('id, map_image_url')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column "map_image_url" does not exist')) {
        console.log('❌ map_image_url column does NOT exist in tracking table');
        console.log('\nPlease run this SQL in your Supabase Dashboard:');
        console.log(`
ALTER TABLE tracking 
ADD COLUMN IF NOT EXISTS map_image_url TEXT;

COMMENT ON COLUMN tracking.map_image_url IS 'URL of the generated map image showing the tracked session path';
        `);
        return false;
      } else {
        console.error('Error:', error);
        return false;
      }
    }
    
    console.log('✅ map_image_url column EXISTS in tracking table');
    console.log('Sample query result:', data);
    return true;
    
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

// Run the verification
verifyMapImageUrlColumn();