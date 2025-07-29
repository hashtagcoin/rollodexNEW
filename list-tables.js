const SUPABASE_URL = 'https://smtckdlpdfvdycocwoip.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGNrZGxwZGZ2ZHljb2N3b2lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkxMDcwOCwiZXhwIjoyMDU5NDg2NzA4fQ.91mR4_igHgBbTUJOkG8yoO1kGhQgueLpglh9ok0AwxE';

async function listTables() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    const openApiSpec = await response.json();
    const paths = Object.keys(openApiSpec.paths || {});
    
    // Extract table names (exclude system tables and special endpoints)
    const tables = paths
      .filter(path => path !== '/' && !path.includes('rpc'))
      .map(path => path.substring(1)) // Remove leading slash
      .sort();
    
    console.log('=== TABLES IN YOUR DATABASE ===\n');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table}`);
    });
    console.log(`\nTotal tables: ${tables.length}`);
    
    // Get a sample of data from the first few tables
    console.log('\n=== SAMPLE DATA FROM TABLES ===\n');
    
    for (const table of tables.slice(0, 3)) {
      try {
        const dataResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=2`, {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          }
        });
        
        if (dataResponse.ok) {
          const data = await dataResponse.json();
          console.log(`\n${table}:`);
          console.log(JSON.stringify(data, null, 2));
        }
      } catch (err) {
        console.error(`Error fetching ${table}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

listTables();