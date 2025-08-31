import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

export const formatDate = (dateString: string): string => {
  const date = parseISO(dateString);
  
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }
  
  return format(date, 'MMM d, yyyy');
};

export const formatRelativeTime = (dateString: string): string => {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
};

export const formatDueDate = (dateString: string): string => {
  const date = parseISO(dateString);
  const now = new Date();
  
  if (date < now) {
    return `Overdue by ${formatDistanceToNow(date)}`;
  }
  
  if (isToday(date)) {
    return `Due today at ${format(date, 'h:mm a')}`;
  }
  
  return `Due ${formatRelativeTime(dateString)}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};