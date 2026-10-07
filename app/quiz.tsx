import React, { useMemo, useState } from 'react';
import { View, Pressable, Linking, BackHandler } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { questionMap } from '../src/data/bank';
import { shuffle } from '../src/domain/engine.mjs';
import { Icon } from '../src/components/Icon';
import { Button, Card, Chip, Copy, Empty, Eyebrow, IconButton, Muted, Note, ProgressBar, Row, Screen, Sheet } from '../src/components/UI';
export default function Quiz() {
    const router = useRouter(), { state, colors, answer, advance, toggleBookmark, notify, canRead, access, parkPremiumSession } = useApp();
    const [picked, setPicked] = useState<string | null>(null), [leaving, setLeaving] = useState(false);
    const session = state.active, q = session ? questionMap.get(session.questionIds[session.index]!) : undefined;
    useFocusEffect(React.useCallback(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { setLeaving(true); return true; }); return () => sub.remove(); }, []));
    const options = useMemo(() => {
        if (!q || !session)
            return [];
        let seed = [...session.id + q.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
        return shuffle(q.options, () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; });
    }, [q?.id, session?.id]);
    if (!session || !q)
        return <Screen back><Empty title="Your next session is waiting" body="Choose a topic or start a short mixed practice session." action="Back to Home" onPress={() => router.replace('/(tabs)')}/></Screen>;
    if (!canRead(q.id) || (session.mode === 'mock' && !access.full))
        return <Screen back><Empty icon="lock" title="Your Complete session is saved" body="This session contains premium questions. Restore access or return to your free samples." action="See plans & access" onPress={() => router.push('/plans')}/><Button kind="secondary" onPress={() => { parkPremiumSession(); router.replace('/(tabs)'); }}>Save session & use free practice</Button></Screen>;
    const submitted = session.answers[session.index], isExam = session.mode === 'mock', correct = submitted?.correct, selected = submitted?.optionId ?? picked;
    const saved = state.bookmarks.includes(q.id);
    function next() {
        if (!submitted) {
            if (picked)
                answer(picked);
            return;
        }
        const done = advance();
        setPicked(null);
        if (done)
            router.replace('/results');
    }
    return <Screen scroll footer={<Button onPress={next} disabled={!selected}>{submitted ? (session.index === session.questionIds.length - 1 ? 'See my results' : 'Next question') : isExam ? 'Save answer' : 'Check my answer'}</Button>}><Row style={{ justifyContent: 'space-between' }}><IconButton name="close" label="Pause practice" onPress={() => setLeaving(true)}/><View style={{ alignItems: 'center', gap: 3 }}><Eyebrow>{isExam ? 'REHEARSAL' : 'PRACTICE'}</Eyebrow><Copy size={13} weight="600">{session.index + 1} of {session.questionIds.length}</Copy></View><IconButton name="bookmark" label={saved ? 'Unsave question' : 'Save question'} selected={saved} onPress={() => { toggleBookmark(q.id); notify(saved ? 'Removed from saved questions.' : 'Question saved for later.'); }}/></Row><ProgressBar value={(session.index + (submitted ? 1 : 0)) / session.questionIds.length * 100} color={colors.success}/><View style={{ gap: 10 }}><Row style={{ justifyContent: 'space-between' }}><Chip icon={q.section === 'road_signs' ? 'sign' : 'road'}>{q.section === 'road_signs' ? 'Road signs' : 'Road rules'}</Chip><Muted size={10}>{q.code}</Muted></Row><Copy size={23} weight="600" style={{ lineHeight: 30 }}>{q.prompt}</Copy><Muted size={12}>Choose the one best answer.</Muted></View>
 <View style={{ gap: 8 }}>{options.map((option: {
            id: string;
            text: string;
        }, i: number) => {
            const chosen = option.id === selected;
            const show = !isExam && !!submitted;
            const isCorrect = show && option.id === q.correct_option_id;
            const isWrong = show && chosen && !correct;
            const background = isCorrect ? colors.successBg : isWrong ? colors.dangerBg : chosen ? colors.raised : colors.surface;
            const border = isCorrect ? colors.success : isWrong ? colors.danger : chosen ? colors.text : colors.line;
            return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: chosen, disabled: !!submitted }} disabled={!!submitted} onPress={() => setPicked(option.id)} style={({ pressed }) => ({ borderWidth: chosen || isCorrect ? 1.6 : 1, borderColor: border, backgroundColor: background, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, minHeight: 54, justifyContent: 'center', opacity: pressed ? .85 : 1 })}><Row style={{ alignItems: 'center' }}><View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: isCorrect ? colors.success : isWrong ? colors.danger : chosen ? colors.text : colors.raised, alignItems: 'center', justifyContent: 'center' }}>{isCorrect || isWrong ? <Icon name={isCorrect ? 'check' : 'close'} size={16} color={colors.surface}/> : <Copy size={12} weight="600" color={chosen ? colors.background : colors.muted}>{String.fromCharCode(65 + i)}</Copy>}</View><Copy size={14} style={{ flex: 1 }}>{option.text}</Copy></Row></Pressable>;
        })}</View>
 {submitted && !isExam && <View style={{ padding: 16, gap: 10, borderRadius: 18, backgroundColor: correct ? colors.successBg : colors.dangerBg }}><Row><Icon name={correct ? 'check' : 'book'} color={correct ? colors.success : colors.danger}/><Copy size={16} weight="700">{correct ? 'You’ve got it.' : 'A useful one to remember.'}</Copy></Row><Copy size={14}>{q.explanation}</Copy><Pressable onPress={() => Linking.openURL(q.evidence[0]!.source_url)} accessibilityRole="link"><Copy size={12} weight="700">Read the source ↗</Copy></Pressable></View>}
 {submitted && isExam && <Note>Answer saved. Explanations will be available after the rehearsal.</Note>}
 <Pressable onPress={() => router.push({ pathname: '/report', params: { questionId: q.id } })} accessibilityRole="button"><Muted size={11} style={{ textAlign: 'center' }}>Something unclear? Flag this question</Muted></Pressable>
 <Sheet visible={leaving} onClose={() => setLeaving(false)} title="Take a breather"><Muted>Your answered questions are saved automatically. You can continue from this question whenever you are ready.</Muted><Button onPress={() => router.replace('/(tabs)')}>Save & leave</Button><Button kind="secondary" icon={null} onPress={() => setLeaving(false)}>Keep practising</Button></Sheet></Screen>;
}
