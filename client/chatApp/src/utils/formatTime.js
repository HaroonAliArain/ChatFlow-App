import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

/**
 * Format time for message bubbles — "10:30 AM"
 */
export const formatMessageTime = (date) => {
  if (!date) return "";
  return format(new Date(date), "h:mm a");
};

/**
 * Format "last seen" time — shortened
 * - "online" if currently online
 * - "today 10:30 AM"
 * - "yesterday 10:30 AM"
 * - "Apr 10, 10:30 AM"
 */
export const formatLastSeen = (date, isOnline) => {
  if (isOnline) return "online";
  if (!date) return "offline";

  const d = new Date(date);
  const time = format(d, "h:mm a");

  if (isToday(d)) return `today ${time}`;
  if (isYesterday(d)) return `yesterday ${time}`;
  return `${format(d, "MMM d")}, ${time}`;
};

/**
 * Format date for chat separators — "Today" / "Yesterday" / "Apr 10, 2026"
 */
export const formatChatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);

  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
};

/**
 * Format relative time — "2 minutes ago", "1 hour ago"
 */
export const formatRelativeTime = (date) => {
  if (!date) return "";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

/**
 * Format sidebar time — "10:30 AM" (today) / "Yesterday" / "Apr 10"
 */
export const formatSidebarTime = (date) => {
  if (!date) return "";
  const d = new Date(date);

  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};
