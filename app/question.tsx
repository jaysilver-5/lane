import React from 'react';
import { Linking, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { questionMap } from '../src/data/bank';
import { useApp } from '../src/state/AppState';
import { Icon } from '../src/components/Icon';
import { Button, Card, Chip, Copy, Empty, Eyebrow, IconButton, Muted, Note, Row, Screen, SectionHead } from '../src/components/UI';
export default function Question() {
    const { id, chosen } = useLocalSearchParams<{
        id: string;
        chosen?: string;
    }>(), router = useRouter(), { colors, state, toggleBookmark, canRead } = useApp();
    const q = questionMap.get(id);
    if (!q)
        return <Screen back><Empty title="Question not found" body="This content may have been removed or revised."/></Screen>;
    if (!canRead(q.id))
        return <Screen back><Empty icon="lock" title="An Ontario Complete question" body="Your history is saved. Unlock Ontario G1 Complete to revisit this explanation." action="See plans" onPress={() => router.push('/plans')}/></Screen>;
    return <Screen back title="Understand the answer" right={<IconButton name="bookmark" label="Toggle saved question" selected={state.bookmarks.includes(q.id)} onPress={() => toggleBookmark(q.id)}/>}><Chip>{q.topic}</Chip><Copy size={27} weight="600">{q.prompt}</Copy><View style={{ gap: 10 }}>{q.options.map(o => <Card key={o.id} style={{ padding: 16, backgroundColor: o.id === q.correct_option_id ? colors.successBg : colors.surface }}><Row><Icon name={o.id === q.correct_option_id ? 'check' : o.id === chosen ? 'close' : 'road'} color={o.id === q.correct_option_id ? colors.success : colors.muted} size={17}/><Copy size={14} style={{ flex: 1 }}>{o.text}</Copy></Row></Card>)}</View><View style={{ gap: 12 }}><SectionHead title="The reason behind it"/><Copy size={15}>{q.explanation}</Copy></View><Card><Eyebrow>FOLLOW THE SOURCE</Eyebrow><Muted size={12}>{q.evidence[0]!.locator}</Muted><Button kind="secondary" icon="share" onPress={() => Linking.openURL(q.evidence[0]!.source_url)}>Open official reference</Button></Card><Muted size={11}>{q.code} · Revision {q.revision}</Muted><Button kind="ghost" icon="flag" onPress={() => router.push({ pathname: '/report', params: { questionId: q.id } })}>Report an issue</Button></Screen>;
}
