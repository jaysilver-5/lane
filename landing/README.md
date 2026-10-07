# Lane marketing site

This is the V1 marketing/acquisition page. It intentionally contains **no web checkout**.

Before publishing, edit `STORE_LINKS` near the bottom of `index.html`:

```js
const STORE_LINKS = {
  apple: 'https://apps.apple.com/...',
  google: 'https://play.google.com/store/apps/details?id=...'
};
```

Until those URLs are replaced, the buttons remain visually present but show a setup message rather than pretending a live store listing exists.

For campaign measurement, attach your analytics events to App Store and Google Play CTA clicks and preserve campaign/landing-page attribution according to your consent/privacy policy.
