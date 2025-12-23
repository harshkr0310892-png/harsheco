-- Update order_messages table and policies to fully support delivery boy messaging

-- Ensure the is_delivery_boy column exists (in case it was not properly added)
ALTER TABLE public.order_messages 
ADD COLUMN IF NOT EXISTS is_delivery_boy boolean DEFAULT false;

-- Disable RLS completely to make changes
ALTER TABLE public.order_messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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

-- Create comprehensive policies for order_messages table
-- Allow authenticated users to insert messages (for both admins and delivery boys)
CREATE POLICY "Order messages insert access" ON public.order_messages
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to select (read) messages
CREATE POLICY "Order messages select access" ON public.order_messages
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to update messages (if needed)
CREATE POLICY "Order messages update access" ON public.order_messages
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete messages (if needed)
CREATE POLICY "Order messages delete access" ON public.order_messages
    FOR DELETE TO authenticated
    USING (true);

-- Grant all permissions to relevant roles
GRANT ALL ON public.order_messages TO authenticated, anon, service_role;