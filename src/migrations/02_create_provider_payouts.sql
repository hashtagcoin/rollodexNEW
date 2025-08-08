-- Step 2: Create provider payouts table
CREATE TABLE IF NOT EXISTS provider_payouts (
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