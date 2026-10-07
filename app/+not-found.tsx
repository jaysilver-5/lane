import React from 'react';
import { useRouter } from 'expo-router';
import { Empty, Screen } from '../src/components/UI';
export default function NotFound() { const router = useRouter(); return <Screen><Empty icon="compass" title="A small detour." body="This page isn’t on the map. Let’s get you back to your practice." action="Back to Home" onPress={() => router.replace('/(tabs)')}/></Screen>; }
