"use client";

import { useState, useEffect } from 'react';
import { useSchedule } from '@/hooks/useSchedule';
import { WeeklySchedule, ScheduleItem } from '@/types/schedule';

export default function AdminPage() {
    const [secret, setSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState<string>(''); // 'admin' or memberId
    const { schedule: initialSchedule } = useSchedule();
    const [editSchedule, setEditSchedule] = useState<WeeklySchedule | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const storedSecret = sessionStorage.getItem('admin_secret');
        const storedRole = sessionStorage.getItem('admin_role');
        if (storedSecret && storedRole) {
            setSecret(storedSecret);
            setRole(storedRole);
            setIsAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        if (initialSchedule && !editSchedule) {
            setEditSchedule(JSON.parse(JSON.stringify(initialSchedule)));
        }
    }, [initialSchedule]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setIsAuthenticated(true);
                setRole(data.role);
                sessionStorage.setItem('admin_secret', secret);
                sessionStorage.setItem('admin_role', data.role);
            } else {
                alert('로그인 실패: 비밀번호를 확인하세요.');
            }
        } catch (e) {
            alert('로그인 에러: ' + e);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        setIsAuthenticated(false);
        setRole('');
        setSecret('');
        window.location.reload();
    };

    const handleSave = async () => {
        if (!editSchedule) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secret
                },
                body: JSON.stringify(editSchedule)
            });

            if (res.ok) {
                alert('저장되었습니다!');
                localStorage.setItem('hanavi_last_schedule', JSON.stringify(editSchedule));
            } else {
                if (res.status === 401) {
                    alert('인증 실패: 다시 로그인해주세요.');
                    setIsAuthenticated(false);
                    sessionStorage.clear();
                } else {
                    alert('저장 실패: 서버 오류');
                }
            }
        } catch (e) {
            alert('에러 발생: ' + e);
        } finally {
            setIsSaving(false);
        }
    };

    const updateDay = (charId: string, day: string, field: keyof ScheduleItem, value: string) => {
        if (!editSchedule) return;
        setEditSchedule(prev => {
            if (!prev) return null;
            const newSchedule = { ...prev };
            const char = newSchedule.characters.find(c => c.id === charId);
            if (char) {
                if (!char.schedule[day]) {
                    char.schedule[day] = { time: '', content: '', type: 'stream' };
                }
                // @ts-ignore
                char.schedule[day][field] = value;
            }
            return newSchedule;
        });
    };

    const handleTimeBlur = (charId: string, day: string, value: string) => {
        let newValue = value.trim();
        // If it's a number like "9", "12", "1" (1 or 2 digits)
        if (/^\d{1,2}$/.test(newValue)) {
            const num = parseInt(newValue, 10);
            if (num >= 0 && num <= 24) {
                newValue = `${num.toString().padStart(2, '0')}:00`;
                updateDay(charId, day, 'time', newValue);
            }
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-sm border border-gray-100">
                    <div className="text-center mb-8">
                        <span className="text-4xl">🔐</span>
                        <h1 className="text-2xl font-bold mt-4 text-gray-800">관리자 로그인</h1>
                    </div>
                    <input
                        type="password"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        placeholder="Secret Key"
                        className="bg-gray-50 border border-gray-200 p-4 w-full rounded-2xl mb-4 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all text-center placeholder-gray-400"
                    />
                    <button type="submit" className="bg-pink-400 text-white w-full py-4 rounded-2xl hover:bg-pink-500 font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                        로그인
                    </button>
                    <p className="mt-6 text-xs text-gray-400 text-center bg-gray-50 p-2 rounded-xl">
                        ID + 123 (예: varessa123) / 슈퍼계정: 0000
                    </p>
                </form>
            </div>
        );
    }

    if (!editSchedule) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-bold animate-pulse">스케줄 로딩중...</div>;

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    // Filter characters if role is not admin
    const visibleCharacters = editSchedule.characters.filter(char => {
        if (role === 'admin') return true;
        return char.id === role;
    });

    // Helper to get dynamic styles based on theme
    const getThemeStyles = (theme: string) => {
        if (theme === 'admin') {
            return {
                bg: '#F3F4F6', // gray-100
                border: '#E5E7EB', // gray-200
                text: '#4B5563', // gray-600
                time: '#6B7280' // gray-500
            };
        }
        return {
            bg: `var(--color-${theme}-bg)`,
            border: `var(--color-${theme}-border)`,
            text: `var(--color-${theme}-text)`,
            time: `var(--color-${theme}-time)`
        };
    };

    // Helper for Input Cells (Handling Types)
    const getInputStyles = (theme: string, type: string) => {
        // Special Collabs (Hardcoded values from CSS or logic)
        if (type === 'collab_maivi') return { backgroundColor: 'var(--color-maivi-bg)', borderColor: 'var(--color-maivi-border)', color: 'var(--color-maivi-time)' };
        if (type === 'collab_hanavi') return { backgroundColor: 'var(--color-hanavi-bg)', borderColor: 'var(--color-hanavi-border)', color: 'var(--color-hanavi-time)' };
        if (type === 'collab_universe') return { backgroundColor: 'var(--color-universe-bg)', borderColor: 'var(--color-universe-border)', color: 'var(--color-universe-time)' };
        if (type === 'collab') return { backgroundColor: 'var(--color-universe-bg)', borderColor: 'var(--color-universe-border)', color: 'var(--color-universe-time)' };

        // Off State
        if (type === 'off') return { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#9CA3AF' };

        // Default Stream
        const styles = getThemeStyles(theme);
        return {
            backgroundColor: 'white', // Cells are white, border is colored
            borderColor: styles.border,
            color: '#333333' // Text content is dark
        };
    };

    // Find logged in character for Header display
    const loggedInChar = editSchedule?.characters.find(c => c.id === role);

    return (
        <div className="min-h-screen bg-[#FDFCFE] p-4 md:p-8 flex flex-col items-center">
            {/* Header / Controls */}
            <div className={`w-full max-w-[1200px] mb-6 flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100 gap-4`}>
                <div className="flex items-center gap-4">
                    <div
                        className="p-2 rounded-[20px] flex items-center gap-3 border-2 transition-colors pr-6"
                        style={{
                            backgroundColor: getThemeStyles(role).bg,
                            color: getThemeStyles(role).border,
                            borderColor: getThemeStyles(role).border
                        }}
                    >
                        {loggedInChar ? (
                            <>
                                <img
                                    src={`/api/proxy/image?url=${encodeURIComponent(loggedInChar.avatarUrl)}`}
                                    alt={loggedInChar.name}
                                    className="w-[50px] h-[50px] rounded-full bg-white object-cover"
                                    referrerPolicy="no-referrer"
                                />
                                <span className="text-xl font-bold" style={{ color: getThemeStyles(role).text }}>
                                    {loggedInChar.name}
                                </span>
                            </>
                        ) : (
                            // Admin or Fallback
                            <>
                                <div className="w-[50px] h-[50px] flex items-center justify-center text-2xl">⚡️</div>
                                <span className="text-xl font-bold">Admin</span>
                            </>
                        )}
                    </div>

                    <div>
                        <h1 className="text-sm font-bold text-gray-400">스케줄 관리자</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            {role === 'admin' ?
                                <input
                                    value={editSchedule.weekRange}
                                    onChange={(e) => setEditSchedule({ ...editSchedule, weekRange: e.target.value })}
                                    className="bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg text-sm w-48 text-center mt-1"
                                />
                                : <span className="text-xs text-gray-300">오늘도 화이팅! 🍀</span>
                            }
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-500 text-white px-4 py-2 rounded-2xl hover:bg-blue-600 disabled:bg-gray-300 font-medium shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                        {isSaving ? '저장 중...' : '저장하기'}
                    </button>
                    <button onClick={handleLogout} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-2xl hover:bg-gray-200 font-medium transition-colors">
                        로그아웃
                    </button>
                </div>
            </div>

            {/* Main Grid Container */}
            <div className="w-full max-w-[1200px] bg-white rounded-[30px] shadow-[0_4px_20px_rgba(255,182,193,0.3)] p-6 overflow-x-auto">
                <div
                    className="grid gap-[10px]"
                    style={{
                        gridTemplateColumns: '100px repeat(7, minmax(120px, 1fr))',
                        minWidth: '940px' // Ensure scrolling on mobile
                    }}
                >
                    {/* Header Row */}
                    <div className="rounded-[20px]"></div> {/* Corner */}
                    {days.map((day) => (
                        <div key={day} className="text-center font-bold text-[#888] p-[10px] bg-[#ffebee] rounded-[20px] text-sm flex items-center justify-center">
                            {day}
                        </div>
                    ))}

                    {/* Character Rows */}
                    {visibleCharacters.map(char => (
                        <div key={char.id} className="contents"> {/* 'contents' makes children direct grid items */}
                            {/* Avatar Cell */}
                            <div
                                className="flex flex-col items-center justify-center p-[10px] rounded-[20px] border-2 transition-colors"
                                style={{
                                    backgroundColor: getThemeStyles(char.colorTheme).bg,
                                    borderColor: getThemeStyles(char.colorTheme).border,
                                    color: getThemeStyles(char.colorTheme).text
                                }}
                            >
                                <img src={char.avatarUrl} alt="" className="w-[50px] h-[50px] rounded-full bg-white object-cover mb-1" />
                                <span className="text-sm font-bold">{char.name}</span>
                            </div>

                            {/* Day Cells */}
                            {days.map(day => {
                                const item = char.schedule[day];
                                const type = item?.type || 'stream';
                                const style = getInputStyles(char.colorTheme, type);

                                return (
                                    <div
                                        key={day}
                                        className="p-[10px] rounded-[20px] min-h-[80px] flex flex-col border-2 transition-transform"
                                        style={{
                                            backgroundColor: style.backgroundColor,
                                            borderColor: style.borderColor,
                                            color: style.color
                                        }}
                                    >
                                        <input
                                            value={item?.time || ''}
                                            onChange={(e) => updateDay(char.id, day, 'time', e.target.value)}
                                            onBlur={(e) => handleTimeBlur(char.id, day, e.target.value)}
                                            placeholder="Time"
                                            className="bg-transparent font-bold text-[1.1rem] mb-[5px] w-full focus:outline-none placeholder-gray-400/50"
                                            style={{ color: 'inherit' }}
                                        />
                                        <textarea
                                            value={item?.content || ''}
                                            onChange={(e) => updateDay(char.id, day, 'content', e.target.value)}
                                            placeholder="Content"
                                            className="bg-transparent text-[0.9rem] w-full resize-none h-full focus:outline-none leading-snug placeholder-gray-400/50 flex-grow"
                                            style={{ color: 'inherit' }}
                                        />
                                        {/* Full Width Type Selector with Korean Options */}
                                        <div className="mt-auto pt-2 w-full">
                                            <select
                                                value={type}
                                                onChange={(e) => updateDay(char.id, day, 'type', e.target.value)}
                                                className="w-full text-[0.8rem] bg-black/5 text-gray-500 rounded px-2 py-1 border-none focus:outline-none cursor-pointer"
                                                style={{ textAlignLast: 'center' }}
                                            >
                                                <option value="stream">🎥 방송</option>
                                                <option value="off">💤 휴방</option>
                                                <option value="collab">🤝 합방</option>
                                                <option value="collab_maivi">💜 메이비</option>
                                                <option value="collab_hanavi">🌸 하나비</option>
                                                <option value="collab_universe">🪐 유니버스</option>
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <p className="mt-8 text-gray-400 text-sm">
                💡 팁: 내용은 자동으로 줄바꿈됩니다. 휴방으로 설정하면 배경이 하얗게 변합니다.
            </p>
        </div>
    );
}
