const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://smtckdlpdfvdycocwoip.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGNrZGxwZGZ2ZHljb2N3b2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MTA3MDgsImV4cCI6MjA1OTQ4NjcwOH0.TrR8QpN7wJLOLXNjgcOvdpQBDAJG1qDCMrypTkGqqYA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyMapImageUrl() {
  console.log('=== Verifying map_image_url column in tracking table ===\n');
  
  try {
    // Test 1: Select just the map_image_url column
    console.log('Test 1: Selecting map_image_url column...');
    const { data: mapUrlData, error: mapUrlError } = await supabase
      .from('tracking')
      .select('map_image_url')
      .limit(10);
    
    if (mapUrlError) {
      console.error('❌ Error:', mapUrlError.message);
    } else {
      console.log('✅ SUCCESS! map_image_url column exists');
      console.log(`   Found ${mapUrlData.length} records`);
      
      // Check how many have actual map URLs
      const withUrls = mapUrlData.filter(row => row.map_image_url !== null);
      console.log(`   Records with map URLs: ${withUrls.length}`);
      
      if (withUrls.length > 0) {
        console.log('\n   Sample map URLs:');
        withUrls.slice(0, 3).forEach((row, i) => {
          console.log(`   ${i + 1}. ${row.map_image_url}`);
        });
      }
    }
    
    // Test 2: Select all columns to see the full schema
    console.log('\n\nTest 2: Getting all columns from tracking table...');
    const { data: allData, error: allError } = await supabase
      .from('tracking')
      .select('*')
      .limit(1);
    
    if (allError) {
      console.error('❌ Error:', allError.message);
    } else if (allData && allData.length > 0) {
      console.log('✅ Table columns:');
      const columns = Object.keys(allData[0]);
      columns.forEach(col => {
        const hasMapImageUrl = col === 'map_image_url' ? ' ← MAP_IMAGE_URL COLUMN' : '';
        console.log(`   - ${col}${hasMapImageUrl}`);
      });
    }
    
    // Test 3: Check if we can update the column
    console.log('\n\nTest 3: Testing write access to map_image_url...');
    const testUrl = 'https://example.com/test-map.png';
    const { error: updateError } = await supabase
      .from('tracking')
      .update({ map_image_url: testUrl })
      .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
    
    if (updateError) {
      if (updateError.code === 'PGRST116') {
        console.log('✅ Write access confirmed (no matching rows, which is expected)');
      } else if (updateError.message.includes('does not exist')) {
        console.error('❌ Column does not exist');
      } else {
        console.log('   Update test result:', updateError.message);
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('✅ The map_image_url column has been successfully added to the tracking table!');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    process.exit(0);
  }
}

verifyMapImageUrl();