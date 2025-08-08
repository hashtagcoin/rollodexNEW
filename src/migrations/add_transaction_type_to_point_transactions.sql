-- Add transaction_type column to point_transactions table
ALTER TABLE point_transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50) DEFAULT 'manual' 
CHECK (transaction_type IN ('fully_funded', 'partial_payment', 'manual_payment'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_type ON point_transactions(user_id, transaction_type);

-- Update existing transactions to have appropriate types based on context
-- This is optional and depends on your existing data
UPDATE point_transactions 
SET transaction_type = 'fully_funded' 
WHERE transaction_type IS NULL 
AND type = 'purchase' 
AND description LIKE '%NDIS%';

-- Create a view for transaction summaries by type
CREATE OR REPLACE VIEW user_transaction_summary AS
SELECT 
    user_id,
    transaction_type,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN type = 'purchase' THEN -amount ELSE amount END) as total_amount,
    MAX(created_at) as last_transaction_date
FROM point_transactions
WHERE transaction_type IS NOT NULL
GROUP BY user_id, transaction_type;