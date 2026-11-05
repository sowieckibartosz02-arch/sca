import * as THREE from 'three';

const SIZE = 512;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const fract = value => value - Math.floor(value);
const hash = (x, y, seed = 1) => fract(Math.sin(x * 127.1 + y * 311.7 + seed * 37.13) * 43758.5453);

function noiseGrid(cells, seed) {
  const grid = new Float32Array(cells * cells);
  for (let i = 0; i < grid.length; i++) grid[i] = hash(i % cells, Math.floor(i / cells), seed);
  return (u, v) => {
    const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y);
    let fx = fract(x), fy = fract(y);
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((ix % cells) + cells) % cells, x1 = (x0 + 1) % cells;
    const y0 = (((iy % cells) + cells) % cells) * cells, y1 = ((iy + 1 + cells) % cells) * cells;
    const a = grid[y0 + x0] * (1 - fx) + grid[y0 + x1] * fx;
    const b = grid[y1 + x0] * (1 - fx) + grid[y1 + x1] * fx;
    return a * (1 - fy) + b * fy;
  };
}

function canvas(size = SIZE) {
  const result = document.createElement('canvas');
  result.width = result.height = size;
  return result;
}

export class Materials {
  constructor(painterly) {
    this.painterly = painterly;
    this.materials = new Set();
    this.textures = new Set();
    this.cache = new Map();
    this.detailCache = new Map();
  }

  makeTexture(source, colorSpace = THREE.NoColorSpace, repeat = 1) {
    const texture = new THREE.CanvasTexture(source);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = colorSpace;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = 8;
    this.textures.add(texture);
    return texture;
  }

  detail(kind) {
    if (this.detailCache.has(kind)) return this.detailCache.get(kind);
    const coarse = noiseGrid(8, 29), cloud = noiseGrid(3, 71), fine = noiseGrid(64, 17);
    const heights = new Float32Array(SIZE * SIZE), shade = new Float32Array(SIZE * SIZE);
    const roughCanvas = canvas(), roughCtx = roughCanvas.getContext('2d');
    const roughData = roughCtx.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = y * SIZE + x, u = x / SIZE, v = y / SIZE;
        const c = coarse(u, v), f = fine(u, v), n = cloud(u, v);
        let value = 1, height = .5, roughness = .88;
        switch (kind) {
          case 'wood': {
            const plank = Math.floor(u * 4), offset = (plank % 2) * .5;
            const gx = fract(u * 4), gy = fract(v * 2 + offset);
            const grain = Math.sin(u * 930 + 8 * Math.sin(v * 6.283) + 6 * c);
            const annual = Math.pow(.5 + .5 * Math.sin(u * 230 + n * 8), 5);
            const seam = gx < .012 || gx > .988 || gy < .006 || gy > .994;
            value = seam ? .45 : .96 + .1 * (hash(plank, Math.floor(v * 2 + offset), 4) - .5) + grain * .025 - annual * .07 + (c - .5) * .045;
            height = seam ? .1 : .5 + grain * .025 - annual * .025;
            roughness = .48 + annual * .12 + f * .08;
            break;
          }
          case 'tile': {
            const tx = fract(u * 4), ty = fract(v * 4);
            const edge = Math.min(tx, ty, 1 - tx, 1 - ty);
            const grout = edge < .018, bevel = clamp((edge - .018) * 40, 0, 1);
            value = grout ? .45 : .98 + (hash(Math.floor(u * 4), Math.floor(v * 4), 9) - .5) * .11 + (n - .5) * .035;
            height = grout ? .1 : .35 + bevel * .16 + (f - .5) * .003;
            roughness = grout ? .94 : .3 + c * .13;
            break;
          }
          case 'metal':
            value = .98 + Math.sin(y * 2.43) * .012 + (c - .5) * .025;
            height = .5 + Math.sin(y * 2.43) * .002;
            roughness = .32 + f * .12;
            break;
          case 'fabric':
          case 'rug': {
            const weave = Math.sin(x * 2.75) * Math.sin(y * 2.75);
            value = .99 + weave * .035 + (c - .5) * .05;
            height = .5 + weave * .022;
            roughness = .97;
            break;
          }
          case 'leather':
            value = .98 + (c - .5) * .085 + (f - .5) * .035;
            height = .5 + (f - .5) * .045;
            roughness = .55 + c * .13;
            break;
          case 'paper':
            value = .98 + (n - .5) * .035 + (f - .5) * .012;
            height = .5 + (f - .5) * .006;
            roughness = .96;
            break;
          case 'wallpaper': {
            const damask = Math.pow(Math.max(0, Math.sin(u * 50.265) * Math.sin(v * 50.265)), 4);
            value = .98 - damask * .095 + (n - .5) * .045;
            height = .5 + damask * .008;
            roughness = .88;
            break;
          }
          case 'concrete':
            value = .96 + (n - .5) * .13 + (c - .5) * .055;
            height = .5 + (c - .5) * .055 + (f - .5) * .024;
            roughness = .92;
            break;
          default:
            // Broad, low-contrast variations read as plaster instead of television noise.
            value = 1 + (n - .5) * .045 + (c - .5) * .025 + (f - .5) * .009;
            height = .5 + (c - .5) * .025 + (f - .5) * .008;
            roughness = .88 + (c - .5) * .08;
        }
        heights[i] = height;
        shade[i] = value;
        const ri = i * 4, r = clamp(roughness * 255, 0, 255);
        roughData.data[ri] = roughData.data[ri + 1] = roughData.data[ri + 2] = r;
        roughData.data[ri + 3] = 255;
      }
    }
    roughCtx.putImageData(roughData, 0, 0);
    const normalCanvas = canvas(), normalCtx = normalCanvas.getContext('2d');
    const normals = normalCtx.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = y * SIZE + x, p = i * 4;
        const dx = (heights[y * SIZE + (x + 1) % SIZE] - heights[y * SIZE + (x + SIZE - 1) % SIZE]) * 3;
        const dy = (heights[((y + 1) % SIZE) * SIZE + x] - heights[((y + SIZE - 1) % SIZE) * SIZE + x]) * 3;
        const inverse = 1 / Math.sqrt(dx * dx + dy * dy + 1);
        normals.data[p] = (dx * inverse * .5 + .5) * 255;
        normals.data[p + 1] = (-dy * inverse * .5 + .5) * 255;
        normals.data[p + 2] = (inverse * .5 + .5) * 255;
        normals.data[p + 3] = 255;
      }
    }
    normalCtx.putImageData(normals, 0, 0);
    const repeat = kind === 'wood' ? 2 : 1;
    const detail = {
      shade,
      normal: this.makeTexture(normalCanvas, THREE.NoColorSpace, repeat),
      roughness: this.makeTexture(roughCanvas, THREE.NoColorSpace, repeat),
      repeat
    };
    this.detailCache.set(kind, detail);
    return detail;
  }

  texture(kind, color) {
    const detail = this.detail(kind), surface = canvas(), ctx = surface.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const image = ctx.getImageData(0, 0, SIZE, SIZE), pixels = image.data;
    for (let i = 0; i < detail.shade.length; i++) {
      const p = i * 4, value = this.painterly ? .4 + detail.shade[i] * .6 : detail.shade[i];
      pixels[p] *= value; pixels[p + 1] *= value; pixels[p + 2] *= value;
    }
    ctx.putImageData(image, 0, 0);
    if (this.painterly) this.paint(ctx, kind);
    return { map: this.makeTexture(surface, THREE.SRGBColorSpace, detail.repeat), normal: detail.normal, roughness: detail.roughness };
  }

  paint(ctx, kind) {
    // Long translucent marks supply brush direction without obscuring the palette.
    for (let i = 0; i < 48; i++) {
      const x = hash(i, 0, 31) * SIZE, y = hash(i, 1, 31) * SIZE;
      const width = 20 + hash(i, 2, 31) * 90;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,231,185,.065)' : 'rgba(29,40,62,.028)';
      ctx.lineWidth = 8 + hash(i, 3, 31) * 24;
      ctx.beginPath();ctx.moveTo(x, y);ctx.bezierCurveTo(x + width * .3,y - 3,x + width * .7,y + 4,x + width,y + 1);ctx.stroke();
    }
    if (kind === 'fabric' || kind === 'paper' || kind === 'wallpaper') {
      ctx.strokeStyle = 'rgba(35,44,64,.065)'; ctx.lineWidth = 1;
      for (let y = 0; y < SIZE; y += 29) {
        for (let x = 0; x < SIZE; x += 47) {
          const dx = hash(x, y, 8) * 7;
          ctx.beginPath();ctx.moveTo(x + dx,y);ctx.lineTo(x + 15 + dx,y - 8);ctx.stroke();
        }
      }
    }
  }

  get(kind, color, glow = false) {
    const key = `${kind}:${color}:${glow}`;
    if (this.cache.has(key)) return this.cache.get(key);
    let material;
    if (glow) material = new THREE.MeshBasicMaterial({ color });
    else {
      const maps = this.texture(kind, color);
      if (this.painterly) {
        if (!this.gradient) {
          this.gradient = new THREE.DataTexture(new Uint8Array([72, 132, 194, 255]), 4, 1, THREE.RedFormat);
          this.gradient.minFilter = this.gradient.magFilter = THREE.NearestFilter;
          this.gradient.needsUpdate = true;
          this.textures.add(this.gradient);
        }
        material = new THREE.MeshToonMaterial({ map: maps.map, gradientMap: this.gradient,
          normalMap: maps.normal, normalScale: new THREE.Vector2(.12, .12) });
        this.addPaintedFog(material);
      } else {
        const scale = kind === 'tile' ? .45 : kind === 'wood' ? .3 : .15;
        material = new THREE.MeshStandardMaterial({ map: maps.map, normalMap: maps.normal,
          normalScale: new THREE.Vector2(scale, scale), roughnessMap: maps.roughness,
          roughness: 1, metalness: kind === 'metal' ? .72 : 0 });
      }
    }
    this.materials.add(material);
    this.cache.set(key, material);
    return material;
  }

  addPaintedFog(material) {
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec3 vBrushWorld;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>',
        'vBrushWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
      shader.fragmentShader = 'varying vec3 vBrushWorld;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
        #ifdef FOG_EXP2
          float fogFactor=1.-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
        #else
          float fogFactor=smoothstep(fogNear,fogFar,vFogDepth);
        #endif
        float wash=.9+.1*sin(vBrushWorld.y*3.+sin(vBrushWorld.x*1.7)+vBrushWorld.z*.8);
        vec3 fogWash=fogColor+vec3(.012,-.002,.018)*sin(vBrushWorld.y*2.1);
        gl_FragColor.rgb=mix(gl_FragColor.rgb,fogWash,clamp(fogFactor*wash,0.,1.));
      #endif`);
    };
  }

  dispose() {
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.materials.clear();this.textures.clear();this.cache.clear();this.detailCache.clear();
  }
}
