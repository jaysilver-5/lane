import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, useStats } from '../../src/state/AppState';
import { topics } from '../../src/data/bank';
import { Button, Card, Copy, Empty, Eyebrow, Heading, Muted, ProgressBar, Row, Screen, SectionHead } from '../../src/components/UI';
import { Icon } from '../../src/components/Icon';
export default function Progress() {
  const router = useRouter();
  const { state, colors, begin } = useApp();
  const stats = useStats();
  const all = state.sessions.flatMap(s => s.answers);
  const maxDay = Math.max(state.preferences.goal, ...stats.week.map((d: {count: number}) => d.count));
  return <Screen tabs>
    <View style={{ paddingTop: 10 }}><Heading eyebrow="LOOK AT YOU GO" sub="The little things add up. Here’s your journey so far.">Progress, at your pace.</Heading></View>
    <Card style={{ backgroundColor: colors.sage, borderColor: colors.sageLine, padding: 20, gap: 15 }}>
      <Row style={{ justifyContent: 'space-between' }}><View style={{ gap: 3 }}><Eyebrow color={colors.success}>CONCEPTS EXPLORED</Eyebrow><Row style={{ alignItems: 'baseline', gap: 5 }}><Copy size={44} weight="600" style={{ lineHeight: 54 }}>{stats.concepts}</Copy><Muted size={14}>of 250</Muted></Row></View>
        <View style={{ width: 54, height: 54, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="spark" size={26} color={colors.success}/></View>
      </Row><ProgressBar value={stats.concepts / 250 * 100} height={6}/><Muted size={12}>Across the full Ontario pack. Every little lightbulb moment counts.</Muted>
    </Card>
    <Card style={{ padding: 16 }}><Row style={{ alignItems: 'stretch', gap: 8 }}>{[
      { value: stats.total ? `${stats.accuracy}%` : '—', label: 'Accuracy' },
      { value: String(state.sessions.length), label: 'Sessions' },
      { value: String(stats.streak), label: 'Day streak' },
    ].map((item, i) => <View key={item.label} style={{ flex: 1, alignItems: 'center', gap: 3, borderLeftWidth: i ? 1 : 0, borderColor: colors.line }}><Copy size={24} weight="600">{item.value}</Copy><Muted size={11}>{item.label}</Muted></View>)}</Row></Card>
    <Card><SectionHead title="A week in practice"/>
      <View style={{ height: 108, flexDirection: 'row', gap: 10, alignItems: 'flex-end', paddingTop: 12 }}>
        {stats.week.map((day: { key: string; label: string; count: number }) => <View key={day.key} accessible accessibilityLabel={`${day.label}: ${day.count} questions answered`} style={{ flex: 1, alignItems: 'center', gap: 7 }}>
          <Copy size={10} color={colors.muted}>{day.count || '·'}</Copy>
          <View style={{ height: Math.max(5, day.count / maxDay * 55), width: '75%', borderRadius: 7, backgroundColor: day.count ? colors.success : colors.raised }}/><Muted size={10}>{day.label}</Muted>
        </View>)}
      </View><Muted size={11}>{stats.today} answered today · {state.preferences.goal}-question daily goal</Muted>
    </Card>
    {all.length ? <View style={{ gap: 12 }}><SectionHead title="Your topic picture"/>{topics.filter(t => all.some(a => a.topic === t.title)).map(t => {
      const answers = all.filter(a => a.topic === t.title), pct = Math.round(answers.filter(a => a.correct).length / answers.length * 100);
      return <Card key={t.id} onPress={() => router.push({ pathname: '/topic', params: { id: t.id } })}>
        <Row style={{ justifyContent: 'space-between' }}><Copy size={14} weight="600" style={{ flex: 1 }}>{t.title}</Copy><Copy size={13} weight="600">{pct}%</Copy></Row><ProgressBar value={pct}/><Muted size={11}>{answers.length} answers · practice accuracy</Muted>
      </Card>;
    })}</View> : <Empty icon="chart" title="Your first small win is waiting." body="Finish a session to see your topic-by-topic progress here." action="Start a short session" onPress={() => { if (begin('quick')) router.push('/quiz'); }}/>} 
    <Button kind="secondary" icon="clock" onPress={() => router.push('/history')}>View session history</Button>
    <Muted size={11} style={{ textAlign: 'center' }}>Practice progress, not a prediction of your exam result.</Muted>
  </Screen>;
}
