import React from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, useStats } from '../../src/state/AppState';
import { Icon } from '../../src/components/Icon';
import { RoadSketch } from '../../src/components/RoadSketch';
import { AccessBanner } from '../../src/components/AccessBanner';
import { Button, Card, Copy, Eyebrow, IconButton, Logo, Muted, ProgressBar, Row, Screen, SectionHead } from '../../src/components/UI';
import { latestMistakes } from '../../src/domain/engine.mjs';

export default function Home() {
  const router = useRouter();
  const { state, colors, begin, access } = useApp();
  const stats = useStats();
  const { width, fontScale } = useWindowDimensions();
  const small = width < 370;
  const mistakes = latestMistakes(state.sessions);
  const questionCount = access.kind === 'guest' ? 10 : state.preferences.goal;
  const active = state.active;
  const start = () => { if (begin('quick')) router.push('/quiz'); };
  return <Screen tabs>
    <Row style={{ justifyContent: 'space-between', paddingTop: 5, paddingBottom: 2 }}>
      <Logo size={30}/>
      <Row style={{ gap: 7 }}><IconButton name="sun" label="Appearance" onPress={() => router.push('/appearance')}/><IconButton name="user" label="Your account" onPress={() => router.push('/(tabs)/profile')}/></Row>
    </Row>
    <View style={{ gap: 7, paddingTop: 6, paddingBottom: 2 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <Muted size={12}>{state.preferences.name ? `Good to see you, ${state.preferences.name}.` : 'YOUR NEXT CHAPTER STARTS HERE'}</Muted>
        <Pressable accessibilityRole="button" accessibilityLabel="Select test location" onPress={() => router.push('/jurisdiction')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Row style={{ gap: 4 }}><Icon name="map" size={12} color={colors.success}/><Copy size={11} weight="600">Ontario G1</Copy><Icon name="down" size={11} color={colors.muted}/></Row>
        </Pressable>
      </Row>
      <Copy size={small ? 33 : 38} weight="600" style={{ lineHeight: small ? 40 : 46, letterSpacing: -1.5 }}>Get <Text style={{ fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', fontStyle: 'italic', fontWeight: '400' }}>road ready.</Text></Copy>
      <Muted size={13}>A little practice. A little more confidence.</Muted>
    </View>
    <Card style={{ backgroundColor: colors.sage, borderColor: colors.sageLine, padding: 18, gap: 14, overflow: 'hidden' }}>
      <Row style={{ alignItems: 'center', gap: 3 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Row style={{ gap: 6 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }}/><Eyebrow color={colors.success}>{active ? 'RIGHT WHERE YOU LEFT OFF' : 'YOUR DAILY DRIVE'}</Eyebrow></Row>
          <Copy size={small ? 21 : 24} weight="600" style={{ lineHeight: 29 }}>{active ? 'Keep your momentum.' : 'Small steps.\nOpen roads.'}</Copy>
          <Muted size={12}>{active ? `${active.answers.length} of ${active.questionIds.length} answered · ${active.title}` : `${questionCount} questions · At your pace`}</Muted>
        </View>
        {fontScale < 1.4 ? <View style={{ pointerEvents: 'none', marginRight: -5 }}><RoadSketch width={small ? 88 : 108} height={128}/></View> : null}
      </Row>
      <Button kind="dark" onPress={start}>{active ? 'Continue practice' : 'Start a quick session'}</Button>
    </Card>
    <Card style={{ padding: 14 }}>
      <Row style={{ gap: 0, alignItems: 'stretch' }}>
        {[{ icon: 'bolt', value: String(stats.streak), label: 'Day streak' }, { icon: 'target', value: `${Math.min(stats.today, state.preferences.goal)}/${state.preferences.goal}`, label: 'Daily goal' }, { icon: 'check', value: stats.total ? `${stats.accuracy}%` : '—', label: 'Accuracy' }].map((item, i) =>
          <View key={item.label} style={{ flex: 1, alignItems: 'center', gap: 4, borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.line, paddingHorizontal: 4 }}>
            <Row style={{ gap: 5 }}><Icon name={item.icon} size={13} color={colors.success}/><Copy size={21} weight="600">{item.value}</Copy></Row>
            <Muted size={11}>{item.label}</Muted>
          </View>)}
      </Row>
    </Card>
    <View style={{ gap: 11, marginTop: 5 }}>
      <SectionHead title="Make it your journey" action="All topics" onPress={() => router.push('/(tabs)/study')}/>
      <Card onPress={() => router.push('/(tabs)/study')} label="Explore road signs and rules" style={{ padding: 15 }}>
        <Row><View style={{ width: 44, height: 48, borderRadius: 14, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' }}><Icon name="book" size={23} color={colors.success}/></View>
          <View style={{ flex: 1, gap: 3 }}><Copy size={15} weight="600">Know the road. Own the moment.</Copy><Muted size={12}>Road signs, rules and little lightbulb moments.</Muted></View><Icon name="chevron" size={16} color={colors.muted}/>
        </Row>
        {stats.concepts > 0 ? <><ProgressBar value={stats.concepts / 250 * 100} height={4}/><Muted size={11}>{stats.concepts} of 250 concepts explored across the full pack</Muted></> : null}
      </Card>
      <Row style={{ alignItems: 'stretch', gap: 10 }}>
        {[{ path: '/review', icon: 'refresh', title: 'Make it stick', body: mistakes.length ? `${mistakes.length} concepts to revisit` : 'Turn mistakes into progress.', bg: colors.peach, action: 'Review mistakes' },
          { path: '/exam', icon: 'flag', title: 'A practice run', body: 'Build confidence with a rehearsal.', bg: colors.lavender, action: 'Try a rehearsal' }].map(item =>
          <Pressable key={item.path} accessibilityRole="button" accessibilityLabel={item.action} onPress={() => router.push(item.path as '/review' | '/exam')}
            style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 15, borderRadius: 21, backgroundColor: item.bg, opacity: pressed ? .75 : 1, gap: 8 })}>
            <Row style={{ justifyContent: 'space-between' }}><Icon name={item.icon} size={20} color={colors.text}/><Icon name="arrow" size={15} color={colors.muted}/></Row>
            <Copy size={15} weight="600">{item.title}</Copy><Muted size={12}>{item.body}</Muted>
          </Pressable>)}
      </Row>
    </View>
    <AccessBanner compact/>
    <Pressable onPress={() => router.push('/content-status')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
      <Muted size={10} style={{ textAlign: 'center' }}>Independent practice. Your pace, your progress. ↗</Muted>
    </Pressable>
  </Screen>;
}
