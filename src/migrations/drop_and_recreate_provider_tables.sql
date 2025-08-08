-- Drop existing view first (views depend on tables)
DROP VIEW IF EXISTS provider_financial_summary CASCADE;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS provider_revenue CASCADE;
DROP TABLE IF EXISTS provider_payouts CASCADE;
DROP TABLE IF EXISTS provider_payout_methods CASCADE;

-- Now create tables fresh

-- Create provider payout methods table
CREATE TABLE provider_payout_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('bank', 'paypal', 'stripe')),
    name VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    last4 VARCHAR(4),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create provider payouts table
CREATE TABLE provider_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL,
    payout_method_id UUID,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    type VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (type IN ('automatic', 'manual')),
    scheduled_date DATE,
    processed_date TIMESTAMPTZ,
    failure_reason TEXT,
    transaction_reference VARCHAR(255),
    booking_ids UUID[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create provider revenue table
CREATE TABLE provider_revenue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL,
    booking_id UUID,
    service_id UUID,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    commission_rate DECIMAL(5, 2) DEFAULT 0.00,
    commission_amount DECIMAL(10, 2) DEFAULT 0.00,
    net_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'paid_out')),
    payout_id UUID,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE provider_payout_methods 
ADD CONSTRAINT fk_provider_payout_methods_provider 
FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE;

ALTER TABLE provider_payouts 
ADD CONSTRAINT fk_provider_payouts_provider 
FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE;

ALTER TABLE provider_payouts 
ADD CONSTRAINT fk_provider_payouts_method 
FOREIGN KEY (payout_method_id) REFERENCES provider_payout_methods(id);

ALTER TABLE provider_revenue 
ADD CONSTRAINT fk_provider_revenue_provider 
FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE;

ALTER TABLE provider_revenue 
ADD CONSTRAINT fk_provider_revenue_booking 
FOREIGN KEY (booking_id) REFERENCES service_bookings(id);

ALTER TABLE provider_revenue 
ADD CONSTRAINT fk_provider_revenue_service 
FOREIGN KEY (service_id) REFERENCES services(id);

ALTER TABLE provider_revenue 
ADD CONSTRAINT fk_provider_revenue_payout 
FOREIGN KEY (payout_id) REFERENCES provider_payouts(id);

-- Create indexes
CREATE INDEX idx_provider_payout_methods_provider ON provider_payout_methods(provider_id);
CREATE INDEX idx_provider_payout_methods_default ON provider_payout_methods(provider_id, is_default) WHERE is_default = true;
CREATE INDEX idx_provider_payouts_provider ON provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_status ON provider_payouts(status);
CREATE INDEX idx_provider_payouts_scheduled ON provider_payouts(scheduled_date) WHERE status = 'pending';
CREATE INDEX idx_provider_revenue_provider ON provider_revenue(provider_id);
CREATE INDEX idx_provider_revenue_booking ON provider_revenue(booking_id);
CREATE INDEX idx_provider_revenue_status ON provider_revenue(status);

-- Enable RLS
ALTER TABLE provider_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_revenue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Providers can view own payout methods" ON provider_payout_methods
    FOR SELECT USING (provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Providers can insert own payout methods" ON provider_payout_methods
    FOR INSERT WITH CHECK (provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Providers can update own payout methods" ON provider_payout_methods
    FOR UPDATE USING (provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Providers can view own payouts" ON provider_payouts
    FOR SELECT USING (provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Providers can view own revenue" ON provider_revenue
    FOR SELECT USING (provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
    ));

-- Create view for provider financial summary
CREATE VIEW provider_financial_summary AS
SELECT 
    p.id as provider_id,
    p.user_id,
    COALESCE(SUM(CASE WHEN r.status = 'paid_out' THEN r.net_amount ELSE 0 END), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN r.status = 'available' THEN r.net_amount ELSE 0 END), 0) as available_balance,
    COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.net_amount ELSE 0 END), 0) as pending_earnings,
    COALESCE(SUM(CASE 
        WHEN r.earned_at >= date_trunc('month', CURRENT_DATE) 
        AND r.status IN ('available', 'paid_out') 
        THEN r.net_amount 
        ELSE 0 
    END), 0) as monthly_earnings,
    COUNT(DISTINCT r.booking_id) as total_bookings,
    MAX(payout.processed_date) as last_payout_date
FROM service_providers p
LEFT JOIN provider_revenue r ON r.provider_id = p.id
LEFT JOIN provider_payouts payout ON payout.provider_id = p.id AND payout.status = 'completed'
GROUP BY p.id, p.user_id;

-- Grant access to the view
GRANT SELECT ON provider_financial_summary TO authenticated;

-- Add payment_status column to service_bookings if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'service_bookings' 
                   AND column_name = 'payment_status') THEN
        ALTER TABLE service_bookings 
        ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'pending_provider_payout'));
    END IF;
END $$;