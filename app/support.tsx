import React,{useState} from 'react';
import { Linking,Pressable,View } from 'react-native';
import { useRouter } from 'expo-router';
import { config } from '../src/config';
import { useApp } from '../src/state/AppState';
import { Icon } from '../src/components/Icon';
import { Button,Card,Copy,Heading,Muted,Note,Row,Screen,SectionHead } from '../src/components/UI';
const faq=[
 ['Is this the official G1 test?','No. FirstLane is independent preparation. FirstLane contains original practice questions, not live exam questions, and is not endorsed by MTO or DriveTest.'],
 ['What is free?','Guests get 10 fixed sample questions. A verified FirstLane account gets 40 fixed samples free forever. The complete Ontario bank is a separate one-time purchase.'],
 ['Is Ontario G1 Complete a subscription?',`No. Ontario G1 Complete is ${config.offer.label} once in Canada. There is no automatic renewal and no access expiry for the Ontario pack.`],
 ['Can I practise without internet?','Offline practice is included with Ontario G1 Complete. FirstLane needs a connection at least every 30 days to refresh purchase access and connectivity for sign-in, purchase restoration and account services.'],
 ['Who charges me?','On iPhone, Apple presents and processes the purchase. On Android, Google Play does. RevenueCat coordinates purchase status and access; FirstLane does not collect your card details.'],
 ['How do I report a question?','Open the question and choose Report an issue. Include what seems incorrect and a supporting source when possible. Do not include sensitive personal information.'],
 ['Can I use FirstLane for a US test?','Not yet. State-specific US packs are planned inside this same app. Ontario questions should not be used for another jurisdiction.'],
 ['Does my score predict a pass?','No. Practice accuracy is a record of answers in FirstLane, not a prediction, certificate or guarantee of an official result.']
 ];
export default function Support(){const router=useRouter(),{colors}=useApp(),[open,setOpen]=useState<number|null>(0);return <Screen back title="A little help"><Heading sub="Questions about your questions? You’re in the right place.">Let’s find{`
`}your way through.</Heading><Button onPress={()=>router.push('/report')} icon="mail">Send feedback</Button><Button kind="secondary" icon="spark" onPress={()=>router.push('/membership')}>Plan, payments & restore</Button><SectionHead title="Good questions, clear answers"/><View style={{gap:10}}>{faq.map(([title,body],i)=><Card key={title}><Pressable onPress={()=>setOpen(open===i?null:i)} accessibilityRole="button" accessibilityState={{expanded:open===i}}><Row style={{justifyContent:'space-between'}}><Copy size={15} weight="600" style={{flex:1}}>{title}</Copy><Icon name={open===i?'close':'down'} size={17} color={colors.muted}/></Row></Pressable>{open===i&&<Muted size={13}>{body}</Muted>}</Card>)}</View>{config.supportEmail?<Button kind="secondary" icon="mail" onPress={()=>Linking.openURL(`mailto:${config.supportEmail}`)}>Email support</Button>:<Note>Email support is currently unavailable. Use Send feedback to report an issue.</Note>}<Button kind="ghost" icon="book" onPress={()=>router.push('/content-status')}>Sources & learning information</Button></Screen>}
