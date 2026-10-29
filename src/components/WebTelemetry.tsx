// Browser analytics must not load in the native iOS or Android bundle.
export function WebTelemetry() { return null; }
