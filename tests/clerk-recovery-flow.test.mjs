import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { authDestination } from '../src/domain/authFlow.mjs';
import { withWebBasePath } from '../src/domain/webLocation.mjs';

// Actual form, immutable hook snapshots, synthetic inputs, no live credentials.
function recovery({mode='forgot-password', next='/membership', codeError=null, passwordError=null, outcome='complete', task=null, initialStatus=null}={}) {
  const slots=[], effects=[], calls=[], urls=[];
  let index=0, changed=true, tree, signIn;
  const element=(type,props)=>({type,props:props||{}});
  const react={
    useState(initial){const slot=index++;if(!(slot in slots))slots[slot]=typeof initial==='function'?initial():initial;return[slots[slot],value=>{const updated=typeof value==='function'?value(slots[slot]):value;if(!Object.is(updated,slots[slot])){slots[slot]=updated;changed=true;}}];},
    useRef(initial){const slot=index++;return slots[slot]||={current:initial};},
    useEffect(callback,deps){const slot=index++,prior=slots[slot];if(!prior||deps.some((value,i)=>!Object.is(value,prior[i]))){slots[slot]=deps;effects.push(callback);}},
  };
  const replace=status=>{signIn={...signIn,status};changed=true;};
  signIn={id:initialStatus?'attempt':null,status:initialStatus,supportedSecondFactors:[{strategy:'email_code'}],
    async create({identifier}){calls.push(['create',identifier]);signIn={...signIn,id:'attempt'};replace('needs_first_factor');return{error:null};},
    async finalize({navigate}){calls.push(['finalize',signIn.status]);navigate({session:{status:'active',currentTask:task},decorateUrl:url=>url});return{error:null};},
    resetPasswordEmailCode:{
      async sendCode(){calls.push(['send']);return{error:null};},
      async verifyCode({code}){calls.push(['verify',code]);if(!codeError)replace('needs_new_password');return{error:codeError};},
      async submitPassword(args){calls.push(['password',args.signOutOfOtherSessions,signIn.status]);if(!passwordError)replace(outcome);return{error:passwordError};},
    },
    mfa:{async sendEmailCode(){calls.push(['second-factor']);return{error:null};}},
  };
  const ui=Object.fromEntries(['Button','Copy','Divider','Field','Heading','Logo','Muted','Note','Screen'].map(name=>[name,name]));
  const imports={
    '../lib/webLocation':{appWebPath:withWebBasePath},
    react,'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'Fragment'},
    'react-native':{ActivityIndicator:'ActivityIndicator',Pressable:'Pressable',View:'View'},
    '@clerk/react':{HandleSSOCallback:'HandleSSOCallback',useClerk:()=>({loaded:true}),useSession:()=>({session:null,isLoaded:true}),useSignIn:()=>({signIn,fetchStatus:'idle'}),useSignUp:()=>({signUp:{missingFields:[]},fetchStatus:'idle'})},
    'expo-router':{useRouter:()=>({replace:url=>urls.push(url),push:url=>urls.push(url)}),useLocalSearchParams:()=>({next,method:'password'})},
    './UI':ui,'./Checkbox':{Checkbox:'Checkbox'},'./SocialAuthButton':{SocialAuthButton:'SocialAuthButton'},
    './WebEmailAuth':{WebEmailAuth:'WebEmailAuth'},
    '../state/AppState':{useApp:()=>({finishOnboarding(){},colors:{success:'#123'}})},
    '../lib/webAccount.web':{clerkConfigured:true,useWebAccount:()=>({identity:null,error:''})},
    '../domain/authFlow.mjs':{authDestination},'../domain/clerkSignup.mjs':{clerkSignupStep:()=> 'pending'},
    '../../web-launch-scope.json':JSON.parse(fs.readFileSync(new URL('../web-launch-scope.json',import.meta.url),'utf8')),
  };
  const source=fs.readFileSync(new URL('../src/components/WebAuth.tsx',import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const context={exports:{},require:name=>{assert.ok(name in imports,name);return imports[name];},setTimeout:()=>1,clearTimeout(){},window:{location:{assign:url=>urls.push(url)}}};
  vm.runInNewContext(js,context);const component=context.exports.WebAuth({mode});
  function render(){index=0;changed=false;tree=component.type(component.props);effects.splice(0).forEach(effect=>effect());}
  function nodes(value){if(!value||typeof value!=='object')return[];if(Array.isArray(value))return value.flatMap(nodes);return[value,...nodes(value.props?.children)];}
  function find(type,label){const node=nodes(tree).find(node=>node.type===type&&(node.props.label===label||node.props.children===label));assert.ok(node,`${type}: ${label}`);return node.props;}
  async function flush(){for(let i=0;i<20;i++){if(changed)render();await Promise.resolve();}}
  render();return{calls,urls,flush,text:()=>JSON.stringify(tree),
    async fill(label,value){find('Field',label).onChangeText(value);await flush();},
    async press(label){await find('Button',label).onPress();await flush();},
    async send(){await this.fill('Email address','learner@example.test');await this.press('Send recovery code');},
    async reset(password='synthetic-test-password',confirm=password){await this.fill('Recovery code','123456');await this.fill('New password',password);await this.fill('Confirm new password',confirm);await this.press('Save new password');},
  };
}

test('forgot-password entry preserves the requested membership destination',async()=>{
  const app=recovery({mode:'sign-in'});await app.press('Forgot your password?');
  assert.deepEqual(app.urls,['/auth/forgot-password?next=%2Fmembership']);
});
test('recovery sends once, limits resend, and finalizes the replacement resource to the original destination',async()=>{
  const app=recovery();await app.send();await app.press('Resend recovery code');
  assert.equal(app.calls.filter(([name])=>name==='send').length,1);assert.match(app.text(),/Wait a minute/);
  await app.reset();assert.deepEqual(app.calls.slice(-3),[['verify','123456'],['password',true,'needs_new_password'],['finalize','complete']]);
  assert.deepEqual(app.urls,['/app/auth/callback?next=%2Fmembership']);
});
test('wrong recovery code cannot submit a password or finalize',async()=>{
  const app=recovery({codeError:{message:'Incorrect or expired code.'}});await app.send();await app.reset();
  assert.equal(app.calls.some(([name])=>['password','finalize'].includes(name)),false);assert.deepEqual(app.urls,[]);assert.match(app.text(),/Incorrect or expired/);
});
test('weak or mismatched passwords make no reset requests',async()=>{
  const app=recovery();await app.send();const before=app.calls.length;
  await app.reset('short');assert.match(app.text(),/at least 8/);assert.equal(app.calls.length,before);
  await app.reset('synthetic-test-password','different-password');assert.match(app.text(),/do not match/);assert.equal(app.calls.length,before);
});
test('provider password rejection does not finalize or navigate',async()=>{
  const app=recovery({passwordError:{message:'Choose a different password.'}});await app.send();await app.reset();
  assert.equal(app.calls.some(([name])=>name==='finalize'),false);assert.deepEqual(app.urls,[]);assert.match(app.text(),/Choose a different/);
});
test('a verified recovery attempt resumes without reusing its code and requests other-session revocation',async()=>{
  const app=recovery({mode:'reset-password',initialStatus:'needs_new_password'});await app.reset();
  assert.equal(app.calls.some(([name])=>name==='verify'),false);assert.deepEqual(app.calls[0],['password',true,'needs_new_password']);assert.deepEqual(app.urls,['/app/auth/callback?next=%2Fmembership']);
});
test('recovery requiring a second factor stays in verification rather than granting a session',async()=>{
  const app=recovery({outcome:'needs_second_factor'});await app.send();await app.reset();
  assert.equal(app.calls.some(([name])=>name==='finalize'),false);assert.ok(app.calls.some(([name])=>name==='second-factor'));assert.deepEqual(app.urls,[]);assert.match(app.text(),/Verify & continue/);
});
test('pending session security task cannot reach the app',async()=>{
  const app=recovery({task:{key:'security'},next:'https://evil.example/'});await app.send();await app.reset();
  assert.deepEqual(app.urls,[]);assert.match(app.text(),/another security step/);
});
test('an external recovery return URL is replaced by the safe app destination',async()=>{
  const app=recovery({next:'https://evil.example/'});await app.send();await app.reset();
  assert.deepEqual(app.urls,['/app/auth/callback?next=%2F(tabs)']);
});
