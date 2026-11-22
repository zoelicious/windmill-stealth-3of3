// audio.js — all sound is WebAudio, synthesized live: no audio files.
// Footsteps, the alarm sting, the dog's bark, the pouch whoosh, and the mill wind.
(function () {
  'use strict';

  function makeAudio() {
    return { ctx: null, master: null, muted: false, windOn: false, stepAlt: false };
  }

  function ensure(a) {
    if (a.ctx) {
      if (a.ctx.state === 'suspended') a.ctx.resume();
      return true;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      a.ctx = new AC();
      a.master = a.ctx.createGain();
      a.master.gain.value = 0.5;
      a.master.connect(a.ctx.destination);
      startWind(a);
      return true;
    } catch (e) {
      return false;
    }
  }

  function startWind(a) {
    if (a.windOn || !a.ctx) return;
    a.windOn = true;
    var len = a.ctx.sampleRate * 2;
    var buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = a.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    var filt = a.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 320;
    var g = a.ctx.createGain(); g.gain.value = 0.05;
    var lfo = a.ctx.createOscillator(); lfo.frequency.value = 0.11;
    var lfoG = a.ctx.createGain(); lfoG.gain.value = 0.025;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(filt); filt.connect(g); g.connect(a.master);
    src.start(); lfo.start();
  }

  function tone(a, freq, t0, dur, type, vol, slideTo) {
    if (!a.ctx || a.muted) return;
    var o = a.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, a.ctx.currentTime + t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.ctx.currentTime + t0 + dur);
    var g = a.ctx.createGain();
    g.gain.setValueAtTime(0.0001, a.ctx.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol, a.ctx.currentTime + t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, a.ctx.currentTime + t0 + dur);
    o.connect(g); g.connect(a.master);
    o.start(a.ctx.currentTime + t0);
    o.stop(a.ctx.currentTime + t0 + dur + 0.05);
  }

  function noiseBurst(a, dur, freq, vol) {
    if (!a.ctx || a.muted) return;
    var len = Math.floor(a.ctx.sampleRate * dur);
    var buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = a.ctx.createBufferSource(); src.buffer = buf;
    var filt = a.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = freq;
    var g = a.ctx.createGain(); g.gain.value = vol;
    src.connect(filt); filt.connect(g); g.connect(a.master);
    src.start();
  }

  var api = {
    makeAudio: makeAudio,
    ensure: ensure,
    footstep: function (a, running, crouched) {
      if (!a.ctx || a.muted) return;
      a.stepAlt = !a.stepAlt;
      noiseBurst(a, 0.07, crouched ? 300 : 700, running ? 0.22 : (crouched ? 0.05 : 0.12));
      tone(a, a.stepAlt ? 82 : 74, 0, 0.06, 'sine', 0.08);
    },
    alarmSting: function (a) {
      tone(a, 466, 0, 0.22, 'sawtooth', 0.16);
      tone(a, 622, 0.16, 0.3, 'sawtooth', 0.16);
      tone(a, 932, 0.32, 0.4, 'square', 0.10);
    },
    suspiciousBlip: function (a) {
      tone(a, 740, 0, 0.12, 'triangle', 0.14, 988);
    },
    bark: function (a) {
      tone(a, 220, 0, 0.09, 'square', 0.14, 140);
      tone(a, 220, 0.14, 0.09, 'square', 0.14, 140);
    },
    pouchThrow: function (a) {
      noiseBurst(a, 0.25, 1200, 0.18);
    },
    pickup: function (a) {
      tone(a, 523, 0, 0.1, 'triangle', 0.14);
      tone(a, 784, 0.08, 0.16, 'triangle', 0.14);
    },
    win: function (a) {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(a, f, i * 0.13, 0.3, 'triangle', 0.15); });
    },
    caught: function (a) {
      tone(a, 220, 0, 0.5, 'sawtooth', 0.16, 110);
    },
    toggleMute: function (a) {
      a.muted = !a.muted;
      if (a.master) a.master.gain.value = a.muted ? 0 : 0.5;
      return a.muted;
    }
  };

  window.WindmillAudio = api;
})();
