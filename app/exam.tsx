import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { Art } from '../src/components/Art';
import { Icon } from '../src/components/Icon';
import { Button, Card, Copy, Heading, Muted, Note, Row, Screen } from '../src/components/UI';

export default function Exam() {
    const router = useRouter();
    const { colors, begin } = useApp();
    function start() { if (begin('mock')) router.push('/quiz'); }
    return <Screen back title="Practice rehearsal" footer={<Button onPress={start}>Start the rehearsal</Button>}>
        <View style={{ backgroundColor: colors.sage, borderRadius: 24, overflow: 'hidden' }}><Art name="road" height={115}/></View>
        <Heading eyebrow="A LITTLE CLOSER TO THE REAL THING" sub="Step out of topic practice and see what you remember across a longer session.">Your quiet{`\n`}dress rehearsal.</Heading>
        <Card>{[
            { icon: 'book', title: '40 questions', body: '20 road-sign and 20 road-rule questions.' },
            { icon: 'clock', title: 'No countdown', body: 'Take the time you need to think.' },
            { icon: 'eye', title: 'Feedback at the finish', body: 'Review every answer and explanation.' },
        ].map(x => <Row key={x.title} style={{ alignItems: 'flex-start' }}><Icon name={x.icon} color={colors.success}/><View style={{ flex: 1, gap: 3 }}><Copy size={14} weight="700">{x.title}</Copy><Muted size={12}>{x.body}</Muted></View></Row>)}</Card>
        <Note tone="warning">This is a FirstLane practice rehearsal, not the official G1 test. Your result is for learning and does not predict an official pass.</Note>
        <Muted size={11} style={{ textAlign: 'center' }}>Made for learning, not for pressure.</Muted>
    </Screen>;
}
