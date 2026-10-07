"""Browser layout smoke checks. This does NOT render or certify the React Native app."""
from pathlib import Path
import os, json, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa/v4/responsive'; OUT.mkdir(parents=True,exist_ok=True)
results=[]; errors=[]
sizes=[(320,568),(375,667),(390,844),(430,932),(768,1024),(1440,900)]
routes=['welcome','today','study','plans','account','sign-in','sign-up','checkout','membership','downloads','support','legal','jurisdiction','study-plan','appearance','progress','history','review','saved','content','report']
try:
 with sync_playwright() as p:
  exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
  browser=p.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}),args=['--no-sandbox'])
  for width,height in sizes:
   page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
   page.on('pageerror',lambda e:errors.append(str(e)))
   landing=(ROOT/'landing/index.html').read_text().replace('<script src="config.js"></script>','<script>'+(ROOT/'landing/config.js').read_text()+'</script>')
   page.set_content(landing)
   ok=page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
   results.append({'surface':'landing','viewport':[width,height],'no_horizontal_overflow':ok})
   assert ok, f'Landing overflow: {width}'
   assert 'CA$14.99' in page.inner_text('body')
   assert page.locator('.store[onclick]').count()==0
   assert page.locator('.store[href="#"]').count()==0
   if width in [320,390,1440]: page.screenshot(path=str(OUT/f'landing-{width}.png'),full_page=True)
   page.evaluate("Object.defineProperty(window,'localStorage',{configurable:true,value:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}}})")
   page.set_content((ROOT/'preview/index.html').read_text())
   page.evaluate("document.body.classList.add('flat');state.reduceMotion=true;render()")
   for route in routes:
    page.evaluate('(route)=>go(route)',route)
    page.wait_for_timeout(5)
    ok=page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    results.append({'surface':'internal-browser-companion','route':route,'viewport':[width,height],'no_horizontal_overflow':ok})
    assert ok,f'Companion overflow: {route} {width}'
    if width in [320,390] and route in ['today','study','sign-up','checkout','plans']:
     page.screenshot(path=str(OUT/f'companion-{route}-{width}.png'))
   page.close()
  browser.close()
finally:
 (OUT/'results.json').write_text(json.dumps({'scope':'Static landing and internal browser companion only; not React Native or native keyboard/store QA.','viewports':sizes,'checks':results,'browser_errors':errors},indent=2))
assert not errors,errors
print(f'PASS: {len(results)} browser route/viewport checks; no page JavaScript errors. Native validation is separate.')
