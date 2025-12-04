import { NextResponse } from 'next/server';
import { getScheduleFromSheet } from '@/utils/googleSheets';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
import crypto from 'crypto';

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey
    );
}

export async function GET(request: Request) {
    // 1. Verify Vercel Cron Signature (Optional but recommended)
    // For simplicity, we'll assume the cron job is protected by Vercel's internal network or a secret query param if needed.
    // But since this is a GET request triggered by Vercel, we can just proceed.
    // To prevent abuse, you could check for `Authorization: Bearer ${process.env.CRON_SECRET}` if you set one up.

    try {
        console.log('[Cron] Checking for schedule updates...');

        // 2. Fetch Current Schedule
        const schedule = await getScheduleFromSheet();
        if (!schedule) {
            console.error('[Cron] Failed to fetch schedule');
            return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
        }

        // 3. Compute Hash
        const scheduleString = JSON.stringify(schedule);
        const currentHash = crypto.createHash('sha256').update(scheduleString).digest('hex');

        // 4. Get Last Hash from DB
        const { data: stateData, error: stateError } = await supabaseAdmin
            .from('system_state')
            .select('value')
            .eq('key', 'last_schedule_hash')
            .single();

        if (stateError && stateError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('[Cron] Failed to fetch system state:', stateError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const lastHash = stateData?.value;

        if (lastHash === currentHash) {
            console.log('[Cron] No changes detected.');
            return NextResponse.json({ message: 'No changes detected' });
        }

        console.log('[Cron] Change detected! Sending notifications...');

        // 5. Fetch Subscriptions
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('*');

        if (subError) {
            console.error('[Cron] Failed to fetch subscriptions:', subError);
            return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
        }

        if (!subscriptions || subscriptions.length === 0) {
            console.log('[Cron] No subscribers to notify.');
            // Still update the hash so we don't keep checking this same update
            await supabaseAdmin.from('system_state').upsert({
                key: 'last_schedule_hash',
                value: currentHash,
                updated_at: new Date().toISOString()
            });
            return NextResponse.json({ message: 'Updated hash, no subscribers' });
        }

        // 6. Send Notifications
        const payload = JSON.stringify({
            title: '[배경 알림] 하나비 스케줄 업데이트 🔔',
            body: '스케줄이 변경되었습니다. 확인해보세요!',
            icon: '/icon-192x192.png'
        });

        const results = await Promise.allSettled(
            subscriptions.map(sub => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: sub.keys
                };
                return webpush.sendNotification(pushSubscription, payload)
                    .catch(err => {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            return supabaseAdmin.from('subscriptions').delete().eq('id', sub.id);
                        }
                        throw err;
                    });
            })
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[Cron] Sent to ${successCount}/${subscriptions.length} devices.`);

        // 7. Update Hash in DB
        const { error: updateError } = await supabaseAdmin.from('system_state').upsert({
            key: 'last_schedule_hash',
            value: currentHash,
            updated_at: new Date().toISOString()
        });

        if (updateError) {
            console.error('[Cron] Failed to update hash:', updateError);
        }

        return NextResponse.json({
            success: true,
            message: `Notifications sent to ${successCount} devices`,
            hash: currentHash
        });

    } catch (error) {
        console.error('[Cron] Internal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
