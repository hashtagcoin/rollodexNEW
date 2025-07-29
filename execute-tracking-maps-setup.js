const fetch = require('node-fetch');

// Use the service key from supabase-test.js since it has the necessary permissions
const SUPABASE_URL = 'https://smtckdlpdfvdycocwoip.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGNrZGxwZGZ2ZHljb2N3b2lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkxMDcwOCwiZXhwIjoyMDU5NDg2NzA4fQ.91mR4_igHgBbTUJOkG8yoO1kGhQgueLpglh9ok0AwxE';

async function executeSQL(sql, description) {
  try {
    console.log(`\nExecuting: ${description}...`);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed: ${description}`);
      console.error(`Status: ${response.status}`);
      console.error(`Error: ${errorText}`);
      return false;
    }

    const result = await response.text();
    console.log(`✅ Success: ${description}`);
    if (result) {
      console.log(`Result: ${result}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error executing ${description}:`, error.message);
    return false;
  }
}

async function setupTrackingMaps() {
  console.log('Starting Tracking Maps Setup...\n');

  // SQL commands to execute
  const sqlCommands = [
    {
      sql: `
        -- Create trackingmaps bucket in Supabase Storage
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('trackingmaps', 'trackingmaps', true)
        ON CONFLICT (id) DO NOTHING;
      `,
      description: 'Create trackingmaps storage bucket'
    },
    {
      sql: `
        -- Allow authenticated users to upload tracking maps
        CREATE POLICY "Allow authenticated users to upload tracking maps" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1]);
      `,
      description: 'Create policy for authenticated users to upload'
    },
    {
      sql: `
        -- Allow public to view tracking maps
        CREATE POLICY "Allow public to view tracking maps" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'trackingmaps');
      `,
      description: 'Create policy for public viewing'
    },
    {
      sql: `
        -- Allow users to update their own tracking maps
        CREATE POLICY "Allow users to update their own tracking maps" ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1])
        WITH CHECK (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1]);
      `,
      description: 'Create policy for users to update their own maps'
    },
    {
      sql: `
        -- Allow users to delete their own tracking maps
        CREATE POLICY "Allow users to delete their own tracking maps" ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1]);
      `,
      description: 'Create policy for users to delete their own maps'
    },
    {
      sql: `
        -- Add map_image_url column to tracking table
        ALTER TABLE tracking 
        ADD COLUMN IF NOT EXISTS map_image_url TEXT;
      `,
      description: 'Add map_image_url column to tracking table'
    },
    {
      sql: `
        -- Add a comment to describe the column
        COMMENT ON COLUMN tracking.map_image_url IS 'URL of the generated map image showing the tracked session path';
      `,
      description: 'Add comment to map_image_url column'
    }
  ];

  let successCount = 0;
  let failureCount = 0;

  // Execute each SQL command
  for (const command of sqlCommands) {
    const success = await executeSQL(command.sql, command.description);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log('\n========================================');
  console.log('Setup Complete!');
  console.log(`✅ Successful operations: ${successCount}`);
  console.log(`❌ Failed operations: ${failureCount}`);
  console.log('========================================\n');

  if (failureCount > 0) {
    console.log('⚠️  Some operations failed. This might be because:');
    console.log('1. The RPC function "exec_sql" might not be available');
    console.log('2. Some policies might already exist');
    console.log('3. Permissions issues\n');
    console.log('You may need to run the SQL commands directly in the Supabase Dashboard SQL Editor.');
    console.log('The SQL file is available at: setup-tracking-maps.sql');
  }
}

// Run the setup
setupTrackingMaps().catch(console.error);