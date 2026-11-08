# Photos de test (Wikimedia Commons), uniquement pour vérifier la reconnaissance : jamais livrées dans l'appli.
import json, os, sys, urllib.request, urllib.parse, random, time
UA = {"User-Agent": "KichtaRunTestBot/1.0 (github.com/massiyousfi23-source/Snake-Massi)"}
CATS = ["Maine Coon", "Ragdoll cats", "Persian cats", "Siamese cats", "British Shorthair", "Sphynx cats", "Scottish Fold",
        "Bengal cats", "Russian Blue", "Abyssinian cats", "Tuxedo cats", "Calico cats", "Tortoiseshell cats", "Orange tabby cats",
        "Black cats", "White cats", "Mackerel tabby cats", "Classic tabby cats", "Turkish Van", "Norwegian Forest cats", "Birman",
        "Devon Rex", "Bicolor cats", "Gray tabby cats", "Exotic Shorthair", "Chartreux", "Bombay cats", "Silver tabby cats"]
out = sys.argv[1]; os.makedirs(out, exist_ok=True); random.seed(3); labels = {}
def get(url):
    for k in range(6):
        try:
            time.sleep(1.2)
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(10 * (k + 1))
    raise RuntimeError("trop de refus")
def api(**p):
    p.update(format="json"); url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p)
    return json.loads(get(url))
for cat in CATS:
    try:
        r = api(action="query", list="categorymembers", cmtitle="Category:" + cat, cmtype="file", cmlimit=60)
        files = [m["title"] for m in r["query"]["categorymembers"] if m["title"].lower().endswith((".jpg", ".jpeg", ".png"))]
        random.shuffle(files); n = 0
        for f in files[:8]:
            if n >= 4: break
            info = api(action="query", titles=f, prop="imageinfo", iiprop="url", iiurlwidth=640)
            page = next(iter(info["query"]["pages"].values()))
            u = page["imageinfo"][0]["thumburl"]
            name = f"{cat.replace(' ', '_')}_{n}.jpg"
            open(os.path.join(out, name), "wb").write(get(u))
            labels[name] = {"category": cat, "source": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(f.replace(" ", "_"))}
            n += 1
        print(cat, n)
    except Exception as e:
        print("échec", cat, e)
json.dump(labels, open(os.path.join(out, "labels.json"), "w"), indent=1)
