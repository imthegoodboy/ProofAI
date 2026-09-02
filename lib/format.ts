export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function truncateHash(value: string | null, leading = 10, trailing = 8) {
  if (!value) return "Not available";
  if (value.length <= leading + trailing + 3) return value;
  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
}
