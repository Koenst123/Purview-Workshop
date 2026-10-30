"""Purview Experience Hub: Hub, Ervaar Purview, Academy, isolatie van de Workshop-state en responsieve schermen."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

app_path = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
errors, console, external_requests = [], [], []
BAD_TEXT = ["undefined", "NaN", "[object Object]", "${", "kon niet worden weergegeven"]


def clean_text(page, where):
    text = page.locator("#main").inner_text()
    for bad in BAD_TEXT:
        assert bad not in text, (where, bad)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda msg: console.append(f"{msg.type}: {msg.text}") if msg.type in ("error", "warning") else None)
    page.on("request", lambda request: external_requests.append(request.url) if request.url.startswith(("http:", "https:")) else None)
    page.goto(app_path.resolve().as_uri())
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    E = page.evaluate

    def go(route, sub=""):
        E("([r, s]) => Site.go(r, s)", [route, sub])
        page.wait_for_timeout(40)

    snapshot_js = """() => ({
      state: JSON.stringify(S()), rev: Store.rev, past: Store.past.length,
      stored: localStorage.getItem(STORAGE_KEY), session: JSON.stringify(sessionStorage)
    })"""
    E("""() => {
      Store.replace(buildPresetState('zorg'), false);
      Store.update(st => { st.meta.customer = 'SYNTHETIC-CUSTOMER'; st.decisions = [{ id: 'hub-test', status: 'open', text: 'SYNTHETIC-DECISION' }]; });
      Store.saveLocal.flush();
      sessionStorage.setItem(ACK_KEY, '1');
    }""")
    before = E(snapshot_js)
    unchanged_js = """(b) => JSON.stringify(S()) === b.state && Store.rev === b.rev && Store.past.length === b.past
      && localStorage.getItem(STORAGE_KEY) === b.stored && JSON.stringify(sessionStorage) === b.session"""

    # ---------- Academy ----------
    go("academy", "home")
    modules = E("CATALOG.academy.modules.map(m => m.id)")
    assert modules == ["overview", "data", "labels", "autolabel", "dlp", "endpoint", "copilot", "monitor", "roadmap"], modules
    assert E("document.querySelector('.a-home-stats').textContent.replace(/\\s+/g, ' ')").count("0/") == 2
    assert page.locator(".a-path").count() == 3 and page.locator(".a-path.is-new").count() == 3
    assert page.locator('#tb-tabs [aria-current="page"]').count() == 1
    assert page.locator('#tb-tabs').is_visible()
    go("academy", "lesson/overview/c2")
    assert page.locator("#main .a-keys li").count() >= 2, "kernkaarten in de les"
    go("academy", "lessons")
    assert page.locator(".a-lesson-card").count() == len(modules)
    page.locator("#a-topic-search").fill("zorg")
    assert 0 < page.locator(".a-lesson-card").count() < len(modules)
    page.locator("#a-topic-search").fill("zzzzz")
    assert page.locator(".a-empty").count() == 1
    page.locator('[data-action="ac-search-clear"]').click()
    assert page.locator(".a-lesson-card").count() == len(modules)
    for mid in modules:
        go("academy", mid)
        assert E("UI.sub.academy") == f"lesson/{mid}/c1"
        assert page.locator(".a-toc a").count() >= 4, mid
        steps = E("(id)=>ACV.steps(ACV.mod(id)).map(s=>s.id)", mid)
        for step in steps:
            go("academy", f"lesson/{mid}/{step}")
            assert page.locator(".a-chapter").count() == 1
            assert page.locator('.a-toc [aria-current="step"]').count() == 1
            assert page.locator(".a-tech, .site code").count() == 0
            clean_text(page, (mid, step))
        go("academy", f"lesson/{mid}/sources")
        assert page.locator('#main .s-src[href^="https://learn.microsoft.com/"]').count() >= 1, mid
        assert page.locator('#main a[href^="http"]:not([target="_blank"])').count() == 0, mid
        go("academy", f"lesson/{mid}/practice")
        for sel in ['[data-action="ac-set"]', '[data-action="ac-toggle"]:not([disabled])', '[data-action="ac-map"]',
                    '[data-action="ac-triage"]', '[data-action="ac-phase"]']:
            j = 0
            while j < 6 and j < page.locator(f".a-widget {sel}").count():
                page.locator(f".a-widget {sel}").nth(j).click()
                j += 1
        clean_text(page, f"module {mid}")
        go("academy", f"lesson/{mid}/quiz")
        quiz = E("(id) => CATALOG.academy.modules.find(m => m.id === id).quiz.map(q => q.answer)", mid)
        assert len(quiz) == 3, mid
        for qi, ans in enumerate(quiz):
            page.locator(f'.a-q-opt[data-i="{qi}"][data-value="{ans}"]').click()
            if qi < len(quiz) - 1:
                assert E("document.activeElement.id") == f"a-why-{qi}", (mid, qi)
        assert E("document.activeElement.id") == "a-quiz-done", mid
        assert "3 van 3 goed" in page.locator("#a-quiz-done").inner_text(), mid
        assert E("(id) => AC.done[id] === true", mid)
    go("academy", "home")
    assert page.locator(".a-path.is-done").count() == 3
    assert E("document.querySelector('.a-home-stats').textContent.replace(/\\s+/g, '')").startswith("3/3")
    go("academy", "path/begrijpen")
    assert page.locator(".a-finish").count() == 1

    # Quiz opnieuw: antwoorden weg, focus op de eerste optie, module blijft afgerond.
    go("academy", "lesson/dlp/quiz")
    page.locator('[data-action="ac-quiz-reset"]').click()
    assert page.locator("#a-quiz-done").count() == 0
    assert E("document.activeElement.matches('.a-q-opt[data-i=\"0\"][data-value=\"0\"]')")
    page.locator('.a-q-opt[data-i="0"][data-value="0"]').click()
    assert page.locator(".a-q-why").count() == 1

    # Informatietype-detector (vereenvoudigd, volgens de SIT-definities op Microsoft Learn).
    go("academy", "lesson/data/practice")

    def sit(text):
        page.locator("#a-sit-text").fill(text)
        page.wait_for_timeout(30)
        return E("(t) => AC_SIT.scan(t).map(h => [h.name, h.status, h.conf])", text), page.locator("#a-sit-out").inner_text()

    hits, shown = sit("Personeelsdossier\nBSN: 111222333")
    assert ["Netherlands citizen's service (BSN) number", "match", 85] in hits, hits
    assert "herkend in dit voorbeeld" in shown.lower()
    hits, _ = sit("Factuurnummer 111222333 is betaald.")
    assert ["Netherlands citizen's service (BSN) number", "nomatch", 0] in hits, hits
    hits, _ = sit("antibsn BSN 111222333")
    assert ["Netherlands citizen's service (BSN) number", "match", 85] in hits, hits
    hits, _ = sit("antibsn bsnnummer 111222333")
    assert ["Netherlands citizen's service (BSN) number", "nomatch", 0] in hits, hits
    hits, _ = sit("BSN 123456789")
    assert ["Netherlands citizen's service (BSN) number", "nomatch", 0] in hits, hits
    hits, _ = sit("IBAN NL91 ABNA 0417 1643 00")
    assert ["International banking account number (IBAN)", "match", 85] in hits, hits
    hits, shown = sit("Creditcard voor de reis: 4111 1111 1111 1111, vervaldatum 12/28.")
    assert ["Credit card number", "test", 0] in hits, hits
    assert "testnummer" in shown.lower()
    hits, _ = sit("Visa 4539 1488 0343 6467 exp date 12/28")
    assert ["Credit card number", "match", 85] in hits, hits
    hits, _ = sit("Nummer 4539 1488 0343 6467")
    assert ["Credit card number", "match", 65] in hits, hits
    hits, _ = sit("visage Visa 4539 1488 0343 6467")
    assert ["Credit card number", "match", 85] in hits, hits
    hits, _ = sit("visage 4539 1488 0343 6467")
    assert ["Credit card number", "match", 65] in hits, hits
    sit("<img src=x onerror=alert(1)> BSN 111222333")
    assert page.locator("#a-sit-out img").count() == 0
    assert E("AC_SIT.scan('1'.repeat(5000)).length") <= 20
    page.locator('[data-action="ac-sample"][data-id="card"]').click()
    assert page.locator('[data-action="ac-sample"][data-id="card"]').get_attribute("aria-pressed") == "true"

    # Begrippenlijst
    go("academy", "glossary")
    total = E("CATALOG.academy.glossary.length")
    assert total >= 40
    search = page.locator(".a-gloss-search")
    search.fill("label")
    assert page.locator("#a-gloss-count").inner_text().startswith("16 van ")
    search.fill("zzzz")
    assert page.locator("#a-gloss-count").inner_text().startswith("0 van ")
    search.fill("")
    assert page.locator("#a-gloss-count").inner_text().startswith(f"{total} van {total}")
    cats = page.locator('[data-action="ac-gcat"]')
    cats.nth(1).click()
    shown = int(page.locator("#a-gloss-count").inner_text().split(" ")[0])
    assert 0 < shown < total
    E("AC.gcat = ''; AC.gq = ''; App.render()")
    clean_text(page, "begrippenlijst")
    assert E(unchanged_js, before), "De Academy wijzigde de Workshop-state"
    page.reload()
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    assert E("Object.keys(AC.done).length") == 9
    assert E("AC.w.sit === null && AC.gq === ''")
    for path in E("CATALOG.academy.paths.map(p=>({id:p.id,modules:p.modules}))"):
        go("academy", "path/" + path["id"])
        assert page.locator(".a-path-row").count() == len(path["modules"])
        page.locator(".a-path-row").first.click()
        assert E("UI.sub.academy").endswith("/" + path["id"])
        page.locator('#main [data-action="ac-next"]').first.click()
        assert E("UI.sub.academy") == f"lesson/{path['modules'][0]}/c2/{path['id']}"
        page.go_back()
        page.wait_for_function("UI.sub.academy.includes('/c1/')")
    assert E("(saved) => localStorage.getItem(STORAGE_KEY) === saved", before["stored"])


    assert not errors, errors
    assert not console, console
    assert not external_requests, external_requests
    browser.close()
print("Academy: lessen, oefeningen, kennischecks, detector en begrippenlijst OK")
