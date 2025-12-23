-- Create proper RLS policies for delivery boys after all tables exist

-- Check if user_roles table exists before creating policies that reference it
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    -- Policy for orders table - delivery boys can only see orders assigned to them
    DROP POLICY IF EXISTS "Orders viewable by delivery boys" ON public.orders;
    CREATE POLICY "Orders viewable by delivery boys" ON public.orders 
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.delivery_boys 
                WHERE delivery_boys.id = auth.uid()
                AND orders.delivery_boy_id = delivery_boys.id
            )
            OR
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'admin'
            )
            OR
            auth.role() = 'service_role'
        );
    
    -- Policy for order_messages table - delivery boys can only see messages related to orders assigned to them
    DROP POLICY IF EXISTS "Order messages viewable by delivery boys" ON public.order_messages;
    CREATE POLICY "Order messages viewable by delivery boys" ON public.order_messages 
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.delivery_boys 
                WHERE delivery_boys.id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE orders.id = order_messages.order_id
                    AND orders.delivery_boy_id = delivery_boys.id
                )
            )
            OR
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'admin'
            )
            OR
            auth.role() = 'service_role'
        );
    
    -- Policy for delivery boys to insert messages
    DROP POLICY IF EXISTS "Order messages insertable by delivery boys" ON public.order_messages;
    CREATE POLICY "Order messages insertable by delivery boys" ON public.order_messages 
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.delivery_boys 
                WHERE delivery_boys.id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE orders.id = order_messages.order_id
                    AND orders.delivery_boy_id = delivery_boys.id
                )
            )
            OR
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'admin'
            )
            OR
            auth.role() = 'service_role'
        );
  ELSE
    -- Fallback: Create more permissive policies if user_roles table doesn't exist
    DROP POLICY IF EXISTS "Orders viewable by authenticated" ON public.orders;
    CREATE POLICY "Orders viewable by authenticated" ON public.orders 
        FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    
    DROP POLICY IF EXISTS "Order messages viewable by authenticated" ON public.order_messages;
    CREATE POLICY "Order messages viewable by authenticated" ON public.order_messages 
        FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    
    DROP POLICY IF EXISTS "Order messages insertable by authenticated" ON public.order_messages;
    CREATE POLICY "Order messages insertable by authenticated" ON public.order_messages 
        FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;