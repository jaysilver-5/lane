import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
export async function setDailyReminder(enabled: boolean, hour = 19) {
    if (Platform.OS === 'web')
        throw new Error('Daily notifications are available in the installed iOS or Android app.');
    if (!enabled) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return;
    }
    if (Platform.OS === 'android')
        await Notifications.setNotificationChannelAsync('study', { name: 'Study reminders', importance: Notifications.AndroidImportance.DEFAULT });
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted')
        throw new Error('Notifications are off. Allow them in your device settings to receive reminders.');
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({ content: { title: 'A little practice. A little more confidence.', body: 'Your next FirstLane practice session is ready. Take it at your pace.' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: 'study' } });
}
