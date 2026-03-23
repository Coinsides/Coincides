/**
 * Get "today" in the user's local timezone.
 * 
 * Priority:
 * 1. Explicit date from query parameter (most reliable)
 * 2. Timezone header from frontend (X-Timezone)
 * 3. User's stored timezone setting
 * 4. Fallback: America/Toronto
 * 
 * Returns YYYY-MM-DD string.
 */

const DEFAULT_TIMEZONE = 'America/Toronto';

/**
 * Get today's date string in a given timezone.
 */
export function getTodayInTimezone(timezone?: string): string {
  const tz = timezone || DEFAULT_TIMEZONE;
  try {
    // Use Intl to get the local date in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    // en-CA format is YYYY-MM-DD
    return formatter.format(new Date());
  } catch {
    // If timezone is invalid, fall back to default
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  }
}

/**
 * Extract the user's timezone from request.
 * Checks X-Timezone header first, then falls back to default.
 */
export function getTimezoneFromRequest(req: { headers?: Record<string, string | string[] | undefined> }): string {
  const tz = req.headers?.['x-timezone'];
  if (typeof tz === 'string' && tz.length > 0) {
    return tz;
  }
  return DEFAULT_TIMEZONE;
}

/**
 * Get today's date from a request.
 * Uses explicit query param > timezone header > default timezone.
 */
export function getTodayFromRequest(req: { query?: Record<string, unknown>; headers?: Record<string, string | string[] | undefined> }): string {
  // If frontend passes ?date=YYYY-MM-DD, use it directly
  const dateParam = req.query?.date;
  if (typeof dateParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return dateParam;
  }
  
  // Otherwise derive from timezone
  return getTodayInTimezone(getTimezoneFromRequest(req));
}
