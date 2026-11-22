// player.js — Tomas, the miller's apprentice: walk, crouch, climb, carry, throw.
// He carries three grain sacks to the cart outside, one trip at a time.
(function () {
  'use strict';

  var WALK_SPEED = 150;
  var RUN_SPEED = 235;
  var CROUCH_SPEED = 70;
  var CLIMB_SPEED = 90;
  var WIDTH = 26;
  var HEIGHT_STAND = 58;
  var HEIGHT_CROUCH = 36;

  function makePlayer(x, y) {
    return {
      name: 'TOMAS', x: x, y: y, vx: 0, vy: 0, dir: 1,
      onGround: true, onLoft: false, crouched: false,
      moving: false, running: false, climbing: false,
      sacks: 0, pouches: 3, carrying: false,
      stepPhase: 0, stepAcc: 0, hidden: false, visibility: 'EXPOSED',
      noise: 'SILENT'
    };
  }

  function update(player, input, dt, level, audio) {
    var left = input.left, right = input.right;
    var up = input.up, down = input.down;
    var speed = player.crouched ? CROUCH_SPEED : (input.run ? RUN_SPEED : WALK_SPEED);

    player.moving = false;
    player.running = false;
    player.climbing = false;

    var onLadder = player.x > level.LADDER.x - 14 && player.x < level.LADDER.x + level.LADDER.w + 14;
    if (onLadder && (up || down) && player.y > level.LOFT_Y + 4) {
      player.climbing = true;
      player.y += (down ? 1 : -1) * CLIMB_SPEED * dt;
      if (player.y < level.LOFT_Y + 30) player.y = level.LOFT_Y + 30;
      if (player.y > level.FLOOR_Y) player.y = level.FLOOR_Y;
      player.vy = 0;
    } else {
      var move = (right ? 1 : 0) - (left ? 1 : 0);
      if (move !== 0) {
        player.dir = move;
        player.moving = true;
        player.running = !!input.run && !player.crouched;
        player.x += move * speed * dt;
        player.stepAcc += speed * dt;
        if (player.stepAcc > 34) {
          player.stepAcc = 0;
          player.stepPhase += 1;
          if (audio) audio.footstep(player.running, player.crouched);
        }
      }
      // Gravity keeps Tomas on the floor or the loft.
      player.vy += level.GRAVITY * dt;
      player.y += player.vy * dt;
      var groundY = player.onLoft ? level.LOFT_Y : level.FLOOR_Y;
      if (player.y >= groundY) { player.y = groundY; player.vy = 0; player.onGround = true; }
      else player.onGround = false;
      // Step off the loft edge and you drop to the ground floor.
      if (player.onLoft && (player.x < level.LOFT.x - 6 || player.x > level.LOFT.x + level.LOFT.w + 6)) {
        player.onLoft = false;
      }
      // Step onto the loft from the ladder top.
      if (!player.onLoft && player.y <= level.LOFT_Y + 2 && player.x > level.LOFT.x && player.x < level.LOFT.x + level.LOFT.w) {
        player.onLoft = true;
        player.y = level.LOFT_Y;
        player.vy = 0;
      }
    }

    // Crouch: slower, smaller, hidden behind low cover.
    player.crouched = !!down && !player.climbing;
    player.noise = player.running ? 'LOUD — RUNNING' : (player.moving ? 'SOFT STEPS' : 'SILENT');

    // Walls of the mill.
    if (player.x < 24) player.x = 24;
    if (player.x > level.PLAY_W - 24) player.x = level.PLAY_W - 24;
  }

  function height(player) {
    return player.crouched ? HEIGHT_CROUCH : HEIGHT_STAND;
  }

  // Pick up a sack when Tomas walks over its spot.
  function tryPickup(player, sacks) {
    for (var i = 0; i < sacks.length; i++) {
      var s = sacks[i];
      if (s.taken) continue;
      var dx = Math.abs(player.x - s.x);
      var dy = Math.abs((player.y - 30) - (s.y - 14));
      if (dx < 34 && dy < 46) {
        s.taken = true;
        player.sacks += 1;
        player.carrying = true;
        return s;
      }
    }
    return null;
  }

  // Throw a flour pouch toward a point: it bursts into a dust cloud.
  function throwPouch(player, tx, ty, dusts, level, audio) {
    if (player.pouches <= 0) return null;
    player.pouches -= 1;
    var dx = tx - player.x;
    var landX = player.x + Math.max(-260, Math.min(260, dx));
    var dust = level.makeDust(landX, Math.min(ty, level.FLOOR_Y - 30));
    dust.born = 0;
    dusts.push(dust);
    if (audio) audio.pouchThrow();
    return dust;
  }

  window.WindmillPlayer = {
    WALK_SPEED: WALK_SPEED, RUN_SPEED: RUN_SPEED, CROUCH_SPEED: CROUCH_SPEED,
    WIDTH: WIDTH, HEIGHT_STAND: HEIGHT_STAND, HEIGHT_CROUCH: HEIGHT_CROUCH,
    makePlayer: makePlayer, update: update, height: height,
    tryPickup: tryPickup, throwPouch: throwPouch
  };
})();
