import React from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { config } from '../src/config';
import { Art } from '../src/components/Art';
import { accessDescription } from '../src/domain/access.mjs';
import { Button,Card,Chip,Heading,Muted,Screen } from '../src/components/UI';
export default function Success(){const router=useRouter(),{access}=useApp();return <Screen><Art name="trophy" height={150}/><Heading eyebrow={access.kind!=='paid'?'ACCESS CHECK':config.mode==='demo'?'TEST PURCHASE COMPLETE':'PURCHASE VERIFIED'} sub={access.kind==='paid'?'Ontario G1 Complete is yours. No countdown and no renewal.':'No verified paid access is available yet.'}>{access.kind==='paid'?`You’re in.\nKeep moving.`:`Check your\naccess first.`}</Heading><Card><Chip selected={access.kind==='paid'}>{access.label}</Chip><Muted>{accessDescription(access)}</Muted>{config.mode==='demo'&&<Muted size={12}>This was a simulation. No money was charged.</Muted>}</Card><Button onPress={()=>router.replace('/(tabs)')}>Start practising</Button><Button kind="secondary" onPress={()=>router.replace('/membership')}>View purchase & receipt</Button></Screen>}
