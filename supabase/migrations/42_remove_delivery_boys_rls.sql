-- Remove RLS policies and disable RLS on delivery_boys table to allow all operations

-- Drop all existing policies on the delivery_boys table
DROP POLICY IF EXISTS "Delivery boys admin access" ON public.delivery_boys;
DROP POLICY IF EXISTS "Delivery boys authenticated access" ON public.delivery_boys;

-- Disable Row Level Security on the delivery_boys table
-- This will allow all operations without any restrictions
ALTER TABLE public.delivery_boys DISABLE ROW LEVEL SECURITY;

-- Create a permissive policy that allows all operations for everyone
CREATE POLICY "Delivery boys all access" ON public.delivery_boys 
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);