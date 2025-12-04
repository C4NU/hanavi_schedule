"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSchedule } from '@/hooks/useSchedule';
import { CharacterSchedule } from '@/types/schedule';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function NotificationManager() {
    const { schedule } = useSchedule();
    const lastScheduleRef = useRef<string>('');
    const isFirstMount = useRef(true);
    const [showPermissionModal, setShowPermissionModal] = useState(false);

    const subscribeUser = async (registration: ServiceWorkerRegistration) => {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            console.error('VAPID Public Key is missing');
            return;
        }

        try {
            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            console.log('User is subscribed:', subscription);

            // Send subscription to backend
            await fetch('/api/push/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Failed to subscribe the user: ', error);
        }
    };

    const registerServiceWorker = useCallback(async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered');

                // Check if already subscribed
                const subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    await subscribeUser(registration);
                }
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }, []);

    useEffect(() => {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return;
        }

        // Check if permission is default (not asked yet)
        if (Notification.permission === 'default') {
            setShowPermissionModal(true);
        } else if (Notification.permission === 'granted') {
            // Ensure service worker is registered and subscribed
            registerServiceWorker();
        }
    }, [registerServiceWorker]);

    const handlePermissionRequest = async () => {
        const permission = await Notification.requestPermission();
        setShowPermissionModal(false);
        if (permission === 'granted') {
            registerServiceWorker();
            new Notification('알림 설정 완료', {
                body: '이제 스케줄 업데이트 알림을 받을 수 있습니다!',
                icon: '/icon-192x192.png'
            });
        }
    };

    useEffect(() => {
        if (!schedule) return;

        const currentScheduleStr = JSON.stringify(schedule);

        if (isFirstMount.current) {
            lastScheduleRef.current = currentScheduleStr;
            isFirstMount.current = false;
            return;
        }

        if (lastScheduleRef.current && lastScheduleRef.current !== currentScheduleStr) {
            // Schedule has changed
            const oldSchedule = JSON.parse(lastScheduleRef.current);
            const newSchedule = schedule;
            let notificationTitle = '하나비 스케줄 업데이트';
            let notificationBody = '스케줄이 업데이트되었습니다. 확인해보세요!';

            // 1. Check if Week Range Changed
            if (oldSchedule.weekRange !== newSchedule.weekRange) {
                notificationTitle = '새로운 주간 스케줄 도착! 📅';
                notificationBody = `${newSchedule.weekRange} 주간 스케줄이 공개되었습니다.`;
            } else {
                // 2. Check for Specific Character Changes
                const changedCharacters: string[] = [];

                newSchedule.characters.forEach((newChar: CharacterSchedule) => {
                    const oldChar = oldSchedule.characters.find((c: CharacterSchedule) => c.id === newChar.id);
                    if (!oldChar) return;

                    // Compare schedule items
                    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
                    const hasChanged = days.some(day => {
                        const oldItem = oldChar.schedule[day];
                        const newItem = newChar.schedule[day];

                        // Compare content and time
                        // Treat undefined/null as empty string/object for comparison
                        const oldContent = oldItem?.content || '';
                        const newContent = newItem?.content || '';
                        const oldTime = oldItem?.time || '';
                        const newTime = newItem?.time || '';

                        return oldContent !== newContent || oldTime !== newTime;
                    });

                    if (hasChanged) {
                        changedCharacters.push(newChar.name);
                    }
                });

                if (changedCharacters.length === 1) {
                    notificationTitle = `${changedCharacters[0]} 스케줄 변경 🔔`;
                    notificationBody = `${changedCharacters[0]}님의 스케줄이 변경되었습니다.`;
                } else if (changedCharacters.length > 1) {
                    notificationTitle = '스케줄 업데이트 🔔';
                    notificationBody = `${changedCharacters.join(', ')}님의 스케줄이 변경되었습니다.`;
                }
            }

            // 1. Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notificationTitle, {
                    body: notificationBody,
                    icon: '/icon-192x192.png'
                });
            }

            // 2. In-app Alert (Toast) - REMOVED as per user request
            // The user only wants browser notifications, not the in-app toast.

            lastScheduleRef.current = currentScheduleStr;
        }
    }, [schedule]);

    if (!showPermissionModal) return null;

    return (
        <div className="fixed inset-0 bg-black/30 z-[9999] flex items-center justify-center animate-fade-in font-[-apple-system,BlinkMacSystemFont,sans-serif] p-4">
            <div className="bg-white rounded-[14px] shadow-2xl p-8 min-w-[300px] max-w-[360px] text-center animate-scale-in">
                {/* 제목 + 본문 */}
                <div className="space-y-2 mb-7">
                    <h3 className="text-[17px] font-bold text-[#333333]">
                        알림 설정
                    </h3>
                    <p className="text-[14px] text-[#333333]/80 leading-relaxed">
                        스케줄이 변경되면<br />
                        가장 먼저 알려드릴까요?
                    </p>
                </div>

                {/* 버튼 영역 */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowPermissionModal(false)}
                        className="flex-1 py-3 text-[14px] font-bold text-[#333333] bg-[#fff0f5] rounded-[10px] active:bg-[#ffe4e1] transition-colors border border-[#ffb6c1]/30"
                    >
                        허용 안 함
                    </button>
                    <button
                        onClick={handlePermissionRequest}
                        className="flex-1 py-3 text-[14px] font-bold text-white bg-[#ffb6c1] rounded-[10px] active:bg-[#ff9aa2] transition-colors shadow-sm"
                    >
                        허용
                    </button>
                </div>
            </div>
        </div>
    );
}
