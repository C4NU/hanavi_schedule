-- Create global_settings table
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Everyone can read
CREATE POLICY "Enable read access for all users" ON public.global_settings
    FOR SELECT USING (true);

-- 2. Only authenticated users (admins) can insert/update
CREATE POLICY "Enable insert for authenticated users only" ON public.global_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.global_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Seed initial data
INSERT INTO public.global_settings (key, value)
VALUES ('inquiry_email', 'canu1832@gmail.com')
ON CONFLICT (key) DO NOTHING;
