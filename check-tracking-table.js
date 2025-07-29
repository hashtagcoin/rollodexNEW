const { createClient } = require('@supabase/supabase-js');

// Use the service key for full access
const SUPABASE_URL = 'https://smtckdlpdfvdycocwoip.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGNrZGxwZGZ2ZHljb2N3b2lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkxMDcwOCwiZXhwIjoyMDU5NDg2NzA4fQ.91mR4_igHgBbTUJOkG8yoO1kGhQgueLpglh9ok0AwxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTrackingTable() {
  try {
    console.log('Checking tracking table structure...\n');
    
    // Try to select from tracking table including the map_image_url column
    const { data, error } = await supabase
      .from('tracking')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing tracking table:', error);
      return;
    }
    
    console.log('✅ Successfully accessed tracking table');
    
    // Check if map_image_url column exists
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('\nColumns in tracking table:', columns);
      
      if (columns.includes('map_image_url')) {
        console.log('\n✅ map_image_url column already exists!');
      } else {
        console.log('\n❌ map_image_url column does not exist yet');
      }
    } else {
      console.log('\nNo data in tracking table to check columns');
      
      // Try another approach - select specifically the column
      const { data: testData, error: testError } = await supabase
        .from('tracking')
        .select('map_image_url')
        .limit(1);
      
      if (testError && testError.message.includes('column')) {
        console.log('❌ map_image_url column does not exist');
      } else {
        console.log('✅ map_image_url column exists (empty table)');
      }
    }
    
    // Check storage buckets
    console.log('\n\nChecking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      console.log('Available storage buckets:', buckets.map(b => b.name));
      
      const trackingMapsBucket = buckets.find(b => b.name === 'trackingmaps');
      if (trackingMapsBucket) {
        console.log('✅ trackingmaps bucket already exists!');
      } else {
        console.log('❌ trackingmaps bucket does not exist yet');
      }
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the check
checkTrackingTable();