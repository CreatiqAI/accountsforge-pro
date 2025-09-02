-- Add status field to revenues table
ALTER TABLE public.revenues 
ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Add CHECK constraint for status values
ALTER TABLE public.revenues 
ADD CONSTRAINT revenues_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update RLS policies for revenues table to allow admins to update status
CREATE POLICY "Admins can update all revenues" 
ON public.revenues 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

-- Allow admins to delete revenues
CREATE POLICY "Admins can delete revenues" 
ON public.revenues 
FOR DELETE 
USING (get_current_user_role() = 'admin');