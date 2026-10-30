"""Six independent role journeys, every choice, free navigation and persisted replay."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

app = Path(sys.argv[1]).resolve().as_uri()
errors, requests = [], []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("request", lambda r: requests.append(r.url) if r.url.startswith(("http:", "https:")) else None)
    page.goto(app)
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    E = page.evaluate

    def portraits(count):
        images = page.locator(".x-avatar img")
        assert images.count() == count
        images.evaluate_all("(images)=>Promise.all(images.map(img=>img.decode()))")
        assert images.evaluate_all("""images=>images.every(img=>
            img.complete && img.naturalWidth===256 && img.naturalHeight===256
            && img.src.startsWith('data:image/svg+xml')
            && img.alt==='' && img.closest('[aria-hidden=\"true\"]')
            && img.getBoundingClientRect().width===img.parentElement.getBoundingClientRect().width
            && img.getBoundingClientRect().height===img.parentElement.getBoundingClientRect().height)""")
        assert page.locator(".x-avatar").all_inner_texts() == [""] * count
        return images.evaluate_all("images=>images.map(img=>img.src)")

    E("""() => {
      Store.replace(buildPresetState('zorg'), false);
      Store.update(s=>s.meta.customer='SYNTHETIC-ROLE-TEST');
      Store.saveLocal.flush(); sessionStorage.setItem(ACK_KEY,'1');
      Site.go('experience','intro');
    }""")
    before = E("({state:JSON.stringify(S()),rev:Store.rev,past:Store.past.length,stored:localStorage.getItem(STORAGE_KEY)})")
    roles = E("CATALOG.experience.roles.map(r=>({id:r.id,moments:r.moments.map(m=>({id:m.id,choices:m.choices.map(c=>c.key)}))}))")
    assert [r["id"] for r in roles] == ["hr", "finance", "project", "security", "care", "specialist"]
    assert len({m["id"] for r in roles for m in r["moments"]}) >= 30
    assert page.locator(".x-role").count() == 6
    sources = portraits(6)
    assert len(set(sources)) == 6
    for role in roles:
        rid, moments = role["id"], role["moments"]
        assert len(moments) >= 5
        E("(id)=>Site.go('experience','role/'+id)", rid)
        expected = sources[[r["id"] for r in roles].index(rid)]
        assert portraits(1) == [expected]
        assert page.locator(".x-role-moment").count() == len(moments)
        page.locator(".x-role-moment").last.click()
        assert E("UI.sub.experience") == f"day/{rid}/{moments[-1]['id']}"
        assert page.locator(".x-dot:not([disabled])").count() == len(moments)
        for i, moment in enumerate(moments):
            page.locator(".x-dot").nth(i).click()
            assert portraits(2) == [expected, expected]
            assert page.locator(".x-day-card .x-day-story").inner_text().strip()
            assert f"Moment {i + 1} van {len(moments)}" in page.locator(".x-story-meta").inner_text()
            assert E("XP.i") == i
            assert page.locator(".x-dot").nth(i).get_attribute("aria-current") == "step"
            for key in moment["choices"]:
                page.locator(f'.x-choice[data-key="{key}"]').click()
                assert E("document.activeElement.id") == "x-out-h"
                assert page.locator(".x-outcome").count() == 1
                assert page.locator(".x-stage .pv-scene, .x-stage .pv-desk, .x-stage .x-portal").count() >= 1
                text = page.locator("#main").inner_text()
                assert not any(bad in text for bad in ["undefined", "NaN", "[object Object]", "${"])
                page.locator('[data-action="xp-view"][data-v="without"]').click()
                assert page.locator(".x-without").inner_text().strip()
                scene = E("() => {const m=XExp.moment(); return XScene.forMoment(m,m.choices.find(c=>c.key===XP.picks[m.id]),true);}")
                if moment["id"] in ["hr-sollicitatie", "hr-loonbestand", "finance-betaalbestand", "project-ontwerp", "care-overdracht"]:
                    assert scene["label"] == "none", moment["id"]
                if moment["id"] in ["finance-accountant", "project-partner"] and key == "B":
                    assert scene["bars"][0][0] == "block", moment["id"]
                page.locator('[data-action="xp-view"][data-v="with"]').click()
            assert page.locator('.x-links a[data-route="academy"]').count() == 1
            assert page.locator('.x-links a[data-route="experience"]').count() == 1
        page.locator(".x-nav .s-btn.primary").click()
        assert E("UI.sub.experience") == "finale/" + rid
        assert E("XExp.answered()") == len(moments)
        assert sum(int(x) for x in page.locator(".x-score b").all_inner_texts()) == len(moments)
        assert page.locator(".x-recap-link").count() == len(moments)
        page.locator(".x-recap-link").first.click()
        assert E("UI.sub.experience") == f"day/{rid}/{moments[0]['id']}"
        page.go_back()
        page.wait_for_function("(id)=>UI.sub.experience==='finale/'+id", arg=rid)
    assert E("Object.keys(XP.picks).length") == 30
    page.reload()
    page.wait_for_function("typeof XP !== 'undefined' && !!Store.state")
    assert E("Object.keys(XP.picks).length") == 30
    assert E("XExp.role().id") == "specialist"
    page.locator('[data-action="xp-restart"]').click()
    page.get_by_role("button", name="Ja", exact=True).click()
    assert E("Object.keys(XP.picks).length") == 25
    assert E("XExp.answered()") == 0
    page.reload()
    page.wait_for_function("typeof XP !== 'undefined' && !!Store.state")
    assert E("Object.keys(XP.picks).length") == 25
    assert E("(b)=>JSON.stringify(S())===b.state && localStorage.getItem(STORAGE_KEY)===b.stored", before)
    assert "SYNTHETIC-ROLE-TEST" not in E("localStorage.getItem(LEARNING_KEY)")
    assert not errors, errors
    assert not requests, requests
    browser.close()
print("Six roles, 30 scenarios, every choice, recaps, persistence and isolated role reset OK")
