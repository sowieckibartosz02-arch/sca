import * as THREE from 'three';

export class Decor {
  constructor(world){this.w=world;this.ink=world.painterly;this.maps=new Map();this.beams=[];this.rain=[];this.clockHands=[];this.particleMaterial=null;}
  material(name,draw,width=512,height=512,lit=true){
    if(this.maps.has(name))return this.maps.get(name);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d'),width,height);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    this.w.materials.textures.add(texture);
    const material=lit?(this.ink?new THREE.MeshToonMaterial({map:texture}):new THREE.MeshStandardMaterial({map:texture,roughness:.85})):new THREE.MeshBasicMaterial({map:texture});
    this.w.materials.materials.add(material);this.maps.set(name,material);return material;
  }
  plane(w,h,x,y,z,rotation,material,parent=this.w.staticRoot){
    const geometry=this.w.geometry(`plane:${w},${h}`,()=>new THREE.PlaneGeometry(w,h));
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  wallText(x,y,z,angle,text,w=.75,h=.3){
    const material=this.material('label:'+text,(c,W,H)=>{c.fillStyle=this.ink?'#d5b47c':'#c7b486';c.fillRect(0,0,W,H);c.fillStyle='#182c2d';c.textAlign='center';c.textBaseline='middle';c.font='bold '+Math.floor(H*.4)+'px Georgia';c.fillText(text,W/2,H/2,W*.9);},512,128);
    return this.plane(w,h,x,y,z,angle,material);
  }
  roomSign(x,y,z,id,angle){this.wallText(x,y,z,angle,({living:'01 · SALON',study:'02 · ARCHIVE',bedroom:'03 · MEMORY',bath:'04 · WASHROOM'})[id],.95,.19);}
  frame(x,y,z,angle,w,h,material){
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=angle;this.w.staticRoot.add(group);
    this.w.box(w+.12,h+.12,.065,0,0,-.012,'wood',this.w.palette.iron,false,group);
    for(const yy of [-h/2-.02,h/2+.02])this.w.box(w+.09,.035,.035,0,yy,.025,'metal',this.w.palette.trim,false,group);
    for(const xx of [-w/2-.02,w/2+.02])this.w.box(.035,h+.09,.035,xx,0,.025,'metal',this.w.palette.trim,false,group);
    this.plane(w,h,0,0,.045,0,material,group);return group;
  }
  painting(x,y,z,angle,kind='portrait',w=.9,h=1.15){
    const material=this.material('painting:'+kind,(c,W,H)=>{
      let seed=2401;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
      const grad=c.createLinearGradient(0,0,W,H);grad.addColorStop(0,this.ink?'#cd936d':'#5f5941');grad.addColorStop(1,this.ink?'#213f4f':'#202b28');c.fillStyle=grad;c.fillRect(0,0,W,H);
      if(kind==='landscape'){
        c.fillStyle=this.ink?'#e2b77d':'#9b997a';c.beginPath();c.arc(W*.7,H*.25,W*.12,0,Math.PI*2);c.fill();
        for(let row=0;row<4;row++){c.fillStyle=this.ink?['#75898b','#4d6d72','#325157','#19323a'][row]:['#626951','#485445','#344537','#20302a'][row];c.beginPath();c.moveTo(0,H);for(let i=0;i<=20;i++)c.lineTo(i*W/20,H*(.42+row*.12)+Math.sin(i*.65+row)*H*.07);c.lineTo(W,H);c.fill();}
        c.strokeStyle=this.ink?'#102b34':'#17271f';c.lineWidth=8;for(let i=0;i<11;i++){const xx=rnd()*W,hh=H*(.15+rnd()*.4);c.beginPath();c.moveTo(xx,H*.96);c.lineTo(xx,H*.96-hh);c.stroke();for(let j=0;j<6;j++){c.beginPath();c.moveTo(xx-hh*.25*(j/6),H*.96-hh+j*hh/8);c.lineTo(xx+hh*.25*(j/6),H*.96-hh+j*hh/8);c.stroke();}}
      }else{
        c.fillStyle=this.ink?'#203842':'#1a221e';c.beginPath();c.ellipse(W*.51,H*.83,W*.3,H*.35,0,0,Math.PI*2);c.fill();
        c.fillStyle=this.ink?'#b77762':'#7c6d52';c.beginPath();c.ellipse(W*.5,H*.39,W*.16,H*.23,-.05,0,Math.PI*2);c.fill();
        c.fillStyle=this.ink?'#182c37':'#20261f';c.beginPath();c.ellipse(W*.5,H*.23,W*.17,H*.12,-.05,Math.PI,Math.PI*2);c.fill();
        c.fillRect(W*.32,H*.32,W*.35,H*.065);c.fillStyle=this.ink?'#e4bc80':'#b4a381';c.fillRect(W*.46,H*.55,W*.09,H*.018);
      }
      for(let i=0;i<3000;i++){c.fillStyle=rnd()>.5?'rgba(230,209,161,.035)':'rgba(10,19,17,.04)';c.fillRect(rnd()*W,rnd()*H,1+rnd()*18,1+rnd()*3);}
      if(this.ink){c.strokeStyle='rgba(21,43,52,.18)';c.lineWidth=1;for(let i=0;i<180;i++){const xx=rnd()*W,yy=rnd()*H;c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+20,yy-10);c.stroke();}}
    });this.frame(x,y,z,angle,w,h,material);
  }
  rug(x,z,w,d,runner=false){
    const material=this.material('rug:'+runner,(c,W,H)=>{
      const base=this.ink?'#8f4c43':'#573c35',border=this.ink?'#d1a06d':'#978463';c.fillStyle=base;c.fillRect(0,0,W,H);
      for(const inset of [12,21,38,48]){c.strokeStyle=border;c.lineWidth=inset===38?9:2;c.strokeRect(inset,inset,W-inset*2,H-inset*2);}
      c.strokeStyle=border;c.lineWidth=3;for(let yy=75;yy<H-70;yy+=47)for(let xx=75;xx<W-70;xx+=47){c.beginPath();c.moveTo(xx,yy-15);c.lineTo(xx+12,yy);c.lineTo(xx,yy+15);c.lineTo(xx-12,yy);c.closePath();c.stroke();}
      c.fillStyle='rgba(229,214,176,.08)';for(let yy=0;yy<H;yy+=3)c.fillRect(0,yy,W,1);
      c.fillStyle='rgba(12,18,15,.1)';for(let xx=0;xx<W;xx+=3)c.fillRect(xx,0,1,H);
    });
    const mesh=this.plane(w,d,x,.011,z,0,material);mesh.rotation.x=-Math.PI/2;
    for(const side of [-1,1])this.w.box(w,.014,.024,x,.014,z+side*d/2,'fabric',this.ink?'#d1ae7b':'#b5a283');
  }
  pendant(x,z){
    const w=this.w;w.cylinder(.09,.09,.065,x,3.07,z,'metal',w.palette.iron);w.cylinder(.012,.012,.34,x,2.88,z,'metal',w.palette.iron);
    const shade=w.cylinder(.13,.36,.19,x,2.63,z,'metal',this.ink?'#447775':'#37524a');shade.material.side=THREE.DoubleSide;
    const inner=w.cylinder(.11,.31,.16,x,2.615,z,'ceramic','#c1ab79');inner.material.side=THREE.DoubleSide;
    w.sphere(.07,x,2.54,z,'#e6c994');const bulb=w.materials.get('bulb','#ffc780',true);const b=w.sphere(.055,x,2.53,z,'#e6c994');b.material=bulb;
    w.point(x,2.43,z,this.ink?0xffc18c:0xffc08a,this.ink?6:4.4,6.4);
  }
  tableLamp(x,y,z){
    const w=this.w;w.cylinder(.13,.15,.045,x,y+.025,z,'metal','#6f5a37');w.cylinder(.035,.055,.27,x,y+.18,z,'metal','#8d784b');
    const shade=w.cylinder(.16,.28,.3,x,y+.46,z,'fabric',this.ink?'#d3b481':'#c1ac80');shade.material.side=THREE.DoubleSide;
    w.cylinder(.18,.26,.018,x,y+.315,z,'wood','#463b2e');w.point(x,y+.34,z,0xffbd77,this.ink?3.4:2.7,5.5);
  }
  floorLamp(x,z){const w=this.w;w.cylinder(.25,.29,.045,x,.04,z);w.cylinder(.017,.017,1.72,x,.9,z,'metal','#7e6b48');const shade=w.cylinder(.23,.39,.42,x,1.85,z,'fabric',this.ink?'#d4ae7e':'#c6b28d');shade.material.side=THREE.DoubleSide;w.point(x,1.6,z,0xffbf81,this.ink?6:5,6);}
  sofa(x,z){
    const w=this.w,c=this.ink?'#ae695e':'#4c5752';
    w.box(2.35,.48,1.15,x,.35,z,'leather',c,true);
    w.box(2.35,.98,.25,x,.82,z+.52,'leather',c);
    for(const xx of [-1.04,1.04])w.box(.27,.65,1.12,x+xx,.62,z,'leather',c);
    for(const xx of [-.54,.54]){
      w.box(.93,.2,.86,x+xx,.64,z-.06,'fabric',this.ink?'#ba7d68':'#63675b');
      const cushion=w.box(.82,.48,.2,x+xx,.94,z+.34,'fabric',this.ink?'#aa695e':'#5c655b');cushion.rotation.x=.12;
      for(const zc of [-.45,.42])w.box(.87,.008,.008,x+xx,.748,z+zc,'fabric','#c2a584');
    }
    const pillow=w.box(.45,.38,.16,x-.75,.95,z+.12,'fabric',this.ink?'#d5aa73':'#a3916e');pillow.rotation.z=.32;pillow.rotation.x=.15;
    for(const xx of [-.94,.94])for(const zz of [-.38,.38])w.cylinder(.035,.027,.2,x+xx,.12,z+zz,'wood','#332b23');
  }
  cabinet(x,z,depth,width,height,angle=0){
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;this.w.staticRoot.add(group);const w=this.w;
    w.colliders.push({x,z,hx:Math.abs(Math.cos(angle))*width/2+Math.abs(Math.sin(angle))*depth/2,hz:Math.abs(Math.sin(angle))*width/2+Math.abs(Math.cos(angle))*depth/2});
    w.box(width,height,depth,0,height/2+.18,0,'wood',w.palette.wood,false,group);
    w.box(width+.08,.06,depth+.06,0,height+.21,0,'wood',w.palette.trim,false,group);
    for(const xx of [-width*.35,width*.35])w.box(.07,.18,depth*.7,xx,.09,0,'wood',w.palette.iron,false,group);
    for(const xx of [-width/4,width/4]){
      w.box(width/2-.04,height-.07,.028,xx,height/2+.18,depth/2+.02,'wood',w.palette.panel,false,group);
      w.box(.08,.035,.04,xx,height/2+.23,depth/2+.05,'metal','#b69960',false,group);
    }
    return group;
  }
  bed(x,z){
    const w=this.w;w.box(2.2,.48,2.8,x,.3,z,'wood',w.palette.wood,true);
    w.box(2.35,1.2,.16,x,.75,z-1.4,'wood',w.palette.panel);
    for(const xx of [-.9,.9])w.box(.08,1.35,.2,x+xx,.72,z-1.4,'wood',w.palette.trim);
    w.box(2.12,.24,2.65,x,.66,z,'fabric',this.ink?'#baa589':'#c5b99f');
    const cover=w.box(2.15,.15,1.93,x,.83,z+.3,'fabric',this.ink?'#527f7b':'#5a7068');
    for(const xx of [-.6,.6]){const pillow=w.box(.82,.2,.5,x+xx,.89,z-.9,'fabric',this.ink?'#debc86':'#d5c9ad');pillow.rotation.y=xx*.11;}
    for(let i=0;i<7;i++)w.box(.014,.018,1.85,x-.9+i*.3,.916,z+.3,'fabric',this.ink?'#a9ae8b':'#829284');
    w.box(2.2,.25,.13,x,.95,z+1.31,'fabric',this.ink?'#a07960':'#69756b');
  }
  desk(x,z){
    const w=this.w;w.box(2,.12,.9,x,.85,z,'wood',w.palette.wood,true);
    for(const xx of [-.8,.8])w.box(.12,.8,.7,x+xx,.4,z,'wood',w.palette.panel);
    for(const yy of [.22,.43,.64]){w.box(.6,.18,.66,x+.6,yy,z,'wood',w.palette.wood);w.box(.12,.027,.04,x+.6,yy,z+.36,'metal','#a49164');}
    w.box(.7,.47,.55,x,.35,z+1,'leather',this.ink?'#9b6158':'#484f49',true);w.box(.7,.55,.12,x,.72,z+1.22,'wood',w.palette.panel);
    for(const xx of [-.27,.27])for(const zz of [-.18,.18])w.box(.05,.22,.05,x+xx,.11,z+1+zz,'wood',w.palette.iron);
    const typewriter=w.box(.55,.12,.38,x+.5,.97,z-.17,'metal',this.ink?'#3c5960':'#38453e');typewriter.rotation.x=.08;
    for(let row=0;row<3;row++)for(let key=0;key<10;key++)w.cylinder(.016,.016,.014,x+.26+key*.05,1.05+row*.009,z-.04-row*.075,'ceramic','#bcb49e');
    const paper=w.box(.43,.32,.012,x+.5,1.18,z-.32,'paper','#d3c6a1');paper.rotation.x=-.15;
    this.wallText(x+.5,1.2,z-.305,0,'DO NOT TURN AROUND',.37,.18);
    this.paper(x-.42,.919,z+.1,.32,.22,-.1);this.cup(x-.78,.92,z+.14);
    w.box(.28,.05,.21,x,.93,z-.1,'paper','#c3b28b');
  }
  bookshelf(x,z,angle){
    const w=this.w,group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;w.staticRoot.add(group);
    w.colliders.push({x,z,hx:Math.abs(Math.cos(angle))*.87+Math.abs(Math.sin(angle))*.26,hz:Math.abs(Math.sin(angle))*.87+Math.abs(Math.cos(angle))*.26});
    w.box(1.6,2.5,.08,0,1.3,-.24,'wood',w.palette.panel,false,group);
    for(const xx of [-.82,.82])w.box(.1,2.6,.5,xx,1.3,0,'wood',w.palette.wood,false,group);
    const colors=this.ink?['#c38d65','#477879','#ad6456','#c5b18b','#314b5a']:['#765b40','#4b6050','#6d423c','#a39270','#3b4d55'];
    for(let row=0;row<5;row++){
      const y=.15+row*.5;w.box(1.7,.055,.52,0,y,0,'wood',w.palette.wood,false,group);
      for(let i=0;i<12;i++){
        const h=.25+((i*7+row*3)%5)*.035,xx=-.72+i*.125;
        const book=w.box(.09,h,.3,xx,y+h/2+.03,.035,'paper',colors[(i+row)%colors.length],false,group);
        if(i===8)book.rotation.z=.13;
        w.box(.07,.011,.005,xx,y+h*.7,.191,'metal',this.ink?'#b9a17c':'#a9956b',false,group);
      }
    }
  }
  radiator(x,z,angle,width=1.1){
    const w=this.w,group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;w.staticRoot.add(group);
    for(let i=0;i<10;i++)w.box(width/13,.65,.16,(i-4.5)*width/10,.49,0,'metal',this.ink?'#d6b38b':'#b0aa92',false,group);
    for(const y of [.25,.75])w.box(width+.1,.065,.09,0,y,-.08,'metal',w.palette.iron,false,group);
    w.cylinder(.025,.025,.3,width*.48,.17,0,'metal',w.palette.trim,group);w.cylinder(.04,.04,.04,width*.48,.8,0,'metal',w.palette.iron,group);
  }
  vase(x,y,z){const w=this.w;w.cylinder(.065,.12,.34,x,y+.17,z,'ceramic',this.ink?'#c1a17b':'#a58d68');w.cylinder(.09,.065,.1,x,y+.39,z,'ceramic',this.ink?'#c1a17b':'#a58d68');for(let i=0;i<5;i++){const stem=w.cylinder(.003,.003,.7,x+(i-2)*.025,y+.7,z,'wood','#4e5740');stem.rotation.z=(i-2)*.09;for(let j=0;j<3;j++){const leaf=w.sphere(.045,x+(i-2)*.035,y+.55+j*.12,z+(i%2)*.04,'#52654b');leaf.scale.set(1,.22,1.7);}}}
  cup(x,y,z){const w=this.w;w.cylinder(.055,.045,.13,x,y+.065,z,'ceramic',this.ink?'#d1b18a':'#b6ad93');w.cylinder(.048,.048,.005,x,y+.131,z,'wood','#29241c');const ring=new THREE.Mesh(w.geometry('cupHandle',()=>new THREE.TorusGeometry(.035,.008,8,12)),w.materials.get('ceramic',this.ink?'#d1b18a':'#b6ad93'));ring.position.set(x+.06,y+.08,z);w.staticRoot.add(ring);}
  paper(x,y,z,w=.28,d=.22,angle=0){
    const material=this.material('handwritten',(c,W,H)=>{c.fillStyle='#d6c6a4';c.fillRect(0,0,W,H);c.strokeStyle='#4a4e3e';c.lineWidth=2;for(let row=0;row<13;row++){c.beginPath();const yy=45+row*30;for(let j=0;j<50;j++){const xx=40+j*8;if(!j)c.moveTo(xx,yy);else c.lineTo(xx,yy+Math.sin(j*.8+row)*3);}c.stroke();}c.fillStyle='#7d4637';c.font='32px Georgia';c.fillText('remember',50,H-25);});
    const page=this.plane(w,d,x,y,z,0,material);page.rotation.x=-Math.PI/2;page.rotation.z=angle;
  }
  coffeeTableStillLife(x,y,z){const w=this.w;for(let i=0;i<3;i++){const b=w.box(.31,.035,.23,x+.42,y+.02+i*.035,z-.16,'paper',[w.palette.panel,w.palette.cloth,w.palette.trim][i]);b.rotation.y=i*.11;}w.cylinder(.07,.075,.025,x-.32,y+.017,z+.12,'metal','#6f7565');}
  bathroom(x,z){
    const w=this.w;w.box(.9,.7,.5,x,.35,z,'ceramic',this.ink?'#d3c29e':'#aaa993',true);w.box(1.1,.12,.7,x,.8,z,'ceramic',this.ink?'#e0c59a':'#d1c9ae');
    w.cylinder(.025,.025,.23,x,.98,z-.21,'metal','#7b8b87');const spout=w.cylinder(.023,.023,.18,x,1.08,z-.13,'metal','#7b8b87');spout.rotation.x=Math.PI/2;
    const mirror=this.material('mirror',(c,W,H)=>{const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#2b4345');g.addColorStop(.4,this.ink?'#91ac9f':'#6c8781');g.addColorStop(1,'#1c3235');c.fillStyle=g;c.fillRect(0,0,W,H);c.strokeStyle='rgba(196,221,198,.13)';for(let i=0;i<20;i++){c.beginPath();c.moveTo(i*W/20,0);c.bezierCurveTo(i*W/20+15,H*.3,i*W/20-8,H*.7,i*W/20,H);c.stroke();}});
    this.frame(x,1.65,-8.865,0,1.2,1.25,mirror);
    this.radiator(7.3,-8.7,0,1.1);this.paper(x+.3,.87,z+.1,.15,.2,.03);
    w.box(1.1,1.5,.15,7.6,.85,-8.65,'fabric',this.ink?'#a3b59a':'#9da794');
  }
  radio(parent){
    const w=this.w;w.box(.47,.26,.018,0,0,.15,'fabric','#91876c',false,parent);
    for(let i=0;i<15;i++)w.box(.009,.2,.01,-.205+i*.022,0,.166,'wood',w.palette.iron,false,parent);
    const dial=this.material('radioDial',(c,W,H)=>{c.fillStyle='#cbb97b';c.fillRect(0,0,W,H);c.strokeStyle='#303d32';c.lineWidth=2;for(let i=0;i<45;i++){let xx=12+i*(W-24)/45;c.beginPath();c.moveTo(xx,H*.2);c.lineTo(xx,H*(i%5===0?.75:.5));c.stroke();}c.fillStyle='#9f4c34';c.fillRect(W*.6,5,4,H-10);},512,64);
    this.plane(.35,.045,0,.08,.18,0,dial,parent);
    for(const xx of [-.15,.15]){const knob=w.cylinder(.027,.027,.035,xx,-.09,.18,'metal','#b19b65',parent,16);knob.rotation.x=Math.PI/2;}
    const aerial=w.cylinder(.004,.004,.58,.17,.42,-.06,'metal','#b1b1a2',parent);aerial.rotation.z=-.22;
    w.box(.25,.025,.025,0,.2,0,'wood','#a48256',false,parent);
  }
  entryDoor(){
    const w=this.w;w.box(1.5,2.6,.085,-.35,1.3,9.83,'wood',w.palette.panel);
    for(const x of [-1.12,.42])w.box(.11,2.75,.12,x,1.37,9.74,'wood',w.palette.trim);
    w.box(1.64,.11,.12,-.35,2.75,9.74,'wood',w.palette.trim);
    for(const y of [.62,1.76])w.box(1.2,.9,.03,-.35,y,9.77,'wood',w.palette.wood);
    this.wallText(-.35,2.1,9.735,Math.PI,'NO. 17',.36,.15);
    const peephole=w.cylinder(.017,.017,.03,-.35,1.75,9.72,'metal','#b6985c');peephole.rotation.x=Math.PI/2;
    w.box(.17,.045,.06,.18,1.05,9.71,'metal','#b6985c');
  }
  window(x,y,z,angle=0){
    const w=this.w,group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=angle;w.staticRoot.add(group);
    const side=x<0?1:-1;
    // The recessed assembly uses opaque rain-painted glass, keeping the demo asset-free.
    w.box(.1,1.75,2.0,0,0,0,'wood',w.palette.iron,false,group);
    const glass=this.material('rainGlass',(c,W,H)=>{
      const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,this.ink?'#5e9d9b':'#456d77');g.addColorStop(.6,this.ink?'#264d62':'#213b46');g.addColorStop(1,'#101f29');c.fillStyle=g;c.fillRect(0,0,W,H);
      for(let i=0;i<100;i++){const xx=(i*83.27)%W,yy=(i*53.61)%H;c.strokeStyle='rgba(177,218,215,.12)';c.lineWidth=1+i%2;c.beginPath();c.moveTo(xx,yy);c.bezierCurveTo(xx-3,yy+20,xx+5,yy+70,xx+1,yy+100+i%80);c.stroke();}
      c.fillStyle='rgba(7,18,25,.55)';for(let i=0;i<14;i++){const xx=i*43;c.fillRect(xx,H*.72+Math.sin(i)*20,18,H*.3);}
    },512,512,false);
    const pane=this.plane(1.78,1.5,side*.063,0,0,side*Math.PI/2,glass,group);
    if(!this.rainMaterial){
      this.rainMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},
        vertexShader:'varying vec2 vRainUv;void main(){vRainUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'uniform float time;varying vec2 vRainUv;void main(){float lane=floor(vRainUv.x*47.);float seed=fract(sin(lane*123.47)*4567.89);float x=fract(vRainUv.x*47.);float y=fract(vRainUv.y*3.+time*(.17+seed*.22)+seed*11.);float streak=pow(max(0.,1.-abs(x-.5)*2.),16.)*pow(1.-y,11.);gl_FragColor=vec4(.63,.83,.87,streak*.24);}'
      });w.materials.materials.add(this.rainMaterial);
    }
    this.plane(1.78,1.5,side*.071,0,0,side*Math.PI/2,this.rainMaterial,group);
    w.box(.18,.055,1.85,side*.075,0,0,'wood',w.palette.trim,false,group);
    w.box(.18,1.6,.055,side*.075,0,0,'wood',w.palette.trim,false,group);
    w.box(.42,.075,2.25,side*.1,-.87,0,'wood',w.palette.trim,false,group);
    w.cylinder(.025,.025,2.65,side*.15,1.0,0,'metal',w.palette.iron,group).rotation.x=Math.PI/2;
    for(const zz of [-1.04,1.04]){
      const geometry=w.geometry('curtain',()=>{const geo=new THREE.PlaneGeometry(.6,2.25,16,20),pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const xx=pos.getX(i),yy=pos.getY(i);pos.setZ(i,Math.sin(xx*30)*.05*(.5+(1.2-yy)*.25));}geo.computeVertexNormals();return geo;});
      const curtain=new THREE.Mesh(geometry,w.materials.get('fabric',this.ink?'#a66657':'#7d6a55'));curtain.material.side=THREE.DoubleSide;curtain.position.set(side*.18,-.14,zz);curtain.rotation.y=side*Math.PI/2;curtain.castShadow=curtain.receiveShadow=true;group.add(curtain);
    }
    this.radiator(x+side*.17,z,Math.PI/2,1.6);
    const moon=new THREE.SpotLight(this.ink?0x90d8d0:0x93bdd4,this.ink?24:20,13,.66,.7,1.45);moon.position.set(x+side*.22,2.45,z-.2);moon.target.position.set(x+side*5,.1,z+1.7);moon.userData.base=moon.intensity;moon.userData.flickers=false;
    moon.castShadow=true;moon.shadow.autoUpdate=false;moon.shadow.needsUpdate=true;moon.shadow.mapSize.set(1024,1024);moon.shadow.bias=-.00025;moon.shadow.normalBias=.035;w.root.add(moon,moon.target);w.lights.push(moon);if(w.shadowLights.length<2)w.shadowLights.push(moon);else moon.castShadow=false;
    this.beam(x+side*.24,z,side);
  }
  beam(x,z,side){
    const w=this.w,geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([x,2.6,z-.7,x,2.6,z+.7,x+side*4.7,.06,z+2.5,x+side*4.7,.06,z-.2],3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,2,1,0,3,2]);geometry.computeVertexNormals();w.geometries.add(geometry);
    const material=this.material('beam',(c,W,H)=>{const image=c.createImageData(W,H);for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++){const i=(yy*W+xx)*4,a=Math.pow(Math.sin(xx/W*Math.PI),2)*Math.sin(yy/H*Math.PI)*.055;image.data[i]=130;image.data[i+1]=188;image.data[i+2]=206;image.data[i+3]=a*255;}c.putImageData(image,0,0);},128,128,false);
    material.transparent=true;material.depthWrite=false;material.side=THREE.DoubleSide;material.blending=THREE.AdditiveBlending;material.toneMapped=false;
    const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=1;w.root.add(mesh);this.beams.push(mesh);
  }
  particles(){
    const w=this.w,positions=new Float32Array(220*3);for(let i=0;i<220;i++){positions[i*3]=Math.sin(i*127.2)*1.2;positions[i*3+1]=.3+(i*1.618%1)*2.5;positions[i*3+2]=-9+(i*3.137%1)*18;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));w.geometries.add(geometry);
    this.particleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'uniform float time;varying float alpha;void main(){vec3 p=position;p.x+=sin(time*.13+position.z)*.07;p.y+=sin(time*.19+position.x)*.12;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(14./max(1.,-mv.z),1.,4.);alpha=.11+sin(position.z*3.)*.07;}',fragmentShader:'varying float alpha;void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.64,.74,.72,alpha*max(0.,1.-d));}'});
    w.materials.materials.add(this.particleMaterial);this.dust=new THREE.Points(geometry,this.particleMaterial);w.root.add(this.dust);
  }
  update(time,dt){if(this.particleMaterial)this.particleMaterial.uniforms.time.value=time;if(this.rainMaterial)this.rainMaterial.uniforms.time.value=time;const visible=this.w.fogEnabled!==false;for(const beam of this.beams)beam.visible=visible;if(this.dust)this.dust.visible=visible;}
  dispose(){this.maps.clear();this.beams.length=0;this.rain.length=0;this.clockHands.length=0;this.particleMaterial=null;}
}
