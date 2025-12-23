-- Add is_delivery_boy column to order_messages table
ALTER TABLE public.order_messages 
ADD COLUMN is_delivery_boy boolean DEFAULT false;

-- Update the existing policy to include delivery boy access
DROP POLICY IF EXISTS "Order messages can be created" ON public.order_messages;

-- Create new policy that allows authenticated users to create messages
CREATE POLICY "Order messages can be created" ON public.order_messages 
    FOR INSERT TO authenticated WITH CHECK (true);

-- Create policy for authenticated users to read order messages
CREATE POLICY "Order messages readable by authenticated" ON public.order_messages 
    FOR SELECT TO authenticated USING (true);