import React from 'react';
import { usePathname } from 'expo-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { config } from '../config';
import { sanitizeTelemetryEvent, telemetryRoute } from '../domain/webTelemetry.mjs';

export function WebTelemetry() {
  const route = telemetryRoute(usePathname());
  if (!config.isProduction) return null;
  return <>
    <Analytics
      mode="production"
      debug={false}
      route={route}
      path={route}
      scriptSrc="/app/_vercel/insights/script.js"
      viewEndpoint="/app/_vercel/insights/view"
      eventEndpoint="/app/_vercel/insights/event"
      sessionEndpoint="/app/_vercel/insights/session"
      beforeSend={event => event.type === 'pageview' ? sanitizeTelemetryEvent(event) : null}
    />
    <SpeedInsights
      debug={false}
      route={route}
      scriptSrc="/app/_vercel/speed-insights/script.js"
      endpoint="/app/_vercel/speed-insights/vitals"
      beforeSend={sanitizeTelemetryEvent}
    />
  </>;
}
