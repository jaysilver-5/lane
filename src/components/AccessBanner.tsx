import React from 'react';
import { View } from 'react-native';
import { config } from '../config';
import { useRouter } from 'expo-router';
import { useApp } from '../state/AppState';
import { accessDescription } from '../domain/access.mjs';
import { Icon } from './Icon';
import { Button, Card, Copy, Muted, Row } from './UI';
export function AccessBanner({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { access, accessLoading, identity, colors } = useApp();
  const destination = access.full ? '/membership' : identity ? '/plans' : '/auth/sign-up';
  const count = access.full ? '500 questions' : access.kind === 'free' ? '40 fixed samples' : '10 fixed samples';
  return <Card onPress={compact ? () => router.push(destination) : undefined}
    label={`${access.label}, ${count}. View access options`} style={{ padding: compact ? 13 : 16, gap: 10 }}>
    <Row style={{ gap: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={access.full ? 'spark' : 'shield'} size={17} color={colors.success}/>
      </View>
      <View style={{ flex: 1, gap: 2 }}><Copy size={12} weight="600">{accessLoading ? 'Checking access…' : access.label}</Copy><Muted size={11}>{compact ? count : accessDescription(access)}</Muted></View>
      {compact ? <Row style={{ gap: 4 }}><Copy size={11} weight="600" color={colors.success}>{access.full ? 'Manage' : access.kind === 'guest' ? 'Join free' : 'Explore'}</Copy><Icon name="chevron" size={14} color={colors.success}/></Row> : null}
    </Row>
    {!compact ? <Button kind="secondary" onPress={() => router.push(destination)}>{access.full ? 'View purchase' : identity ? `Unlock Ontario for ${config.offer.label}` : 'Create a free account'}</Button> : null}
  </Card>;
}
