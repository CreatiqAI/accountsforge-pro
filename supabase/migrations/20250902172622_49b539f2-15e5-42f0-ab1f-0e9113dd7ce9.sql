-- Add RLS policies for DELETE operations on claims table
CREATE POLICY "Users can delete their own pending claims" 
ON public.claims 
FOR DELETE 
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can delete all claims" 
ON public.claims 
FOR DELETE 
USING (get_current_user_role() = 'admin');