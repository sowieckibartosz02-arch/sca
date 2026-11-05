import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]
async def main():
 (ROOT/'artifacts').mkdir(exist_ok=True)
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'],proxy={'server':os.environ['HTTPS_PROXY'],'bypass':'127.0.0.1,localhost'})
  ctx=await b.new_context(viewport={'width':800,'height':560},device_scale_factor=1.5)
  await ctx.add_init_script('const NativeAudio=window.AudioContext;window.AudioContext=class extends NativeAudio{constructor(...args){super(...args);window.testAudio=this;}};')
  results=[]
  for folder in ['01-realistic-pbr','02-painterly']:
   page=await ctx.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
   await page.goto('http://127.0.0.1:8000/'+folder+'/')
   await page.wait_for_function('!!window.lab',timeout=90000)
   assert await page.evaluate('lab.view.renderer.getPixelRatio() === 1.5')
   await page.click('#begin');await page.wait_for_function('lab.state === "play" && testAudio.state === "running"')
   await page.evaluate("document.getElementById('adaptive').checked=false;lab.teleport(-3.2,4.3,.945,-.1)")
   await page.wait_for_function('lab.view.camera.position.x < -3')
   await page.screenshot(path=str(ROOT/'artifacts'/(folder+'-high.png')))
   assert not errors, errors
   results.append({'engine':folder,'native_dpr':1.5,'audio':'running after gesture','high_pipeline':'rendered','page_and_console_errors':errors})
   print(json.dumps(results[-1]),flush=True)
   await page.close()
  (ROOT/'artifacts/final-render-results.json').write_text(json.dumps(results,indent=2))
  await b.close()
asyncio.run(main())
