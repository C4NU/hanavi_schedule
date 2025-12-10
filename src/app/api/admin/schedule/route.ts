import { NextResponse } from 'next/server';
import { saveScheduleToSheet } from '@/utils/googleSheets';

const ADMIN_SECRET = process.env.ADMIN_SECRET || '0000';

const MEMBERS = [
    { id: 'varessa', password: process.env.MEMBER_SECRET_VARESSA || 'varessa123' },
    { id: 'nemu', password: process.env.MEMBER_SECRET_NEMU || 'nemu123' },
    { id: 'maroka', password: process.env.MEMBER_SECRET_MAROKA || 'maroka123' },
    { id: 'mirai', password: process.env.MEMBER_SECRET_MIRAI || 'mirai123' },
    { id: 'ruvi', password: process.env.MEMBER_SECRET_RUVI || 'ruvi123' },
    { id: 'iriya', password: process.env.MEMBER_SECRET_IRIYA || 'iriya123' },
];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const adminSecret = request.headers.get('x-admin-secret');

        let isAuthenticated = false;

        // Check Admin
        if (adminSecret === ADMIN_SECRET) {
            isAuthenticated = true;
        } else {
            // Check Members
            const member = MEMBERS.find(m => m.password === adminSecret);
            if (member) isAuthenticated = true;
        }

        if (!isAuthenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const success = await saveScheduleToSheet(body);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to save to Sheets' }, { status: 500 });
        }
    } catch (error) {
        console.error('Admin save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
