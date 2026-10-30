export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Groups items by local calendar day, newest first: "Today", "Yesterday", then "Mon, Oct 27, 2026". */
export function groupByDay<T extends { createdAt: string }>(items: T[], now = new Date()): DayGroup<T>[] {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(yesterday);

  const sorted = [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const groups: DayGroup<T>[] = [];
  for (const item of sorted) {
    const date = new Date(item.createdAt);
    const key = dayKey(date);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label =
        key === todayKey
          ? 'Today'
          : key === yesterdayKey
            ? 'Yesterday'
            : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
