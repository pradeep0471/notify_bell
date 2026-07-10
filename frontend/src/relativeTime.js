export function relativeTime(isoString) {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const diffSeconds = Math.round((now - then) / 1000);

  if (diffSeconds < 30) return 'just now';

  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];

  for (const [label, seconds] of units) {
    const value = Math.floor(diffSeconds / seconds);
    if (value >= 1) {
      const abbrev = { year: 'y', month: 'mo', week: 'w', day: 'd', hour: 'h', minute: 'm' }[label];
      return `${value}${abbrev} ago`;
    }
  }
  return 'just now';
}
