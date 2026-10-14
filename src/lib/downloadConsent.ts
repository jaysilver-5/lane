import { Alert } from 'react-native';
export function confirmPackDownload(bytes: number): Promise<boolean> {
    const size = bytes < 1_000_000 ? `${Math.ceil(bytes / 1_000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
    return new Promise(resolve => Alert.alert('Download Ontario study pack?',
        `Download size: ${size}. The pack will be saved on this device for offline practice. Mobile data charges may apply.`,
        [{ text: 'Not now', style: 'cancel', onPress: () => resolve(false) }, { text: 'Download', onPress: () => resolve(true) }],
        { cancelable: true, onDismiss: () => resolve(false) }));
}
