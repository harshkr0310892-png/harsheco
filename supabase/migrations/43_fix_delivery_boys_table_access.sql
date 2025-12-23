-- Ensure delivery_boys table is accessible by admin users

-- First, make sure RLS is disabled on the delivery_boys table
ALTER TABLE public.delivery_boys DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might interfere
DROP POLICY IF EXISTS "Delivery boys admin access" ON public.delivery_boys;
DROP POLICY IF EXISTS "Delivery boys authenticated access" ON public.delivery_boys;

-- Create a new permissive policy to allow admin access
CREATE POLICY "Delivery boys full access" ON public.delivery_boys
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also make sure the admin dashboard can access the table
GRANT ALL ON public.delivery_boys TO authenticated;