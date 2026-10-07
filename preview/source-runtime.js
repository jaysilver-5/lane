/* Minimal source-preview adapter. Intentionally not a substitute for React or React Native. */
const CACHE={},states=new Map(),refs=new Map();let hookPath='',hookIndex=0,renderPending=false,rendering=false;
const ROUTES={home:'/app/(tabs)/index.tsx',study:'/app/(tabs)/study.tsx',progress:'/app/(tabs)/progress.tsx',profile:'/app/(tabs)/profile.tsx',plans:'/app/plans.tsx',topic:'/app/topic.tsx','sign-up':'/app/auth/sign-up.tsx',results:'/app/results.tsx',appearance:'/app/appearance.tsx',exam:'/app/exam.tsx',checkout:'/app/checkout.tsx',onboarding:'/app/onboarding.tsx'};
let screen=new URLSearchParams(location.search).get('screen')||'home',params={},tier='guest',theme='light';
const React={createElement:(type,props,...children)=>({type,props:{...props,children:children.length===1?children[0]:children}}),Fragment:'fragment',
 useState(initial){const id=hookPath+':'+hookIndex++;if(!states.has(id))states.set(id,typeof initial==='function'?initial():initial);return [states.get(id),v=>{const next=typeof v==='function'?v(states.get(id)):v;if(next!==states.get(id)){states.set(id,next);schedule();}}];},
 useRef(initial){const id=hookPath+':'+hookIndex++;if(!refs.has(id))refs.set(id,{current:initial});return refs.get(id);},
 useEffect(){},useLayoutEffect(){},useMemo:fn=>fn(),useCallback:fn=>fn,useId:()=>('preview-'+hookPath+':'+hookIndex++).replace(/[^a-z\d_-]/gi,'-'),memo:fn=>fn,forwardRef:fn=>fn};
function schedule(){if(!renderPending){renderPending=true;setTimeout(()=>{renderPending=false;render();},24);}}
function note(message='This visual companion does not run live services. Use the Expo app to verify this flow.'){document.querySelector('.preview-note')?.remove();const e=document.createElement('div');e.className='preview-note';e.textContent=message;document.getElementById('device').append(e);setTimeout(()=>e.remove(),4500);}
function keyFor(route){return ({'/(tabs)':'home','/(tabs)/study':'study','/(tabs)/progress':'progress','/(tabs)/profile':'profile','/plans':'plans','/topic':'topic','/auth/sign-up':'sign-up','/results':'results','/appearance':'appearance','/exam':'exam','/checkout':'checkout','/onboarding':'onboarding'})[route];}
const router={push:go,replace:go,navigate:go,canGoBack:()=>screen!=='home',back:()=>go('/(tabs)')};
function go(target){const key=typeof target==='string'?keyFor(target):keyFor(target.pathname);if(!key){note();return;}params=typeof target==='object'?(target.params||{}):{};screen=key;states.clear();refs.clear();render();}
function load(name,from='/'){if(!name.startsWith('.')){
 if(name==='react')return React;
 if(name==='react-native')return RN;
 if(name==='react-native-svg')return SVG;
 if(name==='react-native-safe-area-context')return {SafeAreaView:'View',SafeAreaProvider:({children})=>children,useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})};
 if(name==='expo-router')return {useRouter:()=>router,useLocalSearchParams:()=>params,useSegments:()=>['(tabs)',screen==='home'?'index':screen==='profile'?'profile':screen],Tabs};
 if(name==='expo-haptics')return {selectionAsync:async()=>{}};
 if(name==='expo-linking')return {createURL:()=>'',openURL:()=>note()};
 throw new Error('Not included in visual adapter: '+name);
 }
 const bits=(from.slice(0,from.lastIndexOf('/'))+'/'+name).split('/'),clean=[];for(const b of bits)if(b==='..')clean.pop();else if(b&&b!=='.')clean.push(b);const id='/'+clean.join('/');
 if(id.endsWith('firstlane-mark.png'))return LOGO;
 if(id==='/src/state/AppState')return {useApp:()=>app(),useStats:()=>load('./src/domain/engine.mjs','/').activity(state.sessions)};
 if(id==='/src/config')return {config:{mode:'demo',isProduction:false,packKey:'CA-ON-G1',offer:{label:'CA$14.99',amount:1499,currency:'CAD'}}};
 if(id==='/src/lib/supabase')return {humanError:e=>e?.message||String(e),requireSupabase:()=>{throw new Error('Visual preview only.')}};
 if(id==='/src/lib/demoAccount')return {validateCredentials:(email,password)=>{if(!email.includes('@')||password.length<8)throw new Error('Enter a valid email and at least 8 characters.');},demoRegister:async()=>{throw new Error('Design preview only. No account was created.');}};
 if(id==='/src/lib/billing')return {clearPendingPurchase:async()=>{},fetchStoreOffer:async()=>({priceString:'CA$14.99'}),pendingPurchase:async()=>false,purchasePreparation:async()=>({status:'cancelled'})};
 const file=[id+'.web.tsx',id+'.web.ts',id,id+'.tsx',id+'.ts',id+'.mjs',id+'.json'].find(p=>MODULES[p]);if(!file)throw new Error('Missing preview module '+id);
 if(CACHE[file])return CACHE[file].exports;const module={exports:{}};CACHE[file]=module;new Function('require','module','exports',MODULES[file])(x=>load(x,file),module,module.exports);return module.exports;
}
const state=structuredClone(load('./src/domain/types.ts','/').defaults);state.preferences.onboarded=true;state.preferences.reduceMotion=true;
const bank=load('./src/data/bank.ts','/');const manifest=load('./content/sample-manifest.json','/');
function app(){const colors=load('./src/theme/tokens.ts','/').palette[theme];const access=tier==='paid'?{kind:'paid',full:true,label:'Ontario Complete',lifetime:true}:tier==='free'?{kind:'free',full:false,label:'FirstLane Free'}:{kind:'guest',full:false,label:'Guest access'};
 return {state,colors,access,identity:tier==='guest'?null:{id:'preview',email:'learner@example.test',confirmed:true},ready:true,reduceMotion:true,dark:theme==='dark',accessLoading:false,bankLoading:false,canRead:id=>load('./src/domain/access.mjs','/').canReadQuestion(id,access,manifest),setAccessGate:message=>note(message),begin:()=>{note('Start a quick session in the Expo app. This companion is for reviewing the visual design.');return false;},notify:note,patchPreferences:p=>{Object.assign(state.preferences,p);if(p.theme)theme=p.theme==='system'?'light':p.theme;render();},finishOnboarding:()=>{},purchaseDemo:async()=>note('No payment was made. This is a visual preview.'),reloadAccess:async()=>({}),toggleBookmark:()=>note()};
}
function setTheme(t){theme=t;state.preferences.theme=t;render();}
function setTier(t){tier=t;render();}
function setFixtureProgress(){const qs=bank.questions.slice(0,10);state.sessions=[{id:'preview-result',mode:'quick',title:'Daily practice',questionIds:qs.map(q=>q.id),answers:qs.map((q,i)=>({id:'a'+i,questionId:q.id,revisionId:q.revision_id,conceptId:q.concept_id,optionId:q.correct_option_id,correct:i<8,section:q.section,topic:q.topic,at:new Date().toISOString()})),startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),index:9}];render();}
const Value=class{constructor(v){this.value=v;}interpolate({inputRange,outputRange}){return outputRange[this.value>=inputRange[1]?1:0];}};
const RN={View:'View',Text:'Text',Pressable:'Pressable',TextInput:'TextInput',ScrollView:'ScrollView',Image:'Image',Switch:'Switch',ActivityIndicator:'ActivityIndicator',KeyboardAvoidingView:'View',Modal:({visible,children})=>visible?children:null,
 Platform:{OS:'web'},useWindowDimensions:()=>({width:document.getElementById('device').clientWidth,height:document.getElementById('device').clientHeight,fontScale:1,scale:1}),
 StyleSheet:{absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0},create:x=>x},Animated:{View:'View',Value,timing:()=>({start:()=>{}}),spring:()=>({start:()=>{}})},Linking:{openURL:()=>note()},useColorScheme:()=>theme};
const SVG={__esModule:true,default:'svg',Svg:'svg',Circle:'circle',G:'g',Line:'line',Path:'path',Rect:'rect',Polyline:'polyline',SvgXml:({xml,width,height})=>React.createElement('RawSVG',{xml,width,height})};
function Tabs(props){return React.createElement('View',{style:{flex:1,minHeight:0}},React.createElement(load('.'+ROUTES[screen],'/').default),props.tabBar());}Tabs.Screen=()=>null;
const svgns='http://www.w3.org/2000/svg';const svgTags=['svg','circle','g','line','path','rect','polyline'];
const nonPx=new Set(['opacity','flex','flexGrow','flexShrink','fontWeight','zIndex','order','aspectRatio','scale']);
function style(el,value){if(Array.isArray(value)){for(const v of value)style(el,v);return;}if(typeof value==='function'){style(el,value({pressed:false,hovered:false,focused:false}));return;}if(!value)return;
 for(let[k,v]of Object.entries(value)){if(v==null)continue;if(v instanceof Value)v=v.value;
  if(k==='paddingHorizontal'||k==='paddingVertical'||k==='marginHorizontal'||k==='marginVertical'){const b=k.startsWith('padding')?'padding':'margin',ends=k.endsWith('Horizontal')?['Left','Right']:['Top','Bottom'];for(const s of ends)style(el,{[b+s]:v});continue;}
  if(k==='transform'&&Array.isArray(v)){el.style.transform=v.map(o=>Object.entries(o).map(([name,n])=>`${name}(${n instanceof Value?n.value:n}${typeof n==='number'&&name.startsWith('translate')?'px':''})`).join(' ')).join(' ');continue;}
  if(k==='flex'&&typeof v==='number'){el.style.flex=v===1?'1 1 0%':String(v);continue;}
  if(k==='borderRadius'&&v===100){}if(k==='shadowColor'||k.startsWith('shadow')||k==='elevation')continue;
  if(k==='tintColor'||k==='textAlignVertical')continue;
  el.style[k]=typeof v==='number'&&!nonPx.has(k)?v+'px':v;
 }
}
function build(v,path='root',textParent=false){if(v==null||typeof v==='boolean')return document.createDocumentFragment();if(Array.isArray(v)){const frag=document.createDocumentFragment();v.forEach((c,i)=>frag.append(build(c,path+'-'+i,textParent)));return frag;}if(typeof v!=='object')return document.createTextNode(String(v));
 const {type,props={}}=v; if(type==='fragment')return build(props.children,path,textParent);
 if(typeof type==='function'){const previous=hookPath,index=hookIndex;hookPath=path+'-'+(type.name||'component');hookIndex=0;const result=type(props);hookPath=previous;hookIndex=index;return build(result,path+'-c',textParent);}
 const kind=type;let tag=({View:'div',Text:'span',Pressable:'div',TextInput:props.multiline?'textarea':'input',ScrollView:'div',Image:'img',Switch:'input',ActivityIndicator:'span',RawSVG:'div'})[kind]||type;
 const el=svgTags.includes(tag)?document.createElementNS(svgns,tag):document.createElement(tag);el.dataset.nodeid=path;
 if(['View','Pressable','ScrollView'].includes(kind))el.className='rn-view';if(kind==='Text'){el.className='rn-text';el.style.display=textParent?'inline':'block';}
 if(kind==='RawSVG'){el.innerHTML=props.xml;style(el,{width:props.width,height:props.height});const svg=el.querySelector('svg');if(svg){svg.setAttribute('width','100%');svg.setAttribute('height','100%');}return el;}
 style(el,props.style);if(!kind[0]?.match(/[A-Z]/)&&typeof props.style?.lineHeight==='number')el.style.lineHeight=String(props.style.lineHeight);
 if(kind==='Pressable'){if(props.accessibilityRole){el.setAttribute('role',props.accessibilityRole);el.tabIndex=props.disabled?-1:0;}if(!props.disabled){el.onclick=props.onPress;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();props.onPress?.();}};}if(props.accessibilityState?.selected!=null)el.setAttribute('aria-selected',props.accessibilityState.selected);if(props.accessibilityState?.checked!=null)el.setAttribute('aria-checked',props.accessibilityState.checked);}
 if(kind==='TextInput'){el.value=props.value||'';el.placeholder=props.placeholder||'';el.type=props.secureTextEntry?'password':'text';el.oninput=e=>props.onChangeText?.(e.target.value);el.onfocus=e=>{if(!rendering)props.onFocus?.(e);};el.onblur=e=>{if(!rendering)props.onBlur?.(e);};}
 if(kind==='Image'){el.src=props.source;el.alt=props.accessibilityLabel||'';el.style.objectFit='contain';}
 if(kind==='Switch'){el.type='checkbox';el.checked=!!props.value;el.onchange=e=>props.onValueChange?.(e.target.checked);}
 if(kind==='ActivityIndicator'){el.textContent='◌';style(el,{color:props.color,fontSize:22});}
 if(props.accessibilityLabel)el.setAttribute('aria-label',props.accessibilityLabel);
 if(svgTags.includes(tag)){for(const[k,val]of Object.entries(props)){if(['children','style','accessible','key'].includes(k)||val==null)continue;const attr=({strokeWidth:'stroke-width',strokeLinecap:'stroke-linecap',strokeLinejoin:'stroke-linejoin',strokeDasharray:'stroke-dasharray',strokeDashoffset:'stroke-dashoffset',fillRule:'fill-rule'})[k]||k;el.setAttribute(attr,String(val));}}
 if(!['View','Text','Pressable','TextInput','ScrollView','Image','Switch','ActivityIndicator'].includes(kind)&&!svgTags.includes(tag)){
  for(const[k,val]of Object.entries(props)){if(['children','style','key'].includes(k)||val==null)continue;if(k.startsWith('on'))el.addEventListener(k.slice(2).toLowerCase(),e=>{if(!rendering)val(e);});else if(k==='htmlFor')el.htmlFor=val;else if(k==='checked')el.checked=val;else if(k==='disabled')el.disabled=val;else el.setAttribute(k,String(val));}
 }
 if(kind==='ScrollView'){el.classList.add('rn-scroll');el.style.overflowY=props.horizontal?'hidden':'auto';el.style.overflowX=props.horizontal?'auto':'hidden';if(props.scrollEnabled===false)el.style.overflowY='visible';const inner=document.createElement('div');inner.className='rn-view';style(inner,props.contentContainerStyle);inner.append(build(props.children,path+'-scroll'));el.append(inner);}
 else if(!['Image','TextInput','Switch','ActivityIndicator'].includes(kind))el.append(build(props.children,path+'-children',textParent||kind==='Text'));
 if(props.numberOfLines&&kind==='Text'){el.style.overflow='hidden';el.style.display='-webkit-box';el.style.webkitLineClamp=props.numberOfLines;el.style.webkitBoxOrient='vertical';}
 return el;
}
function render(){const root=document.getElementById('root'),active=document.activeElement,nodeid=active?.dataset.nodeid,selection=active?.selectionStart,scrolls=[...root.querySelectorAll('.rn-scroll')].map(e=>[e.dataset.nodeid,e.scrollTop]);
 rendering=true;try{if(!ROUTES[screen])screen='home';if(screen==='topic'&&!params.id)params.id=bank.topics[0].id;const Page=load('.'+ROUTES[screen],'/').default;const Main=['home','study','progress','profile'].includes(screen)?load('./app/(tabs)/_layout.tsx','/').default:Page;root.replaceChildren(build(React.createElement(Main)));document.getElementById('route-picker').value=screen;document.getElementById('device').style.background=app().colors.background;document.getElementById('status').style.color=app().colors.text;
  for(const[id,top]of scrolls)root.querySelector(`[data-nodeid="${id}"]`)?.scrollTo(0,top);if(nodeid){const field=root.querySelector(`[data-nodeid="${nodeid}"]`);if(field&&active!==field){field.focus({preventScroll:true});try{if(selection!=null)field.setSelectionRange(selection,selection);}catch{}}}
 }catch(error){root.innerHTML='<pre id="error"></pre>';document.getElementById('error').textContent=error.stack;console.error(error);}finally{rendering=false;}
}
document.getElementById('brandmark').src=LOGO;const picker=document.getElementById('route-picker');for(const key of Object.keys(ROUTES)){const o=document.createElement('option');o.value=key;o.textContent=({study:'Practice',profile:'Account','sign-up':'Create account'})[key]||key[0].toUpperCase()+key.slice(1);picker.append(o);}picker.onchange=()=>{screen=picker.value;params={};states.clear();refs.clear();render();};if(new URLSearchParams(location.search).has('flat'))document.body.classList.add('flat');render();window.addEventListener('resize',()=>render());
