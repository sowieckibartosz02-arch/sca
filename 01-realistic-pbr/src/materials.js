import * as THREE from 'three';
export class Materials {
  constructor(painterly) { this.painterly = painterly; this.materials = new Set(); this.textures = new Set(); this.cache = new Map(); }
  texture(kind, color) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0,0,256,256);
    let seed = 8731; const rnd = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 5500; i++) {
      const x = rnd() * 256, y = rnd() * 256;
      ctx.fillStyle = `rgba(${rnd() > .5 ? '255,245,220' : '15,22,25'},${this.painterly ? .12 : .045})`;
      ctx.fillRect(x,y,kind === 'wood' ? 1 : 2,kind === 'wood' ? 15 + rnd() * 60 : 2);
    }
    if (kind === 'tile') { ctx.strokeStyle = '#39494b'; ctx.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { ctx.beginPath(); ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke(); } }
    if (this.painterly) { ctx.strokeStyle='rgba(30,35,55,.12)'; for(let i=0;i<80;i++){const x=rnd()*256,y=rnd()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+15,y-8);ctx.stroke();} }
    const map = new THREE.CanvasTexture(canvas); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.colorSpace = THREE.SRGBColorSpace; map.repeat.set(2,2); this.textures.add(map);
    const normalCanvas = document.createElement('canvas'); normalCanvas.width = normalCanvas.height = 256;
    const nc = normalCanvas.getContext('2d'), data = nc.createImageData(256,256);
    for(let i=0;i<data.data.length;i+=4){data.data[i]=128+Math.floor(rnd()*10-5);data.data[i+1]=128+Math.floor(rnd()*10-5);data.data[i+2]=255;data.data[i+3]=255;}nc.putImageData(data,0,0);
    const normal = new THREE.CanvasTexture(normalCanvas); normal.wrapS=normal.wrapT=THREE.RepeatWrapping; normal.repeat.set(2,2); this.textures.add(normal);
    const roughCanvas = document.createElement('canvas'); roughCanvas.width=roughCanvas.height=64;
    const rc=roughCanvas.getContext('2d'), rd=rc.createImageData(64,64);
    for(let i=0;i<rd.data.length;i+=4){const v=170+rnd()*65;rd.data[i]=rd.data[i+1]=rd.data[i+2]=v;rd.data[i+3]=255;}rc.putImageData(rd,0,0);
    const roughness=new THREE.CanvasTexture(roughCanvas);roughness.wrapS=roughness.wrapT=THREE.RepeatWrapping;this.textures.add(roughness);
    return {map,normal,roughness};
  }
  get(kind, color, glow = false) {
    const key = kind+color+glow; if(this.cache.has(key))return this.cache.get(key);
    let mat;
    if(glow)mat=new THREE.MeshBasicMaterial({color});
    else {
      const maps=this.texture(kind,color);
      if(this.painterly){
        if(!this.gradient){this.gradient=new THREE.DataTexture(new Uint8Array([55,115,190,255]),4,1,THREE.RedFormat);this.gradient.minFilter=this.gradient.magFilter=THREE.NearestFilter;this.gradient.needsUpdate=true;this.textures.add(this.gradient);}
        mat=new THREE.MeshToonMaterial({map:maps.map,gradientMap:this.gradient,normalMap:maps.normal,normalScale:new THREE.Vector2(.14,.14)});
      }else mat=new THREE.MeshStandardMaterial({map:maps.map,normalMap:maps.normal,normalScale:new THREE.Vector2(.18,.18),roughnessMap:maps.roughness,roughness:kind==='metal'?.38:.88,metalness:kind==='metal'?.65:0});
    }
    this.materials.add(mat);this.cache.set(key,mat);return mat;
  }
  dispose(){for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();}
}
