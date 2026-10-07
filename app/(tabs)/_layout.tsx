import React from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/state/AppState';
import { Copy, Row } from '../../src/components/UI';
import { Icon } from '../../src/components/Icon';
const routes = [
  { route: 'index', label: 'Home', icon: 'home' },
  { route: 'study', label: 'Practice', icon: 'book' },
  { route: 'progress', label: 'Progress', icon: 'chart' },
  { route: 'profile', label: 'Account', icon: 'user' },
];
function Dock() {
  const { colors } = useApp();
  const router = useRouter(), segments = useSegments(), insets = useSafeAreaInsets();
  const current = segments[segments.length - 1];
  return <View style={{ backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 7, paddingBottom: Math.max(insets.bottom, 10) }}>
    <Row style={{ backgroundColor: colors.tab, borderRadius: 24, padding: 5, borderWidth: 1, borderColor: colors.line, gap: 2,
      maxWidth: 552, width: '100%', alignSelf: 'center', boxShadow: '0 4px 18px rgba(28,41,34,0.045)' }}>
      {routes.map(item => {
        const active = current === item.route || (item.route === 'index' && current === '(tabs)');
        return <Pressable key={item.route} accessibilityLabel={item.label} accessibilityRole="tab" accessibilityState={{ selected: active }}
          onPress={() => router.navigate((item.route === 'index' ? '/(tabs)' : `/(tabs)/${item.route}`) as any)}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 54, justifyContent: 'center', alignItems: 'center', paddingVertical: 7,
            gap: 4, backgroundColor: active ? colors.sage : 'transparent', opacity: pressed ? .7 : 1, borderRadius: 18 })}>
          <Icon name={item.icon} size={20} color={active ? colors.success : colors.muted} stroke={active ? 2 : 1.6}/>
          <Copy size={10} weight={active ? '700' : '500'} color={active ? colors.text : colors.muted}>{item.label}</Copy>
        </Pressable>;
      })}
    </Row>
  </View>;
}
export default function TabLayout() {
  return <Tabs tabBar={() => <Dock/>} screenOptions={{ headerShown: false }}>
    {routes.map(item => <Tabs.Screen key={item.route} name={item.route} options={{ title: item.label }}/>)}</Tabs>;
}
