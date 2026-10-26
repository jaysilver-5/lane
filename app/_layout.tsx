import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { AppProvider, useApp } from '../src/state/AppState';
import { sessionRequiresUpgrade } from '../src/domain/availability.mjs';
import sampleManifest from '../content/sample-manifest.json';
import { Toast, Sheet, Muted, Button, Note } from '../src/components/UI';
import { WebFrame } from '../src/components/WebFrame';
import { WebAccountProvider, useWebAccount } from '../src/lib/webAccount';
import { WebTelemetry } from '../src/components/WebTelemetry';
function HydratedScreen({ children }: { children: React.ReactNode }) {
    const { ready, colors } = useApp(), account = useWebAccount();
    if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Loading your FirstLane account" color={colors.success}/></View>;
    return <WebFrame>{account.error && <View style={{ padding: 16 }}><Note tone="warning">{account.error}</Note><Button kind="secondary" onPress={() => { void account.refresh().catch(() => {}); }}>Reconnect account</Button></View>}{children}</WebFrame>;
}
// Keep the navigator mounted across hydration and account switches. Only the
// selected screen waits; unmounting the navigator can discard its route state.
const screenLayout = ({ children }: { children: React.ReactNode }) => <HydratedScreen>{children}</HydratedScreen>;
function Navigation() {
    const router = useRouter();
    const { colors, dark, reduceMotion, accessGate, setAccessGate, identity, parkPremiumSession, state, access } = useApp();
    const mustPark = sessionRequiresUpgrade(state.active, access, sampleManifest);
    return <><StatusBar style={dark ? 'light' : 'dark'}/><Stack screenLayout={screenLayout} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: reduceMotion ? 'none' : 'slide_from_right' }}><Stack.Screen name="(tabs)"/><Stack.Screen name="quiz" options={{ gestureEnabled: false }}/><Stack.Screen name="onboarding" options={{ animation: 'fade' }}/></Stack><Sheet visible={!!accessGate} onClose={() => setAccessGate(null)} title="More room to practise."><Muted>{accessGate}</Muted><Muted>{Platform.OS==='web'?'Free includes 40 fixed sample questions after sign-up. Ontario G1 Complete adds the full Ontario question bank and full rehearsals in your browser.':'Free includes 40 fixed sample questions after sign-up. Ontario G1 Complete unlocks the full Ontario question bank, full rehearsals and offline study.'}</Muted><Button onPress={() => { setAccessGate(null); router.push(identity ? '/plans' : '/auth/sign-up'); }}>{identity ? 'See Ontario G1 Complete' : 'Create your free account'}</Button><Button kind="secondary" onPress={() => { setAccessGate(null); router.push('/plans'); }}>Compare access</Button><Button kind="ghost" icon={null} onPress={() => { if (mustPark) parkPremiumSession(); setAccessGate(null); router.replace('/(tabs)'); }}>{mustPark ? 'Save session & use free practice' : 'Keep practising'}</Button></Sheet><Toast /></>;
}
export default function RootLayout() { return <SafeAreaProvider><WebAccountProvider><AppProvider><WebTelemetry /><Navigation /></AppProvider></WebAccountProvider></SafeAreaProvider>; }

export function ErrorBoundary({retry}:{error:Error;retry:()=>Promise<void>}) {
 return <View style={{flex:1,backgroundColor:'#F8F7F3',padding:24,justifyContent:'center',gap:16}}><Text accessibilityRole="header" style={{fontSize:26,fontWeight:'700',color:'#182D22'}}>Let’s get you back on track.</Text><Text style={{fontSize:16,lineHeight:24,color:'#182D22'}}>FirstLane could not open this screen. Try again. Your saved progress is not cleared by retrying.</Text><Pressable accessibilityRole="button" onPress={()=>{void retry().catch(()=>{});}} style={{minHeight:52,padding:16,borderRadius:16,backgroundColor:'#D5F489'}}><Text style={{fontWeight:'700',textAlign:'center',color:'#182D22'}}>Try again</Text></Pressable></View>;
}
