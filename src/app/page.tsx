"use client";

import { useRef, useState } from "react";
import ScheduleGrid from '@/components/ScheduleGrid';
import { useSchedule } from "@/hooks/useSchedule";
import html2canvas from "html2canvas";

export default function Home() {
  // Navigation State
  const getInitialMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
  };

  const [currentDate, setCurrentDate] = useState<Date>(getInitialMonday());
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  const getWeekRangeString = (monday: Date) => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const sM = (monday.getMonth() + 1).toString().padStart(2, '0');
    const sD = monday.getDate().toString().padStart(2, '0');
    const eM = (sunday.getMonth() + 1).toString().padStart(2, '0');
    const eD = sunday.getDate().toString().padStart(2, '0');

    return `${sM}.${sD} - ${eM}.${eD}`;
  };

  const weekRangeString = getWeekRangeString(currentDate);
  const { schedule } = useSchedule(weekRangeString);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const handlePrevWeek = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handleExport = async () => {
    if (!scheduleRef.current) return;

    try {
      // Clone the element
      const clone = scheduleRef.current.cloneNode(true) as HTMLElement;

      // Apply export styles to the clone
      clone.classList.add('exporting');

      // Position clone off-screen but visible
      clone.style.position = 'fixed';
      clone.style.top = '-10000px';
      clone.style.left = '-10000px';
      clone.style.zIndex = '-1000';

      // Append to body
      document.body.appendChild(clone);

      // Wait for DOM/Styles to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clone, {
        backgroundColor: '#fff0f5',
        scale: 2,
        scrollX: 0,
        scrollY: 0,
        useCORS: true, // Enable CORS for external images
        allowTaint: true, // Allow tainted images
      });

      // Remove clone
      document.body.removeChild(clone);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('이미지 생성에 실패했습니다.');
          return;
        }

        const fileName = `hanabi-schedule-${new Date().toISOString().slice(0, 10)}.png`;

        // Check for Web Share API support (targeting mobile/tablet)
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], fileName, { type: 'image/png' });
          const shareData = {
            files: [file],
            title: '하나비 주간 스케줄',
          };

          if (navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
              return;
            } catch (err) {
              // Ignore AbortError (user cancelled share)
              if ((err as Error).name === 'AbortError') return;
              console.error('Share failed:', err);
              // Fall through to download if share fails (optional, but good for robustness)
            }
          }
        }

        // Fallback: Legacy download (Desktop)
        const link = document.createElement('a');
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);

      }, 'image/png');
    } catch (error) {
      console.error('Export failed:', error);
      alert('PNG 저장에 실패했습니다.');
    }
  };

  return (
    <main className="main-layout">
      <ScheduleGrid
        ref={scheduleRef}
        data={schedule}
        onExport={handleExport}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        headerControls={
          <div
            // @ts-ignore - Custom prop passing for dateDisplay
            dateDisplay={
              <div className="relative">
                <button
                  onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                  className="text-lg md:text-xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 px-4 py-1 rounded-full transition-colors flex items-center gap-2 select-none"
                >
                  {weekRangeString}
                  <span className="text-xs text-gray-500">▼</span>
                </button>

                {/* Date Dropdown */}
                {isDateDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[150]" onClick={() => setIsDateDropdownOpen(false)} />
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[151] max-h-60 overflow-y-auto py-1">
                      {Array.from({ length: 9 }).map((_, i) => {
                        const offset = i - 4; // -4 to +4 weeks
                        const d = new Date(currentDate);
                        d.setDate(d.getDate() + (offset * 7));
                        const rangeStr = getWeekRangeString(d);
                        const isCurrent = offset === 0;

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setCurrentDate(d);
                              setIsDateDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-pink-50 transition-colors flex justify-between items-center
                              ${isCurrent ? 'bg-pink-100 text-pink-600' : 'text-gray-700'}
                            `}
                          >
                            <span>{rangeStr}</span>
                            {isCurrent && <span>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            }
          />
        }
      />
    </main>
  );
}
