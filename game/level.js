// level.js — the windmill's layout: floors, cover, sacks, exit, and the rotating sails.
// The play field is x 0..960, y 0..720. The HUD panel owns x 960..1280.
(function () {
  'use strict';

  var PLAY_W = 960;
  var FLOOR_Y = 600;      // ground floor top
  var LOFT_Y = 452;       // loft platform top
  var GRAVITY = 1500;

  // The sails turn on a fixed cycle. Their shadow pool sweeps the floor.
  var SAIL_HUB = { x: 500, y: 205 };
  var SAIL_PERIOD = 14;   // seconds per full turn
  var SHADOW_WIDTH = 280;

  function sailAngle(t) {
    return (t / SAIL_PERIOD) * Math.PI * 2;
  }

  // Centre of the moving shadow pool on the floor for a given time.
  function shadowCenterX(t) {
    return 480 + 250 * Math.sin(sailAngle(t));
  }

  function shadowRange(t) {
    var c = shadowCenterX(t);
    return { x0: c - SHADOW_WIDTH / 2, x1: c + SHADOW_WIDTH / 2, cx: c };
  }

  // Cover objects. tall: blocks sight even standing. low: blocks only when crouched.
  var COVER = [
    { id: 'sacks', kind: 'SACK PILE', x: 150, y: 556, w: 110, h: 44, tall: false, label: 'SACKS: hide (crouch)' },
    { id: 'hay', kind: 'HAY', x: 560, y: 500, w: 92, h: 100, tall: true, label: 'HAY: hide' },
    { id: 'barrels', kind: 'BARRELS', x: 742, y: 522, w: 96, h: 78, tall: true, label: 'BARRELS: hide' },
    { id: 'crates', kind: 'CRATES', x: 60, y: 528, w: 84, h: 72, tall: true, label: 'CRATES: hide' }
  ];

  // The three grain sacks Tomas must carry out.
  var SACK_SPOTS = [
    { id: 1, x: 305, y: 420, onLoft: true, label: 'SACK 1' },
    { id: 2, x: 620, y: 566, onLoft: false, label: 'SACK 2' },
    { id: 3, x: 800, y: 566, onLoft: false, label: 'SACK 3' }
  ];

  var EXIT_DOOR = { x: 878, y: 478, w: 62, h: 122, label: 'EXIT' };
  var CART = { x: 690, y: 560, w: 190, h: 70 };

  var LOFT = { x: 84, y: LOFT_Y, w: 330, h: 16 };
  var LADDER = { x: 396, y: LOFT_Y, w: 26, h: FLOOR_Y - LOFT_Y };

  // Dust clouds from flour pouches: half-hiding, slow to cross.
  function makeDust(x, y) {
    return { x: x, y: y, r: 74, born: 0, life: 6 };
  }

  function dustBlocks(dust, px, py) {
    var dx = px - dust.x, dy = py - dust.y;
    return dx * dx + dy * dy < dust.r * dust.r;
  }

  // Is a point inside any dust cloud (player half-hidden there)?
  function inDust(dusts, x, y) {
    for (var i = 0; i < dusts.length; i++) {
      if (dustBlocks(dusts[i], x, y)) return true;
    }
    return false;
  }

  // Does the segment guard->player cross a tall cover rect (or a low one while crouched)?
  function segmentHitsRect(x0, y0, x1, y1, r) {
    var dx = x1 - x0, dy = y1 - y0;
    var tmin = 0, tmax = 1;
    if (dx === 0) {
      if (x0 < r.x || x0 > r.x + r.w) return false;
    } else {
      var tx1 = (r.x - x0) / dx, tx2 = (r.x + r.w - x0) / dx;
      if (tx1 > tx2) { var tmp = tx1; tx1 = tx2; tx2 = tmp; }
      tmin = Math.max(tmin, tx1); tmax = Math.min(tmax, tx2);
      if (tmin > tmax) return false;
    }
    if (dy === 0) {
      if (y0 < r.y || y0 > r.y + r.h) return false;
    } else {
      var ty1 = (r.y - y0) / dy, ty2 = (r.y + r.h - y0) / dy;
      if (ty1 > ty2) { var tmp2 = ty1; ty1 = ty2; ty2 = tmp2; }
      tmin = Math.max(tmin, ty1); tmax = Math.min(tmax, ty2);
      if (tmin > tmax) return false;
    }
    return true;
  }

  function coverBlocks(guard, player, crouched) {
    for (var i = 0; i < COVER.length; i++) {
      var c = COVER[i];
      if (!c.tall && !crouched) continue;
      // The cover only hides you if you stand close behind it.
      var midX = (guard.x + player.x) / 2;
      if (Math.abs(midX - (c.x + c.w / 2)) > c.w) continue;
      if (segmentHitsRect(guard.x, guard.y - 26, player.x, player.y - 26, c)) return c;
    }
    return null;
  }

  window.WindmillLevel = {
    PLAY_W: PLAY_W, FLOOR_Y: FLOOR_Y, LOFT_Y: LOFT_Y, GRAVITY: GRAVITY,
    SAIL_HUB: SAIL_HUB, SAIL_PERIOD: SAIL_PERIOD, SHADOW_WIDTH: SHADOW_WIDTH,
    sailAngle: sailAngle, shadowCenterX: shadowCenterX, shadowRange: shadowRange,
    COVER: COVER, SACK_SPOTS: SACK_SPOTS, EXIT_DOOR: EXIT_DOOR, CART: CART,
    LOFT: LOFT, LADDER: LADDER, makeDust: makeDust, inDust: inDust,
    coverBlocks: coverBlocks, segmentHitsRect: segmentHitsRect
  };
})();
