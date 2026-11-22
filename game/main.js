// main.js — The Windmill: game loop, input, staging, and the render order.
// Tomas carries 3 grain sacks through the mill to the cart outside, unseen.
(function () {
  'use strict';

  var level = window.WindmillLevel;
  var vision = window.WindmillVision;
  var Player = window.WindmillPlayer;
  var Guard = window.WindmillGuard;
  var AudioSys = window.WindmillAudio;
  var hud = window.WindmillHud;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  var audio = AudioSys.makeAudio();

  var state = {
    time: 0, timer: 0, phase: 'play', // play | won | caught
    dusts: [], sacks: [], spotted: 0, strikes: 0,
    toast: '', toastT: 0, wonAt: 0, caughtAt: 0
  };

  var player = Player.makePlayer(120, level.FLOOR_Y);
  var bram = Guard.makeBram();
  var pip = Guard.makePip();
  var guards = [bram, pip];

  var input = { left: false, right: false, up: false, down: false, run: false };

  function resetNight(keepStrikes) {
    var strikes = keepStrikes ? state.strikes : 0;
    state.time = 0; state.timer = 0; state.phase = 'play';
    state.dusts = [];
    state.sacks = level.SACK_SPOTS.map(function (s) {
      return { id: s.id, x: s.x, y: s.y, label: s.label, taken: false };
    });
    state.spotted = 0; state.strikes = strikes;
    state.toast = 'GOAL: Carry 3 sacks to the cart outside'; state.toastT = 4;
    player = Player.makePlayer(120, level.FLOOR_Y);
    bram = Guard.makeBram();
    pip = Guard.makePip();
    guards = [bram, pip];
  }

  function setVisibility() {
    if (state.phase !== 'play') { player.visibility = 'HIDDEN'; return; }
    var sh = level.shadowRange(state.time);
    var inShadow = player.x > sh.x0 && player.x < sh.x1 && player.y > level.FLOOR_Y - 70;
    var inDust = level.inDust(state.dusts, player.x, player.y - 24);
    // A dust cloud between a guard and Tomas hides him even in the open.
    var dustBlocks = false;
    guards.forEach(function (g) {
      if (vision.canSee(g, player, level, state).why === 'IN FLOUR DUST') dustBlocks = true;
    });
    var maxS = Math.max(bram.suspicion, pip.suspicion);
    if (inShadow) player.visibility = 'IN SHADOW';
    else if (inDust || dustBlocks) player.visibility = 'HIDDEN';
    else if (maxS >= vision.SUSPICIOUS_AT) player.visibility = 'SEEN!';
    else player.visibility = 'EXPOSED';
    player.hidden = inShadow || inDust || dustBlocks;
  }

  function update(dt) {
    state.time += dt;
    if (state.phase === 'play') state.timer += dt;
    if (state.toastT > 0) state.toastT -= dt;
    if (state.toastT <= 0) state.toast = '';

    // Dust clouds age out.
    for (var i = state.dusts.length - 1; i >= 0; i--) {
      if (state.time - state.dusts[i].born > state.dusts[i].life) state.dusts.splice(i, 1);
    }

    if (state.phase === 'play') {
      Player.update(player, input, dt, level, audio);
      var picked = Player.tryPickup(player, state.sacks);
      if (picked) {
        AudioSys.pickup(audio);
        state.toast = 'SACK ' + picked.id + ' OF 3 — ' + (3 - player.sacks) + ' TO GO';
        state.toastT = 3;
      }
      Guard.updateGuard(bram, dt, player, vision, level, state, audio);
      Guard.updateGuard(pip, dt, player, vision, level, state, audio);
      setVisibility();

      // Caught: a guard at full alarm right on top of Tomas.
      var near = guards.some(function (g) {
        return g.suspicion >= vision.ALARM_AT && Math.abs(g.x - player.x) < 42 &&
          Math.abs(g.y - player.y) < 80 && !player.hidden;
      });
      if (near) {
        state.phase = 'caught';
        state.caughtAt = state.time;
        state.strikes += 1;
        AudioSys.caught(audio);
      }

      // Win: all sacks, then reach the green exit door.
      var d = level.EXIT_DOOR;
      if (player.sacks >= 3 && player.x > d.x - 10 && player.x < d.x + d.w + 10 &&
          player.y > d.y - 10) {
        state.phase = 'won';
        state.wonAt = state.timer;
        AudioSys.win(audio);
      }
    } else if (state.phase === 'won') {
      // Sails keep turning behind the victory scene.
    }
  }

  function render() {
    ctx.clearRect(0, 0, 1280, 720);
    if (state.phase === 'won') {
      hud.drawVictoryScene(ctx, level, state);
      hud.drawTopBar(ctx, state, vision);
      hud.drawPanel(ctx, state, vision, level, player, guards);
      return;
    }
    hud.drawRoom(ctx, level, state);
    hud.drawSails(ctx, level, state.time);
    hud.drawShadowPool(ctx, level, state);
    hud.drawCover(ctx, level);
    hud.drawSacks(ctx, level, state.sacks);
    hud.drawExit(ctx, level, player.sacks >= 3);
    hud.drawDust(ctx, state.dusts, state.time);
    // Guards behind the player when they are far, player on top when near — draw guards first.
    guards.forEach(function (g) { hud.drawGuard(ctx, g, vision, state); });
    hud.drawPlayer(ctx, player);
    hud.drawTopBar(ctx, state, vision);
    hud.drawPanel(ctx, state, vision, level, player, guards);
    hud.drawObjectiveToast(ctx, state);
    if (state.phase === 'caught') hud.drawCaughtOverlay(ctx, state);
  }

  // ---------------------------------------------------------------- input

  var KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'run', ShiftRight: 'run'
  };

  window.addEventListener('keydown', function (e) {
    AudioSys.ensure(audio);
    if (e.code === 'KeyM') { AudioSys.toggleMute(audio); return; }
    if (e.code === 'KeyF') {
      var tx = player.x + player.dir * 200;
      Player.throwPouch(player, tx, level.FLOOR_Y - 40, state.dusts, level, audio);
      return;
    }
    if (e.code === 'KeyR' && state.phase === 'caught') {
      if (state.strikes >= 3) resetNight(false);
      else resetNight(true);
      return;
    }
    var k = KEYMAP[e.code];
    if (k) { input[k] = true; e.preventDefault(); }
  });

  window.addEventListener('keyup', function (e) {
    var k = KEYMAP[e.code];
    if (k) input[k] = false;
  });

  canvas.addEventListener('mousedown', function (e) {
    AudioSys.ensure(audio);
    var r = canvas.getBoundingClientRect();
    var mx = (e.clientX - r.left) * (canvas.width / r.width);
    var my = (e.clientY - r.top) * (canvas.height / r.height);
    if (mx < level.PLAY_W) {
      Player.throwPouch(player, mx, my, state.dusts, level, audio);
    }
  });

  // ---------------------------------------------------------------- staging
  // ?shot=1..4 poses a live scene for screenshots. The game keeps simulating
  // from the pose: the timer runs, the sails turn, the guards patrol.

  function applyShot(n) {
    if (n === 1) {
      // Near-miss cover: Tomas inside the moving sail shadow, Bram's lantern
      // cone almost touching him, "?" overhead, a sack already carried.
      // time 5.0 puts the pool on Tomas ~1.2s after load, when the shot is taken.
      state.timer = 47; state.time = 5.0;
      player.x = 520; player.y = level.FLOOR_Y; player.dir = 1;
      player.sacks = 1; state.sacks[0].taken = true;
      bram.x = 668; bram.y = level.FLOOR_Y; bram.dir = -1;
      bram.suspicion = 58; bram.state = 'SUSPICIOUS'; bram.pauseT = 2.5;
      pip.x = 300; pip.y = level.FLOOR_Y; pip.dir = 1;
      state.toast = '';
    } else if (n === 2) {
      // The shadow cycle: Tomas riding the moving pool mid-floor.
      // time 6.25 puts the pool's centre on Tomas ~1.2s after load, when the shot is taken.
      state.timer = 72; state.time = 6.25;
      player.x = 430; player.y = level.FLOOR_Y; player.dir = 1;
      player.sacks = 1; state.sacks[0].taken = true;
      bram.x = 830; bram.y = level.FLOOR_Y; bram.dir = -1; bram.suspicion = 8;
      pip.x = 180; pip.y = level.FLOOR_Y; pip.dir = 1; pip.suspicion = 0;
      state.toast = 'RIDE THE SAIL SHADOW — IT MOVES WITH THE SAILS';
      state.toastT = 30;
    } else if (n === 3) {
      // Flour pouch: a dust cloud between Bram's lantern and Tomas.
      // Suspicion 70 stays SUSPICIOUS through the shot (~1.2s of decay).
      state.timer = 58; state.time = 9.4;
      player.x = 470; player.y = level.FLOOR_Y; player.dir = 1; player.crouched = true;
      player.sacks = 2; player.pouches = 2;
      state.sacks[0].taken = true; state.sacks[1].taken = true;
      var dust = level.makeDust(580, level.FLOOR_Y - 40);
      dust.r = 90;
      dust.born = state.time;
      state.dusts.push(dust);
      bram.x = 700; bram.y = level.FLOOR_Y; bram.dir = -1;
      bram.suspicion = 70; bram.state = 'SUSPICIOUS'; bram.pauseT = 2.5;
      pip.x = 220; pip.y = level.FLOOR_Y; pip.dir = 1;
      state.toast = 'FLOUR POUCH — DUST BLOCKS HIS SIGHT';
      state.toastT = 30;
    } else if (n === 4) {
      // Victory at the cart: all three sacks delivered, timer kept.
      state.timer = 92; state.time = 12;
      player.x = 572; player.y = level.FLOOR_Y;
      player.sacks = 3;
      state.sacks.forEach(function (s) { s.taken = true; });
      state.phase = 'won';
      state.wonAt = 92;
      state.spotted = 0;
    }
    setVisibility();
  }

  // ---------------------------------------------------------------- boot

  resetNight(false);
  var params = new URLSearchParams(window.location.search);
  var shot = parseInt(params.get('shot') || '0', 10);
  if (shot >= 1 && shot <= 4) applyShot(shot);

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
