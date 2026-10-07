const {withAndroidManifest}=require('@expo/config-plugins');
module.exports=function(config){return withAndroidManifest(config,c=>{const activities=c.modResults.manifest.application?.[0]?.activity||[];for(const a of activities){if(a.$?.['android:name']?.endsWith('MainActivity'))a.$['android:launchMode']='singleTop';}return c;});};
