import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { useApp } from '../state/AppState';
/** Small decorative vector, not a road-sign teaching asset. No remote images or font dependency. */
export function RoadSketch({ width = 116, height = 142 }: { width?: number; height?: number }) {
  const { colors } = useApp();
  return <Svg width={width} height={height} viewBox="0 0 144 170" accessible={false}>
    {[22, 52, 82, 112, 142].map(n => <Line key={'h'+n} x1="0" y1={n} x2="144" y2={n} stroke={colors.sageLine} strokeWidth=".6"/>)}
    {[12, 42, 72, 102, 132].map(n => <Line key={'v'+n} x1={n} y1="0" x2={n} y2="170" stroke={colors.sageLine} strokeWidth=".6"/>)}
    <Circle cx="91" cy="63" r="47" fill="none" stroke={colors.sageLine}/>
    <Path d="M136 184C139 128 16 151 31 105S129 88 100 28" stroke={colors.sageLine} strokeWidth="31" fill="none"/>
    <Path d="M136 184C139 128 16 151 31 105S129 88 100 28" stroke={colors.surface} strokeWidth="25" fill="none"/>
    <Path d="M136 184C139 128 16 151 31 105S129 88 100 28" stroke={colors.success} strokeWidth="1.3" strokeDasharray="5 6" fill="none"/>
    <Circle cx="101" cy="30" r="23" fill={colors.accent} stroke={colors.sageLine}/>
    <Path d="M94 43V19m0 1c6-6 11 6 17 0v12c-6 6-11-6-17 0" stroke={colors.accentText} strokeWidth="1.7" fill="none" strokeLinejoin="round"/>
    <G transform="rotate(-12 31 109)"><Rect x="18" y="99" width="26" height="19" rx="6" fill={colors.forest}/><Rect x="24" y="102" width="14" height="5" rx="2" fill={colors.accent}/><Line x1="23" y1="113" x2="27" y2="113" stroke={colors.onForest}/><Line x1="35" y1="113" x2="39" y2="113" stroke={colors.onForest}/></G>
    <Path d="m13 34 3-8 3 8 8 3-8 3-3 8-3-8-8-3Z" fill={colors.success} opacity=".6"/>
  </Svg>;
}
