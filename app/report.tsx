import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { questionMap } from '../src/data/bank';
import { Button, Card, Copy, Field, Heading, Muted, Note, Screen } from '../src/components/UI';
export default function Report() {
    const router = useRouter(), { questionId } = useLocalSearchParams<{
        questionId?: string;
    }>(), { report, canRead } = useApp(), [delivered, setDelivered] = useState(false), [message, setMessage] = useState(''), [sent, setSent] = useState(false);
    const q = questionId && canRead(questionId) ? questionMap.get(questionId) : null;
    return <Screen back title="Help us make it clearer"><Heading sub="Tell us what felt confusing, inaccurate or difficult to use.">{sent ? 'Thanks for\npointing it out.' : 'A better FirstLane\nstarts with feedback.'}</Heading>{sent ? <><Note tone="success">{delivered ? 'Your report has been submitted. Thank you for helping improve FirstLane.' : 'Your feedback was saved on this device but has not been sent. Signed-in learners can retry using Sync progress in Your account.'}</Note><Button onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>Back to what I was doing</Button></> : <>{q && <Card><Muted size={11}>{q.code}</Muted><Copy size={15}>{q.prompt}</Copy></Card>}<Field label="What should we look at?" value={message} onChangeText={setMessage} multiline numberOfLines={6} textAlignVertical="top" placeholder="Tell us what happened and what you expected…" maxLength={2000}/><Muted size={11}>Please do not include passwords, payment details or sensitive personal information.</Muted><Button disabled={message.trim().length < 10} onPress={async () => { const sentToTeam = await report(message.trim(), q?.id); setDelivered(sentToTeam); setSent(true); }}>Submit feedback</Button></>}</Screen>;
}
