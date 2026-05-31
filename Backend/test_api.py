"""Quick smoke test — run with API server on :8000."""

import requests

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\xa5\xf6\xa4\xe8\x00\x00\x00\x00IEND\xaeB`\x82"
)

base = "http://127.0.0.1:8000"

r = requests.post(f"{base}/api/designs", files={"image": ("t.png", PNG, "image/png")})
assert r.ok, r.text
data = r.json()
did = data["design_id"]
print("create", data)

assert requests.get(f"{base}/api/designs/{did}").ok
print("preview", requests.get(f"{base}/api/designs/{did}/preview").status_code)

co = requests.post(f"{base}/api/checkout/{did}").json()
secret = co["client_secret"]
conf = requests.post(f"{base}/api/checkout/confirm/{secret}").json()
print("confirm", conf)

hd = requests.get(f"{base}/api/downloads/{did}")
print("hd", hd.status_code, len(hd.content), "bytes")
print("OK")
