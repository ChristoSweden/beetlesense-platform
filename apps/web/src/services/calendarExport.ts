/**
 * Calendar Export Service — generates .ics files and calendar URLs
 * for syncing forestry activities to Google Calendar, Outlook, etc.
 * Follows RFC 5545 iCalendar format.
 */

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  reminder?: number; // minutes before
}

/** Pad a number to 2 digits */
function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Format a Date as iCalendar DTSTART/DTEND value (UTC) */
function formatICSDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/** Escape text for iCalendar fields (RFC 5545 §3.3.11) */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Generate a deterministic UID for an event */
function generateUID(event: CalendarEvent): string {
  const hash = event.title + event.startDate.toISOString();
  let h = 0;
  for (let i = 0; i < hash.length; i++) {
    h = ((h << 5) - h + hash.charCodeAt(i)) | 0;
  }
  return `${Math.abs(h).toString(36)}-${event.startDate.getTime()}@beetlesense.ai`;
}

/**
 * Generate a valid RFC 5545 iCalendar (.ics) string from a list of events.
 */
export function generateICS(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BeetleSense//Forest Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BeetleSense Forest Calendar',
    'X-WR-TIMEZONE:Europe/Stockholm',
    '',
    // VTIMEZONE for Europe/Stockholm
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Stockholm',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${generateUID(event)}`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`DTSTART:${formatICSDate(event.startDate)}`);
    lines.push(`DTEND:${formatICSDate(event.endDate)}`);
    lines.push(`SUMMARY:${escapeICS(event.title)}`);
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);

    if (event.location) {
      lines.push(`LOCATION:${escapeICS(event.location)}`);
    }

    // VALARM — reminder
    if (event.reminder && event.reminder > 0) {
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-PT' + event.reminder + 'M');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeICS(event.title)}`);
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Download an .ics file to the user's device.
 */
export function downloadICS(events: CalendarEvent[], filename: string): void {
  const icsContent = generateICS(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a Google Calendar "add event" URL.
 */
export function generateGoogleCalendarURL(event: CalendarEvent): string {
  const fmt = (d: Date) =>
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(event.startDate)}/${fmt(event.endDate)}`,
    details: event.description,
    ...(event.location ? { location: event.location } : {}),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an Outlook Web "add event" URL.
 */
export function generateOutlookURL(event: CalendarEvent): string {
  const params = new URLSearchParams({
    rru: 'addevent',
    subject: event.title,
    body: event.description,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    ...(event.location ? { location: event.location } : {}),
    path: '/calendar/action/compose',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
