import React from 'react';

export type SocialStrategy = 'oauth_google' | 'oauth_apple';

// Web authentication only. Keep the providers' recognizable colors and marks.
export function SocialAuthButton({ strategy, onPress, busy = false, disabled = false }: {
  strategy: SocialStrategy;
  onPress: () => Promise<void>;
  busy?: boolean;
  disabled?: boolean;
}) {
  const apple = strategy === 'oauth_apple';
  const label = `Continue with ${apple ? 'Apple' : 'Google'}`;
  return <>
    <style>{`.firstlane-social-button:hover:not(:disabled){box-shadow:0 1px 5px #0002}.firstlane-social-button:focus-visible{outline:3px solid #276246;outline-offset:3px}.firstlane-social-button:disabled{cursor:wait}`}</style>
    <button type="button" className="firstlane-social-button" disabled={disabled || busy} aria-busy={busy}
      onClick={() => { void onPress(); }}
      style={{ width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        border: `1px solid ${apple ? '#000000' : '#747775'}`, borderRadius: 10, padding: '12px 20px',
        background: apple ? '#000000' : '#FFFFFF', color: apple ? '#FFFFFF' : '#1F1F1F',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif', fontSize: 14, fontWeight: 500,
        lineHeight: '20px', cursor: 'pointer' }}>
      <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        {apple ? <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.77 3.08.83 1.18-.24 2.31-.96 3.57-.87 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z"/> : <>
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/>
          <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.23-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/>
          <path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/>
          <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A6 6 0 0 1 12 5.96Z"/>
        </>}
      </svg>
      <span>{busy ? `Connecting to ${apple ? 'Apple' : 'Google'}…` : label}</span>
    </button>
  </>;
}
