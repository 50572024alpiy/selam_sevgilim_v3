const API_BASE = "https://api.turkiyeapi.dev/v1";
const STORAGE_PINS = "map_of_us_pins_v2";
const STORAGE_PROVINCES = "tr_provinces_cache_v2";
const STORAGE_PROVINCE_PREFIX = "tr_province_details_v2_";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 gün

const TR_VIEWBOX = "25.5,42.7,45.5,35.6"; 
const TR_BOUNDS = { minLat: 35.6, maxLat: 42.7, minLng: 25.5, maxLng: 45.5 };

let map;
let provinces = [];
let provinceDetails = null;

let pins = []; 
let markers = new Map(); 

const el = (id) => document.getElementById(id);
const setStatus = (t) => { const s = el("statusText"); if (s) s.textContent = t; };

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  wireUI();

  pins = readJSON(STORAGE_PINS) || [];
  renderPins();

  loadProvinces()
    .then(() => setStatus("İl seç → ilçe seç → pinle"))
    .catch((e) => {
      console.error(e);
      setStatus("İller yüklenemedi. İnternet gerekli.");
    });
});

function initMap() {
  map = L.map("map", { zoomControl: false, preferCanvas: true });

  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);

  map.setView([39.0, 35.0], 6);
  map.setMaxBounds([
    [34.3, 24.0],
    [44.3, 46.2],
  ]);
}

function wireUI() {
  el("provinceSelect")?.addEventListener("change", onProvinceChange);
  el("districtSelect")?.addEventListener("change", onDistrictChange);

  el("addBtn")?.addEventListener("click", onAddPin);
  el("clearBtn")?.addEventListener("click", onClearPins);

  el("exportBtn")?.addEventListener("click", exportPins);
  el("importInput")?.addEventListener("change", importPins);
}

async function loadProvinces() {
  const cached = readJSON(STORAGE_PROVINCES);
  if (cached?.ts && Array.isArray(cached.data) && Date.now() - cached.ts < CACHE_TTL_MS) {
    provinces = cached.data;
    fillProvinceSelect(provinces);
    return;
  }

  setStatus("İller yükleniyor…");
  const url = `${API_BASE}/provinces?fields=id,name,coordinates&sort=name`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Provinces fetch failed");
  const json = await res.json();

  provinces = Array.isArray(json?.data) ? json.data : [];
  writeJSON(STORAGE_PROVINCES, { ts: Date.now(), data: provinces });

  fillProvinceSelect(provinces);
}

function fillProvinceSelect(items) {
  const sel = el("provinceSelect");
  if (!sel) return;

  sel.querySelectorAll("option:not([disabled])").forEach((o) => o.remove());

  for (const p of items) {
    const opt = document.createElement("option");
    opt.value = String(p.id);
    opt.textContent = p.name;
    sel.appendChild(opt);
  }
}

async function onProvinceChange() {
  const provinceId = Number(el("provinceSelect")?.value);
  const p = provinces.find((x) => Number(x.id) === provinceId);

  const districtSel = el("districtSelect");
  const addBtn = el("addBtn");

  if (districtSel) {
    districtSel.disabled = true;
    districtSel.innerHTML = `<option value="" selected disabled>Yükleniyor…</option>`;
  }
  if (addBtn) addBtn.disabled = true;

  setStatus(`${p?.name ?? "İl"} ilçeleri yükleniyor…`);

  try {
    provinceDetails = await getProvinceDetails(provinceId);
    const districts = normalizeDistricts(provinceDetails?.districts);
    fillDistrictSelect(districts);

    if (districtSel) districtSel.disabled = false;
    setStatus(`${p?.name ?? "İl"} seçildi. İlçe seçebilirsin.`);
  } catch (e) {
    console.error(e);
    setStatus("İlçe listesi yüklenemedi.");
    if (districtSel) {
      districtSel.disabled = true;
      districtSel.innerHTML = `<option value="" selected disabled>İlçe yüklenemedi</option>`;
    }
  }
}

function onDistrictChange() {
  const districtSel = el("districtSelect");
  const addBtn = el("addBtn");
  if (!districtSel || !addBtn) return;
  addBtn.disabled = !districtSel.value;
}

function fillDistrictSelect(districts) {
  const sel = el("districtSelect");
  if (!sel) return;

  sel.innerHTML = `<option value="" selected disabled>İlçe seç balım</option>`;

  for (const d of districts) {
    const opt = document.createElement("option");
    opt.value = d.id != null ? String(d.id) : d.name;
    opt.textContent = d.name;
    opt.dataset.lat = d.lat ?? "";
    opt.dataset.lng = d.lng ?? "";
    sel.appendChild(opt);
  }
}

async function getProvinceDetails(id) {
  const cacheKey = STORAGE_PROVINCE_PREFIX + id;
  const cached = readJSON(cacheKey);
  if (cached?.ts && cached.data && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const url = `${API_BASE}/provinces/${id}?fields=id,name,coordinates,districts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Province details fetch failed");

  const json = await res.json();
  const data = json?.data ?? null;

  writeJSON(cacheKey, { ts: Date.now(), data });
  return data;
}

function normalizeDistricts(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((d) => {
      if (typeof d === "string") return { id: null, name: d, lat: null, lng: null };

      const name = (d?.name ?? d?.district ?? d?.title ?? "").toString().trim();
      const id = d?.id ?? null;

      let lat = null, lng = null;

      if (d?.coordinates?.latitude != null && d?.coordinates?.longitude != null) {
        lat = Number(d.coordinates.latitude);
        lng = Number(d.coordinates.longitude);
      } else if (d?.latitude != null && d?.longitude != null) {
        lat = Number(d.latitude);
        lng = Number(d.longitude);
      }

      return { id, name, lat, lng };
    })
    .filter((x) => x.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

async function onAddPin() {
  const addBtn = el("addBtn");
  const provinceId = Number(el("provinceSelect")?.value);
  const province = provinces.find((x) => Number(x.id) === provinceId);

  const districtSel = el("districtSelect");
  if (!districtSel || !districtSel.value) return;

  const districtOpt = districtSel.options[districtSel.selectedIndex];
  const districtName = (districtOpt?.textContent ?? "").trim();

  const note = (el("noteInput")?.value || "").trim();

  addBtn && (addBtn.disabled = true);
  setStatus("İlçe konumu aranıyor…");

  try {
    let lat = districtOpt?.dataset?.lat ? Number(districtOpt.dataset.lat) : null;
    let lng = districtOpt?.dataset?.lng ? Number(districtOpt.dataset.lng) : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const q1 = `${districtName}, ${province?.name}, Türkiye`;
      const q2 = `${districtName} ilçesi, ${province?.name}, Türkiye`;

      let geo = await geocodeCached(q1);
      if (!geo) geo = await geocodeCached(q2);

      if (geo) {
        lat = geo[0];
        lng = geo[1];
      }
    }

    let approx = false;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const pc = province?.coordinates;
      if (pc?.latitude != null && pc?.longitude != null) {
        const baseLat = Number(pc.latitude);
        const baseLng = Number(pc.longitude);

        const [dLat, dLng] = stableJitter(`${province?.name}|${districtName}`);
        lat = baseLat + dLat;
        lng = baseLng + dLng;
        approx = true;
      } else {
        lat = 39.0;
        lng = 35.0;
        approx = true;
      }
    }

    const key = normalizeKey(`${province?.name}::${districtName}`);
    const already = pins.some((p) => normalizeKey(`${p.provinceName}::${p.districtName}`) === key);
    if (already) {
      setStatus("Bu yer zaten listede ✓");
      return;
    }

    const pin = {
      id: makeId(),
      provinceId,
      provinceName: province?.name ?? "",
      districtName,
      note,
      lat,
      lng,
      approx,
      createdAt: new Date().toISOString(),
    };

    pins.unshift(pin);
    writeJSON(STORAGE_PINS, pins);

    addMarker(pin);
    renderPins();
    focusPin(pin.id);

    const noteInput = el("noteInput");
    if (noteInput) noteInput.value = "";

    setStatus(approx ? "İlçe koordinatı bulunamadı — il merkezine yakın pinlendi." : "Eklendi ");
  } catch (e) {
    console.error(e);
    setStatus("Konum alınamadı. Tekrar dene.");
  } finally {
    if (addBtn) addBtn.disabled = !el("districtSelect")?.value;
  }
}

function addMarker(pin) {
  if (markers.has(pin.id)) return;

  const icon = L.divIcon({
    className: "heart-pin",
    html: "<span>❤</span>",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });

  const place = `${pin.provinceName} · ${pin.districtName}`;
  const safePlace = escapeHtml(place);
  const safeNote = pin.note ? `<div style="margin-top:6px; opacity:.9;">${escapeHtml(pin.note)}</div>` : "";
  const approxNote = pin.approx
    ? `<div style="margin-top:8px; opacity:.75; font-size:12px;">(Yaklaşık konum)</div>`
    : "";

  const gmaps = `https://www.google.com/maps?q=${pin.lat},${pin.lng}`;

  const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map);
  marker.bindPopup(
    `
      <div style="font-weight:800; letter-spacing:-.02em;">${safePlace}</div>
      ${safeNote}
      ${approxNote}
      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <a class="small-btn" href="${gmaps}" target="_blank" rel="noreferrer">Haritada aç</a>
      </div>
    `,
    { closeButton: true }
  );

  markers.set(pin.id, marker);
}

function renderPins() {
  const keep = new Set(pins.map((p) => p.id));
  for (const [id, marker] of markers.entries()) {
    if (!keep.has(id)) {
      marker.remove();
      markers.delete(id);
    }
  }
  for (const p of pins) addMarker(p);

  const list = el("pinsList");
  if (!list) return;

  list.innerHTML = "";

  if (!pins.length) {
    const li = document.createElement("li");
    li.className = "pins-item";
    li.innerHTML = `<div class="pins-note">Henüz pin yok balım.</div>`;
    list.appendChild(li);
    return;
  }

  for (const p of pins) {
    const li = document.createElement("li");
    li.className = "pins-item";

    li.innerHTML = `
      <div class="pins-top">
        <div class="pins-place">${escapeHtml(p.provinceName)} · ${escapeHtml(p.districtName)}</div>
        <div style="color: rgba(148,163,184,.85); font-size:12px;">${formatDate(p.createdAt)}</div>
      </div>
      ${p.note ? `<div class="pins-note">${escapeHtml(p.note)}</div>` : ""}
      ${p.approx ? `<div class="pins-note" style="opacity:.8;">(Yaklaşık konum)</div>` : ""}
      <div class="pins-row">
        <button class="small-btn" data-act="focus" data-id="${p.id}">Göster</button>
        <button class="small-btn" data-act="remove" data-id="${p.id}">Sil</button>
      </div>
    `;

    li.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const id = btn.dataset.id;
      const act = btn.dataset.act;

      if (act === "focus") focusPin(id);
      if (act === "remove") removePin(id);
    });

    list.appendChild(li);
  }
}

function focusPin(id) {
  const pin = pins.find((p) => p.id === id);
  const marker = markers.get(id);
  if (!pin || !marker) return;

  map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 9), { duration: 0.9 });
  marker.openPopup();
}

function removePin(id) {
  pins = pins.filter((p) => p.id !== id);
  writeJSON(STORAGE_PINS, pins);
  renderPins();
}

function onClearPins() {
  if (!pins.length) return;
  if (!confirm("Tüm pinleri silmek istediğine emin misin?")) return;

  pins = [];
  writeJSON(STORAGE_PINS, pins);
  renderPins();
  setStatus("Temizlendi.");
}

function exportPins() {
  const payload = { v: 2, pins, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "map-of-us-pins.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  setStatus("Export indirildi ✓");
}

function importPins(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(String(reader.result || "{}"));
      const arr = Array.isArray(obj?.pins) ? obj.pins : (Array.isArray(obj) ? obj : null);
      if (!Array.isArray(arr)) throw new Error("Format");

      pins = arr
        .filter((x) => x && x.lat != null && x.lng != null)
        .map((x) => ({
          id: String(x.id || makeId()),
          provinceId: Number(x.provinceId || 0),
          provinceName: String(x.provinceName || ""),
          districtName: String(x.districtName || ""),
          note: String(x.note || ""),
          lat: Number(x.lat),
          lng: Number(x.lng),
          approx: Boolean(x.approx),
          createdAt: x.createdAt || new Date().toISOString(),
        }));

      writeJSON(STORAGE_PINS, pins);
      renderPins();
      setStatus("Import tamam 💗");
    } catch (err) {
      console.error(err);
      alert("Import başarısız: JSON formatı doğru değil.");
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
}

async function geocodeCached(query) {
  const key = "geo_tr_v2_" + query.toLowerCase();
  const cached = readJSON(key);
  if (cached && Array.isArray(cached) && cached.length === 2) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=jsonv2&addressdetails=1&limit=1` +
    `&countrycodes=tr&bounded=1&viewbox=${encodeURIComponent(TR_VIEWBOX)}` +
    `&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "Accept-Language": "tr" } });
    if (!res.ok) return null;

    const json = await res.json();
    const lat = Number(json?.[0]?.lat);
    const lon = Number(json?.[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    if (
      lat < TR_BOUNDS.minLat || lat > TR_BOUNDS.maxLat ||
      lon < TR_BOUNDS.minLng || lon > TR_BOUNDS.maxLng
    ) return null;

    const out = [lat, lon];
    writeJSON(key, out);
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function readJSON(k) {
  try { return JSON.parse(localStorage.getItem(k) || "null"); }
  catch { return null; }
}

function writeJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); }
  catch {}
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + "_" + Math.random().toString(16).slice(2);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return ""; }
}

function stableJitter(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;
  const b = (((h >>> 10) >>> 0) % 1000) / 1000;

  const dLat = (a - 0.5) * 0.06; 
  const dLng = (b - 0.5) * 0.08; 
  return [dLat, dLng];
}

function normalizeKey(s) {
  return (s || "")
    .toString()
    .trim()
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}