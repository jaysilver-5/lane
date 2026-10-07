import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AppProvider, useApp } from '../src/state/AppState';
import { sessionRequiresUpgrade } from '../src/domain/availability.mjs';
import sampleManifest from '../content/sample-manifest.json';
import { Toast, Sheet, Muted, Button } from '../src/components/UI';
function Navigation() {
    const router = useRouter();
    const { ready, colors, dark, reduceMotion, accessGate, setAccessGate, identity, parkPremiumSession, state, access } = useApp();
    const mustPark = sessionRequiresUpgrade(state.active, access, sampleManifest);
    if (!ready)
        return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.success}/></View>;
    return <><StatusBar style={dark ? 'light' : 'dark'}/><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: reduceMotion ? 'none' : 'slide_from_right' }}><Stack.Screen name="(tabs)"/><Stack.Screen name="quiz" options={{ gestureEnabled: false }}/><Stack.Screen name="onboarding" options={{ animation: 'fade' }}/></Stack><Sheet visible={!!accessGate} onClose={() => setAccessGate(null)} title="More room to practise."><Muted>{accessGate}</Muted><Muted>Free includes 40 fixed sample questions after sign-up. Ontario G1 Complete unlocks the full Ontario question bank, full rehearsals and offline study.</Muted><Button onPress={() => { setAccessGate(null); router.push(identity ? '/plans' : '/auth/sign-up'); }}>{identity ? 'See Ontario G1 Complete' : 'Create your free account'}</Button><Button kind="secondary" onPress={() => { setAccessGate(null); router.push('/plans'); }}>Compare access</Button><Button kind="ghost" icon={null} onPress={() => { if (mustPark) parkPremiumSession(); setAccessGate(null); router.replace('/(tabs)'); }}>{mustPark ? 'Save session & use free practice' : 'Keep practising'}</Button></Sheet><Toast /></>;
}
export default function RootLayout() { return <SafeAreaProvider><AppProvider><Navigation /></AppProvider></SafeAreaProvider>; }

export function ErrorBoundary({retry}:{error:Error;retry:()=>Promise<void>}) {
 return <View style={{flex:1,backgroundColor:'#F8F7F3',padding:24,justifyContent:'center',gap:16}}><Text accessibilityRole="header" style={{fontSize:26,fontWeight:'700',color:'#182D22'}}>Let’s get you back on track.</Text><Text style={{fontSize:16,lineHeight:24,color:'#182D22'}}>FirstLane could not open this screen. Try again. Your saved progress is not cleared by retrying.</Text><Pressable accessibilityRole="button" onPress={()=>{void retry().catch(()=>{});}} style={{minHeight:52,padding:16,borderRadius:16,backgroundColor:'#D5F489'}}><Text style={{fontWeight:'700',textAlign:'center',color:'#182D22'}}>Try again</Text></Pressable></View>;
}
