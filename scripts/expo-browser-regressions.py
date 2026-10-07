"""Actual Expo web regression harness — NOT RUN in the delivery environment.
Start the Expo web app in demo mode first. This never creates an account or purchases.
Python 3.10+, playwright, and an installed Chromium are required.
"""
import argparse
import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url',default=os.environ.get('FIRSTLANE_QA_BASE_URL','http://127.0.0.1:8081'))
parser.add_argument('--allow-remote-demo',action='store_true',help='Explicitly confirm a remote demo-only test server.')
args=parser.parse_args()
base=args.base_url.rstrip('/')
u=urlparse(base)
if u.scheme not in ['http','https'] or not u.hostname:
    parser.error('Use a valid HTTP(S) demo URL.')
if u.hostname not in ['localhost','127.0.0.1','::1'] and not args.allow_remote_demo:
    parser.error('Remote testing requires --allow-remote-demo. Do not point this at production.')
root=Path(__file__).resolve().parents[1]
out=root/'qa'/'expo-runtime';out.mkdir(parents=True,exist_ok=True)
checks=[];page_errors=[];console_errors=[]
with sync_playwright() as p:
    opts={'headless':True}
    if os.environ.get('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
    browser=p.chromium.launch(**opts)
    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=context.new_page();page.set_default_timeout(20000)
    page.on('pageerror',lambda e:page_errors.append(str(e)))
    page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
    try:
        # A new isolated browser context has no saved account or paid state.
        page.goto(base+'/onboarding',wait_until='domcontentloaded')
        page.get_by_role('button',name='Try as guest',exact=True).click()
        expect(page.get_by_role('tab',name='Home',exact=True)).to_be_visible()
        checks.append('Guest entry and Home tab')
        page.get_by_role('button',name='Start a quick session',exact=True).click()
        page.get_by_role('radio').first.click()
        page.get_by_role('button',name='Check my answer',exact=True).click()
        expect(page.get_by_role('button',name='Next question',exact=True)).to_be_visible()
        # Allow the app's asynchronous state persistence; never replace it with fixtures.
        page.wait_for_function("JSON.parse(localStorage.getItem('firstlane-v1:learner:guest')||'{}').active?.answers?.length===1")
        active_before=page.evaluate("JSON.parse(localStorage.getItem('firstlane-v1:learner:guest')).active")
        page.get_by_role('button',name='Pause practice',exact=True).click()
        page.get_by_role('button',name='Save & leave',exact=True).click()
        page.get_by_role('button',name='Try a rehearsal',exact=True).click()
        page.get_by_role('button',name='Start the rehearsal',exact=True).click()
        page.get_by_role('button',name='Keep practising',exact=True).click()
        expect(page.get_by_role('button',name='Continue practice',exact=True)).to_be_visible()
        active_after=page.evaluate("JSON.parse(localStorage.getItem('firstlane-v1:learner:guest')).active")
        assert active_after['id']==active_before['id'] and len(active_after['answers'])==1
        checks.append('Free session identity and answered progress survive a premium gate')
        page.goto(base+'/auth/sign-up',wait_until='domcontentloaded')
        checkbox=page.get_by_role('checkbox')
        expect(checkbox).not_to_be_checked()
        checkbox.click();expect(checkbox).to_be_checked();expect(checkbox).to_have_attribute('aria-checked','true')
        checkbox.press('Space');expect(checkbox).not_to_be_checked()
        checkbox.press('Enter');expect(checkbox).to_be_checked()
        page.get_by_text('I agree to the terms and have read the privacy notice.',exact=True).click()
        expect(checkbox).not_to_be_checked()
        checks.append('Signup pointer, Space, Enter, label, and aria-checked semantics')
        for path,marker in [('/plans','Available after free signup'),('/checkout','Review purchase')]:
            page.goto(base+path,wait_until='domcontentloaded')
            expect(page.get_by_text(marker,exact=True)).to_be_visible()
        checks.append('Guest plan identity and checkout initial render')
        page.goto(base+'/',wait_until='domcontentloaded')
        page.get_by_role('button',name='Continue practice',exact=True).click()
        # Finish the real guest session, without assuming question answers are correct.
        for _ in range(12):
            result_button=page.get_by_role('button',name='See my results',exact=True)
            if result_button.count() and result_button.is_visible():
                result_button.click();break
            next_button=page.get_by_role('button',name='Next question',exact=True)
            if next_button.count() and next_button.is_visible():
                next_button.click()
            page.get_by_role('radio').first.click()
            page.get_by_role('button',name='Check my answer',exact=True).click()
        expect(page.get_by_role('button',name='Back to Home',exact=True)).to_be_visible()
        page.screenshot(path=str(out/'results-390.png'))
        checks.append('Guest results render')
        for width,height in [(320,568),(390,844),(430,932)]:
            page.set_viewport_size({'width':width,'height':height})
            page.goto(base+'/',wait_until='domcontentloaded')
            expect(page.get_by_role('tab',name='Home',exact=True)).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.screenshot(path=str(out/f'home-{width}.png'))
        checks.append('Actual Expo Home at three phone widths')
        page.wait_for_timeout(300)
        assert not page_errors, page_errors
        assert not console_errors, console_errors
        checks.append('No uncaught page errors or console.error messages during this run')
        report={'status':'PASS','scope':'Actual Expo web runtime, demo guest flows only','checks':checks,
                'notCovered':['Paid checkout transitions','Real Supabase authentication','RevenueCat/store/backend','Native devices/accessibility']}
        (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report,indent=2))
    except Exception as error:
        report={'status':'FAIL','checksCompleted':checks,'failure':str(error),'pageErrors':page_errors,'consoleErrors':console_errors}
        (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
        page.screenshot(path=str(out/'failure.png'))
        raise
    finally:
        context.close();browser.close()
