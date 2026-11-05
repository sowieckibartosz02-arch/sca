import * as THREE from 'three';
import { View } from './render.js';
import { World } from './world.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Story } from './events.js';
import { Meta } from './meta.js';
const PAINTERLY=true;
const $=id=>document.getElementById(id), canvas=$('game');
const saveId=PAINTERLY?'afterimage-ink-v1':'afterimage-pbr-v1';
const notify=text=>{ $('notice').textContent=text; $('notice').style.opacity='1'; noticeTime=5; };
let noticeTime=0, state='menu', started=false, room='', testReturn=null, accumulator=0, last=performance.now(), elapsed=0, flickerUntil=0, fpsTime=0, fpsFrames=0, qualityTime=0, qualityFrames=0, fps=60, debug=false, hudTime=0;
let view,world;
try { view=new View(canvas);world=new World(view.scene,PAINTERLY);if(PAINTERLY)view.selectInk(world.root); }
catch(error){$('boot').textContent='WebGL2 lub moduły niedostępne: '+error.message;throw error;}
const input=new Input(canvas), sound=new Sound(), story=new Story(), meta=new Meta(saveId,notify);
const player=new THREE.Vector3(0,1.65,7.8), direction=new THREE.Vector3(), delta=new THREE.Vector3(), ghostDelta=new THREE.Vector3();
let yaw=0,pitch=0,footPhase=0,target=null,doorGoal=0,lightOn=true;
const progress={time:0,fear:.15,battery:100,key:false,radio:false,memory:false,door:false,signal:false};
const ghost={active:false,until:0,cooldown:20};
const objective=()=>!progress.radio?'Znajdź i włącz radio w salonie.':!progress.key?'Znajdź mosiężny klucz w gabinecie.':!progress.memory?'Otwórz sypialnię i zostań, aż powróci wspomnienie.':!progress.signal?'Poczekaj na ostatni sygnał radia. Zbadaj mieszkanie.':'Wróć do wejścia i użyj przełącznika przy drzwiach.';
$('memory').textContent=meta.visits>1?`Wizyta ${meta.visits}. Od poprzedniej minęło ${meta.absence} min. Mieszkanie pamięta.`:'Pierwsza wizyta. Radio zostawiono włączone, choć nikogo tu nie ma.';
$('boot').textContent='Gotowe. Krótka historia: około 3–5 minut. Przytrzymanie światła chroni przed lękiem.';
$('begin').disabled=false;
view.quality('high');
function flicker(seconds=2){flickerUntil=elapsed+seconds;sound.pulse(90,.3,.12,true);}
function spawn(){ghost.active=true;ghost.until=elapsed+8;world.ghost.position.set(player.x+Math.cos(yaw)*1.4,0,player.z+Math.sin(yaw)*1.4-2);world.ghost.visible=true;}
story.when('hall').then(()=>notify('Na ścianie jest cień. Brakuje przedmiotu, który go rzuca.')).then(()=>flicker(2),1.5);
story.when('radio').then(()=>{flicker(2);notify('„Klucz… w gabinecie. Nie ufaj temu, co stoi za tobą.”');}).then(()=>spawn(),3);
story.when('bedroom').then(()=>notify('Zostań przez chwilę. To wspomnienie potrzebuje ciszy.')).then(()=>{if(state==='play'||state==='test'){progress.memory=true;notify('Pamiętasz teraz, kto tu mieszkał. Radio zamilknie po ostatnim sygnale.');meta.illusion('loading');}},18);
story.when('signal').then(()=>{progress.signal=true;notify('Ostatni sygnał. Możesz już wyjść.');sound.pulse(440,1,.1);});
story.when('fear').then(()=>{spawn();notify('Nie patrz prosto. To istnieje tylko na obrzeżach wzroku.');});
function snapshot(){return {v:1,position:player.toArray(),yaw,pitch,progress:{...progress},events:story.snapshot(),storyTime:story.time,lightOn,doorGoal};}
function restore(data){
 if(data.v!==1||!Array.isArray(data.position)||data.position.length!==3||!data.position.every(Number.isFinite)||!data.progress||!['time','fear','battery'].every(k=>Number.isFinite(data.progress[k])))throw Error('Nieprawidłowy zapis');
 if(Math.abs(data.position[0])>9||Math.abs(data.position[2])>11)throw Error('Pozycja poza mapą');
 player.fromArray(data.position);yaw=Number.isFinite(data.yaw)?data.yaw:0;pitch=Number.isFinite(data.pitch)?data.pitch:0;Object.assign(progress,data.progress);progress.fear=THREE.MathUtils.clamp(progress.fear,0,1);progress.battery=THREE.MathUtils.clamp(progress.battery,0,100);
 story.restore(Array.isArray(data.events)?data.events:[]);story.time=data.storyTime||0;lightOn=data.lightOn!==false;doorGoal=progress.door?Math.PI*.5:0;world.door.rotation.y=doorGoal;world.key.visible=!progress.key;room='';ghost.active=false;world.ghost.visible=false;
 // A delayed memory is reconstructed explicitly because timer closures are never serialized.
 if(!progress.memory&&story.snapshot().includes('bedroom')){story.rules.get('bedroom')[0].fired=false;story.emit('bedroom');}
}
function save(){if(state==='test')return notify('Wróć z laboratorium przed zapisem.');try{localStorage.setItem(saveId,JSON.stringify(snapshot()));notify('Zapisano stan mieszkania.');}catch{notify('Przeglądarka zablokowała zapis.');}}
function load(){if(state==='test')return notify('Wróć z laboratorium przed odczytem.');try{const raw=localStorage.getItem(saveId);if(!raw)return notify('Brak zapisu.');restore(JSON.parse(raw));notify('Przywrócono wspomnienie.');}catch(e){notify('Odczyt nieudany: '+e.message);}}
function end(win){if(state==='end')return;state='end';document.exitPointerLock();sound.pause();$('endingTitle').textContent=win?'You can leave now.':'The room remembers you.';$('endingText').textContent=win?'Zabrałeś wspomnienie. Mieszkanie nie potrzebuje już świadka.':'Lęk wypełnił pokój. Włączaj latarkę i odpoczywaj przy radiu, aby odzyskać spokój.';$('ending').hidden=false;}
async function run(){
 try{await sound.start();sound.master.gain.value=Number($('volume').value);started=true;input.keys.clear();input.pressed.clear();state='play';$('start').hidden=true;$('pause').hidden=true;await canvas.requestPointerLock();}
 catch(e){notify('Kliknij obraz, aby przejąć mysz. '+e.message);if(started)pause();}
}
function pause(){if(!started||state==='end')return;if(state==='test')leaveTest();state='pause';$('pause').hidden=false;sound.pause();input.keys.clear();input.pressed.clear();}
function enterTest(){testReturn=snapshot();state='test';player.set(0,1.65,1);yaw=0;pitch=0;$('test').hidden=false;$('sanity').value=Math.round(progress.fear*100);document.exitPointerLock();notify('Sandbox aktywny. Ustaw parametry i kliknij scenę, aby chodzić.');}
function leaveTest(){if(!testReturn)return;restore(testReturn);testReturn=null;$('test').hidden=true;state='play';}
$('begin').onclick=run;$('resume').onclick=run;$('save').onclick=save;$('load').onclick=load;
$('restart').onclick=$('again').onclick=()=>location.reload();
canvas.onclick=()=>{if(started&&(state==='play'||state==='test'))canvas.requestPointerLock().catch(()=>notify('Nie udało się przejąć myszy.'));};
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&state==='play')pause();});
addEventListener('blur',()=>{if(state==='play')pause();else if(state==='test')sound.pause();});
$('quality').onchange=()=>{view.quality($('quality').value);$('scale').value=view.scale;$('shadows').value=view.shadowQuality;$('scaleValue').textContent=Math.round(view.scale*100)+'%';};
$('scale').oninput=()=>{view.scale=Number($('scale').value);$('scaleValue').textContent=Math.round(view.scale*100)+'%';view.resize();};
$('shadows').onchange=()=>view.shadows($('shadows').value);
$('post').onchange=()=>{view.setPost($('post').checked);$('testPost').checked=$('post').checked;};
$('volume').oninput=()=>{if(sound.master)sound.master.gain.value=Number($('volume').value);};
$('fog').onchange=()=>{view.fogOn=$('fog').checked;};$('lights').onchange=()=>{view.testLights=$('lights').checked;};
$('testPost').onchange=()=>{view.setPost($('testPost').checked);$('post').checked=$('testPost').checked;};
$('testShadows').onchange=()=>view.shadows($('testShadows').checked?'high':'off');
$('sanity').oninput=()=>{progress.fear=Number($('sanity').value)/100;};
$('spawn').onclick=spawn;$('flicker').onclick=()=>flicker(3);$('fake').onclick=()=>meta.illusion('crash');$('testExit').onclick=()=>{leaveTest();run();};
$('console').onsubmit=e=>{
 e.preventDefault();const [cmd,...args]=$('command').value.trim().split(/\s+/);let result='OK';
 if(cmd==='emit'){if(story.rules.has(args[0]))story.emit(args[0]);else result='Unknown event';}
 else if(cmd==='fear'){const value=Number(args[0]);if(Number.isFinite(value))progress.fear=THREE.MathUtils.clamp(value/100,0,1);else result='fear 0..100';}
 else if(cmd==='spawn')spawn();else if(cmd==='loading'||cmd==='crash')meta.illusion(cmd);
 else if(cmd==='flicker')flicker(3);else result='emit hall|radio|bedroom|signal|fear · fear 0..100 · spawn · flicker · loading · crash';
 $('consoleOutput').textContent=result;$('command').value='';
};
function interact(){
 if(target==='radio'){if(!progress.radio){progress.radio=true;story.emit('radio');}else{progress.fear=Math.max(.05,progress.fear-.12);progress.battery=Math.min(100,progress.battery+10);notify('Szum radia przywraca spokój. Ogniwo znów trzyma napięcie.');}sound.pulse(240,.25,.12,true);}
 if(target==='key'){progress.key=true;world.key.visible=false;notify('Mosiężny klucz. Pasuje do drzwi sypialni.');sound.pulse(800,.1,.08);}
 if(target==='door'){if(!progress.key)return notify('Zamknięte. Klucz leży w gabinecie.');progress.door=true;doorGoal=Math.PI*.5;notify('Drzwi ustępują.');sound.pulse(70,.7,.12,true);}
 if(target==='exit'){if(progress.signal&&progress.memory)end(true);else notify('Nie możesz wyjść, zanim wróci całe wspomnienie.');}
}
function update(dt){
 elapsed+=dt;input.sample();
 if(input.take('F3')){debug=!debug;$('debug').hidden=!debug;}
 if(input.take('F5'))save();if(input.take('F9'))load();
 if(input.take('Escape')){if(!$('illusion').hidden)$('illusion').hidden=true;else if(state==='play'){document.exitPointerLock();pause();}else if(state==='test'){leaveTest();pause();}}
 if(input.take('Backquote')){$('console').hidden=!$('console').hidden;if(!$('console').hidden){if(document.pointerLockElement)document.exitPointerLock();$('command').focus();}}
 if(input.take('KeyT')&&started&&state!=='end'){if(state==='test'){leaveTest();run();}else if(state==='play'||state==='pause'){ $('pause').hidden=true;enterTest(); }}
 if(state!=='play'&&state!=='test'){input.dx=input.dy=0;return;}
 const controlled=document.pointerLockElement===canvas;
 if(controlled){yaw-=input.dx*.002+input.turn*dt*2;pitch=THREE.MathUtils.clamp(pitch-input.dy*.002-input.look*dt*1.7,-1.35,1.35);}
 input.dx=input.dy=0;
 const f=controlled?input.forward:0,s=controlled?input.strafe:0;
 delta.set(Math.cos(yaw)*s-Math.sin(yaw)*f,0,-Math.sin(yaw)*s-Math.cos(yaw)*f);
 if(delta.lengthSq()>1)delta.normalize();delta.multiplyScalar(dt*(input.keys.has('ShiftLeft')?3.5:2.15));
 if(!world.blocked(player.x+delta.x,player.z))player.x+=delta.x;
 if(!world.blocked(player.x,player.z+delta.z))player.z+=delta.z;
 const moving=delta.lengthSq()>.000001;footPhase+=moving?dt*12:0;
 view.camera.position.copy(player);view.camera.position.y+=moving?Math.sin(footPhase)*.015:0;view.camera.rotation.set(pitch,yaw,0);view.camera.getWorldDirection(direction);
 if(input.take('KeyF'))lightOn=!lightOn;
 if(state==='play'){
  progress.time+=dt;progress.battery=Math.max(0,progress.battery-(lightOn?.15:0)*dt);
  const nearRadio=player.distanceToSquared(world.radio.position)<6;
  progress.fear=THREE.MathUtils.clamp(progress.fear+dt*(lightOn&&progress.battery>0?.0007:.0065)-(nearRadio&&progress.radio?dt*.035:0),0,1);
  if(progress.fear>.55)story.emit('fear');if(progress.fear>=1)end(false);
  const next=world.roomAt(player.x,player.z);if(next!==room){room=next;story.emit(room);const r=world.rooms.find(r=>r.id===room);sound.room(r?.volume||100);}
  if(progress.radio&&progress.memory&&progress.time>=180)story.emit('signal');
  story.update(dt);
 }
 world.door.rotation.y=THREE.MathUtils.damp(world.door.rotation.y,doorGoal,4,dt);
 target=null;let best=2.3;
 for(const [id,obj] of world.objects){if(id==='key'&&progress.key)continue;if(id==='door')ghostDelta.set(-1.48,1.2,-5);else ghostDelta.copy(obj.position);ghostDelta.sub(player);const distance=ghostDelta.length();ghostDelta.normalize();if(distance<best&&direction.dot(ghostDelta)>.55){target=id;best=distance;}}
 if(input.take('KeyE'))interact();
 if(ghost.active){ghostDelta.copy(world.ghost.position);ghostDelta.y=1.6;ghostDelta.sub(player).normalize();const dot=direction.dot(ghostDelta);if(dot>.94||elapsed>ghost.until){ghost.active=false;world.ghost.visible=false;}else world.ghost.visible=dot>-.15;}
 else if(progress.fear>.65&&elapsed>ghost.cooldown){ghost.cooldown=elapsed+28;spawn();}
 for(const l of world.lights)l.intensity=view.testLights?l.userData.base*(elapsed<flickerUntil?.15+.85*Math.abs(Math.sin(elapsed*32)):1):0;
 sound.update(dt,player,direction,progress.fear,moving,room==='bath'?'tile':'wood',elapsed);
}
function frame(now){
 const wallDt=Math.max(0,(now-last)/1000),realDt=Math.min(wallDt,.1);last=now;accumulator+=realDt;
 // Clamp catch-up to keep returning from a background tab responsive.
 let steps=0;while(accumulator>=1/60&&steps++<6){update(1/60);accumulator-=1/60;}
 if(steps>=6)accumulator=0;
 if(noticeTime>0){noticeTime-=realDt;if(noticeTime<=0)$('notice').style.opacity='0';}
 view.render(elapsed,progress.fear,progress.battery,lightOn);
 hudTime+=realDt;fpsTime+=wallDt;fpsFrames++;
 if(fpsTime>=.5){fps=fpsFrames/fpsTime;fpsFrames=0;fpsTime=0;}
 if(hudTime>.15){hudTime=0;$('objective').textContent=state==='test'?'LABORATORIUM / fabuła wstrzymana':objective();$('fear').value=progress.fear*100;$('battery').value=progress.battery;$('hint').textContent=target?`E — ${ {radio:'radio / odzyskaj spokój',key:'weź klucz',door:'otwórz drzwi',exit:'wyjdź'}[target]}`:'';$('clock').textContent=new Date().toLocaleTimeString();
 if(debug)$('debug').textContent=`${PAINTERLY?'INK / SELECTIVE OUTLINE':'PBR / NORMAL-DEPTH SSAO'}\nFPS ${fps.toFixed(0)} / target 60\nDraw calls ${view.renderer.info.render.calls}\nTriangles ${view.renderer.info.render.triangles}\nEntities ${world.root.children.length}\nState ${state} / ${room}\nFear ${(progress.fear*100).toFixed(0)}% / Battery ${progress.battery.toFixed(0)}%\nTime ${progress.time.toFixed(0)}s\nScale ${Math.round(view.scale*100)}% · DPR ${devicePixelRatio}\nVisits ${meta.visits}`;
 }
 if(state==='play'){
 qualityTime+=wallDt;qualityFrames++;
 if(qualityTime>=5){const measured=qualityFrames/qualityTime;if($('adaptive').checked){const old=view.scale;if(measured<53)view.scale=Math.max(.5,view.scale-.1);else if(measured>59)view.scale=Math.min(Number($('scale').value),view.scale+.05);if(old!==view.scale)view.resize();}qualityTime=qualityFrames=0;}
 }
 requestAnimationFrame(frame);
}
addEventListener('pagehide',()=>{input.dispose();meta.dispose();sound.dispose();world.dispose();view.dispose();},{once:true});
// Public authoring surface also allows the test harness to exercise real gameplay transitions.
window.lab={view,world,story,progress,player,teleport(x,z,angle=0,tilt=0){player.set(x,1.65,z);yaw=angle;pitch=tilt;},get state(){return state;},save,load,spawn,flicker,meta,interact,enterTest,leaveTest};
requestAnimationFrame(frame);
