// ================= audio =================
let AC = null, master = null, sfx = null, musicGain = null, crowdGain = null, sirenGain = null, sirenOsc = null;
let muted = store.get('ty_mute') === '1', musicOn = store.get('ty_music') !== '0', voiceOn = store.get('ty_voice') !== '0';
let musicEl = null, beatNext = 0, beatStep = 0;
function setBtnStates(){ $('muteBtn').innerHTML = icon(muted ? 'volume-off' : 'volume'); $('voiceBtn').classList.toggle('off', !voiceOn);
  const cm = $('cineMute'); if (cm) cm.innerHTML = icon(muted ? 'volume-off' : 'volume');
  const sm = $('setMute'), sv = $('setVoice'); if (sm){ sm.textContent = muted ? 'مقفول' : 'شغال'; sm.classList.toggle('on', !muted); } if (sv){ sv.textContent = voiceOn ? 'شغال' : 'مقفول'; sv.classList.toggle('on', voiceOn); }
  try { if (VOICE.cur) VOICE.cur.muted = muted; } catch(e){} }   // VOICE (19k) doesn't exist yet on the first call
setBtnStates();
function initAudio(){
  if (AC){ AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination);
    sfx = AC.createGain(); sfx.gain.value = .7; sfx.connect(master);
    musicGain = AC.createGain(); musicGain.gain.value = .07; musicGain.connect(master);
    // crowd murmur
    const len = AC.sampleRate*2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i=0;i<len;i++){ last = last*.97 + (Math.random()*2-1)*.03; d[i] = last*6; }
    const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .8;
    crowdGain = AC.createGain(); crowdGain.gain.value = 0; src.connect(bp); bp.connect(crowdGain); crowdGain.connect(master); src.start();
    // siren
    const osc = sirenOsc = AC.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 760;
    const lfo = AC.createOscillator(); lfo.frequency.value = .7; const lg = AC.createGain(); lg.gain.value = 230; lfo.connect(lg); lg.connect(osc.frequency);
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
    sirenGain = AC.createGain(); sirenGain.gain.value = 0; osc.connect(lp); lp.connect(sirenGain); sirenGain.connect(master); osc.start(); lfo.start();
    beatNext = AC.currentTime + .1;
  } catch(e){ AC = null; }
}
function env(g, t, a, dur, vol){ g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + dur); }
function tone(f1, f2, dur, type='sine', vol=.16, delay=0, out){
  if (!AC) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(f2,1), t+dur);
  env(g, t, .005, dur, vol); o.connect(g); g.connect(out || sfx); o.start(t); o.stop(t+dur+.05);
}
let noiseBuf = null;
function noise(dur, freq, vol, delay=0, type='lowpass', out){
  if (!AC) return; if (!noiseBuf){ noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1; }
  const t = AC.currentTime + delay, s = AC.createBufferSource(); s.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = AC.createGain(); env(g, t, .002, dur, vol); s.connect(f); f.connect(g); g.connect(out || sfx); s.start(t); s.stop(t+dur+.05);
}
const thwack = () => { if (!playS('punch', .85)){ noise(.18, 900, .6); tone(160, 60, .15, 'sine', .4); } };   // a real punch (09c)
const horn = () => { tone(415, 415, .16, 'square', .07); tone(523, 523, .16, 'square', .05); tone(415, 415, .22, 'square', .07, .22); tone(523, 523, .22, 'square', .05, .22); };
const clink = () => { tone(2600, 2500, .25, 'sine', .08); tone(3400, 3300, .2, 'sine', .05, .05); };
const coin = () => { tone(880,1320,.12,'square',.07); tone(1320,1760,.16,'square',.06,.08); };
// original mahraganat-style beat (maqsum rhythm, hijaz riff): only during the wedding dance game
const BPM = 126, STEP = 60/BPM/4, ROOT = 146.83;
const HIJ = [0,1,4,5,7,8,10,12];
const RIFF = [0,null,1,null,4,null,1,0, null,0,5,null,4,1,0,null, 7,null,8,null,7,5,4,null, 5,4,1,null,0,null,null,null];
const BASS = [0,null,null,0,null,null,0,null, -2,null,null,-2,null,null,1,null];
function beatTick(){
  if (!AC || muted || !RHY.on) return;   // the beat is only for the wedding dance game
  while (beatNext < AC.currentTime + .15){
    const s = beatStep % 32, t = beatNext, q = s % 16;
    if (q === 0 || q === 8 || q === 11){ const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t+.22); env(g, t, .002, .28, .9); o.connect(g); g.connect(musicGain); o.start(t); o.stop(t+.3); }
    if (q === 4 || q === 12) noise(.14, 1800, .5, t - AC.currentTime, 'bandpass', musicGain);
    if (q === 2 || q === 6 || q === 14) noise(.05, 3500, .28, t - AC.currentTime, 'highpass', musicGain);
    if (q % 2 === 1) noise(.025, 8000, .12, t - AC.currentTime, 'highpass', musicGain);
    const b = BASS[q]; if (b !== null && b !== undefined){ const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = ROOT/2 * Math.pow(2, b/12); f.type = 'lowpass'; f.frequency.value = 380; env(g, t, .005, .2, .35); o.connect(f); f.connect(g); g.connect(musicGain); o.start(t); o.stop(t+.25); }
    const r = RIFF[s]; if (beatStep % 64 >= 32 && r !== null){ const o = AC.createOscillator(), g = AC.createGain(), v = AC.createOscillator(), vg = AC.createGain(); o.type = 'square'; o.frequency.value = ROOT*2 * Math.pow(2, HIJ[HIJ.indexOf(r) >= 0 ? HIJ.indexOf(r) : 0]/12 + 0) ; o.frequency.value = ROOT*2*Math.pow(2, r/12); v.frequency.value = 6; vg.gain.value = 6; v.connect(vg); vg.connect(o.frequency); env(g, t, .01, STEP*1.8, .07); o.connect(g); g.connect(musicGain); o.start(t); v.start(t); o.stop(t+STEP*2); v.stop(t+STEP*2); }
    beatNext += STEP; beatStep++;
  }
}
// voices: browser text-to-speech in Arabic, when available
let arVoice = null; const pickVoice = () => { try { const vs = speechSynthesis.getVoices(); arVoice = vs.find(v => /ar[-_]EG/i.test(v.lang)) || vs.find(v => /^ar/i.test(v.lang)) || null; } catch(e){} };
try { speechSynthesis.onvoiceschanged = pickVoice; pickVoice(); } catch(e){}
let lastSpeak = 0;
function speak(text){ if (muted || !voiceOn || !arVoice || !AC) return; const now = performance.now(); if (now - lastSpeak < 2500) return; lastSpeak = now; try { const u = new SpeechSynthesisUtterance(text.replace(/[^؀-ۿ\s!؟?]/g,'')); u.voice = arVoice; u.lang = arVoice.lang; u.volume = .4; u.rate = 1.05; u.pitch = .85 + Math.random()*.35; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch(e){} }
$('muteBtn').onclick = () => { muted = !muted; store.set('ty_mute', muted?'1':'0'); if (master) master.gain.value = muted ? 0 : 1; if (musicEl){ muted || !musicOn ? musicEl.pause() : musicEl.play().catch(()=>{}); } if (muted) try { speechSynthesis.cancel(); } catch(e){} setBtnStates(); };
$('setMute').onclick = () => $('muteBtn').click();
$('cineMute').onclick = e => { e.stopPropagation(); $('muteBtn').click(); };
$('setVoice').onclick = () => $('voiceBtn').click();
$('voiceBtn').onclick = () => { voiceOn = !voiceOn; store.set('ty_voice', voiceOn?'1':'0'); setBtnStates(); if (voiceOn && !arVoice) banner('جهازك مفيهوش صوت عربي، الكلام هيظهر مكتوب بس', 'info', 3); };
