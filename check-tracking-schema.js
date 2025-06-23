const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://smtckdlpdfvdycocwoip.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGNrZGxwZGZ2ZHljb2N3b2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MTA3MDgsImV4cCI6MjA1OTQ4NjcwOH0.TrR8QpN7wJLOLXNjgcOvdpQBDAJG1qDCMrypTkGqqYA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTrackingSchema() {
  try {
    console.log('Checking tracking table schema...\n');
    
    // Method 1: Try to select the map_image_url column
    const { data, error } = await supabase
      .from('tracking')
      .select('id, map_image_url')
      .limit(1);
    
    if (error) {
      console.error('Error querying tracking table:', error.message);
      console.log('\nColumn may not exist or there might be a permissions issue.');
    } else {
      console.log('✅ Successfully queried map_image_url column!');
      console.log('Sample data:', data);
    }
    
    // Method 2: Try to query with specific columns to verify
    console.log('\n\nVerifying column exists by selecting multiple columns...');
    const { data: trackingData, error: trackingError } = await supabase
      .from('tracking')
      .select('id, created_at, latitude, longitude, map_image_url')
      .limit(5);
    
    if (trackingError) {
      console.error('Error:', trackingError.message);
    } else {
      console.log(`✅ Found ${trackingData.length} tracking records`);
      if (trackingData.length > 0) {
        console.log('\nSample record structure:');
        console.log(Object.keys(trackingData[0]));
      }
    }
    
    // Method 3: Try an insert/update to verify the column exists
    console.log('\n\nTesting column with a dummy update...');
    const { error: updateError } = await supabase
      .from('tracking')
      .update({ map_image_url: null })
      .eq('id', '00000000-0000-0000-0000-000000000000') // Non-existent ID
      .single();
    
    if (updateError) {
      if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
        console.error('❌ Column map_image_url does not exist in tracking table');
      } else if (updateError.code === 'PGRST116') {
        console.log('✅ Column exists! (No matching rows to update, which is expected)');
      } else {
        console.log('Update test result:', updateError.message);
      }
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    process.exit(0);
  }
}

checkTrackingSchema();