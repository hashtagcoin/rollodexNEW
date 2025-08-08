-- Provider Dashboard Schema Migrations

-- 1. Create provider_availability table to manage time slots for service providers
CREATE TABLE IF NOT EXISTS provider_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique combinations of provider, service, date, and time slot
  UNIQUE (provider_id, service_id, date, time_slot)
);

-- Add RLS policies for provider_availability
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;

-- Provider can read and modify their own availability
CREATE POLICY "Providers can view their own availability" 
  ON provider_availability 
  FOR SELECT 
  USING (auth.uid() = provider_id);
  
CREATE POLICY "Providers can insert their own availability" 
  ON provider_availability 
  FOR INSERT 
  WITH CHECK (auth.uid() = provider_id);
  
CREATE POLICY "Providers can update their own availability" 
  ON provider_availability 
  FOR UPDATE 
  USING (auth.uid() = provider_id);
  
CREATE POLICY "Providers can delete their own availability" 
  ON provider_availability 
  FOR DELETE 
  USING (auth.uid() = provider_id);
  
-- Clients can view provider availability (but not modify)
CREATE POLICY "Clients can view availability" 
  ON provider_availability 
  FOR SELECT 
  USING (available = true);

-- 2. Create service_agreement_templates table
CREATE TABLE IF NOT EXISTS service_agreement_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for service_agreement_templates
ALTER TABLE service_agreement_templates ENABLE ROW LEVEL SECURITY;

-- Provider can read and modify their own templates
CREATE POLICY "Providers can view their own templates" 
  ON service_agreement_templates 
  FOR SELECT 
  USING (auth.uid() = provider_id);
  
CREATE POLICY "Providers can insert their own templates" 
  ON service_agreement_templates 
  FOR INSERT 
  WITH CHECK (auth.uid() = provider_id);
  
CREATE POLICY "Providers can update their own templates" 
  ON service_agreement_templates 
  FOR UPDATE 
  USING (auth.uid() = provider_id);
  
CREATE POLICY "Providers can delete their own templates" 
  ON service_agreement_templates 
  FOR DELETE 
  USING (auth.uid() = provider_id);

-- 3. Enhance service_agreements table with more fields
-- (Assuming service_agreements table already exists)
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS service_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES user_profiles(id),
  client_id UUID NOT NULL REFERENCES user_profiles(id),
  service_id UUID REFERENCES services(id),
  agreement_number VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, active, completed, canceled
  start_date DATE,
  end_date DATE,
  file_url TEXT,
  provider_signed BOOLEAN DEFAULT false,
  client_signed BOOLEAN DEFAULT false,
  provider_signature_date TIMESTAMPTZ,
  client_signature_date TIMESTAMPTZ,
  terms TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for service_agreements
ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;

-- Provider and client can view agreements they're part of
CREATE POLICY "Users can view their own agreements" 
  ON service_agreements 
  FOR SELECT 
  USING (auth.uid() = provider_id OR auth.uid() = client_id);
  
-- Provider can insert agreements
CREATE POLICY "Providers can insert agreements" 
  ON service_agreements 
  FOR INSERT 
  WITH CHECK (auth.uid() = provider_id);
  
-- Provider and client can update agreements they're part of
CREATE POLICY "Users can update their own agreements" 
  ON service_agreements 
  FOR UPDATE 
  USING (auth.uid() = provider_id OR auth.uid() = client_id);

-- 4. Create view for bookings with provider details
CREATE OR REPLACE VIEW bookings_with_provider_details AS
SELECT 
  b.id AS booking_id,
  b.user_id AS client_id,
  b.service_id,
  b.provider_id,
  b.scheduled_at,
  b.duration,
  b.status,
  b.price,
  b.payment_status,
  b.payment_method,
  b.notes AS booking_notes,
  b.created_at,
  s.title AS service_title,
  s.description AS service_description,
  s.category AS service_category,
  p.full_name AS provider_name,
  p.business_name AS provider_business,
  p.avatar_url AS provider_avatar,
  c.full_name AS client_name,
  c.avatar_url AS client_avatar
FROM
  bookings b
JOIN 
  services s ON b.service_id = s.id
JOIN 
  user_profiles p ON b.provider_id = p.id
JOIN 
  user_profiles c ON b.user_id = c.id;

-- 5. Add provider_dashboard_preferences to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS provider_dashboard_preferences JSONB DEFAULT '{"defaultView": "appointments", "notifications": true, "autoConfirm": false}'::jsonb;

-- 6. Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_id ON provider_availability(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_date ON provider_availability(date);
CREATE INDEX IF NOT EXISTS idx_service_agreements_provider_id ON service_agreements(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_agreements_client_id ON service_agreements(client_id);
CREATE INDEX IF NOT EXISTS idx_service_agreements_status ON service_agreements(status);
