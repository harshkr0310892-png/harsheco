-- Fix all tables to work properly with session-based authentication approach

-- Fix delivery_boys table
ALTER TABLE public.delivery_boys DISABLE ROW LEVEL SECURITY;

-- Drop all policies on delivery_boys
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

-- Create permissive policy for delivery_boys
CREATE POLICY "Delivery boys all access" ON public.delivery_boys
    FOR ALL TO authenticated, anon, service_role
    USING (true)
    WITH CHECK (true);

-- Fix order_messages table
ALTER TABLE public.order_messages DISABLE ROW LEVEL SECURITY;

-- Drop all policies on order_messages
DO $$ 
DECLARE
    rls_policy record;
BEGIN
    FOR rls_policy IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'order_messages'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(rls_policy.policyname) || ' ON public.order_messages;';
    END LOOP;
END $$;

-- Create permissive policy for order_messages
CREATE POLICY "Order messages all access" ON public.order_messages
    FOR ALL TO authenticated, anon, service_role
    USING (true)
    WITH CHECK (true);

-- Fix orders table for delivery boy access
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Drop all policies on orders
DO $$ 
DECLARE
    rls_policy record;
BEGIN
    FOR rls_policy IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'orders'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(rls_policy.policyname) || ' ON public.orders;';
    END LOOP;
END $$;

-- Create permissive policy for orders
CREATE POLICY "Orders all access" ON public.orders
    FOR ALL TO authenticated, anon, service_role
    USING (true)
    WITH CHECK (true);

-- Grant all permissions to all relevant tables
GRANT ALL ON public.delivery_boys TO authenticated, anon, service_role;
GRANT ALL ON public.order_messages TO authenticated, anon, service_role;
GRANT ALL ON public.orders TO authenticated, anon, service_role;

-- Ensure schema access
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- Make sure the is_delivery_boy column exists in order_messages
ALTER TABLE public.order_messages 
ADD COLUMN IF NOT EXISTS is_delivery_boy boolean DEFAULT false;