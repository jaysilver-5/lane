import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { topics, questions } from '../../src/data/bank';
import { useApp } from '../../src/state/AppState';
import { Icon } from '../../src/components/Icon';
import { AccessBanner } from '../../src/components/AccessBanner';
import { Card, Chip, Copy, Empty, Field, Heading, IconButton, Muted, ProgressBar, Row, Screen } from '../../src/components/UI';
import { topicAvailability } from '../../src/domain/availability.mjs';
import sampleManifest from '../../content/sample-manifest.json';
export default function Study() {
  const router = useRouter();
  const { state, colors, access, setAccessGate } = useApp();
  const [filter, setFilter] = useState('All topics');
  const [query, setQuery] = useState('');
  const seen = useMemo(() => new Set(state.sessions.flatMap(s => s.answers.map(a => a.questionId))), [state.sessions]);
  const filtered = topics.filter(t => (filter === 'All topics' || t.section === (filter === 'Road signs' ? 'road_signs' : 'road_rules')) && t.title.toLowerCase().includes(query.trim().toLowerCase()));
  const items = filtered.map(topic => ({ topic, info: topicAvailability(topic, questions, access, sampleManifest) }));
  return <Screen tabs>
    <Row style={{ justifyContent: 'space-between', paddingTop: 10 }}><View style={{ flex: 1 }}><Heading eyebrow="YOUR PRACTICE SPACE" sub="Find your rhythm, one topic at a time.">A clearer road ahead.</Heading></View><IconButton name="bookmark" label="Saved questions" onPress={() => router.push('/saved')}/></Row>
    <AccessBanner compact/>
    <Field label="Find a topic" placeholder="Signs, parking, right-of-way…" value={query} onChangeText={setQuery}/>
    <Row style={{ gap: 6, flexWrap: 'wrap' }}>{['All topics', 'Road signs', 'Road rules'].map(f => <Chip key={f} selected={filter === f} onPress={() => setFilter(f)}>{f}</Chip>)}</Row>
    <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 5 }}><Copy size={15} weight="600">{filtered.length} topics to explore</Copy><Muted size={11}>{access.full ? 'Your complete library' : `${items.filter(x => !x.info.locked).length} with your samples`}</Muted></Row>
    <View style={{ gap: 10 }}>
      {items.map(({ topic: t, info }) => {
        const done = info.available.filter((q: {id: string}) => seen.has(q.id)).length;
        return <Card key={t.id} label={`${t.title}. ${info.label}${info.locked ? '. Ontario Complete required.' : ''}`} style={{ padding: 14, gap: 9 }}
          onPress={() => info.locked ? setAccessGate(`${t.title} has no ${access.kind === 'guest' ? 'guest' : 'free'} samples. Its ${info.totalCount} questions are included in Ontario G1 Complete.`) : router.push({ pathname: '/topic', params: { id: t.id } })}>
          <Row style={{ gap: 12 }}><View style={{ width: 43, height: 48, borderRadius: 14, backgroundColor: t.section === 'road_signs' ? colors.sage : colors.blue, justifyContent: 'center', alignItems: 'center' }}><Icon name={t.icon} size={22} color={colors.success}/></View>
            <View style={{ flex: 1, gap: 4 }}><Copy size={14} weight="600">{t.title}</Copy><Muted size={11}>{info.label}</Muted></View>
            <Icon name={info.locked ? 'lock' : 'chevron'} size={16} color={colors.muted}/>
          </Row>
          {done > 0 ? <ProgressBar value={done / Math.max(1, info.availableCount) * 100} height={4}/> : null}
        </Card>;
      })}
      {!filtered.length ? <Empty icon="search" title="Let’s try another route." body="Search a broader word, like signs, turning or weather."/> : null}
    </View>
  </Screen>;
}
