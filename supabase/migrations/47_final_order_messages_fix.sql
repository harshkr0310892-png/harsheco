-- Final fix for order_messages table to ensure delivery boys can send messages

-- Disable RLS completely on the order_messages table
ALTER TABLE public.order_messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on the order_messages table
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

-- Create a completely permissive policy for the order_messages table
CREATE POLICY "Order messages all access" ON public.order_messages
    FOR ALL TO authenticated, anon, service_role
    USING (true)
    WITH CHECK (true);

-- Grant all permissions to the table
GRANT ALL ON public.order_messages TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- Also make sure the trigger for updating updated_at exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- If order_messages has an updated_at column, make sure the trigger exists
DO $$
BEGIN
    -- Check if updated_at column exists, if not, add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_messages' AND column_name = 'updated_at') THEN
        ALTER TABLE public.order_messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Check if trigger exists, if not, create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'update_order_messages_updated_at') THEN
        CREATE TRIGGER update_order_messages_updated_at 
        BEFORE UPDATE ON public.order_messages 
        FOR EACH ROW 
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;