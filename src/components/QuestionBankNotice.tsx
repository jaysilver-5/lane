import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useApp } from '../state/AppState';
import { Button, Muted, Row } from './UI';

export function QuestionBankNotice() {
  const { access, bankLoading, bankError, bankAvailability, retryQuestions, colors } = useApp();
  if (Platform.OS === 'web' && access.full && bankAvailability === 'awaiting-review') return <Muted size={12}>40 sample questions are ready to practise. The Complete bank is awaiting review.</Muted>;
  if (Platform.OS !== 'web' || access.kind === 'guest' || (!bankLoading && !bankError)) return null;
  return <View accessibilityLiveRegion="polite" style={{gap:8}}>
    {bankLoading ? <Row><ActivityIndicator size="small" color={colors.success}/><Muted size={12}>Getting your questions ready…</Muted></Row> : <><Muted size={12}>{bankError}</Muted><Button kind="ghost" onPress={retryQuestions}>Retry loading questions</Button></>}
  </View>;
}
