import React from 'react';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';
const paths: Record<string, string> = {
    home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
    book: 'M12 5c-3-2-7-2-10-1v15c4-1 7-1 10 1m0-15c3-2 7-2 10-1v15c-4-1-7-1-10 1V5',
    chart: 'M4 20h16M6 16v-5m6 5V4m6 12V8', user: 'M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    arrow: 'M4 12h15m-6-6 6 6-6 6', back: 'M20 12H5m6-6-6 6 6 6', chevron: 'm9 5 7 7-7 7', down: 'm5 9 7 7 7-7', check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M18 6 6 18',
    bookmark: 'M6 3h12v18l-6-4-6 4Z', clock: 'M12 8v5l3 2', sun: 'M12 1v2m0 18v2M1 12h2m18 0h2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4m0-15.6-1.4 1.4M5.6 18.4l-1.4 1.4',
    moon: 'M20 14A8.5 8.5 0 0 1 10 4 8.5 8.5 0 1 0 20 14Z', spark: 'm12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z',
    road: 'm8 2-4 20m12-20 4 20M12 3v3m0 4v4m0 4v4', sign: 'm12 2 10 10-10 10L2 12Zm0 5v6m0 3v.1',
    car: 'm4 9 2-6h12l2 6m-17 9V9h18v9m-18-5h3m12 0h3M5 18v3m14-3v3',
    lock: 'M6 11h12v10H6Zm2 0V7a4 4 0 0 1 8 0v4', download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
    wifi: 'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a5 5 0 0 1 8 0m-4 4v.1',
    flag: 'M5 22V3c5-5 9 5 14 0v11c-5 5-9-5-14 0', turn: 'M6 21V10a3 3 0 0 1 3-3h11m-5-5 5 5-5 5',
    map: 'm3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3Zm6-3v17m6-14v17', compass: 'm16 8-3 5-5 3 3-5Z',
    light: 'M8 2h8v20H8Zm4 4v.1m0 5.9v.1m0 5.9v.1', refresh: 'M20 7a9 9 0 1 0 1 9M20 2v6h-6',
    search: 'm16 16 6 6M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4',
    heart: 'M12 21 3 12A6 6 0 0 1 12 4a6 6 0 0 1 9 8Z',
    shield: 'm12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6Zm-4 10 3 3 5-6',
    mail: 'M2 5h20v14H2Zm0 0 10 8L22 5', help: 'M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 4v.1',
    globe: 'M2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20',
    logout: 'M9 3H3v18h6m1-9h12m-5-5 5 5-5 5', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    trophy: 'M7 3h10v8a5 5 0 0 1-10 0Zm0 2H3v4a4 4 0 0 0 4 4m10-8h4v4a4 4 0 0 1-4 4m-5 3v5m-5 0h10',
    eye: 'M2 12c5-9 15-9 20 0-5 9-15 9-20 0Z',
    edit: 'm14 4 6 6M3 21l6-2L22 6l-6-6L3 13Z',
    volume: 'M4 9h4l5-5v16l-5-5H4Zm13-1a7 7 0 0 1 0 8m3-11a11 11 0 0 1 0 14',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    calendar: 'M3 5h18v16H3Zm0 5h18M7 2v6m10-6v6',
    bolt: 'M13 2 4 14h7l-1 8 10-13h-7Z',
    filter: 'M3 5h18M6 12h12M9 19h6',
    share: 'M12 16V2m-5 5 5-5 5 5M5 11H3v11h18V11h-2',
    target: 'M12 9v6m-3-3h6',
};
export function Icon({ name, size = 22, color = '#1C2922', stroke = 1.7 }: {
    name: string;
    size?: number;
    color?: string;
    stroke?: number;
}) {
    const circled = ['clock', 'compass', 'help', 'globe', 'target'].includes(name);
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
 {circled && <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={stroke}/>}
 {name === 'sun' && <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={stroke}/>}
 {name === 'settings' && <Path d="m9 2-1 3-3 1-3 3 3 2v3l-2 2 3 3 3-1 3 2 3-2 3 1 3-3-2-2v-3l3-2-3-3-3-1-1-3Z" stroke={color} strokeWidth={stroke}/>}
 <Path d={paths[name] ?? paths.spark} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
 </Svg>;
}
