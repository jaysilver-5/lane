import React from 'react';
import {Linking} from 'react-native';
import {config} from '../src/config';
import {Button,Card,Heading,Muted,Note,Screen,SectionHead} from '../src/components/UI';
export default function Legal(){
 const sections=[
 ['Free access','Guests can try 10 fixed questions. Email-verified accounts get 40 fixed samples, saved results and sample review. Repeating sessions does not unlock paid questions.'],
 ['Your Ontario purchase',`Ontario G1 Complete costs ${config.offer.label} in Canada as a one-time purchase, with no automatic renewal or access expiry. Your app store displays the final local price and applicable tax. Future provinces and other locations may be sold separately.`],
 ['Payments and refunds','Apple or Google handles the payment and applicable refund process. Use the FirstLane account that made the purchase when restoring. A refund can revoke access. Account deletion does not request a refund.'],
 ['Your study data','Practice history is stored on your device. Signed-in learners can choose Sync progress to back up and merge completed practice and saved questions. Clearing local history does not delete a cloud backup.'],
 ['Independent practice','FirstLane is an independent study aid. It is not affiliated with or endorsed by the Ontario government or DriveTest. Practice questions are not an official exam bank, and scores do not guarantee an exam result. Use the official handbook alongside FirstLane.']
 ];
 return <Screen back title="Privacy & terms"><Heading sub="Understand your purchase, your data and your learning experience.">Clear by design.</Heading>{config.operatorName&&<Muted>Operated by {config.operatorName}</Muted>}{sections.map(([title,body])=><Card key={title}><SectionHead title={title!}/><Muted>{body}</Muted></Card>)}{config.privacyUrl&&<Button kind="secondary" onPress={()=>Linking.openURL(config.privacyUrl)}>Read the privacy policy</Button>}{config.termsUrl&&<Button kind="secondary" onPress={()=>Linking.openURL(config.termsUrl)}>Read the full terms</Button>}{config.deletionUrl&&<Button kind="secondary" onPress={()=>Linking.openURL(config.deletionUrl)}>Account deletion information</Button>}{config.mode==='demo'&&<Note tone="warning">Test mode uses simulated accounts and purchases. No real payment is taken.</Note>}{!config.privacyUrl||!config.termsUrl?<Note>Full policies are currently unavailable. Please contact support before creating an account or making a purchase.</Note>:<Muted size={11}>This page is a product summary. The linked policies describe the complete terms and privacy practices.</Muted>}</Screen>;
}
