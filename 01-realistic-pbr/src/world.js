import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Materials } from './materials.js';
export class World {
  constructor(scene, painterly) {
    this.scene=scene;this.painterly=painterly;this.materials=new Materials(painterly);this.geometries=new Set();this.colliders=[];this.lights=[];this.objects=new Map();this.loaded=[];this.disposed=false;
    this.rooms=[{id:'hall',x:0,z:0,w:3,d:20,volume:150},{id:'living',x:-5,z:3,w:7,d:7,volume:160},{id:'study',x:5,z:2,w:7,d:6,volume:140},{id:'bedroom',x:-5,z:-5,w:7,d:6,volume:140},{id:'bath',x:5,z:-6,w:7,d:6,volume:130}];
    this.root=new THREE.Group();scene.add(this.root);this.build();
  }
  box(w,h,d,x,y,z,kind='wall',color='#8d9388',solid=false,parent=this.root) {
    const geo=new RoundedBoxGeometry(w,h,d,1,.035);this.geometries.add(geo);
    const mesh=new THREE.Mesh(geo,this.materials.get(kind,color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    if(solid)this.colliders.push({x,z,hx:w/2,hz:d/2});return mesh;
  }
  wall(x,z,w,d){return this.box(w,3.2,d,x,1.6,z,'wall',this.painterly?'#7e9e9a':'#89928b',true);}
  room({id,x,z,w,d}) {
    this.box(w,.15,d,x,-.08,z,id==='bath'?'tile':'wood',this.painterly?'#8e7565':'#67584b');
    this.box(w,.1,d,x,3.2,z,'wall','#535d5c');
    // Every side room opens onto the central corridor; collision shares the same doorway gap.
    if(id!=='hall'){
      const near=x<0?x+w/2:x-w/2, far=x<0?x-w/2:x+w/2;
      this.wall(far,z,.18,d);this.wall(x,z-d/2,w,.18);this.wall(x,z+d/2,w,.18);
      this.wall(near,z-d/4-.45,.18,d/2-.9);this.wall(near,z+d/4+.45,.18,d/2-.9);
      this.box(.2,.75,1.8,near,2.825,z,'wood','#403e39');
      this.box(.12,2.4,.12,near,1.2,z-.92,'wood','#403e39');this.box(.12,2.4,.12,near,1.2,z+.92,'wood','#403e39');
    }
    this.box(.8,.06,.35,x,3.08,z,'metal','#b9b798');
    const light=new THREE.PointLight(this.painterly?0xf1b884:0xffd8a0,this.painterly?20:15,11,2);light.position.set(x,2.65,z);light.userData.base=light.intensity;this.root.add(light);this.lights.push(light);
    this.box(.8,1.05,.06,x+(x<0?-w/2+.2:w/2-.2),1.7,z,'wall','#203b40');
  }
  build(){
    for(const room of this.rooms)this.room(room);
    this.wall(0,10,3,.2);this.wall(0,-10,3,.2);
    for(const [x,a,b] of [[-1.5,-10,-8],[-1.5,-2,-.5],[-1.5,6.5,10],[1.5,-10,-9],[1.5,-3,-1],[1.5,5,10]])this.wall(x,(a+b)/2,.18,b-a);
    this.box(2,.5,1,-5,.3,3,'wood','#4a514d',true);this.box(2,1,.3,-5,.8,3.55,'wall','#6c766b');
    this.box(1.5,.1,1,-5,.6,1,'wood','#635341',true);
    for(const x of [-5.6,-4.4])for(const z of [.65,1.35])this.box(.08,.55,.08,x,.27,z,'wood','#342f29');
    this.box(2.2,.55,2.8,-5,.3,-5,'wood','#493d37',true);this.box(2.1,.2,2.5,-5,.67,-5,'wall',this.painterly?'#ad8e90':'#b0aaa0');
    this.box(.7,.18,.5,-5,.85,-5.8,'wall','#d5caba');
    this.box(2,.12,.9,5,.85,2,'wood','#725d43',true);this.box(.7,.8,.55,5,.4,3,'wood','#4b4034',true);
    for(const x of [4.2,5.8])this.box(.12,.8,.7,x,.4,2,'wood','#524733');
    this.box(.9,.7,.5,5,.35,-6,'tile','#b2c1bb',true);this.box(1.1,.12,.7,5,.8,-6,'tile','#e0d8c6');
    for(let i=0;i<9;i++)this.box(.1,.25+Math.sin(i)*.08,.28,4.45+i*.13,1.05,2,'wall',['#987564','#53696d','#9a9276'][i%3]);
    // Procedural framed windows are geometry and emissive glass, never downloaded images.
    for(const z of [-5,3]){this.box(.08,1.5,1.6,-8.37,1.9,z,'metal','#242d31');const glass=this.box(.09,1.3,1.4,-8.31,1.9,z,'wall','#315258');glass.material=this.materials.get('glass','#34545b',true);this.box(.12,.08,1.5,-8.24,1.9,z,'metal','#242d31');}
    this.door=new THREE.Group();this.door.position.set(-1.48,0,-5-.85);this.root.add(this.door);
    this.box(.1,2.35,1.7,0,1.175,.85,'wood',this.painterly?'#885b59':'#594d40',false,this.door);
    this.box(.2,.08,.12,.12,1.05,1.4,'metal','#b6a371',false,this.door);this.objects.set('door',this.door);
    this.key=this.box(.18,.035,.08,5,.97,1.9,'metal','#edd58a');this.objects.set('key',this.key);
    this.radio=this.box(.5,.3,.25,-5,.83,1,'metal','#252d2b');this.objects.set('radio',this.radio);
    this.switch=this.box(.12,.25,.06,.8,1.4,9.85,'metal','#ad9d77');this.objects.set('exit',this.switch);
    this.ghost=new THREE.Group();this.ghost.position.set(1,0,-8);this.root.add(this.ghost);
    const ghostMat=new THREE.MeshBasicMaterial({color:this.painterly?'#e4cdb2':'#a0b5b1',transparent:true,opacity:.23,depthWrite:false});this.materials.materials.add(ghostMat);
    for(const [r,h,y] of [[.24,1.6,.9],[.2,.35,1.85]]){const g=new THREE.CapsuleGeometry(r,h-r*2,4,8);this.geometries.add(g);const m=new THREE.Mesh(g,ghostMat);m.position.y=y;this.ghost.add(m);}
    this.ghost.visible=false;
  }
  roomAt(x,z){for(const r of this.rooms)if(Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)return r.id;return 'hall';}
  blocked(x,z){
    let inside=false;for(const r of this.rooms)if(Math.abs(x-r.x)<r.w/2-.22&&Math.abs(z-r.z)<r.d/2-.22)inside=true;
    // Bridge the small gap between corridor and rooms while keeping their outer walls solid.
    if(Math.abs(x)<1.9)for(const r of this.rooms)if(r.id!=='hall'&&Math.abs(z-r.z)<.65)inside=true;
    if(!inside)return true;
    for(const b of this.colliders)if(Math.abs(x-b.x)<b.hx+.2&&Math.abs(z-b.z)<b.hz+.2)return true;
    if(Math.abs(this.door.rotation.y)<.5&&Math.abs(x+1.48)<.35&&Math.abs(z+5)<1.03)return true;
    return false;
  }
  async loadProp(url, fallbackId='radio'){
    try{
      const gltf=await new GLTFLoader().loadAsync(url);
      if(this.disposed){this.disposeTree(gltf.scene);return false;}
      const old=this.objects.get(fallbackId);if(!old){this.disposeTree(gltf.scene);throw Error('Unknown fallback id');}
      gltf.scene.position.copy(old.position);this.root.add(gltf.scene);old.visible=false;this.loaded.push(gltf.scene);return true;
    }catch(error){console.warn('Model unavailable; procedural prop retained.',error.message);return false;}
  }
  disposeTree(root){root.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials)if(m){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}
  dispose(){this.disposed=true;for(const g of this.geometries)g.dispose();for(const object of this.loaded)this.disposeTree(object);this.materials.dispose();this.scene.remove(this.root);}
}
