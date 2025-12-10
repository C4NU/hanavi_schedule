-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table for tracking weekly schedules
create table public.schedules (
    id uuid not null default uuid_generate_v4(),
    week_range text not null, -- e.g., "12.09 - 12.15"
    is_active boolean default true,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint schedules_pkey primary key (id)
);

-- Table for character information (if you want to manage characters in DB)
create table public.characters (
    id text not null, -- e.g., 'varessa', 'nemu'
    name text not null,
    color_theme text not null,
    avatar_url text,
    chzzk_url text,
    constraint characters_pkey primary key (id)
);

-- Table for schedule items
-- Links a schedule week + character + day to a specific activity
create table public.schedule_items (
    id uuid not null default uuid_generate_v4(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    character_id text not null references public.characters(id) on delete cascade,
    day text not null, -- 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'
    time text, -- '20:00'
    content text, -- 'Broadcast Title'
    type text not null default 'stream', -- 'stream', 'off', 'collab', etc.
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint schedule_items_pkey primary key (id),
    -- Ensure 1 item per character per day per schedule (optional, if only 1 slot allowed)
    constraint unique_schedule_item unique (schedule_id, character_id, day)
);

-- Policies (RLS) - Example for open read, admin write
alter table public.schedules enable row level security;
alter table public.characters enable row level security;
alter table public.schedule_items enable row level security;

create policy "Enable read access for all users" on public.schedules for select using (true);
create policy "Enable read access for all users" on public.characters for select using (true);
create policy "Enable read access for all users" on public.schedule_items for select using (true);

-- Insert Initial Characters
insert into public.characters (id, name, color_theme, avatar_url, chzzk_url) values
('varessa', '바레사', 'varessa', '/avatars/varessa.png', 'https://chzzk.naver.com/cb40b98631410d4cc3796ab279c2f1bc'),
('nemu', '네무', 'nemu', '/avatars/nemu.png', 'https://chzzk.naver.com/7c4c49fd3a34ce68e84075f5b44fe8c8'),
('maroka', '마로카', 'maroka', '/avatars/maroka.png', 'https://chzzk.naver.com/157501b80c3c4416110996887550f75f'),
('mirai', '미라이', 'mirai', '/avatars/mirai.png', 'https://chzzk.naver.com/37716364b3086fefd298046072c92345'),
('ruvi', '루비', 'ruvi', '/avatars/ruvi.png', 'https://chzzk.naver.com/acc87c975763452aab25e281e0eb0b85'),
('iriya', '이리야', 'iriya', '/avatars/iriya.png', 'https://chzzk.naver.com/10d1ce368f685df0502875195eee39eb');
