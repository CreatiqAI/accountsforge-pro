-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can view all revenues" ON public.revenues;
DROP POLICY IF EXISTS "Admins can view all receipts" ON storage.objects;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Recreate admin policies using the security definer function
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all expenses"
ON public.expenses
FOR SELECT
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all expenses"
ON public.expenses
FOR UPDATE
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all revenues"
ON public.revenues
FOR SELECT
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'receipts' AND 
  public.get_current_user_role() = 'admin'
);