
import { NextResponse } from 'next/server';
import { saveScheduleToSupabase } from '@/utils/supabase';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Get Token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        // 2. Verify Token
        // Create a dedicated client for validation to avoid global state/storage issues
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const authClient = require('@supabase/supabase-js').createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        const { data: { user }, error } = await authClient.auth.getUser(token);

        if (error || !user) {
            console.error('Auth Error:', error?.message);
            return NextResponse.json({ error: 'Unauthorized: Invalid Token' }, { status: 401 });
        }

        // 3. (Optional) Check Role Permissions via user_roles table if strict access control needed
        // For now, any valid logged-in user is considered authorized to save (as per legacy logic)

        // Save to Supabase
        console.log(`Saving schedule... User: ${user.id} (${user.email})`);
        const success = await saveScheduleToSupabase(body);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            console.error('Failed to save to Supabase');
            return NextResponse.json({ error: 'Failed to save to Supabase' }, { status: 500 });
        }
    } catch (error) {
        console.error('Admin save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
