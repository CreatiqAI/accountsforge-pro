-- Simple fix for user registration and role display issues
-- Run this SQL in your Supabase SQL Editor

-- 1. First, let's see what we're working with
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';

-- 2. Check if user_role enum exists and what values it has
SELECT t.typname, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumlabel;

-- 3. Add 'employee' to the enum if it doesn't exist
DO $$
BEGIN
    -- Only add if the enum exists and employee value doesn't exist
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'user_role' AND e.enumlabel = 'employee'
        ) THEN
            ALTER TYPE public.user_role ADD VALUE 'employee';
        END IF;
    END IF;
END $$;

-- 4. If the role column is TEXT, let's work with it as TEXT for now
-- Update any NULL or invalid roles to 'employee'
UPDATE public.profiles
SET role = 'employee'
WHERE role IS NULL OR role NOT IN ('admin', 'salesman', 'employee');

-- 5. Update the trigger function to handle new user signup properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate key errors
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Ensure get_current_user_role function exists
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- 8. Ensure RLS policies are correct
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- 9. Clean up any duplicate profiles
DELETE FROM public.profiles p1
WHERE EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.user_id = p1.user_id
    AND p2.id > p1.id
);

-- 10. Verification queries
SELECT 'Fix completed successfully!' as status;
SELECT 'Current profiles count: ' || COUNT(*) as profile_count FROM profiles;
SELECT 'Role distribution:' as info;
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;