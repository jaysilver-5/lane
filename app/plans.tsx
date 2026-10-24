import React from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { config } from '../src/config';
import { freePlanLabel } from '../src/domain/availability.mjs';
import { Icon } from '../src/components/Icon';
import { Button, Card, Chip, Copy, Eyebrow, Heading, Muted, Row, Screen } from '../src/components/UI';
export default function Plans() {
  const router = useRouter(), { colors, access, identity, bankAvailability } = useApp();
  const checkout = () => identity ? router.push('/checkout') : router.push({ pathname: '/auth/sign-up', params: { next: '/checkout' } });
  return <Screen back title="Plans & access">
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}><Chip selected icon="spark">SIMPLE BY DESIGN</Chip>
      <Copy size={32} weight="600" style={{ textAlign: 'center', lineHeight: 38 }}>Start free. Unlock it once.</Copy>
      <Muted size={13} style={{ textAlign: 'center' }}>10 guest questions. 40 total with a free verified account. A planned 500-question bank with Complete.</Muted>
    </View>
    <Card style={{ backgroundColor: colors.sage, borderColor: colors.sageLine, padding: 20, gap: 16 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><Eyebrow color={colors.success}>GO THE WHOLE WAY</Eyebrow><Chip selected>ONE-TIME</Chip></Row>
      <View style={{ gap: 5 }}><Copy size={24} weight="600">Ontario G1 Complete</Copy><Row style={{ alignItems: 'baseline', gap: 7 }}><Copy size={42} weight="600" style={{ lineHeight: 53 }}>{config.offer.label}</Copy><Muted size={13}>{Platform.OS==='web'?'once + applicable tax':'once'}</Muted></Row><Muted size={13}>Your Ontario pack. One payment, no automatic renewal.</Muted></View>
      {['500 practice questions in the full bank', 'Keep going practice until you choose to finish', 'Optional 5, 10, 20, 40 or 60-question sessions', 'Topic practice and 40-question rehearsals', 'Explanations, saved questions and mistake review', Platform.OS==='web'?'Study in your browser on phone, tablet or desktop':'Offline practice in the installed app', 'Future corrections to the Ontario pack'].map(text => <Row key={text} style={{ alignItems: 'flex-start' }}><Icon name="check" size={17} color={colors.success}/><Copy size={13} style={{ flex: 1 }}>{text}</Copy></Row>)}
      {Platform.OS === 'web' && bankAvailability !== 'complete' ? <Muted size={12}>The full 500-question bank requires completed content review before release. Available account samples can be practised now.</Muted> : null}
      <Button kind="dark" onPress={() => access.full ? router.push('/membership') : checkout()}>{access.full ? 'View my purchase' : 'Unlock Ontario G1 Complete'}</Button>
      <Muted size={11} style={{ textAlign: 'center' }}>{Platform.OS==='web'?'Ontario pack only. CA$14.99 plus applicable tax. Paddle shows your final total before payment. The web app requires an internet connection.':'Ontario pack only. Your store shows the final local price and applicable tax. Offline study requires an internet access check at least every 30 days.'} Valid, non-refunded access has no scheduled expiry.</Muted>
    </Card>
    <Card style={{ padding: 20, gap: 13 }}>
      <View style={{ gap: 5 }}><Eyebrow>{freePlanLabel(access)}</Eyebrow><Row style={{ justifyContent: 'space-between' }}><Copy size={23} weight="600">FirstLane Free</Copy><Copy size={25} weight="600">CA$0</Copy></Row></View>
      <Copy size={24} weight="600">40 questions free</Copy>
      <Muted size={13}>40 fixed sample questions after email verification: 20 road signs and 20 road rules, including the guest 10. Choose 5, 10, 20 or 40 per session. Unlimited repeats use the same sample pool.</Muted>
      {access.kind === 'guest' ? <Button kind="secondary" onPress={() => router.push('/auth/sign-up')}>Create a free account</Button> : <Button kind="secondary" onPress={() => router.replace('/(tabs)')}>Continue practising</Button>}
      {access.kind === 'guest' ? <Muted size={11}>Guest access includes 10 fixed questions, with unlimited repeats. There is no session limit. A free verified account unlocks 40 fixed questions without payment.</Muted> : null}
    </Card>
    <Row style={{ justifyContent: 'center', gap: 7 }}><Icon name="shield" size={15} color={colors.success}/><Muted size={11}>No auto-renewal. No payment details for free access.</Muted></Row>
    <Muted size={11} style={{ textAlign: 'center' }}>Independent study only. This purchase does not include a licence, government application, test booking or pass guarantee.</Muted>
    <Button kind="ghost" icon="refresh" onPress={() => router.push('/membership')}>Restore a purchase</Button>
    <Button kind="ghost" icon={null} onPress={() => router.push('/legal')}>Privacy & purchase terms</Button>
  </Screen>;
}
