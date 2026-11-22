import json, sys, time
from playwright.sync_api import sync_playwright
base = sys.argv[1]  # repo dir
shots = json.load(open(f"{base}/shots.json"))
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    for s in shots:
        pg.goto(f"http://127.0.0.1:8141/index.html{s['query']}")
        pg.wait_for_timeout(1100)
        pg.screenshot(path=f"{base}/screenshots/{s['name']}", type="jpeg", quality=82)
        print("shot", s["name"])
    b.close()
