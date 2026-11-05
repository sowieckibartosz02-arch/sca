"""Capture actual High-profile gameplay and test native DPR, audio and offline rendering."""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]

async def main():
    (ROOT/'artifacts').mkdir(exist_ok=True)
    (ROOT/'docs').mkdir(exist_ok=True)
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=os.environ.get('LAB_BROWSER','/usr/bin/chromium'),headless=True,
                                      args=['--no-sandbox','--enable-unsafe-swiftshader'])
        context=await browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1)
        await context.add_init_script('const NativeAudio=window.AudioContext;window.AudioContext=class extends NativeAudio{constructor(...args){super(...args);window.testAudio=this;}};')
        for folder,label in [('01-realistic-pbr','pbr'),('02-painterly','painterly')]:
            page=await context.new_page()
            errors=[];external=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
            async def route(request_route):
                url=request_route.request.url
                if url.startswith(('http://127.0.0.1:8000/','data:','blob:')):
                    await request_route.continue_()
                else:
                    external.append(url);await request_route.abort()
            await page.route('**/*',route)
            await page.goto('http://127.0.0.1:8000/'+folder+'/')
            await page.wait_for_function('window.__labBoot?.state === "ready"',timeout=90000)
            assert await page.evaluate('lab.view.renderer.getPixelRatio() === devicePixelRatio')
            await page.click('#begin')
            await page.wait_for_function('lab.state === "play" && testAudio.state === "running"')
            await page.evaluate("document.getElementById('adaptive').checked=false")
            await page.keyboard.press('KeyF')
            await page.evaluate('lab.teleport(-3.4,-.05,2.62,-.04)')
            await page.wait_for_function('lab.view.camera.position.x < -3')
            await page.evaluate("document.getElementById('notice').style.opacity='0'")
            await page.screenshot(path=str(ROOT/'docs'/('preview-'+label+'.jpg')),type='jpeg',quality=90)
            await page.evaluate('lab.teleport(0,7.8,.02,-.03)')
            await page.wait_for_function('lab.view.camera.position.z > 7')
            await page.screenshot(path=str(ROOT/'artifacts'/(folder+'-hall.jpg')),type='jpeg',quality=85)
            assert not errors,errors
            assert not external,external
            # Change device scale in a small second context to verify physical renderer dimensions.
            result={'engine':folder,'high_pipeline':'rendered','audio':'running after gesture','offline':True,
                    'external_requests':external,'errors':errors,
                    'draw_calls':await page.evaluate('lab.view.renderer.info.render.calls'),
                    'triangles':await page.evaluate('lab.view.renderer.info.render.triangles')}
            results.append(result);print(json.dumps(result),flush=True)
            await page.close()
        small=await browser.new_context(viewport={'width':480,'height':320},device_scale_factor=1.5)
        page=await small.new_page()
        await page.goto('http://127.0.0.1:8000/01-realistic-pbr/')
        await page.wait_for_function('window.__labBoot?.state === "ready"',timeout=90000)
        assert await page.evaluate('lab.view.renderer.getPixelRatio()===1.5 && lab.view.renderer.domElement.width===720')
        results.append({'native_dpr':1.5,'physical_canvas_width':720,'css_canvas_width':480})
        await browser.close()
    (ROOT/'artifacts/final-render-results.json').write_text(json.dumps(results,indent=2))

if __name__=='__main__':asyncio.run(main())
