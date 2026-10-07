import React from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useApp } from '../state/AppState';
import { questionMap } from '../data/bank';
import { latestMistakes } from '../domain/engine.mjs';
import { Button, Card, Copy, Empty, Heading, Muted, Screen } from './UI';
export function QuestionCollection({ type }: {
    type: 'saved' | 'mistakes';
}) {
    const router = useRouter(), { state, begin, canRead } = useApp();
    const ids = (type === 'saved' ? state.bookmarks : latestMistakes(state.sessions)).filter((id: string) => canRead(id));
    return <Screen back title={type === 'saved' ? 'Saved questions' : 'Mistake review'}><Heading sub={type === 'saved' ? 'A little collection of things worth coming back to.' : 'Nothing wasted. Every mistake gives you a useful next step.'}>{type === 'saved' ? 'Keep the good\nquestions close.' : 'Turn “not yet”\ninto “got it”.'}</Heading>{ids.length > 0 ? <><Button onPress={() => {
                if (begin(type))
                    router.push('/quiz');
            }}>Practise {ids.length} {ids.length === 1 ? 'question' : 'questions'}</Button><Muted size={12}>{type === 'mistakes' ? 'A later correct answer to the same concept removes it from this list.' : 'Bookmark questions during practice to build your own revision list.'}</Muted>{ids.map((id: string) => { const q = questionMap.get(id); return q ? <Card key={id} onPress={() => router.push({ pathname: '/question', params: { id } })}><Muted size={10}>{q.topic.toUpperCase()}</Muted><Copy size={16} weight="600">{q.prompt}</Copy><Copy size={12} weight="700">See explanation →</Copy></Card> : null; })}</> : <Empty icon={type === 'saved' ? 'bookmark' : 'refresh'} title={type === 'saved' ? 'Your collection starts with one.' : 'A clean slate.'} body={type === 'saved' ? 'Tap the bookmark while practising. Your saved questions will be waiting here.' : 'Complete a session and any concepts you missed will appear here for another look.'} action="Start practising" onPress={() => {
                if (begin('quick'))
                    router.push('/quiz');
            }}/>}</Screen>;
}
