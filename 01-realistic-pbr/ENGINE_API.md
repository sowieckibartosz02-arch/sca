# ENGINE API — kontrakt do przyszłych promptów

## Runtime
- Samodzielny katalog; HTML/CSS/ES modules, Three.js 0.170.0 importmap CDN.
- Brak npm, buildu i zewnętrznych assetów demo. Python http.server, nie file://.
- `src/main.js` jest composition root. Stany: menu, play, pause, test, end.
- Symulacja 1/60 s; maks. 6 kroków catch-up; renderer na requestAnimationFrame.
- `window.lab` to jawny dostęp developerski, nie bezpieczne API sieciowe.

## View (src/render.js)
```js
const view = new View(canvas);
view.scene; view.camera; view.renderer; view.composer;
view.quality('low' | 'medium' | 'high');
view.scale = 0.85; view.resize();
view.shadows('off' | 'medium' | 'high');
view.setPost(true); view.fogOn = true; view.testLights = true;
view.render(simulationSeconds, fear01, batteryPercent, flashlightOn);
view.dispose();
```
- High skala 1 zachowuje devicePixelRatio; FXAA, ACES, cienie PCF soft.
- PBR: SSAO + bloom. Painterly: toon ramp + selected-object OutlinePass.
- Painterly: `view.selectInk(world.root)` po dodaniu nowych brył.
- Cone shafts to aproksymacja, nie fizyczne volumetrics.

## World (src/world.js)
```js
const world = new World(view.scene, painterlyBoolean);
world.box(w,h,d,x,y,z,kind,color,solid=false,parent=world.root);
world.rooms; // { id, x, z, w, d, volume }
world.room(roomDescription);
world.roomAt(x,z); // room id
world.blocked(x,z); // flat collision including player radius
world.objects.set('switch2', mesh);
world.lights; world.key; world.door; world.radio; world.ghost;
await world.loadProp('./models/radio.glb', 'radio'); // false on fallback
world.dispose();
```
- `kind`: wall, wood, tile, metal; map cache, generated normal/roughness/albedo.
- `room()` zakłada centralny korytarz; uzupełnij ściany korytarza w build().
- Zarejestruj geometrię w world.geometries, materiał w materials.materials.
- Nowe tekstury rejestruj w materials.textures, by dispose je zwolnił.
- GLB: brak Draco/KTX2, skala/kolizja ręczna; kotwica interakcji pozostaje.

## Story (src/events.js)
```js
const story = new Story();
story.when('hall').then(() => flicker(2)).then(() => spawn(), 1.5);
story.emit('hall');
story.update(dt);
const ids = story.snapshot();
story.restore(ids);
```
- Reguły one-shot; opóźnienie względem poprzedniego kroku, czas symulacji.
- Kolejka dowolnych closures nie jest serializowana; odbuduj pending state.
- Main emituje id pokoju przy wejściu oraz radio, bedroom, signal, fear.

## Input / Sound / Meta
```js
input.sample(); input.take('KeyE'); input.keys.has('ShiftLeft');
input.forward; input.strafe; input.turn; input.look; input.dx; input.dy;
await sound.start(); // gesture required
sound.room(150); // generated room reverb
sound.pulse(80, .2, .1, false); // Hz, seconds, gain, noise
sound.update(dt, position, direction, fear01, moving, 'wood', time);
sound.pause(); sound.dispose(); input.dispose();
meta.illusion('loading'); meta.illusion('crash'); meta.dispose();
```
- Meta zapisuje wizyty i czas lokalnie, reaguje na blur/focus i zmienia title/favicon.
- Fikcyjne ekrany tylko wewnątrz strony; nigdy podszywanie pod system.

## Main authoring
- Dodaj obiekt do world.objects, identyfikator do interact() i podpowiedzi HUD.
- Trigger pokoju: dodaj Story.when(roomId); scene manager emituje wejście.
- `progress`: time, fear, battery, key, radio, memory, door, signal.
- Snapshot v1: position/yaw/pitch, progress, fired events, time, flashlight, door.
- F5/F9 zapis/odczyt localStorage, osobny namespace każdego silnika.
- T: osobny stan test, powrót przywraca postęp i pozycję, grafikę zachowuje.
- E radio uspokaja/regeneruje; klucz otwiera sypialnię; sygnał po 180 s.
- End win: memory + signal + exit interaction; lose: fear >= 1.
- Dodając mechaniki, rozszerz snapshot i jego walidację.
- Publiczny lab: view/world/story/progress/player/state/save/load/spawn/flicker/meta.

## Ograniczenia i kontrakt zmian
- Flat collision, bez schodów, fizyki i raycastu zasłonięcia interakcji.
- Wysokie DPR i wieloprzebiegowe efekty wymagają dobrego GPU.
- Adaptacja celuje w 60 FPS, minimum scale .5; nie daje gwarancji FPS.
- Nie dodawaj PSX snapping/dithering ani stale niskiej rozdzielczości.
- Zachowaj gesture gate, obsługę pauzy, dispose, brak alokacji wektorów w klatce.
- Każda kopia ma działać po przeniesieniu bez katalogu sąsiedniego silnika.
