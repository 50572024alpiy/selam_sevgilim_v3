const ALLOWED_USER = "iremiko";
const CRED_HASH    = "eb4971d8343b0cd0c51956ced8185c7ae5140ee0cd240e426c59ad7849c9b76f";
const SESSION_KEY  = "love_auth_ok";

function showLoveIntro(){
  const INTRO_KEY = "love_intro_shown_session";
  const DURATION_MS = 4000; 
  const FADE_MS = 650;

  const prefersReduced =
    globalThis.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  if (sessionStorage.getItem(INTRO_KEY) === "1") return;
  sessionStorage.setItem(INTRO_KEY, "1");

  const intro = document.createElement("div");
  intro.className = "intro-overlay";
  intro.setAttribute("aria-hidden", "true");
  intro.innerHTML = `
    <div class="intro-content">
      <div class="intro-glow"></div>
      <div class="intro-title">Alpy ❤️ İremiko</div>
    </div>`;

  document.documentElement.classList.add("intro-lock");
  document.body.classList.add("intro-lock");

  document.body.appendChild(intro);
  requestAnimationFrame(() => intro.classList.add("is-active"));

  setTimeout(() => {
    intro.classList.add("is-exiting");
    setTimeout(() => {
      intro.remove();
      document.documentElement.classList.remove("intro-lock");
      document.body.classList.remove("intro-lock");
    }, FADE_MS + 60);
  }, DURATION_MS);
}

async function sha256Hex(str){
  if (globalThis.crypto && crypto.subtle && globalThis.TextEncoder){
    try{
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    }catch{ /* fallthrough */ }
  }
  return sha256HexPolyfill(str);
}

function sha256HexPolyfill(str){
  const te = (typeof TextEncoder !== "undefined") ? new TextEncoder() : null;
  const bytes = te ? te.encode(str) : utf8Encode(str);
  const bitLen = bytes.length * 8;

  const with1 = new Uint8Array(((bytes.length + 9 + 63) & ~63));
  with1.set(bytes, 0);
  with1[bytes.length] = 0x80;

  const lenHi = Math.floor(bitLen / 2**32) >>> 0;
  const lenLo = (bitLen >>> 0);
  const L = with1.length;
  with1[L-8] = (lenHi >>> 24) & 255;
  with1[L-7] = (lenHi >>> 16) & 255;
  with1[L-6] = (lenHi >>> 8) & 255;
  with1[L-5] = (lenHi) & 255;
  with1[L-4] = (lenLo >>> 24) & 255;
  with1[L-3] = (lenLo >>> 16) & 255;
  with1[L-2] = (lenLo >>> 8) & 255;
  with1[L-1] = (lenLo) & 255;

  const rotr = (n,x)=> (x>>>n) | (x<<(32-n));
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ]);

  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;

  const w = new Uint32Array(64);
  for (let i=0;i<with1.length;i+=64){
    for (let j=0;j<16;j++){
      const o = i + j*4;
      w[j] = (with1[o]<<24) | (with1[o+1]<<16) | (with1[o+2]<<8) | (with1[o+3]);
    }
    for (let j=16;j<64;j++){
      const s0 = (rotr(7,w[j-15]) ^ rotr(18,w[j-15]) ^ (w[j-15]>>>3))>>>0;
      const s1 = (rotr(17,w[j-2]) ^ rotr(19,w[j-2]) ^ (w[j-2]>>>10))>>>0;
      w[j] = (w[j-16] + s0 + w[j-7] + s1)>>>0;
    }

    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let j=0;j<64;j++){
      const S1 = (rotr(6,e) ^ rotr(11,e) ^ rotr(25,e))>>>0;
      const ch = ((e & f) ^ (~e & g))>>>0;
      const T1 = (h + S1 + ch + K[j] + w[j])>>>0;
      const S0 = (rotr(2,a) ^ rotr(13,a) ^ rotr(22,a))>>>0;
      const maj = ((a & b) ^ (a & c) ^ (b & c))>>>0;
      const T2 = (S0 + maj)>>>0;

      h=g; g=f; f=e; e=(d + T1)>>>0; d=c; c=b; b=a; a=(T1 + T2)>>>0;
    }

    h0=(h0+a)>>>0; h1=(h1+b)>>>0; h2=(h2+c)>>>0; h3=(h3+d)>>>0;
    h4=(h4+e)>>>0; h5=(h5+f)>>>0; h6=(h6+g)>>>0; h7=(h7+h)>>>0;
  }

  return [h0,h1,h2,h3,h4,h5,h6,h7].map(x => x.toString(16).padStart(8,"0")).join("");
}

function utf8Encode(str){
  const out = [];
  for (let i=0;i<str.length;i++){
    let c = str.charCodeAt(i);
    if (c<128){ out.push(c); }
    else if (c<2048){ out.push((c>>6)|192, (c&63)|128); }
    else if ((c&0xFC00)===0xD800 && i+1<str.length && (str.charCodeAt(i+1)&0xFC00)===0xDC00){
      const cp = 0x10000 + ((c&0x3FF)<<10) + (str.charCodeAt(++i)&0x3FF);
      out.push((cp>>18)|240, ((cp>>12)&63)|128, ((cp>>6)&63)|128, (cp&63)|128);
    } else {
      out.push((c>>12)|224, ((c>>6)&63)|128, (c&63)|128);
    }
  }
  return new Uint8Array(out);
}

(function mountGate(){
  if (sessionStorage.getItem(SESSION_KEY) === "1") return;

  const gate = document.createElement("div");
  gate.className = "auth-gate";
  gate.innerHTML = `
    <div class="auth-card">
      <h2 class="auth-title">🔒 Selam Sevgilim</h2>
      <div class="auth-sub">Kullanıcı adını ve şifreni gir hayatım.</div>

      <form id="authForm" autocomplete="off">
        <div class="auth-field">
          <label for="ag_user">Kullanıcı Adı</label>
          <input id="ag_user" class="auth-input" name="user" placeholder="kullanıcı" required />
        </div>

        <div class="auth-field">
          <label for="ag_pass">Şifre</label>
          <input id="ag_pass" class="auth-input" name="pass" type="password" placeholder="••••••••" required />
        </div>

        <button class="auth-btn" type="submit">Giriş Yap</button>
        <div class="auth-error" id="ag_err"></div>
        <div class="auth-meta"><3</div>
      </form>
    </div>
  `;

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(gate);
  });

  document.addEventListener("submit", async (e) => {
    if (!e.target || e.target.id !== "authForm") return;
    e.preventDefault();

    const u = document.getElementById("ag_user").value.trim();
    const p = document.getElementById("ag_pass").value;
    const errEl = document.getElementById("ag_err");
    errEl.textContent = "";

    if (u !== ALLOWED_USER){
      errEl.textContent = "Kullanıcı adı hatalı.";
      return;
    }

    try{
      const hash = await sha256Hex(`${u}:${p}`);

      if (hash === CRED_HASH){
        sessionStorage.setItem(SESSION_KEY, "1");

        showLoveIntro();

        gate.classList.add("hide");
        setTimeout(() => gate.remove(), 350);

      } else {
        errEl.textContent = "Şifre hatalı.";
        document.getElementById("ag_pass").value = "";
        document.getElementById("ag_pass").focus();
      }
    }catch(ex){
      console.error(ex);
      errEl.textContent = "Bir hata oluştu.";
    }
  });

  globalThis.loveGateLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  };
})();