-- FIX DATABASE RELATIONSHIPS AND STRUCTURE
-- Run this script to fix all the foreign key relationships and table issues

-- ==========================================
-- 1. ADD PROPER FOREIGN KEY CONSTRAINTS
-- ==========================================

-- Add foreign key constraints to expenses table
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;
ALTER TABLE expenses ADD CONSTRAINT expenses_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints to revenues table
ALTER TABLE revenues DROP CONSTRAINT IF EXISTS revenues_user_id_fkey;
ALTER TABLE revenues ADD CONSTRAINT revenues_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints to claims table
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_user_id_fkey;
ALTER TABLE claims ADD CONSTRAINT claims_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints to profiles table
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ==========================================
-- 2. CREATE VIEWS FOR JOINED DATA
-- ==========================================

-- Create view for expenses with profile data
CREATE OR REPLACE VIEW expenses_with_profiles AS
SELECT
    e.*,
    p.full_name,
    p.phone_number,
    p.role
FROM expenses e
LEFT JOIN profiles p ON e.user_id = p.user_id;

-- Create view for revenues with profile data
CREATE OR REPLACE VIEW revenues_with_profiles AS
SELECT
    r.*,
    p.full_name,
    p.phone_number,
    p.role
FROM revenues r
LEFT JOIN profiles p ON r.user_id = p.user_id;

-- Create view for claims with profile data
CREATE OR REPLACE VIEW claims_with_profiles AS
SELECT
    c.*,
    p.full_name,
    p.phone_number,
    p.role
FROM claims c
LEFT JOIN profiles p ON c.user_id = p.user_id;

-- ==========================================
-- 3. ENABLE RLS ON VIEWS
-- ==========================================

-- Enable RLS on views
ALTER VIEW expenses_with_profiles SET (security_invoker = true);
ALTER VIEW revenues_with_profiles SET (security_invoker = true);
ALTER VIEW claims_with_profiles SET (security_invoker = true);

-- ==========================================
-- 4. UPDATE MISSING COLUMNS IN EXISTING TABLES
-- ==========================================

-- Add missing columns to revenues table
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS customer_email VARCHAR(100);
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS product_service VARCHAR(200);
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Add missing columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS admin_comments TEXT;

-- Add missing columns to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS admin_comments TEXT;

-- ==========================================
-- 5. CREATE MISSING STORED PROCEDURES
-- ==========================================

-- Function to get expenses with profiles (for the join queries)
CREATE OR REPLACE FUNCTION get_expenses_with_profiles(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    amount DECIMAL(10,2),
    description TEXT,
    category VARCHAR(50),
    expense_date DATE,
    status VARCHAR(20),
    proof_url TEXT,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    admin_comments TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    role VARCHAR(20)
) AS $$
BEGIN
    IF target_user_id IS NULL THEN
        RETURN QUERY
        SELECT
            e.id, e.user_id, e.amount, e.description, e.category, e.expense_date,
            e.status, e.proof_url, e.approved_by, e.approved_at, e.admin_comments,
            e.rejection_reason, e.created_at, e.updated_at,
            p.full_name, p.phone_number, p.role
        FROM expenses e
        LEFT JOIN profiles p ON e.user_id = p.user_id
        ORDER BY e.expense_date DESC;
    ELSE
        RETURN QUERY
        SELECT
            e.id, e.user_id, e.amount, e.description, e.category, e.expense_date,
            e.status, e.proof_url, e.approved_by, e.approved_at, e.admin_comments,
            e.rejection_reason, e.created_at, e.updated_at,
            p.full_name, p.phone_number, p.role
        FROM expenses e
        LEFT JOIN profiles p ON e.user_id = p.user_id
        WHERE e.user_id = target_user_id
        ORDER BY e.expense_date DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenues with profiles
CREATE OR REPLACE FUNCTION get_revenues_with_profiles(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    amount DECIMAL(10,2),
    customer_name VARCHAR(200),
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    product_service VARCHAR(200),
    quantity INTEGER,
    invoice_number VARCHAR(100),
    revenue_date DATE,
    status VARCHAR(20),
    proof_url TEXT,
    commission_amount DECIMAL(10,2),
    commission_rate DECIMAL(5,2),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    admin_comments TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    role VARCHAR(20)
) AS $$
BEGIN
    IF target_user_id IS NULL THEN
        RETURN QUERY
        SELECT
            r.id, r.user_id, r.amount, r.customer_name, r.customer_email, r.customer_phone,
            r.product_service, r.quantity, r.invoice_number, r.revenue_date, r.status,
            r.proof_url, r.commission_amount, r.commission_rate, r.approved_by, r.approved_at,
            r.admin_comments, r.rejection_reason, r.created_at, r.updated_at,
            p.full_name, p.phone_number, p.role
        FROM revenues r
        LEFT JOIN profiles p ON r.user_id = p.user_id
        ORDER BY r.revenue_date DESC;
    ELSE
        RETURN QUERY
        SELECT
            r.id, r.user_id, r.amount, r.customer_name, r.customer_email, r.customer_phone,
            r.product_service, r.quantity, r.invoice_number, r.revenue_date, r.status,
            r.proof_url, r.commission_amount, r.commission_rate, r.approved_by, r.approved_at,
            r.admin_comments, r.rejection_reason, r.created_at, r.updated_at,
            p.full_name, p.phone_number, p.role
        FROM revenues r
        LEFT JOIN profiles p ON r.user_id = p.user_id
        WHERE r.user_id = target_user_id
        ORDER BY r.revenue_date DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get claims with profiles
CREATE OR REPLACE FUNCTION get_claims_with_profiles(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    claim_type VARCHAR(50),
    amount DECIMAL(10,2),
    description TEXT,
    expense_id UUID,
    revenue_id UUID,
    status VARCHAR(20),
    submitted_date DATE,
    reviewed_date DATE,
    reviewed_by UUID,
    paid_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    admin_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    role VARCHAR(20)
) AS $$
BEGIN
    IF target_user_id IS NULL THEN
        RETURN QUERY
        SELECT
            c.id, c.user_id, c.claim_type, c.amount, c.description, c.expense_id,
            c.revenue_id, c.status, c.submitted_date, c.reviewed_date, c.reviewed_by,
            c.paid_date, c.payment_method, c.payment_reference, c.notes, c.admin_comments,
            c.created_at, c.updated_at,
            p.full_name, p.phone_number, p.role
        FROM claims c
        LEFT JOIN profiles p ON c.user_id = p.user_id
        ORDER BY c.submitted_date DESC;
    ELSE
        RETURN QUERY
        SELECT
            c.id, c.user_id, c.claim_type, c.amount, c.description, c.expense_id,
            c.revenue_id, c.status, c.submitted_date, c.reviewed_date, c.reviewed_by,
            c.paid_date, c.payment_method, c.payment_reference, c.notes, c.admin_comments,
            c.created_at, c.updated_at,
            p.full_name, p.phone_number, p.role
        FROM claims c
        LEFT JOIN profiles p ON c.user_id = p.user_id
        WHERE c.user_id = target_user_id
        ORDER BY c.submitted_date DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. GRANT PERMISSIONS
-- ==========================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_expenses_with_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenues_with_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_claims_with_profiles TO authenticated;

-- ==========================================
-- 7. UPDATE EXISTING RLS POLICIES
-- ==========================================

-- Update expenses policies to work with the functions
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can view all expenses" ON expenses;

CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Update revenues policies
DROP POLICY IF EXISTS "Users can view own revenues" ON revenues;
DROP POLICY IF EXISTS "Admins can view all revenues" ON revenues;

CREATE POLICY "Users can view own revenues" ON revenues FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Update claims policies
DROP POLICY IF EXISTS "Users can view own claims" ON claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON claims;

CREATE POLICY "Users can view own claims" ON claims FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT 'Database relationships fixed successfully!' as status;

-- Check foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('expenses', 'revenues', 'claims', 'profiles');