import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { summarize } from '../src/domain/engine.mjs';
import { Art } from '../src/components/Art';
import { Button, Card, Copy, Empty, Eyebrow, Heading, Muted, Note, ProgressBar, Row, Screen, SectionHead } from '../src/components/UI';
export default function Results() {
    const router = useRouter(), { id } = useLocalSearchParams<{
        id: string;
    }>(), { state, colors } = useApp();
    const session = id ? state.sessions.find(s => s.id === id) : state.sessions[state.sessions.length - 1];
    if (!session)
        return <Screen back><Empty title="Your first result starts here" body="Complete a practice session to see your results." action="Back to Home" onPress={() => router.replace('/(tabs)')}/></Screen>;
    const result = summarize(session.answers);
    const pct = result.accuracy;
    const circumference = 2 * Math.PI * 55;
    return <Screen><View style={{ alignItems: 'center', gap: 5, paddingTop: 8 }}><Eyebrow>ONE MORE STEP FORWARD</Eyebrow><Copy size={29} weight="700" style={{ textAlign: 'center' }}>One more step forward.</Copy><Muted>{session.title}</Muted></View><View style={{ height: 172, alignItems: 'center', justifyContent: 'center', marginVertical: 3 }}><Svg width={144} height={144} viewBox="0 0 144 144"><Circle cx={72} cy={72} r={55} fill="none" stroke={colors.line} strokeWidth={11}/><Circle cx={72} cy={72} r={55} fill="none" stroke={colors.success} strokeWidth={11} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - pct / 100)} strokeLinecap="round" transform="rotate(-90 72 72)"/></Svg><View style={{ position: 'absolute', alignItems: 'center' }}><Copy size={36} weight="600">{pct}%</Copy><Muted size={11}>accuracy</Muted></View></View><Row>{[{ value: String(result.correct), label: 'correct answers' }, { value: String(result.total - result.correct), label: 'to learn from' }, { value: String(result.total), label: 'questions explored' }].map(x => <View key={x.label} style={{ flex: 1, alignItems: 'center', gap: 3 }}><Copy size={23} weight="700">{x.value}</Copy><Muted size={10} style={{ textAlign: 'center' }}>{x.label}</Muted></View>)}</Row><Card><Copy size={19} weight="700">{pct >= 80 ? 'Keep that momentum.' : 'This is how learning happens.'}</Copy><Muted>{pct >= 80 ? 'A good session is a step forward. Keep mixing topics to build a broader understanding.' : 'Each mistake points to something you can understand better. Review the explanations, then try those concepts again.'}</Muted>{result.sections.filter((s: {
            total: number;
        }) => s.total > 0).map((s: {
            section: string;
            correct: number;
            total: number;
        }) => <View key={s.section} style={{ gap: 8 }}><Row style={{ justifyContent: 'space-between' }}><Copy size={13}>{s.section === 'road_signs' ? 'Road signs' : 'Road rules'}</Copy><Copy size={13} weight="600">{s.correct}/{s.total}</Copy></Row><ProgressBar value={s.correct / s.total * 100}/></View>)}</Card><Button onPress={() => router.push({ pathname: '/session-review', params: { id: session.id } })}>Review this session</Button><Button kind="secondary" icon={null} onPress={() => router.replace('/(tabs)')}>Back to Home</Button><Note>This measures this practice session only, not your chance of passing the official test.</Note></Screen>;
}
