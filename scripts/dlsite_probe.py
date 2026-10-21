import json, urllib.request, urllib.error

RID = "RJ01712295"
urls = [
    f"https://www.dlsite.com/girls/api/=/product.json?workno={RID}&locale=ja_JP",
    f"https://www.dlsite.com/girls/work/=/product_id/{RID}.html",
]
headers = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/155 Safari/537.36",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
}
rows = []
for url in urls:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read(512)
            rows.append({
                "url": url,
                "status": r.status,
                "content_type": r.headers.get("content-type"),
                "prefix": body.decode("utf-8", errors="replace")
            })
    except urllib.error.HTTPError as e:
        rows.append({"url": url, "status": e.code, "error": "HTTPError"})
    except Exception as e:
        rows.append({"url": url, "status": None, "error": type(e).__name__, "detail": str(e)})
print(json.dumps(rows, ensure_ascii=False, indent=2))
