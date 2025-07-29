const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addMapImageUrlColumn() {
  try {
    console.log('Adding map_image_url column to tracking table...');
    
    // Execute the SQL to add the column
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE tracking 
        ADD COLUMN IF NOT EXISTS map_image_url TEXT;
        
        COMMENT ON COLUMN tracking.map_image_url IS 'URL of the generated map image showing the tracked session path';
      `
    });

    if (error) {
      // If exec_sql doesn't exist, try direct approach
      console.log('Trying alternative approach...');
      
      // First, let's check if the column already exists
      const { data: columns, error: columnsError } = await supabase
        .from('tracking')
        .select('*')
        .limit(0);
      
      if (columnsError) {
        console.error('Error checking tracking table:', columnsError);
        return;
      }
      
      console.log('Migration needs to be run directly in Supabase Dashboard SQL Editor.');
      console.log('\nPlease run the following SQL in your Supabase Dashboard:\n');
      console.log(`ALTER TABLE tracking 
ADD COLUMN IF NOT EXISTS map_image_url TEXT;

COMMENT ON COLUMN tracking.map_image_url IS 'URL of the generated map image showing the tracked session path';`);
      return;
    }

    console.log('✅ Successfully added map_image_url column to tracking table!');
    
    // Verify the column was added
    const { data: testData, error: testError } = await supabase
      .from('tracking')
      .select('map_image_url')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Column verified - ready to use!');
    }
    
  } catch (err) {
    console.error('Error during migration:', err);
  }
}

// Run the migration
addMapImageUrlColumn();