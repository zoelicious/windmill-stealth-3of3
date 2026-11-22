// hud.js — everything drawn: the mill interior, the sails and their moving shadow,
// the lantern cones, the guards, Tomas, and the right-hand info panel.
(function () {
  'use strict';

  var PANEL_X = 960;
  var PANEL_W = 320;
  var GOLD = '#ffd27a';
  var GREEN = '#58c96b';
  var INK = '#efe6ff';
  var MUTED = '#b9a8cc';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(ctx, s, x, y, font, color, align) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ---------------------------------------------------------------- scene

  function drawSails(ctx, level, t) {
    var hub = level.SAIL_HUB;
    // Round window with a dusk sky.
    var sky = ctx.createRadialGradient(hub.x, hub.y, 10, hub.x, hub.y, 150);
    sky.addColorStop(0, '#f7b267');
    sky.addColorStop(0.55, '#c96f4a');
    sky.addColorStop(1, '#5b2d4d');
    ctx.save();
    ctx.beginPath(); ctx.arc(hub.x, hub.y, 138, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = sky;
    ctx.fillRect(hub.x - 140, hub.y - 140, 280, 280);
    // Sun low on the horizon.
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(hub.x + 52, hub.y + 62, 26, 0, Math.PI * 2); ctx.fill();
    // Four sails turning on their fixed cycle.
    var a = level.sailAngle(t);
    ctx.translate(hub.x, hub.y);
    ctx.rotate(a);
    ctx.fillStyle = '#e8dcc3';
    for (var i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(16, -128);
      ctx.lineTo(44, -128);
      ctx.lineTo(30, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8a6f4d';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.rotate(-a);
    ctx.translate(-hub.x, -hub.y);
    ctx.restore();
    // Window frame.
    ctx.strokeStyle = '#4a2f22';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(hub.x, hub.y, 138, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hub.x - 138, hub.y); ctx.lineTo(hub.x + 138, hub.y);
    ctx.moveTo(hub.x, hub.y - 138); ctx.lineTo(hub.x, hub.y + 138);
    ctx.lineWidth = 4; ctx.stroke();
    text(ctx, 'THE SAILS TURN — SHADOW MOVES WITH THEM', hub.x, hub.y + 168, 'bold 11px monospace', MUTED, 'center');
  }

  function drawRoom(ctx, level, state) {
    // Dusk wall, purple-brown.
    var wall = ctx.createLinearGradient(0, 0, 0, 620);
    wall.addColorStop(0, '#3a2438');
    wall.addColorStop(0.6, '#2c1c30');
    wall.addColorStop(1, '#241a24');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, level.PLAY_W, 720);
    // Timber beams.
    ctx.fillStyle = '#3d2718';
    ctx.fillRect(0, 84, level.PLAY_W, 14);
    ctx.fillRect(0, 300, level.PLAY_W, 10);
    for (var bx = 90; bx < level.PLAY_W; bx += 170) ctx.fillRect(bx, 0, 14, 600);
    // Loft platform.
    ctx.fillStyle = '#4a2f1e';
    ctx.fillRect(level.LOFT.x, level.LOFT.y, level.LOFT.w, level.LOFT.h);
    ctx.fillStyle = '#5d3d26';
    ctx.fillRect(level.LOFT.x, level.LOFT.y, level.LOFT.w, 5);
    // Ladder.
    ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(level.LADDER.x, level.LOFT.y); ctx.lineTo(level.LADDER.x, level.FLOOR_Y);
    ctx.moveTo(level.LADDER.x + 26, level.LOFT.y); ctx.lineTo(level.LADDER.x + 26, level.FLOOR_Y);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (var ly = level.LOFT_Y + 18; ly < level.FLOOR_Y; ly += 22) {
      ctx.beginPath();
      ctx.moveTo(level.LADDER.x, ly); ctx.lineTo(level.LADDER.x + 26, ly); ctx.stroke();
    }
    // Ground floor: dark planks, the cone light will dominate it.
    ctx.fillStyle = '#2e2019';
    ctx.fillRect(0, level.FLOOR_Y, level.PLAY_W, 120);
    ctx.strokeStyle = '#1d130d'; ctx.lineWidth = 2;
    for (var fx = 0; fx < level.PLAY_W; fx += 64) {
      ctx.beginPath(); ctx.moveTo(fx, level.FLOOR_Y); ctx.lineTo(fx, 720); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, level.FLOOR_Y); ctx.lineTo(level.PLAY_W, level.FLOOR_Y); ctx.stroke();
    // Scattered flour dust motes.
    ctx.fillStyle = 'rgba(230, 210, 180, 0.25)';
    for (var i = 0; i < 26; i++) {
      var mx = (i * 137) % 940 + 10;
      var my = 120 + ((i * 89) % 420);
      ctx.fillRect(mx, my + Math.sin(state.time * 0.7 + i) * 4, 3, 3);
    }
  }

  function drawShadowPool(ctx, level, state) {
    var sh = level.shadowRange(state.time);
    var g = ctx.createLinearGradient(sh.x0, 0, sh.x1, 0);
    g.addColorStop(0, 'rgba(16, 24, 72, 0)');
    g.addColorStop(0.18, 'rgba(16, 24, 72, 0.62)');
    g.addColorStop(0.82, 'rgba(16, 24, 72, 0.62)');
    g.addColorStop(1, 'rgba(16, 24, 72, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(sh.x0, level.FLOOR_Y - 4, sh.x1 - sh.x0, 124);
    // Dashed ghost of where the shadow is heading next — the cycle, readable.
    var next = level.shadowRange(state.time + 3.5);
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(120, 150, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(next.x0, level.FLOOR_Y + 2, next.x1 - next.x0, 116);
    ctx.restore();
    text(ctx, 'SAIL SHADOW — SAFE', sh.cx, level.FLOOR_Y + 118, 'bold 12px monospace', '#9db4ff', 'center');
  }

  function drawCover(ctx, level) {
    level.COVER.forEach(function (c) {
      if (c.kind === 'HAY') {
        ctx.fillStyle = '#c9a13b';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + c.h);
        ctx.quadraticCurveTo(c.x + c.w / 2, c.y - 22, c.x + c.w, c.y + c.h);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8a6d1e'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x + 14, c.y + c.h - 12); ctx.lineTo(c.x + 30, c.y + 18);
        ctx.moveTo(c.x + 46, c.y + c.h - 8); ctx.lineTo(c.x + 60, c.y + 10);
        ctx.moveTo(c.x + 70, c.y + c.h - 14); ctx.lineTo(c.x + 82, c.y + 26);
        ctx.stroke();
        text(ctx, 'HAY: hide', c.x + c.w / 2, c.y - 8, 'bold 11px monospace', '#e8c95a', 'center');
      } else if (c.kind === 'BARRELS') {
        for (var i = 0; i < 2; i++) {
          var bx = c.x + i * 48;
          ctx.fillStyle = '#7a4a26';
          rr(ctx, bx, c.y + 6, 44, c.h - 6, 6); ctx.fill();
          ctx.strokeStyle = '#3d2412'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bx, c.y + 26); ctx.lineTo(bx + 44, c.y + 26);
          ctx.moveTo(bx, c.y + 52); ctx.lineTo(bx + 44, c.y + 52);
          ctx.stroke();
        }
        text(ctx, 'BARRELS: hide', c.x + c.w / 2, c.y - 8, 'bold 11px monospace', '#d89a5a', 'center');
      } else if (c.kind === 'CRATES') {
        ctx.fillStyle = '#6b4a2e';
        rr(ctx, c.x, c.y + 8, c.w, c.h - 8, 4); ctx.fill();
        ctx.strokeStyle = '#3d2718'; ctx.lineWidth = 3;
        ctx.strokeRect(c.x + 4, c.y + 12, c.w - 8, c.h - 16);
        ctx.beginPath();
        ctx.moveTo(c.x + 4, c.y + 12); ctx.lineTo(c.x + c.w - 4, c.y + c.h - 4);
        ctx.moveTo(c.x + c.w - 4, c.y + 12); ctx.lineTo(c.x + 4, c.y + c.h - 4);
        ctx.stroke();
        text(ctx, 'CRATES: hide', c.x + c.w / 2, c.y - 8, 'bold 11px monospace', '#c9a06a', 'center');
      } else {
        // Sack pile, low cover.
        ctx.fillStyle = '#a8875a';
        [[0, 22, 52], [28, 0, 52], [56, 22, 52]].forEach(function (s) {
          ctx.beginPath();
          ctx.ellipse(c.x + s[0] + 26, c.y + c.h - s[1] - 8, 27, 15, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.strokeStyle = '#6b4d2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(c.x + 54, c.y + 14, 27, 15, 0, 0, Math.PI * 2); ctx.stroke();
        text(ctx, 'SACKS: hide (crouch)', c.x + c.w / 2 + 25, c.y - 8, 'bold 11px monospace', '#d8b878', 'center');
      }
    });
  }

  function drawSacks(ctx, level, sacks) {
    sacks.forEach(function (s) {
      if (s.taken) return;
      var pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300);
      ctx.fillStyle = 'rgba(255, 210, 122, ' + (0.25 * pulse).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y - 12, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b98d4f';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 22, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6b4d2a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 22, 16, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x - 8, s.y - 12); ctx.lineTo(s.x + 8, s.y - 12); ctx.stroke();
      text(ctx, s.label, s.x, s.y - 34, 'bold 11px monospace', GOLD, 'center');
    });
  }

  function drawExit(ctx, level, sacksDone) {
    var d = level.EXIT_DOOR;
    var glow = sacksDone ? 0.85 : 0.45;
    ctx.fillStyle = 'rgba(88, 201, 107, ' + (0.18 * glow).toFixed(2) + ')';
    ctx.fillRect(d.x - 14, d.y - 14, d.w + 28, d.h + 14);
    ctx.fillStyle = '#1d4d2a';
    rr(ctx, d.x, d.y, d.w, d.h, 6); ctx.fill();
    ctx.strokeStyle = GREEN; ctx.lineWidth = 3;
    rr(ctx, d.x, d.y, d.w, d.h, 6); ctx.stroke();
    ctx.fillStyle = GREEN;
    ctx.fillRect(d.x + 8, d.y + 10, d.w - 16, 22);
    text(ctx, 'EXIT', d.x + d.w / 2, d.y + 26, 'bold 13px monospace', '#0d2b14', 'center');
    ctx.fillStyle = '#c9f5d0';
    ctx.beginPath(); ctx.arc(d.x + d.w - 12, d.y + d.h / 2, 4, 0, Math.PI * 2); ctx.fill();
    text(ctx, sacksDone ? 'CART WAITS →' : 'NEED 3 SACKS', d.x + d.w / 2, d.y + d.h + 18, 'bold 11px monospace', GREEN, 'center');
  }

  function drawCone(ctx, guard, vision, level) {
    var alarm = guard.suspicion >= vision.ALARM_AT;
    var isDog = guard.kind === 'DOG';
    var len = isDog ? vision.CONE_LEN_DOG : (alarm ? vision.CONE_LEN_ALARM : vision.CONE_LEN);
    var half = alarm ? vision.CONE_HALF_ALARM : vision.CONE_HALF;
    var ox = guard.x, oy = guard.y - 30;
    var base = guard.dir >= 0 ? 0 : Math.PI;
    var flick = 0.9 + 0.1 * Math.sin(Date.now() / 90 + guard.x);
    var dim = isDog ? 0.55 : 1; // Pip's nose-cone is dimmer than a lantern
    var g = ctx.createRadialGradient(ox, oy, 10, ox, oy, len);
    g.addColorStop(0, 'rgba(255, 214, 130, ' + (0.5 * flick * dim).toFixed(2) + ')');
    g.addColorStop(0.6, 'rgba(255, 190, 90, ' + (0.26 * flick * dim).toFixed(2) + ')');
    g.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, len, base - half, base + half);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 220, 140, ' + (0.35 * dim).toFixed(2) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(base - half) * len, oy + Math.sin(base - half) * len);
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(base + half) * len, oy + Math.sin(base + half) * len);
    ctx.stroke();
  }

  function drawGuard(ctx, g, vision, state) {
    drawCone(ctx, g, vision, window.WindmillLevel);
    var h = g.kind === 'DOG' ? 26 : 62;
    var y = g.y;
    if (g.kind === 'DOG') {
      // Dog Pip: low body, tail, ears — ears UP is the warning before the bark.
      ctx.fillStyle = '#8a6a4a';
      rr(ctx, g.x - 20, y - 22, 40, 18, 8); ctx.fill();
      ctx.beginPath(); ctx.arc(g.x + g.dir * 22, y - 16, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b4d33';
      ctx.beginPath(); ctx.arc(g.x + g.dir * 26, y - 18, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(g.x - 20, y - 18); ctx.lineTo(g.x - 30, y - 30); ctx.stroke();
      // Ears.
      ctx.fillStyle = '#5d4028';
      var earH = g.earsUp ? 16 : 8;
      ctx.beginPath();
      ctx.moveTo(g.x + g.dir * 16, y - 24);
      ctx.lineTo(g.x + g.dir * 20, y - 24 - earH);
      ctx.lineTo(g.x + g.dir * 26, y - 24);
      ctx.closePath(); ctx.fill();
      if (g.earsUp) text(ctx, 'EARS UP!', g.x, y - 48, 'bold 12px monospace', '#ffb84d', 'center');
      text(ctx, 'DOG PIP', g.x, y + 16, 'bold 11px monospace', '#e8c9a0', 'center');
    } else {
      // Miller Bram: stout, apron, cap, swinging lantern.
      ctx.fillStyle = '#5d3d26';
      rr(ctx, g.x - 15, y - 58, 30, 44, 8); ctx.fill();
      ctx.fillStyle = '#e8dcc3';
      rr(ctx, g.x - 12, y - 46, 24, 34, 4); ctx.fill();
      ctx.fillStyle = '#c98a4a';
      ctx.beginPath(); ctx.arc(g.x, y - 64, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3d2718';
      ctx.beginPath(); ctx.arc(g.x, y - 70, 12, Math.PI, 0); ctx.fill();
      ctx.fillRect(g.x - 13, y - 72, 26, 5);
      // Lantern arm.
      var swing = Math.sin(Date.now() / 400 + g.x) * 4;
      ctx.strokeStyle = '#3d2718'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(g.x + g.dir * 10, y - 44); ctx.lineTo(g.x + g.dir * 26, y - 30 + swing); ctx.stroke();
      ctx.fillStyle = '#ffcf6e';
      ctx.beginPath(); ctx.arc(g.x + g.dir * 26, y - 24 + swing, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 207, 110, 0.35)';
      ctx.beginPath(); ctx.arc(g.x + g.dir * 26, y - 24 + swing, 16, 0, Math.PI * 2); ctx.fill();
      text(ctx, 'MILLER BRAM', g.x, y + 16, 'bold 11px monospace', '#ffd27a', 'center');
    }
    // "?" / "!" bubble + the suspicious line.
    if (g.suspicion >= vision.ALARM_AT) {
      bubble(ctx, g.x, y - h - 26, '!', '#ff5a4d');
    } else if (g.suspicion >= vision.SUSPICIOUS_AT) {
      bubble(ctx, g.x, y - h - 26, '?', '#ffd27a');
      if (g.kind === 'MILLER') {
        text(ctx, 'WHAT WAS THAT?', g.x + g.dir * 8, y - h - 80, 'bold 14px monospace', '#ffd27a', 'center');
      }
    }
  }

  function bubble(ctx, x, y, mark, color) {
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
    text(ctx, mark, x, y + 6, 'bold 17px monospace', color, 'center');
  }

  function drawPlayer(ctx, p) {
    var h = p.crouched ? 36 : 58;
    var y = p.y;
    // Sack on his back when carrying.
    ctx.fillStyle = '#2e4a6b';
    rr(ctx, p.x - 11, y - h + 4, 22, h - 14, 7); ctx.fill();
    if (p.sacks > 0) {
      ctx.fillStyle = '#b98d4f';
      ctx.beginPath(); ctx.ellipse(p.x - p.dir * 12, y - h + 14, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6b4d2a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p.x - p.dir * 12, y - h + 14, 10, 8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(p.x, y - h - 2, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a26';
    ctx.beginPath(); ctx.arc(p.x, y - h - 6, 9, Math.PI, 0); ctx.fill();
    ctx.fillRect(p.x - 10, y - h - 8, 20, 4);
    // Legs: a little walk cycle.
    var step = p.moving ? Math.sin(p.stepPhase * 2.4) * 5 : 0;
    ctx.strokeStyle = '#1d2f45'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x, y - 12); ctx.lineTo(p.x - 5 + step, y);
    ctx.moveTo(p.x, y - 12); ctx.lineTo(p.x + 5 - step, y);
    ctx.stroke();
    text(ctx, 'TOMAS', p.x, y + 16, 'bold 11px monospace', '#9fd0ff', 'center');
    if (p.visibility === 'IN SHADOW' || p.visibility === 'HIDDEN') {
      text(ctx, 'HIDDEN', p.x, y - h - 22, 'bold 11px monospace', '#9db4ff', 'center');
    }
  }

  function drawDust(ctx, dusts, t) {
    dusts.forEach(function (d) {
      var age = t - d.born;
      var a = Math.max(0, 0.75 * (1 - age / d.life));
      var r = d.r * (1 + age * 0.06);
      var g = ctx.createRadialGradient(d.x, d.y, 4, d.x, d.y, r);
      g.addColorStop(0, 'rgba(238, 226, 200, ' + a.toFixed(2) + ')');
      g.addColorStop(1, 'rgba(238, 226, 200, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI * 2); ctx.fill();
      text(ctx, 'FLOUR DUST — BLOCKS SIGHT', d.x, d.y + r + 16, 'bold 11px monospace', '#efe2c8', 'center');
    });
  }

  function drawVictoryScene(ctx, level, state) {
    // Outside at dusk: the cart, the mill behind, three sacks delivered.
    var sky = ctx.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, '#7a4a6b');
    sky.addColorStop(0.5, '#c96f4a');
    sky.addColorStop(1, '#3a2438');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, level.PLAY_W, 720);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(760, 180, 44, 0, Math.PI * 2); ctx.fill();
    // The mill silhouette with turning sails.
    ctx.fillStyle = '#241a24';
    ctx.beginPath();
    ctx.moveTo(120, 600); ctx.lineTo(170, 220); ctx.lineTo(300, 220); ctx.lineTo(350, 600);
    ctx.closePath(); ctx.fill();
    var a = level.sailAngle(state.time);
    ctx.save();
    ctx.translate(235, 190); ctx.rotate(a);
    ctx.fillStyle = '#17101f';
    for (var i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(-8, -150, 30, 150);
    }
    ctx.restore();
    // Ground.
    ctx.fillStyle = '#2e2019';
    ctx.fillRect(0, 600, level.PLAY_W, 120);
    // The cart, loaded with three sacks.
    var c = level.CART;
    ctx.fillStyle = '#6b4a2e';
    rr(ctx, c.x, c.y, c.w, 34, 6); ctx.fill();
    ctx.fillStyle = '#3d2718';
    ctx.beginPath(); ctx.arc(c.x + 34, c.y + 44, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x + c.w - 34, c.y + 44, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b98d4f';
    [[30, 0], [80, -6], [130, 0]].forEach(function (o) {
      ctx.beginPath();
      ctx.ellipse(c.x + o[0], c.y - 2 + o[1], 26, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // Tomas beside his cart.
    ctx.fillStyle = '#2e4a6b';
    rr(ctx, 560, 552, 24, 48, 7); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(572, 544, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a26';
    ctx.beginPath(); ctx.arc(572, 540, 10, Math.PI, 0); ctx.fill();
    ctx.fillRect(562, 538, 20, 4);
    text(ctx, 'TOMAS', 572, 618, 'bold 11px monospace', '#9fd0ff', 'center');
    // Banner.
    ctx.fillStyle = 'rgba(16, 10, 24, 0.82)';
    rr(ctx, 210, 60, 540, 118, 12); ctx.fill();
    ctx.strokeStyle = GREEN; ctx.lineWidth = 3;
    rr(ctx, 210, 60, 540, 118, 12); ctx.stroke();
    text(ctx, 'DELIVERED!', 480, 108, 'bold 34px Georgia, serif', GREEN, 'center');
    text(ctx, 'All 3 sacks on the cart — Night 1 complete', 480, 138, '15px monospace', INK, 'center');
    text(ctx, state.spotted === 0 ? 'GHOST BONUS +500 — never seen' : 'Seen ' + state.spotted + ' time(s) — ghost bonus lost', 480, 164, 'bold 13px monospace', GOLD, 'center');
  }

  // ---------------------------------------------------------------- HUD

  function drawTopBar(ctx, state, vision) {
    ctx.fillStyle = 'rgba(16, 10, 24, 0.88)';
    ctx.fillRect(0, 0, 960, 46);
    ctx.fillStyle = '#6b4d8f';
    ctx.fillRect(0, 46, 960, 2);
    text(ctx, 'THE WINDMILL', 16, 30, 'bold 19px Georgia, serif', GOLD);
    text(ctx, 'Level 1 of 3', 220, 29, 'bold 14px monospace', INK);
    text(ctx, 'Night 1', 340, 29, 'bold 14px monospace', INK);
    text(ctx, fmtTime(state.timer), 480, 31, 'bold 20px monospace', INK, 'center');
    text(ctx, state.spotted === 0 ? '+500 if unseen' : 'GHOST BONUS LOST', 620, 29, 'bold 13px monospace', state.spotted === 0 ? GOLD : '#ff8a7a');
    var strikes = 'STRIKES ' + '●'.repeat(3 - state.strikes) + '○'.repeat(state.strikes);
    text(ctx, strikes, 944, 29, 'bold 13px monospace', '#ff8a7a', 'right');
  }

  function drawPanel(ctx, state, vision, level, player, guards) {
    var x = PANEL_X, w = PANEL_W;
    ctx.fillStyle = '#120b1c';
    ctx.fillRect(x, 0, w, 720);
    ctx.fillStyle = '#6b4d8f';
    ctx.fillRect(x, 0, 2, 720);
    var px = x + 16;
    var y = 26;

    text(ctx, 'THE WINDMILL', px, y, 'bold 17px Georgia, serif', GOLD); y += 22;
    text(ctx, 'Level 1 of 3  •  Night 1', px, y, '12px monospace', MUTED); y += 26;

    // Detection word + alarm bar.
    var maxS = Math.max(guards[0].suspicion, guards[1].suspicion);
    var word = vision.detectionWord(maxS);
    var stage = vision.alarmStage(maxS);
    var wordColor = ['#9fe8a9', '#ffd27a', '#ff9a5a', '#ff5a4d'][stage];
    text(ctx, 'DETECTION', px, y, 'bold 11px monospace', MUTED); y += 18;
    text(ctx, word, px, y, 'bold 22px monospace', wordColor); y += 20;
    text(ctx, 'SPOTTED ' + state.spotted + '  •  STRIKES ' + state.strikes + '/3', px, y, 'bold 12px monospace', '#ff8a7a');
    y += 20;
    var labels = ['CALM', 'UNEASY', 'HUNTED', 'ALARM'];
    var segW = (w - 32) / 4;
    for (var i = 0; i < 4; i++) {
      var on = i <= stage;
      ctx.fillStyle = on ? ['#58c96b', '#ffd27a', '#ff9a5a', '#ff5a4d'][i] : '#2a1e38';
      rr(ctx, px + i * segW + 1, y, segW - 3, 16, 3); ctx.fill();
      text(ctx, labels[i], px + i * segW + segW / 2, y + 30, '9px monospace', on ? INK : MUTED, 'center');
    }
    y += 48;

    // Visibility + noise.
    text(ctx, 'VISIBILITY', px, y, 'bold 11px monospace', MUTED);
    text(ctx, player.visibility, px + 118, y, 'bold 13px monospace', player.visibility === 'EXPOSED' ? '#ff8a7a' : '#9db4ff');
    y += 22;
    text(ctx, 'NOISE', px, y, 'bold 11px monospace', MUTED);
    text(ctx, player.noise, px + 118, y, 'bold 13px monospace', player.noise.indexOf('LOUD') === 0 ? '#ff8a7a' : INK);
    y += 22;
    text(ctx, 'SACKS', px, y, 'bold 11px monospace', MUTED);
    text(ctx, player.sacks + ' / 3', px + 118, y, 'bold 13px monospace', GOLD);
    text(ctx, 'POUCHES ' + player.pouches + ' / 3', px + 178, y, 'bold 12px monospace', INK);
    y += 22;
    text(ctx, 'GOAL', px, y, 'bold 11px monospace', MUTED);
    text(ctx, player.sacks < 3 ? 'Carry 3 sacks → EXIT' : 'All sacks! → EXIT', px + 118, y - 2, '11px monospace', INK);
    y += 14;
    ctx.fillStyle = '#2a1e38'; ctx.fillRect(px, y, w - 32, 1); y += 18;

    // Guard roster.
    text(ctx, 'GUARDS ON PATROL', px, y, 'bold 11px monospace', MUTED); y += 20;
    guards.forEach(function (g) {
      var dist = (Math.abs(g.x - player.x) / 46).toFixed(1);
      var st = window.WindmillGuard.statusWord(g, vision);
      var dot = g.state === 'ALARM' ? '#ff5a4d' : (g.state === 'PATROL' ? '#58c96b' : '#ffd27a');
      ctx.fillStyle = dot;
      ctx.beginPath(); ctx.arc(px + 6, y - 4, 5, 0, Math.PI * 2); ctx.fill();
      text(ctx, g.name, px + 18, y, 'bold 12px monospace', INK);
      text(ctx, dist + 'm', px + w - 48, y, '12px monospace', MUTED, 'right');
      y += 16;
      text(ctx, st, px + 18, y, '11px monospace', MUTED);
      var barW = 110;
      ctx.fillStyle = '#2a1e38';
      rr(ctx, px + 168, y - 9, barW, 7, 3); ctx.fill();
      ctx.fillStyle = wordColor;
      rr(ctx, px + 168, y - 9, Math.max(3, barW * g.suspicion / 100), 7, 3); ctx.fill();
      y += 24;
    });
    ctx.fillStyle = '#2a1e38'; ctx.fillRect(px, y, w - 32, 1); y += 18;

    // Legend.
    text(ctx, 'LEGEND', px, y, 'bold 11px monospace', MUTED); y += 18;
    var legend = [
      ['#2a3f8f', 'SAIL SHADOW: safe'],
      ['#ffb84d', 'LANTERN: danger'],
      ['#c9a13b', 'HAY: hide'],
      ['#58c96b', 'EXIT'],
      ['#efe2c8', 'FLOUR DUST: blocks sight']
    ];
    legend.forEach(function (row) {
      ctx.fillStyle = row[0];
      ctx.fillRect(px, y - 10, 14, 10);
      text(ctx, row[1], px + 22, y, '12px monospace', INK);
      y += 19;
    });
    y += 6;
    ctx.fillStyle = '#2a1e38'; ctx.fillRect(px, y, w - 32, 1); y += 18;

    // Controls.
    text(ctx, 'CONTROLS', px, y, 'bold 11px monospace', MUTED); y += 18;
    var controls = [
      'WASD / Arrows — move',
      'C or Down — crouch behind cover',
      'Shift — run (loud!)',
      'F — throw flour pouch',
      'Click — throw pouch at point',
      'M — mute'
    ];
    controls.forEach(function (c) {
      text(ctx, c, px, y, '12px monospace', INK);
      y += 17;
    });
    y += 8;

    // Minimap strip.
    text(ctx, 'MINIMAP', px, y, 'bold 11px monospace', MUTED); y += 8;
    var mapY = y, mapH = 58, mapW = w - 32;
    ctx.fillStyle = '#1d1428';
    rr(ctx, px, mapY, mapW, mapH, 4); ctx.fill();
    ctx.strokeStyle = '#6b4d8f'; ctx.lineWidth = 1;
    rr(ctx, px, mapY, mapW, mapH, 4); ctx.stroke();
    var sx = function (v) { return px + (v / level.PLAY_W) * mapW; };
    ctx.fillStyle = '#58c96b';
    ctx.fillRect(sx(level.EXIT_DOOR.x) - 3, mapY + 6, 6, mapH - 12);
    ctx.fillStyle = '#c9a13b';
    level.COVER.forEach(function (c) {
      ctx.fillRect(sx(c.x), mapY + mapH - 14, (c.w / level.PLAY_W) * mapW, 8);
    });
    ctx.fillStyle = GOLD;
    state.sacks.forEach(function (s) {
      if (!s.taken) { ctx.beginPath(); ctx.arc(sx(s.x), mapY + 14, 3, 0, Math.PI * 2); ctx.fill(); }
    });
    guards.forEach(function (g) {
      ctx.fillStyle = g.state === 'ALARM' ? '#ff5a4d' : '#ffb84d';
      ctx.beginPath(); ctx.arc(sx(g.x), mapY + 30, 5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#9fd0ff';
    ctx.beginPath(); ctx.arc(sx(player.x), mapY + 44, 5, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'YOU', sx(player.x), mapY + 40, '9px monospace', '#9fd0ff', 'center');
  }

  function drawObjectiveToast(ctx, state) {
    if (!state.toast) return;
    ctx.fillStyle = 'rgba(16, 10, 24, 0.85)';
    var tw = 420;
    rr(ctx, (960 - tw) / 2, 60, tw, 40, 8); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    rr(ctx, (960 - tw) / 2, 60, tw, 40, 8); ctx.stroke();
    text(ctx, state.toast, 480, 86, 'bold 15px monospace', GOLD, 'center');
  }

  function drawCaughtOverlay(ctx, state) {
    ctx.fillStyle = 'rgba(10, 4, 12, 0.72)';
    ctx.fillRect(0, 0, 960, 720);
    text(ctx, 'CAUGHT!', 480, 300, 'bold 52px Georgia, serif', '#ff5a4d', 'center');
    text(ctx, 'Miller Bram caught Tomas by the lantern light.', 480, 340, '16px monospace', INK, 'center');
    text(ctx, 'Strike ' + state.strikes + ' of 3 — press R to try the night again', 480, 372, '15px monospace', MUTED, 'center');
  }

  window.WindmillHud = {
    PANEL_X: PANEL_X, PANEL_W: PANEL_W, fmtTime: fmtTime,
    drawSails: drawSails, drawRoom: drawRoom, drawShadowPool: drawShadowPool,
    drawCover: drawCover, drawSacks: drawSacks, drawExit: drawExit,
    drawGuard: drawGuard, drawPlayer: drawPlayer, drawDust: drawDust,
    drawVictoryScene: drawVictoryScene, drawTopBar: drawTopBar,
    drawPanel: drawPanel, drawObjectiveToast: drawObjectiveToast,
    drawCaughtOverlay: drawCaughtOverlay
  };
})();
