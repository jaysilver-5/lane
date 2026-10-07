import React from 'react';
import {View} from 'react-native';
import {useApp} from '../src/state/AppState';
import {config} from '../src/config';
import {Icon} from '../src/components/Icon';
import {Button,Card,Chip,Copy,Heading,Muted,Note,Row,Screen} from '../src/components/UI';
export default function Downloads(){
 const {state,colors,access,installPack,removePack,bankLoading,bankVersion}=useApp();
 return <Screen back title="Offline packs"><View style={{height:104,backgroundColor:colors.blue,borderRadius:21,alignItems:'center',justifyContent:'center'}}><Icon name="download" size={40} color={colors.text}/></View><Heading sub="Download your Ontario pack while connected, then practise on the go.">Your practice,{`\n`}without the signal.</Heading><Card><Row style={{justifyContent:'space-between',flexWrap:'wrap'}}><Copy size={20} weight="700">Ontario G1</Copy><Chip selected={state.downloaded}>{bankLoading?'Loading…':state.downloaded?'Saved on this device':access.full?'Ready to download':'Complete required'}</Chip></Row><Muted>{state.downloaded?`English · Version ${bankVersion}`:'English · Included with Ontario G1 Complete'}</Muted><Button loading={bankLoading} onPress={state.downloaded?removePack:installPack} kind={state.downloaded?'secondary':'primary'} icon={state.downloaded?'trash':'download'}>{state.downloaded?'Remove downloaded copy':'Download Ontario pack'}</Button></Card><Note>Reconnect at least once every 30 days so FirstLane can refresh purchase access. Your Ontario purchase has no expiry; this periodic check supports secure offline use.</Note><Muted size={12}>Downloads stay separate for each FirstLane account. Removing a download does not delete your practice history. Sync your progress from Your account before changing devices.</Muted>{config.mode==='demo'&&<Note tone="warning">TEST MODE · This uses a local draft pack, not a publicly approved learning release.</Note>}</Screen>;
}
