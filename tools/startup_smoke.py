"""Optional Playwright regressions for local boot and actionable failure screens.

Run: python tools/startup_smoke.py. Starts its own loopback HTTP server.
Playwright is a development-only dependency; the games need only Python 3.
"""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
from threading import Thread
import time

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
ENGINES = ("01-realistic-pbr", "02-painterly")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


async def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    results = []
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                executable_path=os.environ.get("LAB_BROWSER", "/usr/bin/chromium"),
                headless=True, args=["--no-sandbox", "--enable-unsafe-swiftshader"])
            for engine in ENGINES:
                page = await browser.new_page(viewport={"width": 640, "height": 400})
                external = []
                errors = []

                async def local_only(route):
                    if route.request.url.startswith(base + "/"):
                        await route.continue_()
                    else:
                        external.append(route.request.url)
                        await route.abort()

                await page.route("**/*", local_only)
                page.on("pageerror", lambda error: errors.append(str(error)))
                await page.goto(f"{base}/{engine}/")
                await page.wait_for_function("window.__labBoot?.state && __labBoot.state !== 'loading'", timeout=90000)
                assert await page.evaluate("__labBoot.state") == "ready", await page.locator("#boot").text_content()
                assert await page.locator("#begin").is_enabled()
                assert not external, external
                assert not errors, errors
                await page.close()

                failures = []
                for mode in ("missing-module", "thrown-init"):
                    page = await browser.new_page()
                    if mode == "missing-module":
                        await page.route("**/src/main.js", lambda route: route.abort())
                    else:
                        await page.route("**/src/main.js", lambda route: route.fulfill(
                            status=200, content_type="text/javascript",
                            body='throw new Error("Synthetic initialization failure");'))
                    start = time.perf_counter()
                    await page.goto(f"{base}/{engine}/")
                    await page.wait_for_function("window.__labBoot?.state === 'error'", timeout=5000)
                    duration = time.perf_counter() - start
                    assert duration < 5, duration
                    assert await page.locator("#bootRetry").is_visible()
                    assert not await page.locator("#begin").is_enabled()
                    message = await page.locator("#boot").text_content()
                    if mode == "thrown-init":
                        assert "Synthetic initialization failure" in message
                    failures.append({"mode": mode, "seconds_to_diagnostic": round(duration, 3), "result": "passed"})
                    await page.close()

                # The managed browser forbids actual file:// navigation. Exercise the
                # unmodified bootstrap's protocol branch with an injected location.
                page = await browser.new_page()
                await page.set_content('<button id="begin" disabled>START</button><p id="boot"></p><button id="bootRetry" hidden>RETRY</button>')
                await page.evaluate("""({source, scriptURL}) => {
                    const adapter = {
                        currentScript: { src: scriptURL },
                        getElementById: id => document.getElementById(id)
                    };
                    new Function('location', 'document', source)(
                        { protocol: 'file:', reload() {} }, adapter);
                }""", {"source": (ROOT / engine / "src/bootstrap.js").read_text(),
                        "scriptURL": f"{base}/{engine}/src/bootstrap.js"})
                assert await page.evaluate("__labBoot.state") == "error"
                assert "file://" in await page.locator("#boot").text_content()
                assert "start.bat" in await page.locator("#boot").text_content()
                assert await page.locator("#bootRetry").is_visible()
                assert not await page.locator("#begin").is_enabled()
                await page.close()
                result = {"engine": engine, "http_without_external_requests": "passed",
                          "external_requests": external, "pageerrors": errors,
                          "failure_cases": failures,
                          "file_protocol_diagnostic": "passed with location adapter; actual file navigation blocked by managed browser policy"}
                results.append(result)
                print(json.dumps(result), flush=True)
            await browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    artifacts = ROOT / "artifacts"
    artifacts.mkdir(exist_ok=True)
    (artifacts / "startup-results.json").write_text(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    asyncio.run(main())
