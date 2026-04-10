export interface CalendarEventDetails {
  summary: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink: string;
  summary: string;
  start: string;
}

/**
 * Create an event on the user's Google Calendar.
 * Uses GOOGLE_CALENDAR_ID env var if set, otherwise falls back to "primary".
 * Requires a valid Google OAuth2 access token with calendar write scope.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventDetails
): Promise<CalendarEventResult> {
  const configuredCalendarId = process.env.GOOGLE_CALENDAR_ID || "";
  const calendarIds = configuredCalendarId
    ? [configuredCalendarId, "primary"]
    : ["primary"];

  const payload = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.startDateTime, ...(event.timeZone && { timeZone: event.timeZone }) },
    end: { dateTime: event.endDateTime, ...(event.timeZone && { timeZone: event.timeZone }) },
  };

  for (const calId of calendarIds) {
    const encodedId = encodeURIComponent(calId);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events`;

    console.log("[calendar] creating event", {
      url,
      calendarId: calId,
      tokenPrefix: accessToken?.substring(0, 10) + "...",
      tokenLength: accessToken?.length,
      event: { summary: event.summary, start: event.startDateTime, end: event.endDateTime, timeZone: event.timeZone },
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      console.log("[calendar] event created successfully", {
        calendarId: calId,
        eventId: data.id,
        htmlLink: data.htmlLink,
      });
      return {
        eventId: data.id,
        htmlLink: data.htmlLink,
        summary: data.summary,
        start: data.start?.dateTime ?? data.start?.date,
      };
    }

    const body = await res.text();
    console.warn("[calendar] Google Calendar API failed", {
      calendarId: calId,
      status: res.status,
      body,
    });

    // 404/403 on a configured calendar means the user doesn't have access
    // to it -- fall back to "primary" if we haven't tried it yet.
    if ((res.status === 404 || res.status === 403) && calId !== "primary") {
      console.log("[calendar] falling back to primary calendar");
      continue;
    }

    throw new Error(`Google Calendar API error (${res.status}): ${body}`);
  }

  throw new Error("Failed to create calendar event on all attempted calendars");
}
