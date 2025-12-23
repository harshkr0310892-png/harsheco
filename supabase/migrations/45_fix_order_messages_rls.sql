-- Fix RLS policies for order_messages table to allow admin messaging functionality

-- First, disable RLS completely on the order_messages table
ALTER TABLE public.order_messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on the order_messages table to start fresh
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

-- Create permissive policies for the order_messages table
-- Allow authenticated users to insert messages
CREATE POLICY "Order messages insert access" ON public.order_messages
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to select (read) messages
CREATE POLICY "Order messages select access" ON public.order_messages
    FOR SELECT TO authenticated
    USING (true);

-- Grant proper permissions to the table
GRANT ALL ON public.order_messages TO authenticated, anon, service_role;