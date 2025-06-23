const { createClient } = require('@supabase/supabase-js');

// Use the service key for full access
const SUPABASE_URL = 'https://smtckdlpdfvdycocwoip.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGNrZGxwZGZ2ZHljb2N3b2lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkxMDcwOCwiZXhwIjoyMDU5NDg2NzA4fQ.91mR4_igHgBbTUJOkG8yoO1kGhQgueLpglh9ok0AwxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAndSetupTracking() {
  console.log('=== Tracking Maps Setup Check ===\n');
  
  let setupNeeded = [];
  
  try {
    // 1. Check tracking table for map_image_url column
    console.log('1. Checking tracking table structure...');
    const { data, error } = await supabase
      .from('tracking')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('relation "public.tracking" does not exist')) {
      console.log('❌ Tracking table does not exist!');
      setupNeeded.push('Create tracking table first');
    } else if (error) {
      console.error('Error accessing tracking table:', error);
    } else {
      console.log('✅ Tracking table exists');
      
      // Check for map_image_url column
      const { data: columnTest, error: columnError } = await supabase
        .from('tracking')
        .select('map_image_url')
        .limit(1);
      
      if (columnError && columnError.message.includes('column "map_image_url" does not exist')) {
        console.log('❌ map_image_url column does not exist');
        setupNeeded.push('Add map_image_url column to tracking table');
      } else if (!columnError) {
        console.log('✅ map_image_url column exists');
      }
    }
    
    // 2. Check storage buckets
    console.log('\n2. Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      setupNeeded.push('Unable to check storage buckets - may need manual setup');
    } else {
      const bucketNames = buckets.map(b => b.name);
      console.log('Available storage buckets:', bucketNames);
      
      if (!bucketNames.includes('trackingmaps')) {
        console.log('❌ trackingmaps bucket does not exist');
        setupNeeded.push('Create trackingmaps storage bucket');
        setupNeeded.push('Set up RLS policies for trackingmaps bucket');
      } else {
        console.log('✅ trackingmaps bucket exists');
        
        // Check if bucket is public
        const trackingMapsBucket = buckets.find(b => b.name === 'trackingmaps');
        if (trackingMapsBucket && trackingMapsBucket.public) {
          console.log('✅ trackingmaps bucket is public');
        } else {
          console.log('❌ trackingmaps bucket is not public');
          setupNeeded.push('Make trackingmaps bucket public');
        }
      }
    }
    
    // 3. Summary
    console.log('\n=== Setup Summary ===');
    if (setupNeeded.length === 0) {
      console.log('✅ All components are properly set up!');
    } else {
      console.log('❌ The following setup steps are needed:');
      setupNeeded.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
      
      console.log('\n📋 Required SQL Commands:');
      console.log('Please run the following SQL in your Supabase Dashboard SQL Editor:\n');
      
      if (setupNeeded.some(s => s.includes('storage bucket'))) {
        console.log(`-- Create trackingmaps bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trackingmaps', 'trackingmaps', true)
ON CONFLICT (id) DO NOTHING;`);
      }
      
      if (setupNeeded.some(s => s.includes('RLS policies'))) {
        console.log(`
-- Set up RLS policies for trackingmaps bucket
CREATE POLICY "Allow authenticated users to upload tracking maps" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow public to view tracking maps" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'trackingmaps');

CREATE POLICY "Allow users to update their own tracking maps" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own tracking maps" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1]);`);
      }
      
      if (setupNeeded.some(s => s.includes('map_image_url column'))) {
        console.log(`
-- Add map_image_url column to tracking table
ALTER TABLE tracking 
ADD COLUMN IF NOT EXISTS map_image_url TEXT;

-- Add description comment
COMMENT ON COLUMN tracking.map_image_url IS 'URL of the generated map image showing the tracked session path';`);
      }
      
      console.log('\n📝 Note: You can also find all these commands in the file: /mnt/d/rollodexNEW/setup-tracking-maps.sql');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the check
checkAndSetupTracking();