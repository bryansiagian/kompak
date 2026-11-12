export type DueState = 'overdue' | 'today' | 'upcoming';

// Tanggal hari ini menurut zona waktu perangkat, dalam bentuk YYYY-MM-DD.
export function todayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Tanggal ISO bisa dibandingkan sebagai teks.
export function dueState(dueDate: string, today: string): DueState {
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  return 'upcoming';
}

// Tenggat adalah tanggal kalender: diformat dalam UTC agar tidak bergeser sehari.
export function formatDueDate(dueDate: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${dueDate}T00:00:00Z`));
}