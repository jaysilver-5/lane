import React from 'react';
import { View, Switch } from 'react-native';
import { useApp } from '../src/state/AppState';
import { Button, Card, Chip, Copy, Field, Heading, Muted, Note, Row, Screen, SectionHead } from '../src/components/UI';
export default function StudyPlan() {
    const { state, colors, patchPreferences, setReminders, notify } = useApp();
    const p = state.preferences;
    return <Screen back title="Your study plan"><Heading sub="Make a little space for learning. You can change any of this whenever life changes.">Consistency,{`\n`}without pressure.</Heading><Card><Copy size={17} weight="700">Daily question goal</Copy><Row>{[5, 10, 20].map(n => <Chip key={n} selected={p.goal === n} onPress={() => patchPreferences({ goal: n })}>{n} questions</Chip>)}</Row><Muted size={12}>Your goal sets the size of quick practice sessions. It does not limit how much you can study.</Muted></Card><Field label="Target test date (optional, YYYY-MM-DD)" placeholder="2026-11-15" value={p.targetDate} onChangeText={targetDate => patchPreferences({ targetDate })} maxLength={10} autoCapitalize="none"/><Muted size={12}>A planning note, not an official test booking. Leave it blank when you are still deciding.</Muted><Card><Row style={{ justifyContent: 'space-between' }}><View style={{ flex: 1, gap: 5 }}><Copy size={16} weight="700">A gentle daily nudge</Copy><Muted size={12}>Local notification, on this device only.</Muted></View><Switch accessibilityLabel="Daily reminder" value={p.reminders} trackColor={{ true: colors.success, false: colors.line }} onValueChange={enabled => setReminders(enabled).catch(e => notify(e.message))}/></Row><Row style={{ flexWrap: 'wrap' }}>{[8, 12, 19, 21].map(hour => <Chip key={hour} selected={p.reminderHour === hour} onPress={() => {
                if (p.reminders)
                    setReminders(true, hour).catch(e => notify(e.message));
                else
                    patchPreferences({ reminderHour: hour });
            }}>{hour < 12 ? `${hour} am` : hour === 12 ? '12 pm' : `${hour - 12} pm`}</Chip>)}</Row></Card><Note>No lost lives. No shame for missing a day. Your next session will be waiting whenever you are ready.</Note><Button onPress={() => {
            if (p.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.targetDate))
                throw new Error('Use YYYY-MM-DD, or leave the date blank.');
            notify('Your study preferences are saved.');
        }} icon="check">Save my plan</Button></Screen>;
}
