-- COMPLETE FIX FOR CLAIM & SALES MANAGEMENT SYSTEM
-- Run this entire script in your Supabase SQL Editor

-- ==========================================
-- 1. DROP EXISTING POLICIES THAT CAUSE ISSUES
-- ==========================================

-- Drop problematic RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- ==========================================
-- 2. ENSURE COMPLETE DATABASE SCHEMA
-- ==========================================

-- Profiles table (already exists, but ensure correct structure)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('employee', 'salesman', 'admin'));

-- Add any missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 5.00;

-- Ensure expenses table exists with correct structure
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    expense_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    proof_url TEXT,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    admin_comments TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure revenues table exists with correct structure (for sales)
CREATE TABLE IF NOT EXISTS revenues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- salesman ID
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    product_service VARCHAR(200) NOT NULL,
    quantity INTEGER DEFAULT 1,
    invoice_number VARCHAR(100),
    revenue_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    proof_url TEXT,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    admin_comments TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claims table (for payment requests)
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    claim_type VARCHAR(50) CHECK (claim_type IN ('expense_reimbursement', 'commission', 'bonus', 'other')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    expense_id UUID, -- references expenses.id for expense claims
    revenue_id UUID, -- references revenues.id for commission claims
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'paid')) DEFAULT 'pending',
    submitted_date DATE DEFAULT CURRENT_DATE,
    reviewed_date DATE,
    reviewed_by UUID,
    paid_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    admin_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission tracking table
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salesman_id UUID NOT NULL,
    revenue_id UUID NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    payout_status VARCHAR(20) CHECK (payout_status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
    payout_date DATE,
    payout_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(revenue_id) -- One commission per sale
);

-- Performance reports table
CREATE TABLE IF NOT EXISTS performance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_claims DECIMAL(10,2) DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_commission DECIMAL(10,2) DEFAULT 0,
    claims_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    net_result DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- Evidence documents table
CREATE TABLE IF NOT EXISTS evidence_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_type VARCHAR(10) CHECK (reference_type IN ('claim', 'expense', 'revenue')) NOT NULL,
    reference_id UUID NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_path VARCHAR(500) NOT NULL,
    document_type VARCHAR(50),
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
    reference_type VARCHAR(20), -- claim, expense, revenue
    reference_id UUID,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. CREATE PROPER RLS POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies (FIXED for signup)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (true); -- Allow signup
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all expenses" ON expenses FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending expenses" ON expenses FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
);
CREATE POLICY "Admins can update all expenses" ON expenses FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Revenues policies (for sales)
CREATE POLICY "Users can view own revenues" ON revenues FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all revenues" ON revenues FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Salesmen can insert own revenues" ON revenues FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('salesman', 'admin'))
);
CREATE POLICY "Users can update own pending revenues" ON revenues FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
);
CREATE POLICY "Admins can update all revenues" ON revenues FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Claims policies
CREATE POLICY "Users can view own claims" ON claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all claims" ON claims FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can insert own claims" ON claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending claims" ON claims FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
);
CREATE POLICY "Admins can update all claims" ON claims FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Commissions policies
CREATE POLICY "Salesmen can view own commissions" ON commissions FOR SELECT USING (auth.uid() = salesman_id);
CREATE POLICY "Admins can view all commissions" ON commissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 4. CREATE HELPER FUNCTIONS
-- ==========================================

-- Function to calculate commission
CREATE OR REPLACE FUNCTION calculate_commission_amount(sale_amount DECIMAL, commission_rate DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND((sale_amount * commission_rate) / 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    target_user_id UUID,
    notification_title VARCHAR(200),
    notification_message TEXT,
    notification_type VARCHAR(50) DEFAULT 'info',
    ref_type VARCHAR(20) DEFAULT NULL,
    ref_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
    VALUES (target_user_id, notification_title, notification_message, notification_type, ref_type, ref_id)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. CREATE TRIGGERS FOR AUTOMATION
-- ==========================================

-- Trigger for automatic commission calculation on revenue approval
CREATE OR REPLACE FUNCTION handle_revenue_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- If revenue is being approved
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        -- Calculate commission
        NEW.commission_amount := calculate_commission_amount(NEW.amount, NEW.commission_rate);

        -- Create commission record
        INSERT INTO commissions (salesman_id, revenue_id, commission_amount, commission_rate)
        VALUES (NEW.user_id, NEW.id, NEW.commission_amount, NEW.commission_rate);

        -- Create notification for salesman
        PERFORM create_notification(
            NEW.user_id,
            'Sale Approved',
            'Your sale of $' || NEW.amount || ' has been approved. Commission: $' || NEW.commission_amount,
            'success',
            'revenue',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_revenue_approval ON revenues;
CREATE TRIGGER on_revenue_approval
    BEFORE UPDATE ON revenues
    FOR EACH ROW
    EXECUTE FUNCTION handle_revenue_approval();

-- Trigger for expense approval notifications
CREATE OR REPLACE FUNCTION handle_expense_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
        PERFORM create_notification(
            NEW.user_id,
            CASE WHEN NEW.status = 'approved' THEN 'Expense Approved' ELSE 'Expense Rejected' END,
            'Your expense claim of $' || NEW.amount || ' has been ' || NEW.status || '.',
            CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'error' END,
            'expense',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_expense_approval ON expenses;
CREATE TRIGGER on_expense_approval
    AFTER UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION handle_expense_approval();

-- ==========================================
-- 6. INSERT SAMPLE DATA FOR TESTING
-- ==========================================

-- Insert company settings
INSERT INTO company_settings (setting_key, setting_value, description) VALUES
('default_commission_rate', '5.00', 'Default commission rate percentage for salesman'),
('max_expense_amount', '1000.00', 'Maximum expense amount without special approval'),
('company_name', 'AccountsForge Pro', 'Company name for reports'),
('currency', 'USD', 'Default currency')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- ==========================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_expenses_user_status ON expenses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenues_user_status ON revenues(user_id, status);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(revenue_date DESC);
CREATE INDEX IF NOT EXISTS idx_claims_user_status ON claims(user_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_date ON claims(submitted_date DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_salesman ON commissions(salesman_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT 'Database setup completed successfully!' as status;
SELECT 'Tables created: ' || COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';