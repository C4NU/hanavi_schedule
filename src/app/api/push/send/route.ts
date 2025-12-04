import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
// import { getScheduleFromSheet } from '@/utils/googleSheets';

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

export async function POST(request: Request) {
    try {
        console.log('Push notification request received');

        // 1. Verify Admin Secret (Simple security)
        const bodyData = await request.json();
        const { secret, title, body } = bodyData;
        const adminSecret = process.env.ADMIN_SECRET;

        console.log('Admin Secret Check:', {
            provided: secret ? '***' : 'missing',
            expected: adminSecret ? '***' : 'missing',
            match: secret === adminSecret
        });

        if (!adminSecret || secret !== adminSecret) {
            console.error('Unauthorized: Invalid Admin Secret');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Subscriptions using Admin Client (Bypass RLS)
        const { data: subscriptions, error } = await supabaseAdmin
            .from('subscriptions')
            .select('*');

        if (error) {
            console.error('Supabase error fetching subscriptions:', error);
            return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
        }

        console.log(`Found ${subscriptions?.length || 0} subscriptions`);

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions found' });
        }

        // 3. Send Notifications
        const payload = JSON.stringify({
            title: title || '하나비 스케줄 업데이트',
            body: body || '스케줄이 업데이트되었습니다. 확인해보세요!',
            icon: '/icon-192x192.png'
        });

        const results = await Promise.allSettled(
            subscriptions.map(sub => {
                // Ensure keys are in the correct format
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: sub.keys
                };

                return webpush.sendNotification(pushSubscription, payload)
                    .catch(err => {
                        console.error('WebPush Send Error:', err.statusCode, err.body, sub.endpoint);
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            // Subscription expired or gone, delete from DB
                            return supabaseAdmin.from('subscriptions').delete().eq('id', sub.id);
                        }
                        throw err;
                    });
            })
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.length - successCount;

        console.log(`Push Result: Success=${successCount}, Failed=${failureCount}`);

        return NextResponse.json({
            success: true,
            message: `Sent to ${successCount} devices, failed ${failureCount}`
        });

    } catch (error) {
        console.error('Error sending push:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
