-- Create salesman performance tracking table
CREATE TABLE public.salesman_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  total_sales_amount NUMERIC NOT NULL DEFAULT 0,
  total_sales_count INTEGER NOT NULL DEFAULT 0,
  total_approved_expenses NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0.10 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  commission_earned NUMERIC DEFAULT 0,
  bonus_amount NUMERIC DEFAULT 0,
  total_payout NUMERIC DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  payment_date DATE NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Create claims tracking table
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('expense_reimbursement', 'commission', 'bonus', 'other')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  expense_id UUID NULL,
  performance_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  submitted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reviewed_date DATE NULL,
  paid_date DATE NULL,
  reviewed_by UUID NULL,
  payment_method TEXT NULL,
  payment_reference TEXT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.salesman_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for salesman_performance
CREATE POLICY "Users can view their own performance" 
ON public.salesman_performance 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all performance records" 
ON public.salesman_performance 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert performance records" 
ON public.salesman_performance 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update performance records" 
ON public.salesman_performance 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

-- Create RLS policies for claims
CREATE POLICY "Users can view their own claims" 
ON public.claims 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims" 
ON public.claims 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can insert their own claims" 
ON public.claims 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending claims" 
ON public.claims 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update all claims" 
ON public.claims 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

-- Create triggers for updating timestamps
CREATE TRIGGER update_salesman_performance_updated_at
BEFORE UPDATE ON public.salesman_performance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
BEFORE UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_salesman_performance_user_month_year ON public.salesman_performance(user_id, year, month);
CREATE INDEX idx_claims_user_status ON public.claims(user_id, status);
CREATE INDEX idx_claims_expense_id ON public.claims(expense_id);
CREATE INDEX idx_claims_performance_id ON public.claims(performance_id);