// vision.js — lantern cones, line of sight, and the staged detection ladder.
// calm -> suspicious ("?") -> alarm ("!") -> recover by hiding.
(function () {
  'use strict';

  var CONE_LEN = 270;
  var CONE_LEN_DOG = 180;  // Pip hunts by nose and ears: a shorter cone
  var CONE_HALF = 0.46;   // radians, ~26 deg
  var CONE_LEN_ALARM = 320;
  var CONE_HALF_ALARM = 0.60;

  var SUSPICIOUS_AT = 35;
  var ALARM_AT = 75;

  // Does the segment a->b pass within r of point c?
  function segmentHitsCircle(ax, ay, bx, by, cx, cy, r) {
    var dx = bx - ax, dy = by - ay;
    var len2 = dx * dx + dy * dy;
    var t = len2 === 0 ? 0 : ((cx - ax) * dx + (cy - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    var px = ax + t * dx, py = ay + t * dy;
    var ddx = cx - px, ddy = cy - py;
    return ddx * ddx + ddy * ddy < r * r;
  }

  // Is the player inside a guard's lantern cone?
  function inCone(guard, px, py, alarm) {
    var dx = px - guard.x, dy = (py - 24) - (guard.y - 30);
    var dist = Math.sqrt(dx * dx + dy * dy);
    var len = guard.kind === 'DOG' ? CONE_LEN_DOG : (alarm ? CONE_LEN_ALARM : CONE_LEN);
    if (dist > len || dist < 8) return { inside: false, dist: dist };
    var ang = Math.atan2(dy, dx);
    var facing = guard.dir >= 0 ? 0 : Math.PI;
    var diff = Math.abs(((ang - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    var half = alarm ? CONE_HALF_ALARM : CONE_HALF;
    return { inside: diff < half, dist: dist, angle: diff };
  }

  // Full sight test: cone + shadow pool + dust + cover. Returns why the player is (not) seen.
  function canSee(guard, player, level, state) {
    var alarm = guard.suspicion >= ALARM_AT;
    var cone = inCone(guard, player.x, player.y, alarm);
    if (!cone.inside) return { seen: false, why: 'OUT OF CONE', dist: cone.dist };
    // The moving sail shadow hides Tomas even in the open.
    var sh = level.shadowRange(state.time);
    if (player.x > sh.x0 && player.x < sh.x1 && player.y > level.FLOOR_Y - 70) {
      return { seen: false, why: 'IN SAIL SHADOW', dist: cone.dist };
    }
    // Flour dust blocks sight — standing in it, or with a cloud between
    // the guard's eyes and Tomas.
    if (level.inDust(state.dusts, player.x, player.y - 24)) {
      return { seen: false, why: 'IN FLOUR DUST', dist: cone.dist };
    }
    for (var d = 0; d < state.dusts.length; d++) {
      var dust = state.dusts[d];
      if (segmentHitsCircle(guard.x, guard.y - 30, player.x, player.y - 24, dust.x, dust.y, dust.r)) {
        return { seen: false, why: 'IN FLOUR DUST', dist: cone.dist };
      }
    }
    // Cover between guard and player.
    var cover = level.coverBlocks(guard, player, player.crouched);
    if (cover) return { seen: false, why: 'BEHIND ' + cover.kind, dist: cone.dist };
    return { seen: true, why: 'EXPOSED IN LANTERN LIGHT', dist: cone.dist };
  }

  function detectionWord(maxSuspicion) {
    if (maxSuspicion >= ALARM_AT) return 'ALARM';
    if (maxSuspicion >= SUSPICIOUS_AT) return 'SUSPICIOUS';
    if (maxSuspicion >= 12) return 'UNEASY';
    return 'CALM';
  }

  function alarmStage(maxSuspicion) {
    if (maxSuspicion >= ALARM_AT) return 3; // ALARM
    if (maxSuspicion >= SUSPICIOUS_AT) return 2; // HUNTED
    if (maxSuspicion >= 12) return 1; // UNEASY
    return 0; // CALM
  }

  function alarmLabel(stage) {
    return ['CALM', 'UNEASY', 'HUNTED', 'ALARM'][stage];
  }

  // Hearing: running footsteps carry; walking is silent.
  function hearsNoise(guard, player) {
    if (!player.moving || player.crouched) return false;
    var dx = player.x - guard.x;
    var radius = player.running ? 240 : 60;
    return Math.abs(dx) < radius && Math.abs(player.y - guard.y) < 120;
  }

  window.WindmillVision = {
    CONE_LEN: CONE_LEN, CONE_LEN_DOG: CONE_LEN_DOG, CONE_HALF: CONE_HALF,
    CONE_LEN_ALARM: CONE_LEN_ALARM, CONE_HALF_ALARM: CONE_HALF_ALARM,
    SUSPICIOUS_AT: SUSPICIOUS_AT, ALARM_AT: ALARM_AT,
    inCone: inCone, canSee: canSee,
    detectionWord: detectionWord, alarmStage: alarmStage, alarmLabel: alarmLabel,
    hearsNoise: hearsNoise
  };
})();
