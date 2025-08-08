-- Step 1: Create provider payout methods table
CREATE TABLE IF NOT EXISTS provider_payout_methods (
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