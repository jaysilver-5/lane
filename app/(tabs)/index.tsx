import React, { useState } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, useStats } from '../../src/state/AppState';
import { Icon } from '../../src/components/Icon';
import { RoadSketch } from '../../src/components/RoadSketch';
import { QuestionBankNotice } from '../../src/components/QuestionBankNotice';
import { Button, Card, Copy, Eyebrow, IconButton, Logo, Muted, ProgressBar, Row, Screen, SectionHead } from '../../src/components/UI';
import { latestMistakes } from '../../src/domain/engine.mjs';

export default function Home() {
  const router = useRouter();
  const { state, colors, begin, access, setAccessGate, changeQuickLength } = useApp();
  const stats = useStats();
  const { width, fontScale } = useWindowDimensions();
  const small = width < 370;
  const mistakes = latestMistakes(state.sessions);
  const [nextCount, setQuestionCount] = useState<number|'continuous'>('continuous');
  const active = state.active;
  const questionCount = active?.mode === 'quick' ? active.continuous ? 'continuous' : active.questionIds.length : nextCount;
  const start = () => { if (begin('quick', undefined, active ? undefined : questionCount)) router.push('/quiz'); };
  const chooseCount = (count: number|'continuous') => {
    if(count==='continuous'&&!access.full){setAccessGate('Keep going is included with Ontario G1 Complete. Choose a fixed question count to practise free.');return;}
    if (typeof count==='number' && access.kind === 'guest' && count > 10 && count <= 40) { router.push('/auth/sign-up'); return; }
    if (typeof count==='number' && !access.full && count > 40) { setAccessGate('60-question sessions are included with Ontario G1 Complete. Free accounts include up to 40 questions per session.'); return; }
    if (!active || changeQuickLength(count)) setQuestionCount(count);
  };
  return <Screen tabs>
    <Row style={{ justifyContent: 'space-between', paddingTop: 5, paddingBottom: 2 }}>
      <Logo size={30}/>
      <Row style={{ gap: 7 }}><IconButton name="sun" label="Appearance" onPress={() => router.push('/appearance')}/><IconButton name="user" label="Your account" onPress={() => router.push('/(tabs)/profile')}/></Row>
    </Row>
    <View style={{ gap: 3, paddingBottom: 2 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <Copy size={small ? 26 : 29} weight="600" style={{ lineHeight: 36, letterSpacing: -1 }}>Get <Text style={{ fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', fontStyle: 'italic', fontWeight: '400' }}>road ready.</Text></Copy>
        <Pressable accessibilityRole="button" accessibilityLabel="Select test location" onPress={() => router.push('/jurisdiction')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Row style={{ gap: 4 }}><Icon name="map" size={12} color={colors.success}/><Copy size={11} weight="600">Ontario G1</Copy><Icon name="down" size={11} color={colors.muted}/></Row>
        </Pressable>
      </Row>
      {state.preferences.name ? <Muted size={12}>Good to see you, {state.preferences.name}.</Muted> : null}
    </View>
    <Card style={{ backgroundColor: colors.sage, borderColor: colors.sageLine, padding: 16, gap: 10, overflow: 'hidden' }}>
      <Row style={{ alignItems: 'center', gap: 3 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Row style={{ gap: 6 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }}/><Eyebrow color={colors.success}>{active ? 'READY TO CONTINUE' : 'YOUR PRACTICE'}</Eyebrow></Row>
          <Copy size={small ? 21 : 24} weight="600" style={{ lineHeight: 29 }}>{active ? 'Keep your momentum.' : 'Find your rhythm.'}</Copy>
          <Muted size={12}>{active ? active.continuous ? `${active.answers.length} answered · Keep going` : `${active.answers.length} of ${active.questionIds.length} answered · ${active.title}` : questionCount==='continuous' ? 'No question limit · Finish anytime' : `${questionCount} questions this session · At your pace`}</Muted>
        </View>
        {fontScale < 1.4 ? <View style={{ pointerEvents: 'none', marginRight: -5 }}><RoadSketch width={small ? 78 : 96} height={100}/></View> : null}
      </Row>
      {!active || active.mode === 'quick' ? <View style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between', gap: 5 }}><Copy size={11} weight="600">Session length</Copy><Pressable accessibilityRole="button" accessibilityLabel={access.full?'Keep going':'Keep going, Complete required'} accessibilityState={{ selected: questionCount==='continuous' }} onPress={() => chooseCount('continuous')} style={{ minHeight:44, paddingHorizontal:12, borderRadius:22, alignItems:'center', justifyContent:'center', backgroundColor:questionCount==='continuous'?colors.accent:colors.surface }}><Row style={{gap:5}}>{!access.full?<Icon name="lock" size={12} color={questionCount==='continuous'?colors.accentText:colors.muted}/>:null}<Copy size={12} weight="600" color={questionCount==='continuous'?colors.accentText:colors.text}>∞ Keep going</Copy></Row></Pressable></Row>
        <Row style={{ gap: 5 }}>{[5, 10, 20, 40, 60].map(count => {
          const selected = questionCount === count;
          const locked = count > (access.kind === 'guest' ? 10 : access.full ? 60 : 40);
          return <Pressable key={count} accessibilityRole="button" accessibilityLabel={`${count} questions${locked ? count <= 40 ? ', free account required' : ', Complete required' : ''}`} accessibilityState={{ selected }} onPress={() => chooseCount(count)} style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: selected ? colors.accent : colors.surface, borderWidth: 1, borderColor: selected ? 'transparent' : colors.line, opacity: pressed ? .75 : 1 })}>
            <Row style={{ gap: 3 }}>{locked ? <Icon name="lock" size={11} color={colors.muted}/> : null}<Copy size={12} weight="600" color={selected ? colors.accentText : colors.text}>{count}</Copy></Row>
          </Pressable>;
        })}</Row>
        <Muted size={11}>{questionCount==='continuous'?access.full?'Cycles through your available questions. Finish anytime.':'Complete feature. Choose a fixed count to practise free.':'Choose your pace. Finish whenever you like.'}</Muted>
      </View> : null}
      <Button kind="dark" onPress={start}>{questionCount==='continuous'&&!access.full?'Unlock Keep going':active ? 'Continue practice' : questionCount==='continuous' ? 'Start practising' : `Start ${questionCount}-question session`}</Button>
    </Card>
    <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
      <Row style={{ gap: 5 }}><Icon name="check" size={13} color={colors.success}/><Copy size={12} weight="600">40 questions free</Copy><Muted size={11}>{access.kind === 'guest' ? 'with an account' : '· unlimited repeats'}</Muted></Row>
      <Pressable accessibilityRole="button" onPress={() => router.push(access.kind === 'guest' ? '/auth/sign-up' : '/plans')} style={{ minHeight: 44, justifyContent: 'center' }}><Copy size={12} weight="600" color={colors.success}>{access.kind === 'guest' ? 'Join free →' : 'Plans & access →'}</Copy></Pressable>
    </Row>
    <QuestionBankNotice/>
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
    <Pressable onPress={() => router.push('/content-status')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
      <Muted size={10} style={{ textAlign: 'center' }}>Independent practice. Your pace, your progress. ↗</Muted>
    </Pressable>
  </Screen>;
}
