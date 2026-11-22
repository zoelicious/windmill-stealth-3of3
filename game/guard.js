// guard.js — Miller Bram (lantern patrol) and Dog Pip (ears up, then barks).
// Bram sweeps the mill floor; Pip sniffs the loft end. Both learn the player's
// last seen spot, hurry there, then give up and go back to patrol.
(function () {
  'use strict';

  function makeGuard(kind, name, x, y, patrol, speed) {
    return {
      kind: kind, name: name, x: x, y: y, dir: 1,
      patrol: patrol, wp: 0, speed: speed, baseSpeed: speed,
      suspicion: 0, state: 'PATROL', // PATROL | SUSPICIOUS | ALARM | SEARCH
      lastSeenX: 0, lastSeenY: 0, searchT: 0, barkT: 0, earsUp: false,
      pauseT: 0, sweepT: 0, seenPlayer: false, seenWhy: ''
    };
  }

  function makeBram() {
    return makeGuard('MILLER', 'MILLER BRAM', 640, 600, [330, 860], 52);
  }

  function makePip() {
    return makeGuard('DOG', 'DOG PIP', 260, 600, [140, 480], 78);
  }

  function updateGuard(g, dt, player, vision, level, state, audio) {
    var alarm = g.suspicion >= vision.ALARM_AT;
    g.speed = g.baseSpeed * (alarm ? 1.9 : (g.state === 'SUSPICIOUS' ? 1.25 : 1));

    // --- senses -------------------------------------------------------------
    var sight = vision.canSee(g, player, level, state);
    g.seenPlayer = sight.seen;
    g.seenWhy = sight.why;
    var heard = vision.hearsNoise(g, player);

    if (sight.seen) {
      // Seen in the open: suspicion climbs fast up close, slower far away.
      var rate = sight.dist < 120 ? 55 : 30;
      g.suspicion += rate * dt;
      g.lastSeenX = player.x; g.lastSeenY = player.y;
      if (g.suspicion >= vision.ALARM_AT && g.state !== 'ALARM') {
        g.state = 'ALARM';
        state.spotted += 1;
        if (audio) audio.alarmSting();
      } else if (g.suspicion >= vision.SUSPICIOUS_AT && g.state === 'PATROL') {
        g.state = 'SUSPICIOUS';
        g.pauseT = 0.9;
        if (audio) audio.suspiciousBlip();
      }
    } else {
      g.suspicion -= (g.state === 'ALARM' ? 7 : 16) * dt;
      if (g.suspicion < 0) g.suspicion = 0;
      if (g.suspicion < vision.SUSPICIOUS_AT && g.state === 'SUSPICIOUS') g.state = 'PATROL';
      if (g.suspicion < 25 && g.state === 'ALARM') { g.state = 'SEARCH'; g.searchT = 4; }
    }

    // Dog Pip: ears go up as a warning BEFORE he barks.
    if (g.kind === 'DOG') {
      if (heard && !g.earsUp && g.suspicion < vision.ALARM_AT) {
        g.earsUp = true; g.barkT = 1.6;
      }
      if (g.earsUp) {
        g.barkT -= dt;
        if (g.barkT <= 0) {
          g.earsUp = false;
          g.suspicion = Math.min(100, g.suspicion + 45);
          g.lastSeenX = player.x; g.lastSeenY = player.y;
          g.state = g.suspicion >= vision.ALARM_AT ? 'ALARM' : 'SUSPICIOUS';
          if (g.state === 'ALARM') { state.spotted += 1; if (audio) audio.alarmSting(); }
          else if (audio) audio.bark();
        }
      }
    }

    // --- movement -----------------------------------------------------------
    if (g.state === 'ALARM' || g.state === 'SEARCH') {
      // Hurry to the last seen spot, look around, then give up.
      var dx = g.lastSeenX - g.x;
      if (Math.abs(dx) > 12) {
        g.dir = dx > 0 ? 1 : -1;
        g.x += g.dir * g.speed * dt;
      } else if (g.state === 'SEARCH') {
        g.searchT -= dt;
        g.sweepT += dt;
        g.dir = Math.sin(g.sweepT * 2.2) > 0 ? 1 : -1;
        if (g.searchT <= 0) { g.state = 'PATROL'; g.suspicion = 0; }
      } else {
        g.searchT -= dt;
        if (g.searchT <= 0) { g.state = 'SEARCH'; g.searchT = 4; }
      }
    } else {
      if (g.pauseT > 0) {
        g.pauseT -= dt; // stop and stare toward the sound — the "?" moment
        g.sweepT += dt;
      } else {
        var target = g.patrol[g.wp];
        var ddx = target - g.x;
        if (Math.abs(ddx) < 10) {
          g.wp = (g.wp + 1) % g.patrol.length;
          g.pauseT = 1.4; // turn at the end of the sweep
        } else {
          g.dir = ddx > 0 ? 1 : -1;
          g.x += g.dir * g.speed * dt;
        }
      }
    }

    if (g.x < 40) g.x = 40;
    if (g.x > level.PLAY_W - 40) g.x = level.PLAY_W - 40;
  }

  function statusWord(g, vision) {
    if (g.state === 'ALARM') return 'ALARM — HUNTING';
    if (g.state === 'SEARCH') return 'SEARCHING';
    if (g.state === 'SUSPICIOUS') return 'SUSPICIOUS';
    if (g.kind === 'DOG' && g.earsUp) return 'EARS UP!';
    return 'PATROL';
  }

  function distanceTo(g, player) {
    return Math.abs(g.x - player.x) / 46; // metres, roughly
  }

  window.WindmillGuard = {
    makeBram: makeBram, makePip: makePip,
    updateGuard: updateGuard, statusWord: statusWord, distanceTo: distanceTo
  };
})();
