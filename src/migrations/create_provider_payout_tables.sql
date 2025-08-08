-- Create provider payout methods table
CREATE TABLE IF NOT EXISTS provider_payout_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS provider_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    payout_method_id UUID REFERENCES provider_payout_methods(id),
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

-- Create provider revenue table for tracking earnings by service
CREATE TABLE IF NOT EXISTS provider_revenue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES service_bookings(id),
    service_id UUID REFERENCES services(id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    commission_rate DECIMAL(5, 2) DEFAULT 0.00,
    commission_amount DECIMAL(10, 2) DEFAULT 0.00,
    net_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'paid_out')),
    payout_id UUID REFERENCES provider_payouts(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add payment_status column to service_bookings if it doesn't exist
ALTER TABLE service_bookings 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'pending_provider_payout'));

-- Create indexes for performance
CREATE INDEX idx_provider_payout_methods_provider ON provider_payout_methods(provider_id);
CREATE INDEX idx_provider_payout_methods_default ON provider_payout_methods(provider_id, is_default) WHERE is_default = true;
CREATE INDEX idx_provider_payouts_provider ON provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_status ON provider_payouts(status);
CREATE INDEX idx_provider_payouts_scheduled ON provider_payouts(scheduled_date) WHERE status = 'pending';
CREATE INDEX idx_provider_revenue_provider ON provider_revenue(provider_id);
CREATE INDEX idx_provider_revenue_booking ON provider_revenue(booking_id);
CREATE INDEX idx_provider_revenue_status ON provider_revenue(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_provider_payout_methods_updated_at BEFORE UPDATE ON provider_payout_methods
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_payouts_updated_at BEFORE UPDATE ON provider_payouts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE provider_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_revenue ENABLE ROW LEVEL SECURITY;

-- Providers can view and manage their own payout methods
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

-- Providers can view their own payouts
CREATE POLICY "Providers can view own payouts" ON provider_payouts
    FOR SELECT USING (provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
    ));

-- Providers can view their own revenue
CREATE POLICY "Providers can view own revenue" ON provider_revenue
    FOR SELECT USING (provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
    ));

-- Create view for provider financial summary
CREATE OR REPLACE VIEW provider_financial_summary AS
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