"""Verify the source-rendered DOM companion, NOT Expo/React Native runtime.
Requires: pip install playwright; playwright install chromium
Optional: CHROMIUM_PATH=/path/to/chromium
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa' / 'refresh'
OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / 'preview' / 'index.html').read_text()
SCREENS = ['home','study','progress','profile','plans','sign-up','results','appearance','topic','exam','checkout','onboarding']
results = []
errors = []

def show(page, screen, theme='light', tier='guest', fixture=False):
    page.goto('about:blank')
    page.set_content(HTML, wait_until='load')
    page.evaluate('''([s,t,a,f])=>{screen=s;params={};theme=t;tier=a;
        if(f||s==='results'||s==='progress')setFixtureProgress();else render();}''', [screen,theme,tier,fixture])
    assert page.locator('#error').count() == 0, f'{screen}: render error'

with sync_playwright() as p:
    executable = os.environ.get('CHROMIUM_PATH')
    options = {'headless': True, 'args': ['--no-sandbox']}
    if executable:
        options['executable_path'] = executable
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width':390, 'height':844})
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width, height in [(320,568),(375,667),(390,844),(430,932),(1100,960)]:
        page.set_viewport_size({'width':width,'height':height})
        for screen in SCREENS:
            show(page, screen)
            metrics = page.evaluate('''()=>({
                documentOverflow:document.documentElement.scrollWidth>innerWidth+1,
                clippedText:[...document.querySelectorAll('#root .rn-text')]
                  .filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+2)
                  .map(e=>e.textContent.slice(0,80)),
                tabOutside:[...document.querySelectorAll('[role=tab]')].some(e=>{
                  const a=e.getBoundingClientRect(),b=document.querySelector('#device').getBoundingClientRect();
                  return a.bottom>b.bottom+1||a.right>b.right+1||a.left<b.left-1;
                })})''')
            assert not metrics['documentOverflow'], (screen,width,metrics)
            assert not metrics['clippedText'], (screen,width,metrics)
            assert not metrics['tabOutside'], (screen,width,metrics)
            results.append({'screen':screen,'viewport':f'{width}x{height}','theme':'light','passed':True})
            if width == 390:
                page.locator('#device').screenshot(path=str(OUT/f'{screen}-design-preview.png'))
            if width == 320 and screen == 'home':
                page.locator('#device').screenshot(path=str(OUT/'home-320-design-preview.png'))
    page.set_viewport_size({'width':390,'height':844})
    for screen in ['home','study','progress','profile']:
        show(page,screen,'dark')
        results.append({'screen':screen,'viewport':'390x844','theme':'dark','passed':True})
        if screen=='home':page.locator('#device').screenshot(path=str(OUT/'home-dark-design-preview.png'))
    show(page,'sign-up')
    checkbox=page.get_by_role('checkbox')
    expect(checkbox).not_to_be_checked()
    checkbox.click();page.wait_for_timeout(80);expect(checkbox).to_be_checked()
    assert checkbox.get_attribute('aria-checked')=='true'
    checkbox.press('Space');page.wait_for_timeout(80);expect(checkbox).not_to_be_checked()
    checkbox.press('Enter');page.wait_for_timeout(80);expect(checkbox).to_be_checked()
    assert 'solid' in page.locator('label').evaluate('(e)=>e.style.outline')
    page.locator('label').click();page.wait_for_timeout(80);expect(checkbox).not_to_be_checked()
    interactions=['consent: pointer, Space, Enter, label, checked state, focus outline']
    show(page,'home')
    page.get_by_role('tab',name='Practice',exact=True).click()
    expect(page.get_by_role('tab',name='Practice',exact=True)).to_have_attribute('aria-selected','true')
    interactions.append('dock navigation and selected state')
    for tier,label in [('guest','Available after free signup'),('free','Your plan'),('paid','Always available')]:
        show(page,'plans',tier=tier)
        assert label in page.locator('#root').inner_text()
    interactions.append('three access-tier plan labels')
    assert not errors,errors
    browser.close()
report={'scope':'Source-rendered DOM design adapter only; not Expo, React Native, store or backend QA.',
        'renderCases':len(results),'cases':results,'interactions':interactions,'pageErrors':errors,
        'limitations':['Fixture state and navigation adapter','No real React reconciliation or RN layout engine','No live auth or payment','No native accessibility certification']}
(OUT/'source-preview-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(f'PASS: {len(results)} source-preview render cases; consent, dock and plan-label checks. NOT Expo/native QA.')
