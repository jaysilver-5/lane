import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { Art } from '../src/components/Art';
import { Button, Chip, Copy, Eyebrow, Field, Heading, Logo, Muted, Note, Row, Screen } from '../src/components/UI';

export default function Onboarding() {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const { colors, state, patchPreferences, finishOnboarding } = useApp();
    const [step, setStep] = useState(0);
    const pager = useRef<ScrollView>(null);
    const compact = height < 750;
    const veryShort = height < 620;
    const pageWidth = Math.min(width, 560) - 40;
    useEffect(() => { pager.current?.scrollTo({ x: step * pageWidth, animated: false }); }, [pageWidth]);

    function goTo(next: number) {
        if (next < 0 || next > 2) return;
        setStep(next);
        pager.current?.scrollTo({ x: next * pageWidth, animated: Math.abs(next - step) === 1 });
    }

    function continueFlow() {
        if (step < 2) goTo(step + 1);
        else { finishOnboarding(); router.replace('/auth/sign-up'); }
    }

    const pages = [
        <View key="welcome" style={{ gap: veryShort ? 8 : compact ? 10 : 16, justifyContent: 'center' }}>
            <Art height={veryShort ? 124 : compact ? 160 : Math.min(240, height * .26)} />
            <Eyebrow>GET ROAD READY.</Eyebrow>
            <Copy size={veryShort ? 31 : compact ? 34 : 40} weight="700" style={{ lineHeight: veryShort ? 35 : compact ? 38 : 44, letterSpacing: -1.8 }}>The road ahead{`\n`}looks good on you.</Copy>
            <Muted size={compact ? 14 : 16}>Get comfortable with the rules, understand your mistakes, and make progress at your own pace.</Muted>
            {veryShort ? null : <Row style={{ flexWrap: 'wrap', gap: 7 }}><Chip icon="clock">Short sessions</Chip><Chip icon="book">Clear explanations</Chip></Row>}
        </View>,
        <View key="location" style={{ gap: compact ? 12 : 18, justifyContent: 'center' }}>
            <Art name="road" height={veryShort ? 78 : compact ? 105 : 145} />
            <Heading eyebrow="01 / YOUR DESTINATION" sub="Choose where you will take your test.">One app.{`\n`}Your local rules.</Heading>
            <View style={{ padding: compact ? 16 : 20, borderRadius: 22, borderWidth: 2, borderColor: colors.success, backgroundColor: colors.surface, gap: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}><Copy size={22} weight="700">Ontario G1</Copy><Chip selected>Selected</Chip></Row>
                <Muted>Canada · Car learner knowledge test</Muted>
            </View>
            <Note tone="warning">FirstLane is independent practice, not an official exam bank or a guarantee of passing.</Note>
        </View>,
        <View key="goal" style={{ gap: compact ? 12 : 18, justifyContent: 'center' }}>
            <Heading eyebrow="02 / MAKE IT YOURS" sub="Small, repeatable sessions make progress easier.">A pace that{`\n`}fits your life.</Heading>
            <Field label="What should we call you? (optional)" placeholder="Your first name" value={state.preferences.name} onChangeText={name => patchPreferences({ name })} maxLength={40} />
            <Copy size={15} weight="700">Your daily practice goal</Copy>
            <Row style={{ gap: 8 }}>{[5, 10, 20].map(n => <Pressable key={n} accessibilityRole="radio" accessibilityState={{ checked: state.preferences.goal === n }} onPress={() => patchPreferences({ goal: n })} style={{ flex: 1, minHeight: 72, padding: 12, borderRadius: 18, backgroundColor: state.preferences.goal === n ? colors.accent : colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', alignItems: 'center' }}><Copy size={20} weight="700" color={state.preferences.goal === n ? colors.accentText : colors.text}>{n}</Copy><Copy size={11} color={state.preferences.goal === n ? colors.accentText : colors.muted}>questions</Copy></Pressable>)}</Row>
            <Muted size={12}>You can change this anytime. No payment is needed to explore FirstLane.</Muted>
        </View>,
    ];

    return <Screen scroll={false} footer={<View style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'center', gap: 8 }}>{pages.map((_, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Go to onboarding step ${index + 1}`} accessibilityState={{ selected: step === index }} onPress={() => goTo(index)} hitSlop={12} style={{ height: 6, width: step === index ? 28 : 8, borderRadius: 5, backgroundColor: step === index ? colors.text : colors.line }}/>)}</Row>
        <Button onPress={continueFlow}>{step === 2 ? 'Create my free account' : 'Continue'}</Button>
        <Row style={{ justifyContent: 'center', gap: 22 }}>
            {step > 0 ? <Pressable accessibilityRole="button" onPress={() => goTo(step - 1)}><Copy size={13} weight="600">Back</Copy></Pressable> : <Pressable accessibilityRole="button" onPress={() => { finishOnboarding(); router.replace('/(tabs)'); }}><Copy size={13} weight="600">Try as guest</Copy></Pressable>}
            <Pressable accessibilityRole="button" onPress={() => router.push('/auth/sign-in')}><Copy size={13} weight="600">Sign in</Copy></Pressable>
        </Row>
    </View>}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><Logo /><Chip icon="map">ONTARIO G1</Chip></Row>
        <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} onScroll={event => setStep(Math.max(0, Math.min(2, Math.round(event.nativeEvent.contentOffset.x / pageWidth))))}>
            {pages.map(page => <ScrollView key={page.key} style={{ width: pageWidth }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 8 }}>{page}</ScrollView>)}
        </ScrollView>
    </Screen>;
}
