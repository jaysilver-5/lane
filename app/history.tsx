import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { summarize } from '../src/domain/engine.mjs';
import { Card, Copy, Empty, Heading, Muted, Row, Screen } from '../src/components/UI';
import { Icon } from '../src/components/Icon';
export default function History() { const router = useRouter(), { state, colors } = useApp(); return <Screen back title="Your sessions"><Heading sub="Small sessions. A growing collection of progress.">Every little drive.</Heading>{!state.sessions.length ? <Empty icon="clock" title="Nothing here, yet." body="Your completed practice sessions will be saved here automatically."/> : [...state.sessions].reverse().map(s => { const result = summarize(s.answers); return <Card key={s.id} onPress={() => router.push({ pathname: '/results', params: { id: s.id } })}><Row><View style={{ backgroundColor: colors.raised, padding: 13, borderRadius: 16 }}><Icon name={s.mode === 'mock' ? 'flag' : 'book'} color={colors.text}/></View><View style={{ flex: 1, gap: 5 }}><Copy size={15} weight="700">{s.title}</Copy><Muted size={11}>{new Date(s.finishedAt ?? s.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {result.total} questions</Muted></View><Copy size={21} weight="700">{result.accuracy}%</Copy></Row></Card>; })}</Screen>; }
