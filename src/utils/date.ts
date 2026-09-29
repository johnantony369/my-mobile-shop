import { Language } from '../types';

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayLocalDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

export function getLast14Days(): {
  dateStr: string;
  dayNum: number;
  dayName: string;
  dayNameEn: string;
  isToday: boolean;
}[] {
  const days = [];
  const todayStr = getLocalDateString();
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // From 13 days ago to today (14 days)
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    days.push({
      dateStr,
      dayNum: d.getDate(),
      dayNameEn: dayNamesEn[d.getDay()],
      dayName: dayNamesEn[d.getDay()],
      isToday: dateStr === todayStr,
    });
  }
  return days;
}

export const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatHeaderDate(dateStr: string, _lang?: Language): string {
  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayLocalDateString();

  if (dateStr === todayStr) {
    return 'Today';
  }
  if (dateStr === yesterdayStr) {
    return 'Yesterday';
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const monthName = EN_MONTHS[month - 1];
  return `${day} ${monthName} ${year}`;
}

export function formatMonthName(year: number, month: number, _lang?: Language): string {
  const monthName = EN_MONTHS[month - 1];
  return `${monthName} ${year}`;
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 is 12
  return `${hours}:${minutes} ${ampm}`;
}
