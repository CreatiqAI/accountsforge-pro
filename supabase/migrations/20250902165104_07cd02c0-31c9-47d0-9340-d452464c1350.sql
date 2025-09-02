-- Add DELETE policy for admins on expenses table
CREATE POLICY "Admins can delete expenses" 
ON public.expenses 
FOR DELETE 
USING (get_current_user_role() = 'admin'::text);