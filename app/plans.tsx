import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { config } from '../src/config';
import { freePlanLabel } from '../src/domain/availability.mjs';
import { Icon } from '../src/components/Icon';
import { Button, Card, Chip, Copy, Eyebrow, Heading, Muted, Row, Screen } from '../src/components/UI';
export default function Plans() {
  const router = useRouter(), { colors, access, identity } = useApp();
  const checkout = () => identity ? router.push('/checkout') : router.push({ pathname: '/auth/sign-up', params: { next: '/checkout' } });
  return <Screen back title="Plans & access">
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}><Chip selected icon="spark">SIMPLE BY DESIGN</Chip>
      <Copy size={32} weight="600" style={{ textAlign: 'center', lineHeight: 38 }}>Start free. Unlock it once.</Copy>
      <Muted size={13} style={{ textAlign: 'center' }}>{access.kind === 'guest' ? 'Try 10 guest samples, or create a free account for 40. The full Ontario pack is one purchase away.' : '40 fixed samples to find your rhythm. One purchase for the complete Ontario G1 pack.'}</Muted>
    </View>
    <Card style={{ backgroundColor: colors.sage, borderColor: colors.sageLine, padding: 20, gap: 16 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><Eyebrow color={colors.success}>GO THE WHOLE WAY</Eyebrow><Chip selected>ONE-TIME</Chip></Row>
      <View style={{ gap: 5 }}><Copy size={24} weight="600">Ontario G1 Complete</Copy><Row style={{ alignItems: 'baseline', gap: 7 }}><Copy size={42} weight="600" style={{ lineHeight: 53 }}>{config.offer.label}</Copy><Muted size={13}>once</Muted></Row><Muted size={13}>Your Ontario pack. No subscription. No expiry.</Muted></View>
      {['All 500 practice questions', 'Topic practice and full rehearsals', 'Explanations, saved questions and mistake review', 'Offline practice in the installed app', 'Future corrections to the Ontario pack'].map(text => <Row key={text} style={{ alignItems: 'flex-start' }}><Icon name="check" size={17} color={colors.success}/><Copy size={13} style={{ flex: 1 }}>{text}</Copy></Row>)}
      <Button kind="dark" onPress={() => access.full ? router.push('/membership') : checkout()}>{access.full ? 'View my purchase' : 'Unlock Ontario G1 Complete'}</Button>
      <Muted size={11} style={{ textAlign: 'center' }}>Ontario pack only. Your store shows the final local price and applicable tax.</Muted>
    </Card>
    <Card style={{ padding: 20, gap: 13 }}>
      <View style={{ gap: 5 }}><Eyebrow>{freePlanLabel(access)}</Eyebrow><Row style={{ justifyContent: 'space-between' }}><Copy size={23} weight="600">FirstLane Free</Copy><Copy size={25} weight="600">CA$0</Copy></Row></View>
      <Muted size={13}>40 fixed sample questions after email verification: 20 road signs and 20 road rules. Repeating practice uses the same sample pool.</Muted>
      {access.kind === 'guest' ? <Button kind="secondary" onPress={() => router.push('/auth/sign-up')}>Create a free account</Button> : <Button kind="secondary" onPress={() => router.replace('/(tabs)')}>Continue practising</Button>}
      {access.kind === 'guest' ? <Muted size={11}>Your current guest access has 10 fixed questions.</Muted> : null}
    </Card>
    <Row style={{ justifyContent: 'center', gap: 7 }}><Icon name="shield" size={15} color={colors.success}/><Muted size={11}>No auto-renewal. No payment details for free access.</Muted></Row>
    <Button kind="ghost" icon="refresh" onPress={() => router.push('/membership')}>Restore a purchase</Button>
    <Button kind="ghost" icon={null} onPress={() => router.push('/legal')}>Privacy & purchase terms</Button>
  </Screen>;
}
