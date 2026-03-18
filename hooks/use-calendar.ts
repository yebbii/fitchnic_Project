import { useState, useMemo } from "react";

/** 캘린더 월 탐색 + 날짜 그리드 계산 공통 훅 */
export function useCalendar() {
  const today = new Date();
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const calDays = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
    return days;
  }, [calMonth]);

  const prevMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));
  const monthLabel = `${calMonth.getFullYear()}년 ${calMonth.getMonth() + 1}월`;

  return { today, calMonth, calDays, prevMonth, nextMonth, monthLabel };
}
