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
  dayNameMl: string;
  isToday: boolean;
}[] {
  const days = [];
  const todayStr = getLocalDateString();
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesMl = ['ഞായർ', 'തിങ്കൾ', 'ചൊവ്വ', 'ബുധൻ', 'വ്യാഴം', 'വെള്ളി', 'ശനി'];

  // From 13 days ago to today (14 days)
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    days.push({
      dateStr,
      dayNum: d.getDate(),
      dayNameEn: dayNamesEn[d.getDay()],
      dayNameMl: dayNamesMl[d.getDay()],
      dayName: dayNamesMl[d.getDay()],
      isToday: dateStr === todayStr,
    });
  }
  return days;
}

export const ML_MONTHS = [
  'ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മേയ്', 'ജൂൺ',
  'ജൂലൈ', 'ആഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ'
];

export const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatHeaderDate(dateStr: string, lang: Language): string {
  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayLocalDateString();

  if (dateStr === todayStr) {
    return lang === 'ml' ? 'ഇന്ന്' : 'Today';
  }
  if (dateStr === yesterdayStr) {
    return lang === 'ml' ? 'ഇന്നലെ' : 'Yesterday';
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const monthName = lang === 'ml' ? ML_MONTHS[month - 1] : EN_MONTHS[month - 1];
  return `${day} ${monthName} ${year}`;
}

export function formatMonthName(year: number, month: number, lang: Language): string {
  const monthName = lang === 'ml' ? ML_MONTHS[month - 1] : EN_MONTHS[month - 1];
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
