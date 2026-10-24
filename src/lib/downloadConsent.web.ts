// Loading questions is part of opening the web app, not a separate install.
// Native keeps its download-size consent in downloadConsent.ts.
export async function confirmPackDownload(_bytes: number): Promise<boolean> { return true; }
