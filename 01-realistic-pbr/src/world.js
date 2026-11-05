import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Materials } from './materials.js';
import { Decor } from './decor.js';

export class World {
  constructor(scene, painterly) {
    this.scene=scene;this.painterly=painterly;this.materials=new Materials(painterly);
    this.geometries=new Set();this.geometryCache=new Map();this.colliders=[];this.lights=[];
    this.objects=new Map();this.loaded=[];this.disposed=false;this.shadowLights=[];this.lastDoorAngle=0;
    this.palette=painterly?{wall:'#9caca0',panel:'#22484e',trim:'#bd9165',wood:'#845b43',cloth:'#ae695e',iron:'#273e4c'}:{wall:'#b7aa8e',panel:'#273e38',trim:'#74674c',wood:'#514032',cloth:'#51494b',iron:'#252c2c'};
    this.rooms=[{id:'hall',x:0,z:0,w:3,d:20,volume:150},{id:'living',x:-5,z:3,w:7,d:7,volume:160},{id:'study',x:5,z:2,w:7,d:6,volume:140},{id:'bedroom',x:-5,z:-5,w:7,d:6,volume:140},{id:'bath',x:5,z:-6,w:7,d:6,volume:130}];
    this.root=new THREE.Group();this.staticRoot=new THREE.Group();this.root.add(this.staticRoot);scene.add(this.root);
    this.decor=new Decor(this);this.build();this.batchStatic();
  }
  geometry(key,make){if(!this.geometryCache.has(key)){const geometry=make();this.geometries.add(geometry);this.geometryCache.set(key,geometry);}return this.geometryCache.get(key);}
  box(w,h,d,x,y,z,kind='plaster',color=this.palette.wall,solid=false,parent=this.staticRoot) {
    // Hard surfaces use millimetre bevels; upholstery keeps a physically softer edge.
    const edge=kind==='fabric'?.018:kind==='leather'?.025:kind==='ceramic'?.008:kind==='paper'?.001:kind==='metal'?.003:.004;
    const radius=Math.min(edge,w/6,h/6,d/6);
    const geometry=this.geometry(`box:${w},${h},${d},${radius}`,()=>new RoundedBoxGeometry(w,h,d,1,radius));
    const mesh=new THREE.Mesh(geometry,this.materials.get(kind,color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    if(solid)this.colliders.push({x,z,hx:w/2,hz:d/2});return mesh;
  }
  cylinder(top,bottom,height,x,y,z,kind='metal',color=this.palette.iron,parent=this.staticRoot,segments=20){
    const geometry=this.geometry(`cylinder:${top},${bottom},${height},${segments}`,()=>new THREE.CylinderGeometry(top,bottom,height,segments));
    const mesh=new THREE.Mesh(geometry,this.materials.get(kind,color));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  sphere(radius,x,y,z,color,parent=this.staticRoot,kind='ceramic'){
    const geometry=this.geometry(`sphere:${radius}`,()=>new THREE.SphereGeometry(radius,16,10));
    const mesh=new THREE.Mesh(geometry,this.materials.get(kind,color));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  wall(x,z,w,d){
    const {wall,panel,trim}=this.palette;
    this.box(w,3.2,d,x,1.6,z,'plaster',wall,true);
    const alongZ=d>w,length=alongZ?d:w;
    for(const side of [-1,1]){
      const face=(alongZ?w:d)/2+.012;
      if(alongZ){
        this.box(.028,.95,d,x+side*face,.49,z,'wood',panel);
        for(const [y,h] of [[.1,.15],[1.0,.045],[1.07,.03],[3.03,.13],[3.12,.065]])this.box(.075,h,d,x+side*(face+.02),y,z,'wood',y>2?trim:panel);
      }else{
        this.box(w,.95,.028,x,.49,z+side*face,'wood',panel);
        for(const [y,h] of [[.1,.15],[1.0,.045],[1.07,.03],[3.03,.13],[3.12,.065]])this.box(w,h,.075,x,y,z+side*(face+.02),'wood',y>2?trim:panel);
      }
      const count=Math.floor(length/.85);
      for(let i=0;i<count;i++){
        const pos=-length/2+(i+.5)*length/count;
        if(alongZ)this.box(.04,.72,.025,x+side*(face+.03),.56,z+pos,'wood',trim);
        else this.box(.025,.72,.04,x+pos,.56,z+side*(face+.03),'wood',trim);
      }
    }
  }
  point(x,y,z,color,power,distance=8){
    const light=new THREE.PointLight(color,power,distance,2);light.position.set(x,y,z);light.userData.base=power;this.root.add(light);this.lights.push(light);return light;
  }
  room({id,x,z,w,d}) {
    this.box(w,.15,d,x,-.08,z,id==='bath'?'tile':'wood',id==='bath'?(this.painterly?'#9aa499':'#8f9383'):this.palette.wood);
    this.box(w,.1,d,x,3.2,z,'plaster',this.painterly?'#394e59':'#46433b');
    if(id!=='hall'){
      const near=x<0?x+w/2:x-w/2,far=x<0?x-w/2:x+w/2;
      this.wall(far,z,.18,d);this.wall(x,z-d/2,w,.18);this.wall(x,z+d/2,w,.18);
      this.wall(near,z-d/4-.45,.18,d/2-.9);this.wall(near,z+d/4+.45,.18,d/2-.9);
      this.box(.24,.76,1.9,near,2.82,z,'wood',this.palette.panel);
      for(const side of [-1,1]){
        this.box(.28,2.45,.13,near,1.22,z+side*.94,'wood',this.palette.trim);
        this.box(.29,.07,2.02,near,2.47,z,'wood',this.palette.trim);
      }
      this.decor.roomSign(near+(x<0?.15:-.15),2.63,z,id,x<0?Math.PI/2:-Math.PI/2);
    }
  }
  build(){
    for(const room of this.rooms)this.room(room);
    this.wall(0,10,3,.2);this.wall(0,-10,3,.2);
    for(const [x,a,b] of [[-1.5,-10,-8],[-1.5,-2,-.5],[-1.5,6.5,10],[1.5,-10,-9],[1.5,-3,-1],[1.5,5,10]])this.wall(x,(a+b)/2,.18,b-a);
    // Architectural depth is visible immediately from the start, before the flashlight is enabled.
    this.decor.rug(0,1.8,1.75,14.7,true);
    for(const z of [7.3,-1.2,-8.8])this.decor.pendant(0,z);
    this.decor.painting(1.365,1.95,7.65,-Math.PI/2,'portrait');
    this.decor.painting(-1.365,1.95,-1.25,Math.PI/2,'landscape');
    this.decor.painting(0,1.95,-9.865,0,'portrait');
    this.decor.radiator(1.27,7.9,Math.PI/2,.95);
    this.decor.entryDoor();
    this.decor.sofa(-5,3);
    this.box(1.5,.12,1,-5,.61,1,'wood',this.palette.wood,true);
    for(const x of [-5.6,-4.4])for(const z of [.65,1.35])this.box(.065,.55,.065,x,.28,z,'wood',this.palette.wood);
    this.decor.rug(-5,2.3,4.2,4.6);
    this.decor.cabinet(-7.7,.3,.7,2.5,.62,Math.PI/2);
    this.decor.floorLamp(-7.35,4.9);
    this.decor.painting(-5.2,1.95,6.36,Math.PI,'landscape',1.8,1.05);
    this.decor.bookshelf(-7.85,5.5,Math.PI/2);
    this.decor.vase(-7.7,.86,.25);
    this.decor.paper(-4.55,.69,1.1,.31,.2,.1);
    this.decor.cup(-5.5,.7,.85);
    this.decor.coffeeTableStillLife(-5,.69,1);
    this.decor.bed(-5,-5);
    this.decor.cabinet(-7.6,-5.4,.55,1.2,.5,Math.PI/2);
    this.decor.tableLamp(-7.5,.74,-5.3);
    this.decor.painting(-5,2.0,-7.86,0,'portrait',1.15,1.35);
    this.decor.rug(-5.2,-5.2,4.4,4.6);
    this.decor.desk(5,2);
    this.decor.bookshelf(7.86,.1,-Math.PI/2);
    this.decor.painting(5.5,1.95,4.86,Math.PI,'landscape',1.5,.95);
    this.decor.rug(5,2.4,3.7,3.8);
    this.decor.tableLamp(4.25,.918,1.8);
    this.decor.bathroom(5,-6);
    this.decor.window(-8.37,1.9,3);
    this.decor.window(-8.37,1.9,-5);
    this.decor.window(8.37,1.9,2);
    this.door=new THREE.Group();this.door.position.set(-1.48,0,-5.85);this.root.add(this.door);
    this.box(.1,2.35,1.7,0,1.175,.85,'wood',this.palette.panel,false,this.door);
    for(const side of [-1,1]){
      for(const y of [.6,1.65]){
        this.box(.018,.73,1.25,side*.061,y,.85,'wood',this.palette.wood,false,this.door);
        for(const z of [.21,1.49])this.box(.02,.78,.025,side*.076,y,z,'wood',this.palette.trim,false,this.door);
        for(const yy of [y-.39,y+.39])this.box(.02,.025,1.3,side*.076,yy,.85,'wood',this.palette.trim,false,this.door);
      }
    }
    this.box(.2,.055,.15,.12,1.05,1.4,'metal','#b59e63',false,this.door);this.objects.set('door',this.door);
    this.key=this.box(.18,.035,.08,5,.97,1.9,'metal','#e1bd65',false,this.root);this.objects.set('key',this.key);
    const keyRing=new THREE.Mesh(this.geometry('keyRing',()=>new THREE.TorusGeometry(.045,.012,8,20)),this.materials.get('metal','#e1bd65'));keyRing.rotation.x=Math.PI/2;keyRing.position.set(-.11,0,0);this.key.add(keyRing);
    for(const xx of [.04,.075])this.box(.018,.035,.035,xx,0,.048,'metal','#e1bd65',false,this.key);
    this.radio=this.box(.54,.33,.28,-5,.83,1,'wood',this.painterly?'#7b4a47':'#4b2f22',false,this.root);
    this.decor.radio(this.radio);this.objects.set('radio',this.radio);
    this.switch=this.box(.12,.25,.06,.8,1.4,9.85,'metal','#ad9d77',false,this.root);this.objects.set('exit',this.switch);
    this.box(.065,.09,.025,0,0,-.045,'ceramic','#e5d4ad',false,this.switch);
    this.decor.wallText(.8,1.73,9.83,Math.PI,'RELEASE',.35,.14);
    this.ghost=new THREE.Group();this.ghost.position.set(1,0,-8);this.root.add(this.ghost);
    const ghostMaterial=new THREE.MeshBasicMaterial({color:this.painterly?'#e4cdb2':'#a0b5b1',transparent:true,opacity:.22,depthWrite:false});this.materials.materials.add(ghostMaterial);
    const body=this.geometry('ghostBody',()=>new THREE.CapsuleGeometry(.22,1.18,4,12));
    const torso=new THREE.Mesh(body,ghostMaterial);torso.position.y=1.02;this.ghost.add(torso);
    const head=new THREE.Mesh(this.geometry('ghostHead',()=>new THREE.SphereGeometry(.17,16,12)),ghostMaterial);head.position.set(0,1.88,0);head.scale.set(.86,1.25,.94);this.ghost.add(head);
    this.ghost.visible=false;
    this.decor.particles();
  }
  batchStatic(){
    const groups=new Map();this.root.updateMatrixWorld(true);
    this.staticRoot.traverse(mesh=>{
      if(!mesh.isMesh||Array.isArray(mesh.material))return;
      const key=mesh.material.uuid+':'+mesh.castShadow;
      if(!groups.has(key))groups.set(key,{material:mesh.material,castShadow:mesh.castShadow,geometries:[]});
      let geometry=mesh.geometry.clone();if(geometry.index){const expanded=geometry.toNonIndexed();geometry.dispose();geometry=expanded;}
      geometry.applyMatrix4(mesh.matrixWorld);groups.get(key).geometries.push(geometry);
    });
    this.staticRoot.clear();
    for(const group of groups.values()){
      const geometry=mergeGeometries(group.geometries,false);for(const old of group.geometries)old.dispose();
      if(!geometry)throw Error('Static room geometry could not be merged');
      this.geometries.add(geometry);const mesh=new THREE.Mesh(geometry,group.material);mesh.castShadow=group.castShadow;mesh.receiveShadow=true;this.staticRoot.add(mesh);
    }
  }
  update(time,dt,fogEnabled=true){
    this.fogEnabled=fogEnabled;this.decor.update(time,dt);
    if(Math.abs(this.lastDoorAngle-this.door.rotation.y)>.015){this.lastDoorAngle=this.door.rotation.y;for(const light of this.shadowLights)light.shadow.needsUpdate=true;}
  }
  quality(level){for(const light of this.shadowLights){light.castShadow=level==='high';light.shadow.needsUpdate=true;}}
  roomAt(x,z){for(const r of this.rooms)if(Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)return r.id;return 'hall';}
  blocked(x,z){
    let inside=false;for(const r of this.rooms)if(Math.abs(x-r.x)<r.w/2-.22&&Math.abs(z-r.z)<r.d/2-.22)inside=true;
    if(Math.abs(x)<1.9)for(const r of this.rooms)if(r.id!=='hall'&&Math.abs(z-r.z)<.65)inside=true;
    if(!inside)return true;
    for(const b of this.colliders)if(Math.abs(x-b.x)<b.hx+.2&&Math.abs(z-b.z)<b.hz+.2)return true;
    if(Math.abs(this.door.rotation.y)<.5&&Math.abs(x+1.48)<.35&&Math.abs(z+5)<1.03)return true;
    return false;
  }
  async loadProp(url,fallbackId='radio'){
    try{
      const gltf=await new GLTFLoader().loadAsync(url);
      if(this.disposed){this.disposeTree(gltf.scene);return false;}
      const old=this.objects.get(fallbackId);if(!old){this.disposeTree(gltf.scene);throw Error('Unknown fallback id');}
      gltf.scene.position.copy(old.position);this.root.add(gltf.scene);old.visible=false;this.loaded.push(gltf.scene);for(const light of this.shadowLights)light.shadow.needsUpdate=true;return true;
    }catch(error){console.warn('Model unavailable; procedural prop retained.',error.message);return false;}
  }
  disposeTree(root){root.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials)if(m){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}
  dispose(){this.disposed=true;this.decor.dispose();for(const geometry of this.geometries)geometry.dispose();for(const object of this.loaded)this.disposeTree(object);this.materials.dispose();for(const light of this.shadowLights)light.shadow.map?.dispose();this.scene.remove(this.root);}
}
