-- Fix RLS policies for delivery_boys table to work with session-based admin authentication

-- Update the policy for delivery_boys table to be more permissive for admin operations
-- Since the app uses session-based auth (sessionStorage) rather than proper Supabase auth roles,
-- we need to make the policies more permissive for admin operations

-- Drop the existing policy
DROP POLICY IF EXISTS "Delivery boys admin access" ON public.delivery_boys;

-- Create a new policy that allows authenticated users to manage delivery boys
-- This will work with the Supabase client from the frontend when used by the admin
CREATE POLICY "Delivery boys admin access" ON public.delivery_boys 
    FOR ALL USING (
        auth.role() = 'authenticated' OR auth.role() = 'service_role'
    )
    WITH CHECK (
        auth.role() = 'authenticated' OR auth.role() = 'service_role'
    );

-- Also update the fallback policy if it exists
DROP POLICY IF EXISTS "Delivery boys authenticated access" ON public.delivery_boys;
CREATE POLICY "Delivery boys authenticated access" ON public.delivery_boys 
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');