import React, { useId, useState } from 'react';
import { useApp } from '../state/AppState';
import type { CheckboxProps } from './Checkbox';
/** Real HTML control: pointer, touch, Space and label activation are native browser behavior. */
export function Checkbox({ checked, onChange, label, disabled = false }: CheckboxProps) {
  const { colors } = useApp();
  const id = useId();
  const [focused, setFocused] = useState(false);
  return <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48,
    padding: '4px 2px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    color: colors.text, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.55,
    outline: focused ? `2px solid ${colors.success}` : '2px solid transparent', outlineOffset: 4 }}>
    <input id={id} type="checkbox" checked={checked} aria-checked={checked} disabled={disabled}
      onChange={event => onChange(event.currentTarget.checked)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onKeyDown={event => { if (event.key === 'Enter' && !event.repeat) { event.preventDefault(); onChange(!checked); } }}
      style={{ accentColor: colors.success, width: 22, height: 22, minWidth: 22, margin: 0, cursor: 'inherit' }}/>
    <span style={{ flex: 1 }}>{label}</span>
  </label>;
}
