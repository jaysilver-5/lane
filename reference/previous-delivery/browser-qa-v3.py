"""FirstLane v0.3 browser-companion QA. This does not test native billing or live Supabase."""
from pathlib import Path
import json, hashlib, time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa/v3';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,value):
    checks.append({'name':name,'passed':bool(value)})
    print(f'{len(checks)}: {name} = {bool(value)}',flush=True)
    if not value: raise AssertionError(name)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
    page.expose_function('qaDigest',lambda vals:list(hashlib.sha256(bytes(vals)).digest()))
    page.evaluate("""Object.defineProperty(window,'localStorage',{value:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}}});Object.defineProperty(window.crypto,'subtle',{value:{digest:async (algorithm,bytes)=>new Uint8Array(await window.qaDigest([...bytes])).buffer}});""")
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'preview/index.html').read_text())
    page.evaluate("document.body.classList.add('flat');state.reduceMotion=true;render()")
    def ev(x): return page.evaluate(x)
    def go(x,data=None): page.evaluate('([p,d])=>go(p,d)',[x,data or {}]);page.wait_for_timeout(30)
    def shot(name): page.wait_for_timeout(180);page.screenshot(path=str(OUT/(name+'.png')),full_page=False)
    def screen(): return page.locator('#screen').inner_text()
    def button(name): return page.locator('#screen').get_by_role('button',name=name,exact=True)

    check('Welcome offers free account',button('Create my free account').count()==1)
    check('Welcome offers 10-question guest preview',button('Try 10 guest questions').count()==1)
    check('No trial language on welcome','trial' not in screen().lower())
    shot('01-welcome')

    button('Try 10 guest questions').click();page.wait_for_timeout(40)
    check('Guest pool is fixed at 10',ev('samplePool().length')==10)
    ev("begin('mock')");check('Guest full rehearsal is gated',ev("page==='locked'"))
    go('plans')
    check('Plans shows CA$14.99 once','CA$14.99' in screen() and 'once' in screen().lower())
    check('Plans says no subscription','No subscription' in screen())
    check('Plans says no expiry','No expiry' in screen())
    check('Plans contains no trial offer','trial' not in screen().lower())
    check('Complete plan is shown before Free',ev("document.querySelector('#screen .plus-card').compareDocumentPosition(document.querySelector('#screen .card')) & Node.DOCUMENT_POSITION_FOLLOWING")!=0)
    shot('02-plans-free')

    go('sign-up');shot('03-sign-up')
    page.locator('#signup-name').fill('Alex');page.locator('#email').fill('alex@example.test');page.locator('#password').fill('Throwaway123')
    button('Create my free account').click();page.wait_for_timeout(40)
    check('Signup requires terms','Accept the terms' in screen())
    page.locator('#accept-terms').check();button('Create my free account').click();page.wait_for_function("page==='verify-email'")
    check('Unverified account remains guest',ev("accessNow().kind==='guest'"))
    page.locator('#verify-code').fill('246810');button('Verify & choose my access').click();page.wait_for_function("page==='plans'")
    check('Verified account becomes FirstLane Free',ev("accessNow().kind==='free'"))
    check('Verified free pool is exactly 40',ev('samplePool().length')==40)
    check('Signup did not create receipt',ev('currentAccount().receipts.length')==0)

    go('checkout');shot('04-checkout')
    check('Checkout describes one purchase','ONE PURCHASE' in screen())
    check('Checkout has no expiry','NO EXPIRY' in screen())
    check('Checkout says Apple or Google handles payment','Apple or Google' in screen())
    check('Checkout contains no Paddle','Paddle' not in screen())

    # Non-success outcomes must not unlock.
    for outcome in ['cancelled','declined','pending']:
        ev('setStoreOutcome('+json.dumps(outcome)+')');go('checkout')
        button('Simulate CA$14.99 purchase').click();page.get_by_role('button',name='Confirm test purchase',exact=True).click();page.wait_for_timeout(40)
        check(outcome+' never unlocks Complete',ev("accessNow().kind!=='paid'"))
        if outcome=='pending':
            check('Pending hides duplicate purchase CTA',button('Simulate CA$14.99 purchase').count()==0)
        if outcome=='declined': check('Declined state is explained','declined' in screen().lower())
        if outcome=='cancelled': check('Cancelled state is explained','cancelled' in screen().lower())

    # Convert pending to verified success.
    ev("setStoreOutcome('success')")
    if button('Check purchase status').count(): button('Check purchase status').click()
    else:
        go('checkout');button('Simulate CA$14.99 purchase').click();page.get_by_role('button',name='Confirm test purchase',exact=True).click()
    page.wait_for_timeout(60)
    check('Success grants paid lifetime access',ev("accessNow().kind==='paid' && accessNow().full===true"))
    check('Paid record has no expiry',ev('currentAccount().paid.endsAt===null && currentAccount().paid.lifetime===true'))
    check('Success screen has no renewal countdown','No countdown' in screen() and 'no renewal' in screen().lower())
    shot('05-payment-success')

    go('membership')
    check('Billing screen labels one-time/no expiry','no renewal' in screen().lower() and 'no access expiry' in screen().lower())
    check('Receipt shows CA$14.99','CA$14.99' in screen())
    check('Receipt is present',ev('currentAccount().receipts.length')==1)
    shot('06-membership')

    # Paid route coverage and lifetime access.
    ev("begin('mock')")
    check('Paid rehearsal contains 40 questions',ev('state.active.questionIds.length')==40)
    check('Paid rehearsal balances 20 signs',ev("state.active.questionIds.filter(id=>byId.get(id).section==='road_signs').length") ==20)
    check('Paid rehearsal balances 20 rules',ev("state.active.questionIds.filter(id=>byId.get(id).section==='road_rules').length") ==20)
    ev('state.active=null;save()')
    go('downloads');check('Offline screen is unlocked for Complete','Save review pack' in screen())

    # Sign out and sign in restores same account entitlement.
    go('profile');ev('logoutPreview()');check('Signed out user is guest',ev("accessNow().kind==='guest'"))
    page.locator('#email').fill('alex@example.test');page.locator('#password').fill('Throwaway123');button('Sign in').click();page.wait_for_function("page==='today'")
    check('Sign in restores Complete',ev("accessNow().kind==='paid'"))
    check('Restored purchase still has no expiry',ev('currentAccount().paid.endsAt===null'))

    # Refund must revoke but not erase receipt/history.
    ev('refundPreview()');page.wait_for_timeout(30)
    check('Refund revokes premium entitlement',ev("accessNow().kind==='free'"))
    check('Refunded receipt remains',ev("currentAccount().receipts.length===1 && currentAccount().receipts[0].status==='refunded'"))
    check('Refund does not create a trial',ev("typeof currentAccount().trial==='undefined'"))
    shot('07-refunded')

    # Free pool stays fixed even under repeated starts.
    for _ in range(100):
        ev("state.active=null;begin('quick')")
        if not ev('state.active.questionIds.every(id=>SAMPLES.freeQuestionIds.includes(id))'): raise AssertionError('premium leak')
    check('100 free sessions never leak premium questions',True)
    ev('state.active=null;save()')

    # Second account isolation.
    ev('logoutPreview()');go('sign-up');page.locator('#email').fill('second@example.test');page.locator('#password').fill('Throwaway456');page.locator('#accept-terms').check();button('Create my free account').click();page.wait_for_function("page==='verify-email'");page.locator('#verify-code').fill('246810');button('Verify & choose my access').click();page.wait_for_function("page==='plans'")
    check('Second account does not inherit purchase',ev("accessNow().kind==='free' && !currentAccount().paid"))

    # Layout/theme route sweep.
    routes=['today','study','progress','profile','plans','membership','downloads','appearance','account','study-plan','jurisdiction','support','report','content','legal','review','saved']
    for width in [360,430]:
        page.set_viewport_size({'width':width,'height':900})
        for theme in ['light','dark']:
            ev('setTheme('+json.dumps(theme)+')')
            for route in routes:
                go(route)
                check(f'{width}px {theme} {route} no horizontal overflow',len(screen())>5 and ev("document.querySelector('#screen').scrollWidth <= document.querySelector('#screen').clientWidth+2"))
    page.set_viewport_size({'width':390,'height':844});ev("setTheme('dark')");go('plans');shot('08-plans-dark')

    check('No browser JavaScript errors',not errors)
    report={'status':'passed','checks':checks,'passed':len(checks),'js_errors':errors,'scope':'HTML companion only; simulated accounts/store outcomes; no live Apple/Google/RevenueCat/Supabase/native runtime.','generated_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    (OUT/'browser-report.json').write_text(json.dumps(report,indent=2))
    browser.close()
print(f'{len(checks)} FirstLane v0.3 browser checks passed. No JavaScript errors.')
