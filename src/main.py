import http.client
import json

conn = http.client.HTTPSConnection("google.serper.dev")
payload = json.dumps({
  "q": "Climate in Africa",
  "gl": "ke",
  "tbs": "qdr:m"
})
headers = {
  'X-API-KEY': 'f2894d5ad822684ec9222f7ca8f27acca7182aee',
  'Content-Type': 'application/json'
}
conn.request("POST", "/search", payload, headers)
res = conn.getresponse()
data = res.read()
print(data.decode("utf-8"))
