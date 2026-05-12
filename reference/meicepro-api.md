# Meicepro / Meiquc Skin Analysis Report — API Reverse-Engineering

> Target: `https://eu-meicepro-api.meiquc.cn` — EU region of Meicepro Pro (`MC900` device family).
> Web viewer: `/meicepro-h5/pages/report/report?id={diagnosisId}&language={lang}&appVersion=...`
> Sample report id used: `00000000-0000-0000-0000-000000000000` (algorithm v1.3.0.6, app v0.10.3.0).

---

## 1. How the H5 viewer actually fetches the report

The whole report is a single-shot Vue/Uniapp SPA. After loading `/meicepro-h5/...index.0ebf7cc8.js` it issues exactly **three** XHRs and never makes another API call again — even when you navigate between sub-pages (Skin Analysis, Aging Grade, etc.) the data is read from `uni.getStorageSync("data")` that was hydrated at startup.

| # | Method | URL | What it gives you |
|---|--------|-----|-------------------|
| 1 | GET | `/meicepro-api/open/diagnosis/get/{diagnosisId}/{lang}` | The full diagnosis: customer + all 3 face directions + all scores + image URLs + localized symptom descriptions |
| 2 | GET | `/meicepro-api/open/diagnosis/query/{diagnosisId}/{page}/{pageSize}` | Same diagnosis wrapped as a paginated list (no symptom descriptions, no customer block). Only shape that varies vs `get`. |
| 3 | POST | `/meicepro-api/open/appLanguage/queryByShopList` | List of (language × templateType) → translation file URLs (xlsx/xlt) used by the desktop app to localise itself |

OSS images live on a public-readable Aliyun bucket — no signature/token required.

The viewer is **publicly accessible** — anyone with the diagnosisId can see the report. Authentication is not required for the `/open/...` endpoints (everything else requires Bearer token; without it they return `code:100016, "无权访问"`).

### Behaviour notes
- `language` is a **required path segment** in `/open/diagnosis/get/` — omitting it returns 404.
  Tested values that work: `en`, `zh` (you can predict from `applanguage` payload that all of `ar de el en es fr he hu id it ja lt nl pl pt ru sk th tr uk vi zh` are supported).
- Bad / unknown id → `{"code":500602,"message":"拍摄记录不存在","status":"F"}` ("photo record does not exist").
- `diagnosis/query` is a `mybatis-pagehelper` style page wrapper: passing page=1/pageSize=1 still works and returns one entry; out-of-range page=2 returns the full list (no clamping). Field `total/pages/totalSize` reflects how many *photo sessions* exist for the customer (always 1 for a single report).

---

## 2. Endpoint catalogue (from JS-bundle reverse-engineering)

Pulled from `pages-report-beautySkin.js` / `pages-aichat-index.js` — the API util module is shared across these chunks.

### 2.1 Public / open endpoints (no auth)
| Endpoint | Method | Purpose |
|---|---|---|
| `/meicepro-api/open/diagnosis/get/{id}/{lang}` | GET | Full diagnosis + localized symptom desc list |
| `/meicepro-api/open/diagnosis/query/{id}/{page}/{pageSize}` | GET | Paginated diagnosis list (used to detect "no longer exists") |
| `/meicepro-api/open/appLanguage/queryByShopList` | POST `{}` | Languages × template-type catalogue |

### 2.2 Authenticated endpoints (Bearer required — for the operator desktop app, NOT the H5 viewer)
| Endpoint | Method | Purpose |
|---|---|---|
| `/meicepro-api/oemInfo/get` | GET | Branding / OEM tenant config |
| `/meicepro-api/user/get` | GET | Current operator |
| `/meicepro-api/userDict/get` | GET | Enumerations (skin types, ITA standards, …) |
| `/meicepro-api/customer/get/{cusId}` | GET | Customer record |
| `/meicepro-api/diagnosis/get/{id}` | GET | Authenticated mirror of open/get (richer fields) |
| `/meicepro-api/diagnosis/queryAITrendList` | GET | Cross-session trend data for AI summary |
| `/meicepro-api/diagnosis/updateDiagnosisCc/{id}` | POST | Update "chief complaint" string |
| `/meicepro-api/diagnosis/updSelectedData` | POST | Persist user-selected items (toggling included items in PDF) |
| `/meicepro-api/diagnosis/addProposal` | POST | Save treatment proposal text |
| `/meicepro-api/diagnosisITA/queryAll` | GET | ITA (Individual Typology Angle) skin-tone classification table |
| `/meicepro-api/diagnosisProduct/query/1/9999` | GET | Products attached to diagnosis |
| `/meicepro-api/diagnosisProduct/add/{id}` <br> `/addList/{id}` <br> `/addNewList/{id}` <br> `/delete/{id}` <br> `/updProductNum/{id}` | POST/PUT | Manage attached products |
| `/meicepro-api/product/query/{id}` | GET | Product catalogue |
| `/meicepro-api/product/query/1/9999` | GET | All products |
| `/meicepro-api/product/queryAIRecommendList` | GET | AI-recommended products for this diagnosis |
| `/meicepro-api/questionAnswer/getSkinType/{id}` | GET | Skin-type questionnaire answers |
| `/meicepro-api/symptomDesc/queryAll` | GET | Master list of symptom advice (also shipped inline in `open/get`) |
| `/meicepro-api/system/datetime` | GET | Server time |
| `/meicepro-api/userOrder/query/1/999` | GET | Operator's orders / billing history |
| `/meicepro-api/file/...` | varied | OSS file upload helper |
| `/meicepro-api/mail/sendEmail` | POST | Email the report PDF/link |
| `/meicepro-api/aiChat/chat/completions` | POST | AI chat (OpenAI-compatible) |
| `/meicepro-api/aiChat/report/completions` | POST | AI report-generation streaming |
| `/aiChat/summary/completions` | POST | AI summary stream (used by `/pages/ai/ai`) |
| `/meicepro-api/xfyun/getAuthUrl` | GET | iFlytek (Xunfei) TTS WebSocket URL |
| `/analytics-api/appEventLog/add` | POST | Telemetry / event logging |

The H5 viewer never calls any of these; all the goodies are inside the open `diagnosis/get`.

---

## 3. Web-app routes

The Vue/Uniapp router exposes these client-side routes (chunks in `/meicepro-h5/static/js/pages-*.HASH.js`):

| Route | Function |
|---|---|
| `/pages/report/report?id=...&language=...&appVersion=...` | Main report (radar chart, aging grade map, hero photo) |
| `/pages/report/analyze?type={dote\|symptom}` | Detail view (reads from local storage) |
| `/pages/report/aInit` | Initialisation / QR onboarding |
| `/pages/report/suggest` | Suggestions (1 KB stub — feature flagged off in this build) |
| `/pages/report/beautySkin` | "Beauty Skin" / product recommendations view |
| `/pages/ai/ai` | AI report streaming page |
| `/pages/aichat/index` | AI chat |
| `/pages/index/index` | Landing |
| `/pages/push-parameters/index` | Push-config |
| `/pages/qrcode/qrcode` | QR scan |
| `/pages/vip-description/index` | VIP info |

---

## 4. Diagnosis JSON structure (the real money shot)

Top-level shape from `/open/diagnosis/get/{id}/{lang}` — example values from the real report.

```jsonc
{
  "code": 200,
  "status": "S",
  "message": "SUCCESS",
  "datas": {
    "customer": { /* customer record */ },
    "diagnosis": { /* one report */ },
    "diagnosisProductList": [ /* attached products */ ],
    "priceEnable": 1,
    "symptomDescList": [ /* localized symptom advice cards */ ]
  }
}
```

### 4.1 `customer`
PII for the patient — exposed without auth on the open endpoint.

| Field | Sample | Meaning |
|---|---|---|
| `id` | `a228b39b-...` | customerId |
| `cusName` | `<patient name>` | name |
| `birthday` | `1999-11-23 00:00:00` | DOB |
| `gender` | `1` | 1=male, 0=female (per `userDict`) |
| `phone` | `07568935764` | phone |
| `email` | `null` | email |
| `married`, `procreated`, `beauty` | `0/1/null` | lifestyle flags |
| `diagnosisCc` | `under eye areas and small petechia` | Chief complaint (free text) |
| `cusDesc`, `cusLabel`, `cusSource`, `cusStatus` | misc | CRM tags |
| `skinType` | `2` | resolved Fitzpatrick-ish skin type from questionnaire (1..6) |
| `itaStandard` | `null` | ITA classification id (joins `diagnosisITA/queryAll`) |
| `shopId` / `shopName` | `11111111-...` / `<your-clinic>` | clinic |
| `userId` / `userName` | `2e84afaa-...` / `<your-clinic>` | operator |
| `oemId` | `null` (4100 on diagnosis) | tenant brand id |
| `createTime` / `optTime` / `updateTime` | timestamps | China/UTC+8 timezone (`+08`) |

### 4.2 `diagnosis` (the report itself)

| Field | Sample | Meaning |
|---|---|---|
| `id` | `00000000-...` | diagnosisId (the URL `id`) |
| `cusId` | `a228b39b-...` | foreign key to customer |
| `shopId`, `userId`, `oemId` | | |
| `algType` | `2` | analyzer family. 2 = MC900 desktop |
| `algVersion` | `"1.3.0.6"` | image-analysis algo version (shown in top-right of the H5) |
| `appVersion` | `"0.10.3.0"` | desktop client version |
| `dataVersion` | `1` | response schema version. The JS branches on `isNewDataVersion` to enable acne (symptom 17) |
| `deviceNo` | `"MC900-F115AE089A87"` | physical device serial |
| `directions` | `"111"` | bitmask of which face directions were captured: position 0 = front (center), 1 = right, 2 = left. `"111"` = all three; `"010"` = only front. |
| `createTime`, `uploadTime` | `2026-04-25 22:13:52+08` | capture / upload time |
| `skinScore` | `0.69482` | overall skin score (0..1, 1 = best). Front face takes precedence in the radar chart. |
| `skinAge` | `26` | estimated skin age |
| `diagnosisStatus` | `1` | 1 = finished |
| `freeze` | `null` | ITA/freeze flag |
| `diagnosisITA` / `diagnosisITAId` | `null` | applied ITA classification |
| `diagnosisWoe` / `diagnosisWoeId` | `null` | applied "WOE" classification (legacy) |
| `mcReportId`, `meicetReportId` | `null` | external report ids |
| `aiPrompt` / `aiResult` | `null` | last AI run inputs/outputs (set by AI page) |
| `proposal` | `null` | doctor's proposal text (auth endpoint) |
| `selectedType` | `null` | last-selected scope filter |
| `extra` | `null` | OEM extra |
| `meiceExtra` | `'{"skinType":"2","agingIndexType":"1","platform":"windows","appVersionCode":"26040902","appType":"meicet","BigDataVersion":"1"}'` | desktop-side metadata serialized as JSON string |
| `customerQueryResponse` | duplicated `customer` | denormalised copy |
| `diagnosisSkinList` | `[ … ]` | **per-face** results, one entry per direction — the most important array |

### 4.3 `diagnosis.diagnosisSkinList[i]` — per-direction analysis

Each entry covers one face direction.

| Field | Range / Sample | Meaning |
|---|---|---|
| `id` | uuid | per-face record id |
| `direction` | `1` / `0` / `-1` | **right (1) / front (0) / left (-1)** |
| `diagnosisStatus` | `1` | finished |
| `isFinished` | `1` | analysis complete |
| `selectedType` | `null` | per-face filter override |
| `skinScore` | `0.70667` | per-face overall score |
| `skinAge` | `26` | per-face skin age |
| `skinColor` | `"NATURE"` | enum: NATURE / FAIR / WHEAT / DARK (consult `userDict`) |
| `skinType` | `3` (front only) | only present on front-face: ITA / Fitzpatrick bucket |
| `agingIndex` | `14` (front), `-1` else | aggregate aging score for that face direction (-1 = N/A) |

Per-symptom score blocks (each contributes to the radar chart). Scores are 0..1 — **higher = better** (less symptom). Counts/areas/ratios are raw measurements.

| Symptom | Score | Count | Area (px²) | Ratio (% of face) | Notes |
|---|---|---|---|---|---|
| Acne (yellow/white) | `acneScore` | `acneNum` | `acneArea` | `acneRatio` | Code 17 (only when `dataVersion>=1`) |
| Red Acne | `redAcneScore` | `redAcneNum` | `redAcneArea` | `redAcneRatio` | |
| Red Spots | `redspotScore` | `redspotNum` | `redspotArea` | `redspotRatio` | code 04 (sensitive area / red area) |
| Pores | `poreScore` | `poreNum` | `poreArea` | `poreRatio` | code 07 |
| Texture | `textureScore` | `textureNum` | `textureArea` | `textureRatio` | code 06 |
| Surface (visible) Spots | `surfacespotScore` | `surfacespotNum` | `surfacespotArea` | `surfacespotRatio` | "biaosu" — symptom code 02 visible variant |
| UV Spots | `uvspotScore` | `uvspotNum` | `uvspotArea` | `uvspotRatio` | code 02 (UV photography) |
| UV Deep Spots | `uvdeepspotScore` | `uvdeepspotNum` | `uvdeepspotArea` | `uvdeepspotRatio` | code 03 |
| Brown Spots | `brownspotScore` | `brownspotNum` | (`brownspotArea` may be null) | `brownspotRatio` | + `brownspotAgingIndex`, `brownspotWeight` |
| Wrinkles (overall) | `wrinkleScore` | – | – | – | composite (front face) |

**Per-region wrinkles** (front face only, except `wrinkleSide*` which is on the side faces):

| Region | Score | Aging idx | Weight | Symptom code |
|---|---|---|---|---|
| Forehead lines | `wrinkleForeheadScore` | `wrinkleForeheadAgingIndex` | `wrinkleForeheadWeight` | 09 |
| Frown lines (glabellar) | `wrinkleGlabellarScore` | `wrinkleGlabellarAgingIndex` | `wrinkleGlabellarWeight` | 10 |
| Inter-ocular wrinkles (between eyes) | `wrinkleBetweeneyeScore` | `wrinkleBetweeneyeAgingIndex` | `wrinkleBetweeneyeWeight` | 11 |
| Periorbital / under-eye | `wrinkleUndereyeScore` | `wrinkleUndereyeAgingIndex` | `wrinkleUndereyeWeight` | 12 |
| Crow's feet (side) | `wrinkleSideScore` | `wrinkleSideAgingIndex` | `wrinkleSideWeight` | 13 (side faces only) |
| Nasolabial folds | `wrinkleNasofoldsScore` | `wrinkleNasofoldsAgingIndex` | `wrinkleNasofoldsWeight` | 14 |
| Marionette (mouth corner) | `wrinkleCormouthScore` | `wrinkleCormouthAgingIndex` | `wrinkleCormouthWeight` | 15 |

> The H5's "Aging Grade" face heatmap displays `wrinkle*AgingIndex / 10`. Sample: `wrinkleForeheadAgingIndex=19` → "1.9 Grade" on the forehead overlay. Severity colouring: 0–~2 mild (green), then yellow / orange / red toward 5+. Composite "Aging comprehensive level" = average of the displayed regions (front: forehead + glabellar + betweeneye + undereye + cormouth + nasofolds + brownspot; side: side + brownspot).

### 4.4 `diagnosisSkinDetailList[]` — per-symptom severity breakdown

Each per-direction record carries a fine-grained `diagnosisSkinDetailList`: one entry per (`symptom`, `degreeLevel`) pair.

```jsonc
{ "symptom": "06", "degreeLevel": 2, "counts": 573, "area": 69854.0, "areaRatio": 0.06397 }
```

| Field | Meaning |
|---|---|
| `symptom` | 2-digit zero-padded code (see § 4.5) |
| `degreeLevel` | severity class. Most symptoms use 1=mild, 2=moderate, 3=severe. Wrinkles use 1=skin-pattern, 2=shallow, 3=deeper, 4=deepest. Some use up to 6 levels (e.g. 14, 15) for finer wrinkle stages. |
| `counts` | number of detected blobs of that severity |
| `area` | total pixel area |
| `areaRatio` | area / face-mask area (0..1) |

> The H5 "Forehead Lines" detail view reads `diagnosisSkinDetailList` filtered to `symptom=='09'` and groups rows by `degreeLevel` to fill the "Shallow Lines / Deeper Lines / Deepest Lines" cards (e.g. front face had `degreeLevel=2 counts=27` → "Shallow Lines: 27 quantity, …mm², …%").

### 4.5 Symptom code → label catalogue

Recovered from JS strings + the `symptomDescList` payload. (Originals are Chinese; English from the report's `symptomDescList`.)

| Code | CN | EN | Where it shows up |
|---|---|---|---|
| 01 | 雀斑 | UV spots / freckles | Open desc only — symptom desc card |
| 02 | 棕色斑 | Brown Spots | Skin Analysis tab + skin-detail rows |
| 03 | 深色斑 | Deep-seated dark spots / UV deep spots | Symptom desc card (corresponds to `uvdeepspot*` numbers) |
| 04 | 红区 | Red Area / sensitive | Skin Analysis tab |
| 05 | – | – | unused in this report |
| 06 | 纹理 | Texture | Skin Analysis tab |
| 07 | 毛孔 | Pores (small / medium / large via `degreeLevel`) | Skin Analysis tab |
| 08 | 卟啉 | Porphyrin | Skin Analysis tab |
| 09 | 抬头纹 | Forehead Lines | Aging Grade tab |
| 10 | 眉间纹 | Frown Lines / Glabellar | Aging Grade tab |
| 11 | 眼间纹 | Inter-ocular Wrinkles (between eyes) | Aging Grade tab |
| 12 | 眶周纹 | Periorbital / under-eye Wrinkles | Aging Grade tab |
| 13 | 鱼尾纹 | Crow's Feet (side faces only) | Side-face aging tab |
| 14 | 法令纹 | Nasolabial Folds | Aging Grade tab |
| 15 | 口角纹 | Marionette / Mouth-corner Lines | Aging Grade tab |
| 16 | – | – | unused |
| 17 | 痘痘 | Acne | Skin Analysis (when `dataVersion >= 1`) |
| 18 | – | – | unused |

The "Skin Analysis" radar chart tabs are: **Pores, Porphyrin, Surface Spots (表素), Texture, Brown Spots, UV Spots, Red Area** + **Acne** (when present). The "Aging Grade" tabs (front face) are: **Forehead, Frown, Inter-ocular, Nasolabial, Mouth-Corner, Periorbital, Brown Spots**. The side-face Aging Grade has only **Crow's Feet** + **Brown Spots**.

### 4.6 `diagnosisSkinList[i]` images — one OSS asset per visualisation

All hosted on a public Aliyun bucket — no signing required.

```
{appOssBucketName}{oemId}/{shopId}/reports/{photoSessionId}/{direction}/{file}
```

- `appOssBucketName`: `https://meice-meicepro-oss-eu-central-1.oss-eu-central-1.aliyuncs.com/` (returned in the HTML `<script>window.env=…` block; same bucket is referenced from JSON).
- `{oemId}`: `4100`
- `{shopId}`: clinic uuid
- `{photoSessionId}`: a third uuid that **isn't** the diagnosisId or cusId — appears to be a per-shoot device-side id (`22222222-2222-2222-2222-222222222222` here). Use the `img*` URLs straight from the API rather than reconstructing.
- `{direction}`: `right` / `center` / `left` (matches `direction` field 1 / 0 / -1).
- File extension: original photos are JPG (~2.5–5 MB), AI overlays / masks are PNG with alpha (~50–900 KB).

#### Image keys (all directions)

| API field | OSS file | What it is |
|---|---|---|
| `imgCross` | `cross.jpg` | Cross-polarized RGB photo (raw) |
| `imgParallel` | `parallel.jpg` | Parallel-polarized RGB photo |
| `imgDaylight` | `daylight.jpg` | "Daylight" white-light photo (default hero image) |
| `imgUv` | `uv.jpg` | UV-illuminated photo |
| `imgUvSpecial`, `imgUvHighContrast` | `uvSpecial.jpg`, `uvHighContrast.jpg` | UV pre-processed for porphyrin / pigment visibility |
| `imgWood` | `wood.* (null here)` | Wood's lamp variant (some hardware revisions) |
| `imgRetouch` | retouch (null here) | Beautified hero image |
| `imgBloodmap` | `bloodmap.jpg` | Vascularity heatmap |
| `imgRedmap`, `imgDeepRedMap` | `redmap.jpg`, `deepRedMap.jpg` | Surface vs deep redness |
| `imgRedhotmap` | `redhotmap.jpg` | Red intensity heatmap |
| `imgBrownmap`, `imgDeepBrownMap` | `brownMap.jpg`, `deepBrownMap.jpg` | Brown pigment maps (surface / deep) |
| `imgBrownHotmap` | `brownHotmap.* (null here)` | Brown intensity heatmap (variant) |
| `imgCoolMap` | `coolMap.jpg` | "Cool" (cyan/blue tone) overlay |
| `imgAcnePng` | `acne.png` | Acne lesions detection mask |
| `imgRedAcnePng` | `redAcne.png` | Inflamed (red) acne mask |
| `imgPorePng` | `pore.png` | Pore detection mask |
| `imgTexturePng` | `texture.png` | Texture / skin pattern mask |
| `imgSurfaceSpotPng` | `surfaceSpot.png` | Surface (biaosu) spot mask |
| `imgBrownSpotPng` | `brownSpot.png` | Brown spot mask |
| `imgDeepSpotPng` | `deepSpot.jpg` | Deep spot map |
| `imgDeepGraySpotPng` | `deepGraySpot.jpg` | Deep gray spot map |
| `imgSensitiveAreaPng` | `sensitiveArea.png` | Sensitive / red area mask |
| `imgSidePng` | `side.png` | Side-face annotation (left/right faces only) |

**Front-face only (direction = 0):** `imgAging`, `imgWrinklePng`, `imgForeheadPng`, `imgGlabellarPng`, `imgBetweeneyePng`, `imgUndereyePng`, `imgNasofoldsPng`, `imgCormouthPng`, `imgSurfaceSpotAging` — separate transparent masks per wrinkle region used to overlay each tab in `/pages/report/analyze?type=dote`.

#### 4.7 `jsonAging` — the morph file

Per direction the API gives a `jsonAging` URL pointing at `/{...}/{direction}/aging.json`:

```jsonc
{
  "padding": 50,
  "start_pts":  [{x:.524, y:.293}, …],   // 174 normalized landmarks
  "target_pts": [{x:.529, y:.292}, …],   // same length, "aged" target
  "tri_idx":    [{x:0,y:133,z:134}, …]   // 318 triangle indices (Delaunay)
}
```

This is a face-mesh morph used by the H5 to animate "current → aged" (or vice versa) over the daylight image. Coordinates are normalized to the image's `[0,1]` square (after `padding`-px crop). The H5 uses it to render a Lottie-style morph.

### 4.8 `symptomDescList` — localised advice cards

Returned only by `open/diagnosis/get` (not by `query`). One entry per symptom code present in this report (or shared `oemId=0` defaults). Fields:

```jsonc
{
  "id": "...", "oemId": "0|4100", "shopId": "0|...",
  "symptom": "02",           // joins skin-detail.symptom
  "language": "en",
  "scoreMin": 0.0, "scoreMax": null, "symptomLevel": null,
  "description": "",
  "reason":  "1. UV radiation may lead to ...\n2. Hormonal changes ...",
  "advise":  "1. Light therapy can help lighten dark spots ...\n2. ...",
  "img": "url1;url2"          // semicolon-separated illustrations
}
```

The viewer prefers the most-specific row (oemId match > default `oemId:'0'`) for each `symptom`, and shows it as the "Reason / Advice" card in the symptom drill-down. Switching `language` returns localized strings; the `img` URLs are language-agnostic illustrations.

### 4.9 `diagnosisProductList` & `priceEnable`
Empty for the open endpoint in this report. When the operator has attached recommended products via `/diagnosisProduct/...`, the products show up here; `priceEnable=1` controls whether prices are rendered in the H5.

---

## 5. `diagnosis/query` — pagination wrapper

Identical entries to `diagnosis/get` except:
- `customerQueryResponse` is `null`
- `customer`, `symptomDescList`, `diagnosisProductList`, `priceEnable` are absent
- `diagnosisSkinDetailList` is **always empty array** (the per-degree breakdown is dropped)

Wrapped in a standard pagehelper envelope:
```jsonc
{ "code": 200, "status": "S", "count": true, "page": 1, "pageSize": 999,
  "pageNum": 1, "pages": 1, "startRow": 0, "endRow": 999,
  "total": 1, "totalSize": 1, "datas": [ /* diagnoses */ ] }
```

Use this if you only want lightweight metadata or you're hitting the endpoint where the same `id` may map to multiple diagnoses (it doesn't in this build, but the API was clearly designed for a customer-id history view).

---

## 6. `appLanguage/queryByShopList`

```http
POST /meicepro-api/open/appLanguage/queryByShopList
Content-Type: application/json

{}
```

Returns 94 rows: every (`countryCode`, `language`, `templateType`) combo. Each row points at an `.xlsx`/`.xlt` translation/template file in OSS.

| `templateType` | Used for |
|---|---|
| 1 | Desktop-app strings (xlsx) |
| 2 | Report/PDF strings (xlsx) |
| 3 | Excel `.xlt` template — desktop-app PDF generator |
| 4 | Excel `.xlt` template — secondary |
| 5 | Mobile-app strings (en/zh only) |

Languages: `ar de el en es fr he hu id it ja lt nl pl pt ru sk th tr uk vi zh` (plus `zh` having 2 variants).

The H5 **does not** consume these — it inlines its own i18n. They're useful for understanding what locales the platform claims to support.

---

## 7. Auth model & secrets

- The `/open/...` endpoints are bare-public — no `Authorization` header, no API key, no signature; only the diagnosisId is required. Treat the diagnosisId as a **bearer secret** (anyone with the link sees full PII).
- Authenticated endpoints expect a Bearer token issued by the operator login flow. None of those tokens are needed for the H5 viewer.
- The HTML inlines a small env block:
  ```js
  window.env = {
    appOssBucketName: "https://meice-meicepro-oss-eu-central-1.oss-eu-central-1.aliyuncs.com/",
    buryingPoint:     "https://eu-open.meiquc.cn/",
    baseUrlEmail:     "",
    storageServer:    ""
  }
  ```
  `buryingPoint` is the analytics domain (separate from `meicepro-api` host), used by the desktop client.
- Region split is implicit in hostname: `eu-meicepro-api.meiquc.cn` for EU, `oss-eu-central-1` bucket for assets. China region uses `meice-meicepro.oss-cn-shanghai` (visible in some `symptomDescList[i].img` urls), AP region `oss-ap-southeast-1`.

---

## 8. Quick recipes

### Get the full report as JSON (no auth)
```bash
curl -s 'https://eu-meicepro-api.meiquc.cn/meicepro-api/open/diagnosis/get/00000000-0000-0000-0000-000000000000/en' | jq .
```

### List supported languages / templates
```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{}' \
  https://eu-meicepro-api.meiquc.cn/meicepro-api/open/appLanguage/queryByShopList | jq '[.datas[].language] | unique'
```

### Pull every per-direction asset for a report
```bash
ID=00000000-0000-0000-0000-000000000000
curl -s "https://eu-meicepro-api.meiquc.cn/meicepro-api/open/diagnosis/get/$ID/en" \
  | jq -r '.datas.diagnosis.diagnosisSkinList[] | (.imgDaylight,.imgCross,.imgParallel,.imgUv,.imgRedmap,.imgBrownmap,.imgBloodmap,.imgPorePng,.imgTexturePng,.imgAcnePng,.imgRedAcnePng,.imgSurfaceSpotPng,.imgBrownSpotPng,.imgDeepSpotPng,.imgSensitiveAreaPng,.imgWrinklePng,.imgAging,.imgForeheadPng,.imgGlabellarPng,.imgBetweeneyePng,.imgUndereyePng,.imgNasofoldsPng,.imgCormouthPng,.imgSidePng,.jsonAging) | select(. != null)' \
  | xargs -n1 -P8 wget -q --content-disposition
```

### Render a face-aging morph
1. Download `daylight.jpg` (or `cross.jpg`).
2. Download `aging.json` for the same direction.
3. Apply the (`start_pts → target_pts`) morph using the `tri_idx` triangulation and an OpenCV/`cv2.warpAffine`-style per-triangle warp (or feed it to a Lottie renderer; the H5 wraps the geometry with a Lottie player from the `lottie` chunk).

### Map a `degreeLevel` row to a UI tab in `/pages/report/analyze`
1. The route reads `getStorageSync("data")` populated at first load with the same diagnosis JSON.
2. `?type=symptom` ⇒ tabs `[毛孔, 卟啉, 表素, 纹理, 棕色斑, 紫外色斑, 红区, (痘痘)]` ⇒ symptom codes `[07, 08, 02-visible, 06, 02, 02-uv, 04, 17]`.
3. `?type=dote` ⇒ if front face: `[抬头纹09, 眉间纹10, 眼间纹11, 法令纹14, 口角纹15, 眶周纹12, 棕色斑02]`; if side face: `[鱼尾纹13, 棕色斑02]`.

---

## 9. Files saved to disk

All raw artefacts dumped during this exploration are in `api-dump/`:

```
api-dump/
├── diagnosis-get-en.json          full /open/diagnosis/get response
├── diagnosis-get-en.pretty.json   pretty-printed
├── diagnosis-query.json           /open/diagnosis/query response
├── diagnosis-query.pretty.json    pretty-printed
├── applanguage.json               /open/appLanguage/queryByShopList response
├── aging-center.json              center/aging.json mesh-morph
├── aging-center.pretty.json       pretty
├── index.js                       main H5 bundle
├── chunk-vendors.js               vendor bundle
├── pages-report-report.js         report page chunk
├── pages-report-analyze.js        analyze page chunk (decodes type=dote/symptom)
├── pages-report-aInit.js
├── pages-report-beautySkin.js     contains the API client constants
├── pages-aichat-index.js          contains the API client constants
├── pages-ai-ai.js
├── pages-index-index.js
└── pages-push-parameters-index.js
```
