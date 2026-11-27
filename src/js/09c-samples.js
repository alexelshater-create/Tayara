// ================= real recorded sounds (assets/sfx/real, all CC0: Kenney Impact Sounds + OpenGameArt) =================
// Punches, falls, wood, glass, metal, footsteps, reloads, a dry click, a car crash, the engine loop and the siren.
// They load on the first tap (when the audio starts). Until then nothing plays — never the old drawn sounds.
const SAMP = { buf: {}, n: {}, loading: false, eng: null, siren: null };
async function loadSamples(){
  if (SAMP.loading || !AC) return; SAMP.loading = true;
  let L; try { L = await (await fetch('assets/sfx/real/list.json')).json(); } catch (e){ return; }
  await Promise.all(Object.entries(L).map(async ([k, n]) => {
    SAMP.n[k] = n; const names = n > 1 || k === 'crash' ? Array.from({ length: n }, (_, i) => `${k}_${i + 1}`) : [k];
    SAMP.buf[k] = (await Promise.all(names.map(async nm => { try { return await AC.decodeAudioData(await (await fetch(`assets/sfx/real/${nm}.${k === 'engine' ? 'wav' : 'mp3'}`)).arrayBuffer()); } catch (e){ return null; } }))).filter(Boolean);
  }));
  // the engine: one recorded loop, sped up and slowed down with the revs
  if (SAMP.buf.engine && SAMP.buf.engine[0]){ const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = SAMP.buf.engine[0]; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(sfx || master); s.start(); SAMP.eng = { src: s, g }; }
  // the siren: a real recording instead of the drawn one
  if (SAMP.buf.siren && SAMP.buf.siren[0] && sirenGain){ const s = AC.createBufferSource(); s.buffer = SAMP.buf.siren[0]; s.loop = true; s.connect(sirenGain); s.start(); try { if (sirenOsc) sirenOsc.disconnect(); } catch (e){} SAMP.siren = s; }
}
// play one (a random take of it); vol 0..1, rate = pitch, delay in seconds. True when the audio exists (even if not loaded yet: then silence)
function playS(k, vol = 1, rate = 1, delay = 0){
  if (!AC) return false; if (!SAMP.loading) loadSamples();
  const B = SAMP.buf[k]; if (!B || !B.length || muted || vol <= .002) return true;
  const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = B[(Math.random() * B.length) | 0]; s.playbackRate.value = rate * (.96 + Math.random() * .08); g.gain.value = vol;
  s.connect(g); g.connect(sfx || master); s.start(AC.currentTime + delay); return true;
}
