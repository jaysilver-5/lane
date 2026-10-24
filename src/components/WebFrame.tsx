import React from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useApp } from '../state/AppState';
import { Copy, Logo, Muted, Row } from './UI';
import { Icon } from './Icon';

export function WebFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions(), { colors, identity, access } = useApp();
  const router = useRouter(), path = usePathname();
  if (Platform.OS !== 'web' || width < 1000) return <>{children}</>;
  const links = [
    { label: 'Home', route: '/(tabs)', path: '/', icon: 'home' },
    { label: 'Practice', route: '/(tabs)/study', path: '/study', icon: 'book' },
    { label: 'Progress', route: '/(tabs)/progress', path: '/progress', icon: 'chart' },
    { label: 'Account', route: '/(tabs)/profile', path: '/profile', icon: 'user' },
  ];
  return <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
    <View style={{ width: 250, padding: 24, borderRightWidth: 1, borderColor: colors.line, gap: 30 }}>
      <Logo size={32}/>
      <View accessibilityRole="menu" style={{ gap: 8 }}>{links.map(link => <Pressable key={link.label} accessibilityRole="link" accessibilityState={{ selected: path === link.path }} onPress={() => router.navigate(link.route as any)} style={{ padding: 14, borderRadius: 14, backgroundColor: path === link.path ? colors.sage : 'transparent' }}><Row><Icon name={link.icon} color={colors.success}/><Copy weight="600" size={14}>{link.label}</Copy></Row></Pressable>)}</View>
      <View style={{ flex: 1 }}/>
      <View style={{ gap: 8, padding: 14, borderRadius: 16, backgroundColor: colors.sage }}><Copy weight="700" size={14}>Ontario G1</Copy><Muted size={12}>{access.label}</Muted><Pressable accessibilityRole="link" onPress={() => router.push(identity ? '/membership' : '/auth/sign-in')} style={{ minHeight: 44, justifyContent: 'center' }}><Copy size={13} weight="600" color={colors.success}>{identity ? 'Manage my access →' : 'Sign in →'}</Copy></Pressable></View>
      <Muted size={11}>iOS and Android apps coming soon.</Muted>
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
  </View>;
}
