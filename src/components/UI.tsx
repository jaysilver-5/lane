import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';
import { Art } from './Art';
import { humanError } from '../lib/supabase';
export function Copy({ children, size = 16, color, weight = '400', style, lines }: {
    children: React.ReactNode;
    size?: number;
    color?: string;
    weight?: '400' | '500' | '600' | '700' | '800' | '900';
    style?: any;
    lines?: number;
}) { const { colors } = useApp(); return <Text maxFontSizeMultiplier={1.6} numberOfLines={lines} style={[{ flexShrink: 1, minWidth: 0, fontSize: size, lineHeight: size * 1.45, color: color ?? colors.text, fontWeight: weight, letterSpacing: size >= 28 ? -1.2 : size >= 18 ? -.4 : 0, ...(Platform.OS === 'web' ? { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' } : {}) }, style]}>{children}</Text>; }
export function Eyebrow({ children, color }: {
    children: React.ReactNode;
    color?: string;
}) { const { colors } = useApp(); return <Copy size={10} color={color ?? colors.muted} weight="700" style={{ letterSpacing: 2.1, lineHeight: 16 }}>{children}</Copy>; }
export function Heading({ children, sub, eyebrow }: {
    children: React.ReactNode;
    sub?: string;
    eyebrow?: string;
}) { const compact = useWindowDimensions().height < 750; return <View style={{ gap: compact ? 5 : 7 }}>{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}<Copy size={compact ? 28 : 31} weight="700" style={{ lineHeight: compact ? 33 : 36 }}>{children}</Copy>{sub ? <Muted size={compact ? 13 : 14}>{sub}</Muted> : null}</View>; }
export function Muted({ children, size = 14, style }: {
    children: React.ReactNode;
    size?: number;
    style?: any;
}) { const { colors } = useApp(); return <Copy size={size} color={colors.muted} style={style}>{children}</Copy>; }
export function Row({ children, style }: {
    children: React.ReactNode;
    style?: ViewStyle;
}) { return <View style={[{ flexDirection: 'row', alignItems: 'center', minWidth: 0, gap: 10 }, style]}>{children}</View>; }
export function Card({ children, style, onPress, label }: {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
    label?: string;
}) { const { colors } = useApp(); const inner = <View style={[{ width: '100%', minWidth: 0, backgroundColor: colors.surface, borderRadius: 22, padding: 17, gap: 12, borderWidth: 1, borderColor: colors.line }, style]}>{children}</View>; return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ minWidth: 0, opacity: pressed ? .85 : 1 })}>{inner}</Pressable> : inner; }
export function Chip({ children, icon, selected = false, onPress, color }: {
    children: React.ReactNode;
    icon?: string;
    selected?: boolean;
    onPress?: () => void;
    color?: string;
}) { const { colors } = useApp(); const content = <Row style={{ minHeight: onPress ? 44 : 30, gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 30, backgroundColor: color ?? (selected ? colors.accent : colors.surface), borderWidth: 1, borderColor: selected ? 'transparent' : colors.line }}>{icon ? <Icon name={icon} size={14} color={selected ? colors.accentText : colors.text}/> : null}<Copy size={12} weight="600" color={selected ? colors.accentText : colors.text}>{children}</Copy></Row>; return onPress ? <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={{ minWidth: 0, maxWidth: '100%' }}>{content}</Pressable> : content; }
export function Button({ children, onPress, kind = 'primary', icon = 'arrow', disabled = false, loading = false, style }: {
    children: React.ReactNode;
    onPress: () => unknown;
    kind?: 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger';
    icon?: string | null;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
}) {
    const { colors, state, reduceMotion, notify } = useApp();
    const scale = useRef(new Animated.Value(1)).current;
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false), mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const bg = kind === 'primary' ? colors.accent : kind === 'dark' ? colors.forest : kind === 'secondary' ? colors.raised : kind === 'danger' ? colors.dangerBg : 'transparent';
    const fg = kind === 'primary' ? colors.accentText : kind === 'dark' ? colors.onForest : kind === 'danger' ? colors.danger : colors.text;
    async function press() {
        if (busyRef.current || loading || disabled)
            return;
        busyRef.current = true;
        try {
            if (state.preferences.haptics && Platform.OS !== 'web')
                void Haptics.selectionAsync().catch(() => { });
            setBusy(true);
            await onPress();
        }
        catch (error) {
            notify(humanError(error));
        }
        finally {
            busyRef.current = false;
            if (mounted.current) setBusy(false);
        }
    }
    function animate(value: number) {
        if (!reduceMotion)
            Animated.spring(scale, { toValue: value, useNativeDriver: Platform.OS !== 'web', speed: 35, bounciness: 0 }).start();
    }
    return <Animated.View style={[{ minWidth: 0, transform: [{ scale }], opacity: disabled ? .4 : 1 }, style]}><Pressable accessibilityRole="button" accessibilityLabel={typeof children === 'string' ? children : undefined} accessibilityState={{ disabled: disabled || busy || loading, busy: busy || loading }} disabled={disabled || busy || loading} onPress={press} onPressIn={() => animate(.975)} onPressOut={() => animate(1)} style={{ minHeight: 50, justifyContent: 'center', backgroundColor: bg, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 }}><Row style={{ justifyContent: 'center', gap: 9 }}>{(busy || loading) ? <ActivityIndicator color={fg}/> : <><Copy size={14} weight="700" color={fg} style={{ textAlign: 'center' }}>{children}</Copy>{icon ? <Icon name={icon} size={17} color={fg}/> : null}</>}</Row></Pressable></Animated.View>;
}
export function IconButton({ name, onPress, label, selected = false }: {
    name: string;
    onPress: () => void;
    label: string;
    selected?: boolean;
}) { const { colors } = useApp(); return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: selected ? colors.accent : colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .6 : 1 })}><Icon name={name} size={20} color={selected ? colors.accentText : colors.text}/></Pressable>; }
export function ProgressBar({ value, color, height = 7 }: {
    value: number;
    color?: string;
    height?: number;
}) { const { colors } = useApp(); const progress = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0; return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }} style={{ height, backgroundColor: colors.raised, borderRadius: 20, overflow: 'hidden' }}><View style={{ width: `${progress}%`, height: '100%', backgroundColor: color ?? colors.success, borderRadius: 20 }}/></View>; }
export function Screen({ children, back = false, title, right, scroll = true, footer, tabs = false }: {
    children: React.ReactNode;
    back?: boolean;
    title?: string;
    right?: React.ReactNode;
    scroll?: boolean;
    footer?: React.ReactNode;
    tabs?: boolean;
}) {
    const { colors, reduceMotion } = useApp();
    const { height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const compact = height < 750;
    const veryShort = height < 620;
    const router = useRouter(), enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
    useEffect(() => { Animated.timing(enter, { toValue: 1, duration: reduceMotion ? 0 : 300, useNativeDriver: Platform.OS !== 'web' }).start(); }, []);
    const content = <Animated.View style={{ flex: scroll ? undefined : 1, flexGrow: 1, flexShrink: 1, minHeight: 0, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }], width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: veryShort ? 8 : compact ? 12 : 18, gap: veryShort ? 10 : compact ? 13 : 16 }}>{children}</Animated.View>;
    return <SafeAreaView edges={footer || tabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']} style={{ flex: 1, minHeight: 0, backgroundColor: colors.background }}><KeyboardAvoidingView style={{ flex: 1, minHeight: 0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{(back || title || right) && <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: compact ? 7 : 10 }}><Row style={{ justifyContent: 'space-between' }}>{back ? <IconButton name="back" label="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}/> : <View />}{title ? <Copy size={15} weight="600" style={{ flexShrink: 1, textAlign: 'center' }}>{title}</Copy> : null}{right ?? <View style={{ width: 44 }}/>}</Row></View>}{scroll ? <ScrollView style={{ flex: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingTop: back || title ? 4 : 8 }}>{content}</ScrollView> : content}{footer && <View style={{ paddingTop: 9, paddingBottom: Math.max(insets.bottom, 14), backgroundColor: colors.background, borderTopWidth: 1, borderColor: colors.line }}><View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20 }}>{footer}</View></View>}</KeyboardAvoidingView></SafeAreaView>;
}
export function SectionHead({ title, action, onPress }: {
    title: string;
    action?: string;
    onPress?: () => void;
}) { const { colors } = useApp(); return <Row style={{ justifyContent: 'space-between' }}><Copy size={19} weight="700" style={{ flexShrink: 1 }}>{title}</Copy>{action ? <Pressable onPress={onPress} accessibilityRole="button" hitSlop={12}><Copy size={12} color={colors.muted} weight="600">{action} →</Copy></Pressable> : null}</Row>; }
export function Field({ label, error, accessory, style, onFocus, onBlur, ...props }: TextInputProps & {
    label: string;
    error?: string;
    accessory?: React.ReactNode;
}) { const { colors } = useApp(); const [focus, setFocus] = useState(false); return <View style={{ gap: 7 }}><Copy size={13} weight="600">{label}</Copy><View><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} onFocus={event => { setFocus(true); onFocus?.(event); }} onBlur={event => { setFocus(false); onBlur?.(event); }} style={[{ minHeight: props.multiline ? 140 : 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: error ? colors.danger : focus ? colors.success : colors.line, borderRadius: 16, padding: 14, paddingRight: accessory ? 54 : 14, color: colors.text, fontSize: 16 }, style]} {...props}/>{accessory ? <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>{accessory}</View> : null}</View>{error ? <Copy size={12} color={colors.danger}>{error}</Copy> : null}</View>; }
export function Empty({ icon = 'spark', title, body, action, onPress }: {
    icon?: string;
    title: string;
    body: string;
    action?: string;
    onPress?: () => void;
}) { const { colors } = useApp(); return <Card style={{ alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 400, padding: 22, gap: 11 }}><View style={{ backgroundColor: colors.raised, padding: 16, borderRadius: 48 }}><Icon name={icon} size={26} color={colors.text}/></View><Copy size={20} weight="700" style={{ textAlign: 'center' }}>{title}</Copy><Muted size={13} style={{ textAlign: 'center' }}>{body}</Muted>{action && onPress ? <Button onPress={onPress}>{action}</Button> : null}</Card>; }
export function MenuItem({ icon, title, subtitle, onPress, tail, danger = false }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    tail?: React.ReactNode;
    danger?: boolean;
}) {
    const { colors } = useApp();
    const content = <Row><View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={danger ? colors.danger : colors.text} size={18}/></View><View style={{ flex: 1, gap: 2 }}><Copy size={14} weight="600" color={danger ? colors.danger : colors.text}>{title}</Copy>{subtitle ? <Muted size={11}>{subtitle}</Muted> : null}</View>{tail ?? (onPress ? <Icon name="chevron" size={16} color={colors.muted}/> : null)}</Row>;
    // A passive settings row must not disable or swallow its child Switch.
    return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ paddingVertical: 11, opacity: pressed ? .6 : 1 })}>{content}</Pressable> : <View style={{ paddingVertical: 11 }}>{content}</View>;
}
export function Divider() { const { colors } = useApp(); return <View style={{ height: 1, backgroundColor: colors.line }}/>; }
export function Note({ children, tone = 'neutral' }: {
    children: React.ReactNode;
    tone?: 'neutral' | 'warning' | 'success';
}) { const { colors } = useApp(); return <View style={{ padding: 12, borderRadius: 14, backgroundColor: tone === 'warning' ? colors.peach : tone === 'success' ? colors.successBg : colors.raised }}><Copy size={12} color={tone === 'success' ? colors.success : colors.text}>{children}</Copy></View>; }
export function Sheet({ visible, onClose, title, children }: {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}) { const { colors, reduceMotion } = useApp(); const insets = useSafeAreaInsets(); return <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}><View style={{ flex: 1, backgroundColor: 'rgba(9,20,13,.48)', justifyContent: 'flex-end' }}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close sheet"/><View accessibilityViewIsModal style={{ backgroundColor: colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, paddingBottom: Math.max(insets.bottom, 20), gap: 16, maxHeight: '90%', width: '100%', maxWidth: 600, alignSelf: 'center' }}><View style={{ width: 38, height: 4, backgroundColor: colors.line, borderRadius: 4, alignSelf: 'center' }}/><Row style={{ justifyContent: 'space-between' }}><Copy size={23} weight="700" style={{ flex: 1 }}>{title}</Copy><IconButton name="close" label="Close" onPress={onClose}/></Row><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18 }}>{children}</ScrollView></View></View></Modal>; }
export function Toast() { const { toast, colors } = useApp(); const insets = useSafeAreaInsets(); return toast ? <View accessibilityLiveRegion="polite" style={{ pointerEvents: 'none', position: 'absolute', bottom: 96 + insets.bottom, left: 24, right: 24, maxWidth: 552, alignSelf: 'center', backgroundColor: colors.text, borderRadius: 17, padding: 16, boxShadow: '0 8px 24px rgba(16,32,20,0.12)' }}><Copy size={13} color={colors.background}>{toast}</Copy></View> : null; }
export function Logo({ size = 34, wordmark = true }: {
    size?: number;
    wordmark?: boolean;
}) { return <Row style={{ gap: 9 }}><Art name="logo" height={size} width={size}/>{wordmark && <Copy size={25} weight="800" style={{ letterSpacing: -1.5 }}>FirstLane</Copy>}</Row>; }
