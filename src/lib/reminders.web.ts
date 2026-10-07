export async function setDailyReminder(enabled: boolean, _hour = 19): Promise<void> {
    if (!enabled) return;
    throw new Error('Daily notifications are available in the installed iOS or Android app.');
}
