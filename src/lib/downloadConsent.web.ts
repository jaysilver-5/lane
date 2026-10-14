export async function confirmPackDownload(bytes: number): Promise<boolean> {
    const size = bytes < 1_000_000 ? `${Math.ceil(bytes / 1_000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
    return globalThis.confirm(`Download Ontario study pack?\n\nDownload size: ${size}. The pack will be saved on this device for offline practice. Mobile data charges may apply.`);
}
