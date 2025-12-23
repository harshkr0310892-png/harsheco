-- Completely reset RLS policies for delivery_boys table to ensure admin access

-- First, disable RLS completely on the delivery_boys table
ALTER TABLE public.delivery_boys DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on the delivery_boys table to start fresh
DO $$ 
DECLARE
    rls_policy record;
BEGIN
    FOR rls_policy IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'delivery_boys'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(rls_policy.policyname) || ' ON public.delivery_boys;';
    END LOOP;
END $$;

-- Create a completely permissive policy for the delivery_boys table
CREATE POLICY "Delivery boys all access" ON public.delivery_boys
    FOR ALL TO authenticated, anon, service_role
    USING (true)
    WITH CHECK (true);

-- Ensure the table has the proper permissions
GRANT ALL ON public.delivery_boys TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;