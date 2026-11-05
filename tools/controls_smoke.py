"""Verify gameplay remains usable if the browser denies audio and pointer lock."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
async def main():
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=os.environ.get('LAB_BROWSER','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
        for folder in ['01-realistic-pbr','02-painterly']:
            page=await browser.new_page(viewport={'width':640,'height':420})
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            await page.add_init_script("Element.prototype.requestPointerLock=function(){return Promise.reject(new Error('Denied by test'));};window.AudioContext=class{constructor(){throw new Error('Audio denied by test');}};")
            await page.goto('http://127.0.0.1:8000/'+folder+'/')
            await page.wait_for_function('window.__labBoot?.state === "ready"',timeout=90000)
            await page.evaluate("lab.view.quality('low')")
            await page.click('#begin');await page.wait_for_function('lab.state === "play"')
            assert not await page.evaluate('!!document.pointerLockElement')
            old=await page.evaluate('lab.player.z')
            await page.keyboard.down('KeyW');await page.wait_for_timeout(700);await page.keyboard.up('KeyW')
            assert await page.evaluate('lab.player.z')<old
            old_yaw=await page.evaluate('lab.view.camera.rotation.y')
            await page.mouse.move(350,250);await page.mouse.down();await page.mouse.move(440,250,steps=8);await page.mouse.up()
            await page.wait_for_function('(y)=>Math.abs(lab.view.camera.rotation.y-y)>.05',arg=old_yaw)
            await page.keyboard.press('Escape');await page.wait_for_function('lab.state === "pause"')
            await page.click('#resume');await page.wait_for_function('lab.state === "play"')
            assert not errors,errors
            results.append({'engine':folder,'audio_denied':'playable','pointer_lock_denied':'WASD and drag-look passed','pause_resume':'passed','pageerrors':errors})
            print(json.dumps(results[-1]),flush=True);await page.close()
        await browser.close()
    (ROOT/'artifacts/controls-results.json').write_text(json.dumps(results,indent=2))
if __name__=='__main__':asyncio.run(main())
