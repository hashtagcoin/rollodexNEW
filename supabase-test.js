const SUPABASE_URL = 'https://smtckdlpdfvdycocwoip.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGNrZGxwZGZ2ZHljb2N3b2lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkxMDcwOCwiZXhwIjoyMDU5NDg2NzA4fQ.91mR4_igHgBbTUJOkG8yoO1kGhQgueLpglh9ok0AwxE';

async function fetchTables() {
  try {
    // Get list of tables
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch tables:', response.status, response.statusText);
      return;
    }
    
    const data = await response.text();
    console.log('API Response:', data);
    
    // Try to get schema information
    const schemaResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_tables`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (schemaResponse.ok) {
      const tables = await schemaResponse.json();
      console.log('Tables:', tables);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchTables();