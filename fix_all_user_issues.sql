-- Complete fix for user registration and role display issues
-- Run this SQL in your Supabase SQL Editor

-- 1. First, check current data and update any invalid roles
UPDATE public.profiles SET role = 'employee' WHERE role NOT IN ('admin', 'salesman', 'employee');

-- 2. Update the user_role enum to include 'employee'
DO $$
BEGIN
    -- Check if enum type exists and update it
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- If enum exists, we need to add the employee value if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'user_role' AND e.enumlabel = 'employee') THEN
            ALTER TYPE public.user_role ADD VALUE 'employee';
        END IF;
    ELSE
        -- Create new enum with all roles
        CREATE TYPE public.user_role AS ENUM ('admin', 'salesman', 'employee');
    END IF;
END $$;

-- 3. Update profiles table structure to use the enum (if not already using it)
DO $$
BEGIN
    -- Check if the column is already using the enum type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'role'
        AND udt_name = 'user_role'
    ) THEN
        -- Convert text column to enum
        ALTER TABLE public.profiles
            ALTER COLUMN role TYPE public.user_role USING role::public.user_role;
    END IF;

    -- Set default value
    ALTER TABLE public.profiles
        ALTER COLUMN role SET DEFAULT 'employee'::public.user_role;
END $$;

-- 4. Update or create the trigger function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')::public.user_role
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate key errors
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Ensure RLS policies are correct for all roles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

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

-- 7. Update admin policies for other tables to handle all roles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- 8. Ensure claims table policies work for employees
DROP POLICY IF EXISTS "Users can view their own claims" ON public.claims;
DROP POLICY IF EXISTS "Users can insert their own claims" ON public.claims;
DROP POLICY IF EXISTS "Users can update their own claims" ON public.claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON public.claims;
DROP POLICY IF EXISTS "Admins can update all claims" ON public.claims;

-- Recreate claims policies if claims table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'claims') THEN
        EXECUTE '
        CREATE POLICY "Users can view their own claims"
        ON public.claims
        FOR SELECT
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own claims"
        ON public.claims
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own claims"
        ON public.claims
        FOR UPDATE
        USING (auth.uid() = user_id);

        CREATE POLICY "Admins can view all claims"
        ON public.claims
        FOR SELECT
        USING (public.get_current_user_role() = ''admin'');

        CREATE POLICY "Admins can update all claims"
        ON public.claims
        FOR UPDATE
        USING (public.get_current_user_role() = ''admin'');
        ';
    END IF;
END
$$;

-- 9. Clean up any duplicate profiles that might exist
DELETE FROM public.profiles p1
WHERE EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.user_id = p1.user_id
    AND p2.id > p1.id
);

-- 10. Test the setup
SELECT 'Database fix completed successfully!' as status;
SELECT 'Current profiles count: ' || COUNT(*) as profile_count FROM profiles;
SELECT 'Roles distribution: ' || role || ' = ' || COUNT(*) as role_distribution
FROM profiles
GROUP BY role
ORDER BY role;