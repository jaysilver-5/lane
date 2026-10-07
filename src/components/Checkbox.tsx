import React from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';
import { Copy, Row } from './UI';
export interface CheckboxProps { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean; }
/** Native file: VoiceOver/TalkBack semantics and a full-width 48px press target. */
export function Checkbox({ checked, onChange, label, disabled = false }: CheckboxProps) {
  const { colors } = useApp();
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label}
    accessibilityState={{ checked, disabled }} disabled={disabled} onPress={() => onChange(!checked)}
    style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: disabled ? .5 : pressed ? .7 : 1 })}>
    <Row style={{ alignItems: 'center', gap: 12 }}>
      <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 1.5,
        borderColor: checked ? colors.success : colors.muted, backgroundColor: checked ? colors.success : colors.surface,
        alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <Icon name="check" size={17} color={colors.background}/> : null}
      </View><Copy size={13} style={{ flex: 1 }}>{label}</Copy>
    </Row>
  </Pressable>;
}
