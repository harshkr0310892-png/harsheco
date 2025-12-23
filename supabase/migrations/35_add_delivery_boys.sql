-- Create delivery_boys table
CREATE TABLE public.delivery_boys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    phone text,
    email text,
    is_active boolean DEFAULT true NOT NULL,
    is_banned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT delivery_boys_pkey PRIMARY KEY (id)
);

-- Create unique index for username
CREATE UNIQUE INDEX delivery_boys_username_key ON public.delivery_boys USING btree (username);

-- Create trigger to update updated_at column
CREATE TRIGGER update_delivery_boys_updated_at 
    BEFORE UPDATE ON public.delivery_boys 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable row level security
ALTER TABLE public.delivery_boys ENABLE ROW LEVEL SECURITY;

-- Create initial policy for delivery boys (will be refined in later migration)
CREATE POLICY "Delivery boys authenticated access" ON public.delivery_boys 
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');