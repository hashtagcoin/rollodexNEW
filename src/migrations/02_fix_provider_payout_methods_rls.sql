-- Fix RLS policies for provider_payout_methods table

-- First, ensure RLS is enabled
ALTER TABLE provider_payout_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Providers can view their own payout methods" ON provider_payout_methods;
DROP POLICY IF EXISTS "Providers can insert their own payout methods" ON provider_payout_methods;
DROP POLICY IF EXISTS "Providers can update their own payout methods" ON provider_payout_methods;
DROP POLICY IF EXISTS "Providers can delete their own payout methods" ON provider_payout_methods;

-- Create policies that allow providers to manage their own payout methods
-- Note: We're using provider_id = auth.uid() to match the user's ID

-- Policy for SELECT
CREATE POLICY "Providers can view their own payout methods" ON provider_payout_methods
    FOR SELECT
    USING (provider_id = auth.uid());

-- Policy for INSERT
CREATE POLICY "Providers can insert their own payout methods" ON provider_payout_methods
    FOR INSERT
    WITH CHECK (provider_id = auth.uid());

-- Policy for UPDATE
CREATE POLICY "Providers can update their own payout methods" ON provider_payout_methods
    FOR UPDATE
    USING (provider_id = auth.uid())
    WITH CHECK (provider_id = auth.uid());

-- Policy for DELETE
CREATE POLICY "Providers can delete their own payout methods" ON provider_payout_methods
    FOR DELETE
    USING (provider_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_provider_payout_methods_provider_id ON provider_payout_methods(provider_id);

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_payout_methods_provider_id_fkey') THEN
        ALTER TABLE provider_payout_methods
        ADD CONSTRAINT provider_payout_methods_provider_id_fkey
        FOREIGN KEY (provider_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;