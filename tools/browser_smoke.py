"""Optional development validation; pip-installed Playwright is not a game dependency.
Start the root server separately, then: python tools/browser_smoke.py
Set LAB_BROWSER to override the system Chromium executable.
"""
import asyncio
import base64
import json
import math
import os
import struct
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'

async def main():
    ARTIFACTS.mkdir(exist_ok=True)
    results = []
    async with async_playwright() as p:
        options = dict(executable_path=os.environ.get('LAB_BROWSER', '/usr/bin/chromium'), headless=True,
                       args=['--no-sandbox', '--enable-unsafe-swiftshader'])
        if os.environ.get('HTTPS_PROXY'):
            options['proxy'] = {'server': os.environ['HTTPS_PROXY'], 'bypass': '127.0.0.1,localhost'}
        browser = await p.chromium.launch(**options)
        context = await browser.new_context(viewport={'width': 960, 'height': 640})
        for folder in ['01-realistic-pbr', '02-painterly']:
            page = await context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
            await page.goto('http://127.0.0.1:8000/' + folder + '/')
            await page.wait_for_function('!!window.lab', timeout=90000)
            assert await page.evaluate('lab.state') == 'menu'
            assert await page.evaluate('lab.view.renderer.getPixelRatio() === devicePixelRatio')
            await page.click('#begin')
            await page.wait_for_function('lab.state === "play" && !!document.pointerLockElement')
            await page.evaluate("lab.view.quality('low'); document.getElementById('adaptive').checked=false")
            await page.wait_for_function('lab.progress.time > .1')

            async def aim(x, z, tx, ty, tz):
                yaw = math.atan2(-(tx-x), -(tz-z))
                pitch = math.atan2(ty-1.65, math.hypot(tx-x, tz-z))
                await page.evaluate('(a)=>lab.teleport(...a)', [x,z,yaw,pitch])

            async def use(x,z,tx,ty,tz,condition):
                await aim(x,z,tx,ty,tz)
                await page.wait_for_timeout(250)
                await page.keyboard.press('KeyE')
                await page.wait_for_function(condition, timeout=15000)

            # Exercise the same keyboard interactions used by a player.
            await use(-5,2,-5,.83,1,'lab.progress.radio')
            await use(5,3.9,5,.97,1.9,'lab.progress.key')
            assert await page.evaluate('lab.world.blocked(-1.48,-5)')
            await use(-.7,-5,-1.48,1.2,-5,'lab.progress.door')
            await page.wait_for_function('lab.world.door.rotation.y > .6')
            assert not await page.evaluate('lab.world.blocked(-1.48,-5)')
            await page.evaluate('lab.teleport(-3,-5)')
            await page.wait_for_function("lab.story.snapshot().includes('bedroom')")
            # Advance only the story scheduler, avoiding an artificial three-minute wall-clock run.
            await page.evaluate('lab.story.update(18.1)')
            await page.wait_for_function('lab.progress.memory')
            await page.evaluate('document.getElementById("illusion").hidden=true')

            # Save/load must restore progress and world presentation together.
            await page.evaluate('lab.save();lab.progress.key=false;lab.progress.fear=.9;lab.world.key.visible=true;lab.load()')
            assert await page.evaluate('lab.progress.key && !lab.world.key.visible && lab.progress.fear < .9')
            await page.evaluate('lab.enterTest()')
            await page.wait_for_function('lab.state === "test" && !document.pointerLockElement')
            saved_time = await page.evaluate('lab.progress.time')
            await page.locator('#sanity').fill('70')
            await page.locator('#sanity').dispatch_event('input')
            await page.click('#spawn')
            assert await page.evaluate('Math.abs(lab.progress.fear-.7) < .001')
            assert await page.evaluate('lab.world.ghost.visible')
            await page.click('#fog')
            assert not await page.evaluate('lab.view.fogOn')
            await page.click('#testPost')
            assert not await page.evaluate('lab.view.post')
            await page.click('#testShadows')
            assert not await page.evaluate('lab.view.flash.castShadow')
            await page.wait_for_timeout(300)
            assert await page.evaluate('lab.progress.time') == saved_time
            await page.click('#testExit')
            await page.wait_for_function('lab.state === "play" && !!document.pointerLockElement')
            assert await page.evaluate('lab.progress.fear < .7')
            await page.evaluate("lab.view.fogOn=true;lab.view.setPost(true);lab.view.shadows('medium')")

            # Peripheral ghost disappears when its center is directly viewed.
            await page.evaluate('lab.teleport(0,5);lab.spawn()')
            ghost_pos = await page.evaluate('lab.world.ghost.position.toArray()')
            await aim(0,5,ghost_pos[0],1.6,ghost_pos[2])
            await page.wait_for_function('!lab.world.ghost.visible')

            # Broken glTF keeps the procedural fallback. Then load a valid embedded triangle.
            assert not await page.evaluate("lab.world.loadProp('data:application/json,%7Bbad','radio')")
            vertices = struct.pack('<9f', -.2,0,0, .2,0,0, 0,.4,0)
            model = {'asset':{'version':'2.0'}, 'scene':0,'scenes':[{'nodes':[0]}], 'nodes':[{'mesh':0}],
                     'meshes':[{'primitives':[{'attributes':{'POSITION':0}}]}],
                     'buffers':[{'byteLength':len(vertices),'uri':'data:application/octet-stream;base64,'+base64.b64encode(vertices).decode()}],
                     'bufferViews':[{'buffer':0,'byteLength':len(vertices)}],
                     'accessors':[{'bufferView':0,'componentType':5126,'count':3,'type':'VEC3','min':[-.2,0,0],'max':[.2,.4,0]}]}
            model_url = 'data:application/json;base64,'+base64.b64encode(json.dumps(model).encode()).decode()
            assert await page.evaluate('(url)=>lab.world.loadProp(url,"radio")',model_url)
            await page.evaluate('lab.world.loaded[0].visible=false;lab.world.radio.visible=true')
            # Test real timer gate on the next fixed update; no ending function is called by tests.
            await page.evaluate('lab.progress.time=179.99')
            await page.wait_for_function('lab.progress.signal')
            await use(.8,8.5,.8,1.4,9.85,'lab.state === "end"')
            assert await page.locator('#endingTitle').text_content() == 'You can leave now.'

            # A fresh session exercises the loss path and native pause/resume.
            await page.reload()
            await page.wait_for_function('!!window.lab',timeout=90000)
            await page.click('#begin')
            await page.wait_for_function('lab.state === "play" && !!document.pointerLockElement')
            await page.evaluate("lab.view.quality('low')")
            await page.keyboard.press('Escape')
            await page.wait_for_function('lab.state === "pause" && !document.pointerLockElement')
            await page.click('#resume')
            await page.wait_for_function('lab.state === "play" && !!document.pointerLockElement')
            await page.keyboard.press('KeyW')
            start_z = await page.evaluate('lab.player.z')
            await page.keyboard.down('KeyW')
            await page.wait_for_timeout(500)
            await page.keyboard.up('KeyW')
            assert await page.evaluate('lab.player.z') < start_z
            await page.keyboard.press('F3')
            await page.wait_for_function('!document.getElementById("debug").hidden')
            await page.screenshot(path=str(ARTIFACTS/(folder+'.png')))
            await page.evaluate('lab.progress.fear=1')
            await page.wait_for_function('lab.state === "end"')
            assert await page.locator('#endingTitle').text_content() == 'The room remembers you.'
            assert not errors, errors
            results.append({'engine':folder,'result':'passed','checks':['boot/native-DPR','gesture/pointer-lock','radio/key/door',
                'bedroom trigger','save/load','test-room toggles/isolation','hallucination gaze','glTF fallback and load',
                '180-second gate/win','pause/resume','keyboard movement','debug','fear/loss'],'pageerrors':errors})
            print(json.dumps(results[-1]),flush=True)
            await page.close()
        await browser.close()
    (ARTIFACTS/'browser-results.json').write_text(json.dumps(results,indent=2))

if __name__ == '__main__':
    asyncio.run(main())
