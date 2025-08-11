// =============================================================================
// DATE UTILITIES - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { format, parseISO, addDays, addMonths, differenceInDays, differenceInMonths } from 'date-fns';

export const DateUtils = {
  // Format date for display
  formatDate: (date: string | Date, formatStr = 'yyyy-MM-dd'): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  },

  // Format datetime for display
  formatDateTime: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
  },

  // Add days to date
  addDaysToDate: (date: string | Date, days: number): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return addDays(dateObj, days);
  },

  // Add months to date
  addMonthsToDate: (date: string | Date, months: number): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return addMonths(dateObj, months);
  },

  // Calculate age from birth date
  calculateAge: (birthDate: string | Date): number => {
    const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
    const today = new Date();
    return Math.floor(differenceInDays(today, birth) / 365.25);
  },

  // Calculate months between dates
  monthsBetween: (startDate: string | Date, endDate: string | Date): number => {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    return differenceInMonths(end, start);
  },

  // Check if date is in the past
  isInPast: (date: string | Date): boolean => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return dateObj < new Date();
  },

  // Check if date is in the future
  isInFuture: (date: string | Date): boolean => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return dateObj > new Date();
  },

  // Get current timestamp
  getCurrentTimestamp: (): string => {
    return new Date().toISOString();
  },

  // Parse date safely
  parseDate: (dateString: string): Date | null => {
    try {
      return parseISO(dateString);
    } catch {
      return null;
    }
  },
};
