import React from 'react';
import { Image } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { artwork } from './artwork';
export function Art({ name = 'journey', width = '100%', height = 260 }: {
    name?: keyof typeof artwork;
    width?: number | `${number}%`;
    height?: number;
}) {
    if (name === 'logo') {
        return <Image source={require('../../assets/icon.png')} accessibilityLabel="FirstLane logo" resizeMode="contain" style={{ width, height, borderRadius: height * .25, backgroundColor: '#12392B' }} />;
    }
    return <SvgXml xml={artwork[name]} width={width} height={height}/>;
}
