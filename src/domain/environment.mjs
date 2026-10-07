/** Unknown or absent modes must never enable simulated auth or purchases. */
export function runtimeMode(value) {
  if (value === 'demo') return 'demo';
  if (value == null || value === '' || value === 'connected' || value === 'production') return 'connected';
  throw new Error('Invalid app environment. Use demo, connected, or production.');
}
