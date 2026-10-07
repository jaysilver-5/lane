import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { questionMap } from '../src/data/bank';
import { useApp } from '../src/state/AppState';
import { Icon } from '../src/components/Icon';
import { Card, Copy, Empty, Heading, Muted, Row, Screen } from '../src/components/UI';
export default function SessionReview() {
    const { id } = useLocalSearchParams<{
        id: string;
    }>(), router = useRouter(), { state, colors, canRead } = useApp();
    const session = state.sessions.find(s => s.id === id);
    return <Screen back title="Session review"><Heading sub="The explanation matters more than the score.">Make every{`\n`}answer count.</Heading>{!session ? <Empty title="Session not found" body="Choose a session from your history."/> : session.answers.map((answer, i) => {
            const q = questionMap.get(answer.questionId);
            if (!q)
                return null;
            if (!canRead(q.id))
                return <Card key={answer.id} onPress={() => router.push('/plans')}><Copy weight="700">Saved Complete question</Copy><Muted>Your score is saved. Unlock Ontario G1 Complete to review this explanation.</Muted></Card>;
            return <Card key={answer.id} onPress={() => router.push({ pathname: '/question', params: { id: q.id, chosen: answer.optionId } })}><Row style={{ alignItems: 'flex-start' }}><Icon name={answer.correct ? 'check' : 'refresh'} color={answer.correct ? colors.success : colors.danger}/><View style={{ flex: 1, gap: 8 }}><Muted size={10}>QUESTION {i + 1} · {answer.correct ? 'CORRECT' : 'REVISIT'}</Muted><Copy size={15} weight="600">{q.prompt}</Copy><Muted size={12}>{q.explanation}</Muted><Copy size={12} weight="700">See the answer →</Copy></View></Row></Card>;
        })}</Screen>;
}
