import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
const finishShader = {
 uniforms: {tDiffuse:{value:null}, time:{value:0}, fear:{value:0}, enabled:{value:1}, resolution:{value:new THREE.Vector2(1,1)}},
 vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader: `uniform sampler2D tDiffuse;uniform float time,fear,enabled;uniform vec2 resolution;varying vec2 vUv;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec2 p=vUv-.5;vec3 c=texture2D(tDiffuse,vUv).rgb;
 if(enabled>.5){ float paper=hash(vUv*resolution*.7);float brush=sin(vUv.x*620.+sin(vUv.y*80.)*3.)*sin(vUv.y*510.);
 float gray=dot(c,vec3(.3,.5,.2));vec3 warm=c*vec3(1.03,1.0,.9)+vec3(.009,.003,.012);c=mix(warm,vec3(gray*.7,gray*.84,gray),fear*.32);c+=(paper-.5)*.006+brush*.002;c*=1.-smoothstep(.22,.72,length(p))*.24; }
 gl_FragColor=vec4(c,1.);}`
};
export class View {
 constructor(canvas){
   this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
   this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.setClearAlpha(1);
   this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
   this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x172e39);this.scene.fog=new THREE.FogExp2(0x172e39,.027);
   this.camera=new THREE.PerspectiveCamera(68,1,.08,60);this.camera.rotation.order='YXZ';this.scene.add(this.camera);
   this.ambient=new THREE.HemisphereLight(0x86b6c1,0x42213e,.85);this.scene.add(this.ambient);
   this.flash=new THREE.SpotLight(0xffe5bf,45,19,Math.PI/6,.55,1.3);this.flash.castShadow=true;this.flash.shadow.bias=-.0003;this.flash.shadow.normalBias=.03;
   this.flash.position.set(.12,-.1,-.12);this.camera.add(this.flash);this.flash.target.position.set(0,0,-10);this.camera.add(this.flash.target);
   const cookie=document.createElement('canvas');cookie.width=cookie.height=128;const ctx=cookie.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffff');g.addColorStop(.45,'#ded9ca');g.addColorStop(1,'#000000');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
   this.cookie=new THREE.CanvasTexture(cookie);this.flash.map=this.cookie;
   this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
   this.outline=new OutlinePass(new THREE.Vector2(innerWidth,innerHeight),this.scene,this.camera);this.outline.edgeStrength=1.2;this.outline.edgeThickness=1;this.outline.visibleEdgeColor.set('#081b26');this.outline.hiddenEdgeColor.set('#4a364c');this.composer.addPass(this.outline);
   this.finish=new ShaderPass(finishShader);this.composer.addPass(this.finish);this.composer.addPass(new OutputPass());this.fxaa=new ShaderPass(FXAAShader);this.composer.addPass(this.fxaa);
   this.scale=1;this.post=true;this.fogOn=true;this.shadowQuality='medium';this.testLights=true;this.shadowSize=0;this.width=0;this.height=0;this.dpr=0;
   this.resize();
 }
 resize(){
   const w=innerWidth,h=innerHeight,dpr=devicePixelRatio||1;if(w===this.width&&h===this.height&&dpr===this.dpr&&this.lastScale===this.scale)return;
   this.width=w;this.height=h;this.dpr=dpr;this.lastScale=this.scale;
   this.renderer.setPixelRatio(dpr*this.scale);this.renderer.setSize(w,h,false);this.composer.setPixelRatio(dpr*this.scale);this.composer.setSize(w,h);
   this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.fxaa.uniforms.resolution.value.set(1/(w*dpr*this.scale),1/(h*dpr*this.scale));this.finish.uniforms.resolution.value.set(w*dpr*this.scale,h*dpr*this.scale);
 }
 selectInk(root){this.outline.selectedObjects.length=0;root.traverse(o=>{if(o.isMesh)this.outline.selectedObjects.push(o);});}
 quality(level){
   this.scale={low:.65,medium:.85,high:1}[level]||1;this.outline.enabled=this.post;this.outline.edgeStrength=level==='low'?.7:1.2;
   this.shadows(level==='high'?'high':level==='low'?'off':'medium');this.resize();
 }
 shadows(level){
   this.shadowQuality=level;this.onShadows?.(level);this.flash.castShadow=level!=='off';const size=level==='high'?2048:1024;
   if(size!==this.shadowSize){this.shadowSize=size;this.flash.shadow.mapSize.set(size,size);this.flash.shadow.map?.dispose();this.flash.shadow.map=null;}
 }
 setPost(on){this.post=on;this.outline.enabled=on; this.finish.uniforms.enabled.value=on?1:0;}
 render(time,fear,battery,on){
   this.resize();this.finish.uniforms.time.value=time;this.finish.uniforms.fear.value=fear;
   this.camera.fov=68+Math.sin(time*1.3)*fear*1.4;this.camera.updateProjectionMatrix();
   this.flash.visible=on&&battery>0;this.flash.intensity=(battery<15?30+Math.sin(time*31)*15:45)*(fear>.75?.8+Math.sin(time*17)*.15:1);

   this.scene.fog.density=this.fogOn?.027+fear*.015:0;
   this.renderer.info.reset();this.renderer.info.autoReset=false;this.composer.render();
 }
 dispose(){this.composer.passes.forEach(p=>p.dispose?.());this.composer.dispose();this.cookie.dispose();this.flash.shadow.map?.dispose();this.renderer.dispose();}
}
