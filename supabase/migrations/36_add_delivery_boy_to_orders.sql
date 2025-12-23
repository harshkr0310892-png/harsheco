-- Add delivery_boy_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN delivery_boy_id uuid;

-- Add foreign key constraint (with conditional check to ensure referenced table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_boys') THEN
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_delivery_boy_id_fkey 
    FOREIGN KEY (delivery_boy_id) 
    REFERENCES public.delivery_boys(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX idx_orders_delivery_boy_id ON public.orders(delivery_boy_id);