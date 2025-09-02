-- Add foreign key constraints to establish relationships for Supabase joins

-- Add foreign key constraint for salesman_performance table
ALTER TABLE public.salesman_performance 
ADD CONSTRAINT fk_salesman_performance_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key constraint for claims table
ALTER TABLE public.claims 
ADD CONSTRAINT fk_claims_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Also add foreign key constraints to existing tables for completeness
ALTER TABLE public.expenses 
ADD CONSTRAINT fk_expenses_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.revenues 
ADD CONSTRAINT fk_revenues_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;