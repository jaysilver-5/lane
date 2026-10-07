import React from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { topics, questions } from '../src/data/bank';
import { useApp } from '../src/state/AppState';
import { Icon } from '../src/components/Icon';
import { Button, Card, Chip, Copy, Empty, Heading, Muted, Note, Row, Screen, SectionHead } from '../src/components/UI';
import { topicAvailability } from '../src/domain/availability.mjs';
import sampleManifest from '../content/sample-manifest.json';
export default function Topic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, begin, access } = useApp();
  const topic = topics.find(t => t.id === id);
  if (!topic) return <Screen back><Empty title="Topic not found" body="Return to the practice library and choose a topic."/></Screen>;
  const info = topicAvailability(topic, questions, access, sampleManifest);
  const source = info.available[0]?.evidence[0]?.source_url;
  return <Screen back title="Explore a topic">
    <View style={{ height: 110, borderRadius: 24, backgroundColor: topic.section === 'road_signs' ? colors.sage : colors.blue, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 60, height: 60, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}><Icon name={topic.icon} size={31} color={colors.success}/></View>
    </View>
    <Heading eyebrow={topic.section === 'road_signs' ? 'ROAD SIGNS' : 'ROAD RULES'} sub={topic.description}>{topic.title}</Heading>
    <Row style={{ flexWrap: 'wrap', gap: 7 }}><Chip icon={info.locked ? 'lock' : 'book'}>{info.label}</Chip><Chip icon="clock">At your pace</Chip></Row>
    {info.locked ? <><Note>This topic has no {access.kind === 'guest' ? 'guest' : 'free'} samples. Ontario G1 Complete includes all {info.totalCount} questions.</Note><Button onPress={() => router.push('/plans')}>Explore Ontario Complete</Button></> :
      info.needsDownload ? <><Note>Your full topic is included. Download the Ontario pack to load all {info.totalCount} questions.</Note><Button icon="download" onPress={() => router.push('/downloads')}>Load my Ontario pack</Button></> :
      <Button onPress={() => { if (begin('topic', topic.title)) router.push('/quiz'); }}>{access.full ? 'Practise this topic' : `Practise ${info.availableCount} ${info.availableCount === 1 ? 'sample' : 'samples'}`}</Button>}
    {info.objectives.length > 0 ? <Card><SectionHead title={access.full ? 'What you’ll explore' : 'In your available samples'}/>
      {info.objectives.slice(0, 12).map((objective, index) => <Row key={objective as string} style={{ alignItems: 'flex-start' }}>
        <View style={{ width: 23, height: 23, borderRadius: 8, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' }}><Copy size={11} weight="600">{index + 1}</Copy></View><Copy size={13} style={{ flex: 1 }}>{objective as string}</Copy>
      </Row>)}{info.objectives.length > 12 ? <Muted>And {info.objectives.length - 12} more concepts.</Muted> : null}
    </Card> : null}
    <Note tone="warning">{topic.section === 'road_signs' ? 'Sign questions currently use text descriptions, not visual-recognition tests.' : 'Use the official guidance alongside your practice.'}</Note>
    <Button kind="secondary" icon="book" onPress={() => source ? Linking.openURL(source) : router.push('/content-status')}>{source ? 'Read the official source' : 'Official references'}</Button>
  </Screen>;
}
