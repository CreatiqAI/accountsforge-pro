-- Fix the user profile creation trigger to handle phone number correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone_number, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User')
  );
  RETURN NEW;
END;
$$;