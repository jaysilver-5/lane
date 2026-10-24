import React from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/state/AppState';
import { config } from '../../src/config';
import { Icon } from '../../src/components/Icon';
import { Button, Card, Copy, Divider, Eyebrow, Heading, MenuItem, Muted, Row, Screen } from '../../src/components/UI';
export default function Profile() {
  const router = useRouter();
  const { state, colors, identity, access } = useApp();
  const name = identity?.name.trim() || state.preferences.name.trim() || '';
  const words = name.split(/\s+/).filter(Boolean);
  const initials = [words[0]?.[0], words.length > 1 ? words[words.length - 1]?.[0] : ''].filter(Boolean).join('').toUpperCase();
  return <Screen tabs>
    <View style={{ paddingTop: 10 }}><Heading eyebrow="MADE FOR YOUR JOURNEY" sub="Your details, your preferences, your pace.">A little space for you.</Heading></View>
    <Row style={{ paddingVertical: 7, gap: 13 }}><View accessibilityLabel={initials ? 'Profile initials' : 'Profile avatar'} style={{ width: 54, height: 54, borderRadius: 19, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' }}>{initials ? <Copy size={20} weight="600">{initials}</Copy> : <Icon name="user" size={26} color={colors.success}/>}</View>
      <View style={{ flex: 1, gap: 3 }}><Copy size={20} weight="600">{words[0] ? `Welcome, ${words[0]}.` : 'Welcome to FirstLane.'}</Copy><Muted size={12}>{identity?.email ?? 'Guest · saved on this device'}</Muted></View>
    </Row>
    <Card style={{ backgroundColor: colors.sage, borderColor: colors.sageLine, gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}><Eyebrow color={colors.success}>{access.full ? 'ONTARIO G1 COMPLETE' : access.kind === 'free' ? 'YOUR FREE ACCOUNT' : 'A GOOD PLACE TO START'}</Eyebrow><Icon name="spark" size={19} color={colors.success}/></Row>
      <Copy size={21} weight="600">{access.full ? 'More room to keep growing.' : 'Make room for progress.'}</Copy>
      <Muted size={12}>{access.full ? 'Your full Ontario pack. One purchase, no expiry.' : `${access.kind === 'free' ? '40 free' : '10 guest'} samples now. The full pack for ${config.offer.label}, once.`}</Muted>
      <Button kind="dark" onPress={() => router.push(access.full ? '/membership' : '/plans')}>{access.full ? 'View your access' : 'Explore Ontario Complete'}</Button>
    </Card>
    <View style={{ gap: 9 }}><Eyebrow>YOUR LEARNING</Eyebrow><Card style={{ paddingVertical: 3 }}>
      <MenuItem icon="spark" title="Plan & billing" subtitle="Purchase, receipts and restore" onPress={() => router.push('/membership')}/><Divider/>
      <MenuItem icon="user" title="Your account" subtitle={identity ? 'Account and data controls' : 'Create an account or sign in'} onPress={() => router.push('/account')}/><Divider/>
      <MenuItem icon="map" title="Test location" subtitle="Ontario G1 · Canada" onPress={() => router.push('/jurisdiction')}/><Divider/>
      <MenuItem icon="target" title="Study plan" subtitle={`${state.preferences.goal} questions a day`} onPress={() => router.push('/study-plan')}/>
      {Platform.OS !== 'web' && <><Divider/><MenuItem icon="download" title="Offline packs" subtitle={state.downloaded ? 'Ontario pack downloaded' : 'Take your practice with you'} onPress={() => router.push('/downloads')}/></>}
    </Card></View>
    <View style={{ gap: 9 }}><Eyebrow>THE LITTLE DETAILS</Eyebrow><Card style={{ paddingVertical: 3 }}>
      <MenuItem icon="sun" title="Appearance & accessibility" subtitle="Light, dark, motion and haptics" onPress={() => router.push('/display')}/><Divider/>
      <MenuItem icon="help" title="Help & support" subtitle="Guidance when you need it" onPress={() => router.push('/support')}/><Divider/>
      <MenuItem icon="shield" title="Privacy & terms" onPress={() => router.push('/legal')}/><Divider/>
      <MenuItem icon="book" title="Learning information" subtitle="Sources and content review" onPress={() => router.push('/content-status')}/>
    </Card></View>
    <Muted size={10} style={{ textAlign: 'center', paddingVertical: 10 }}>FirstLane · Get road ready.
Independent driving-test preparation.</Muted>
  </Screen>;
}
