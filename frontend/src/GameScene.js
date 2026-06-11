import Phaser from 'phaser';
import { getWorld, WORLDS, TOUCHES_PER_LEVEL, LEVEL_EASE, HIT_COOLDOWN_MS } from './worlds';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.score = 0;
    this.perfectCombo = 0;
    this.totalHits = 0;
    this.style21 = 0;          // contador de estilo (perfects) dentro de la sede
    this.worldIndex = 0;
    this.isGameOver = false;
    this.inTransition = false;
    this.feverActive = false;
    this.lastHitTime = -9999;
    this.parallaxOffset = 0;
  }

  init(data) {
    this.playerName = data.playerName;
    this.onHud = data.onHud;        // callback hacia React para el HUD
    this.onGameOver = data.onGameOver;

    // Resetear todas las variables de estado al iniciar/reiniciar la escena
    this.score = 0;
    this.perfectCombo = 0;
    this.totalHits = 0;
    this.style21 = 0;          // contador de estilo (perfects) dentro de la sede
    this.worldIndex = 0;
    this.isGameOver = false;
    this.inTransition = false;
    this.feverActive = false;
    this.lastHitTime = -9999;
    this.parallaxOffset = 0;
  }

  preload() {
    this.load.spritesheet('bibi', '/bibi_walk_transparent.png', { frameWidth: 256, frameHeight: 1024 });
    this.load.image('animated_ball', '/animated_ball.png');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);

    // ---- Fondo procedural (cielo + tribunas + cancha) ----
    this.skyGfx = this.add.graphics().setDepth(-100);
    this.fieldGfx = this.add.graphics().setDepth(-58);
    this.standTiles = [];   // capas con scroll (parallax)
    this.standObjs = [];    // todos los objetos de tribuna (para limpiar)
    this.standRegions = []; // {x, w} de cada tribuna (para flashes)

    // Emisores de partículas
    this.dustEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 50 }, angle: { min: 250, max: 290 },
      scale: { start: 0.8, end: 0 }, alpha: { start: 0.5, end: 0 },
      tint: 0x888888, lifespan: 400, emitting: false
    });

    this.sparkEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 100, max: 300 }, angle: { min: 220, max: 320 },
      scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 },
      tint: 0xFFFF00, lifespan: 500, emitting: false
    });

    this.fireEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 50, max: 150 }, scale: { start: 1.5, end: 0 },
      alpha: { start: 0.8, end: 0 }, tint: [0xFF0000, 0xFF6600, 0xFFFF00],
      lifespan: 600, emitting: false
    });
    this.fireEmitter.setDepth(1);

    this.leftGlow = this.add.rectangle(0, 0, width / 3, height, 0xFFFF00, 0.15).setOrigin(0, 0).setAlpha(0).setDepth(20);
    this.rightGlow = this.add.rectangle(width, 0, width / 3, height, 0xFFFF00, 0.15).setOrigin(1, 0).setAlpha(0).setDepth(20);

    // Geometría del CUERPO del personaje (cualquier contacto hace rebotar el balón)
    this.playerScale = 0.62;                // personaje más grande para que el pie alcance el balón
    this.bodyHalf = 82;                     // medio ancho del cuerpo (rebote)
    this.bodyTopOffset = -95;               // cabeza (relativo a player.y)
    this.bodyBottomOffset = 120;            // piernas/pie (relativo a player.y)
    this.footOffset = 75;                   // PERFECT hacia el lado que camina
    this.fieldH = 130;                      // alto de la franja de césped
    this.prevBallY = 0;

    // Línea de césped donde se pierde el balón (coincide con el campo visual)
    this.fieldTopY = height - this.fieldH;
    this.ground = this.physics.add.staticGroup();
    this.groundRect = this.add.rectangle(width / 2, this.fieldTopY + 12, width, 24, 0x000000, 0);
    this.physics.add.existing(this.groundRect, true);
    this.ground.add(this.groundRect);

    // El personaje vive ABAJO (sobre el césped) para aprovechar todo el alto al rebotar
    const baseY = this.playerBaseY();

    // Sombra "PERFECT": silueta del personaje hacia el lado que camina (indicador del pie)
    this.perfectGhost = this.add.sprite(width / 2, baseY, 'bibi').setScale(this.playerScale);
    this.perfectGhost.setTint(0x000000).setAlpha(0.22).setDepth(2);

    this.player = this.physics.add.sprite(width / 2, baseY, 'bibi');
    this.player.setCollideWorldBounds(false);
    this.physics.world.setBounds(0, 0, width, height);
    this.player.setScale(this.playerScale);
    this.player.setDepth(3);
    this.player.setImmovable(true);
    this.player.body.allowGravity = false;

    // Reflow al cambiar el tamaño del lienzo (móvil: barra de URL que aparece/desaparece)
    this.scale.on('resize', this.relayout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.relayout, this));

    this.ballShadow = this.add.graphics();

    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('bibi', { start: 0, end: 3 }),
      frameRate: 12,
      repeat: -1
    });

    // Recorte circular del balón
    const srcImg = this.textures.get('animated_ball').getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = 60; canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.arc(30, 30, 29, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(srcImg, 0, 0, srcImg.width, srcImg.height, 0, 0, 60, 60);
    this.textures.addCanvas('ball_texture', canvas);

    this.ball = this.physics.add.sprite(width / 2, 50, 'ball_texture');
    this.ball.setCircle(28, 2, 2);
    this.ball.setBounce(1, 1); // Rebote 100% elástico (ideal contra las paredes)
    this.ball.setCollideWorldBounds(true);
    this.ball.setAngularDrag(150);

    this.physics.add.collider(this.ball, this.ground, this.handleDrop, null, this);
    // El toque balón-jugador se detecta manualmente en update() (línea de golpeo)
    this.prevBallY = this.ball.y;

    // Construir la primera sede (con entrada animada) y arrancar el nivel
    this.buildWorld(true);
    this.startLevel();

    // Pausar la física hasta que el usuario cierre el tutorial o reanudar de inmediato si ya fue clickeado
    if (window.phaserGameReadyToStart) {
      this.startPhysics();
    } else {
      this.physics.world.pause();
    }

    // Tick del HUD (temporizador)
    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        if (!this.isGameOver && !this.inTransition) this.updateHud();
      }
    });

    // Destellos de cámara del público (inmersión)
    this.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        for (let i = 0; i < Phaser.Math.Between(1, 3); i++) this.spawnCrowdFlash();
      }
    });

    // Habilitar controles de teclado (Flechas y A/D)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Registrar inicialización local
    this.updateHud();
  }

  // Y base del personaje: justo encima del césped (parte inferior de la pantalla)
  playerBaseY() {
    return this.fieldTopY - 40;
  }

  // Reflow cuando cambia el tamaño del lienzo (móvil: barra de URL, rotación, etc.)
  relayout() {
    const width = this.scale.width;
    const height = this.scale.height;
    if (!width || !height) return;

    this.fieldTopY = height - this.fieldH;
    this.physics.world.setBounds(0, 0, width, height);

    // Suelo (límite de césped) reposicionado + cuerpo físico estático actualizado
    if (this.groundRect) {
      this.groundRect.setPosition(width / 2, this.fieldTopY + 12);
      this.groundRect.setSize(width, 24);
      if (this.groundRect.body) this.groundRect.body.updateFromGameObject();
    }

    // Personaje y su sombra anclados ABAJO (aprovecha todo el alto para rebotar)
    const baseY = this.playerBaseY();
    if (this.player) this.player.y = baseY;
    if (this.perfectGhost) this.perfectGhost.y = baseY;

    // Resplandores laterales a alto completo
    if (this.leftGlow) this.leftGlow.setSize(width / 3, height);
    if (this.rightGlow) { this.rightGlow.setPosition(width, 0); this.rightGlow.setSize(width / 3, height); }

    // Redibujar fondo (cielo, césped, tribunas) al nuevo tamaño (sin animación de entrada)
    if (this.world) this.buildWorld(false);
  }

  // ===================== MUNDOS / SEDES =====================
  buildWorld(animate = true) {
    const width = this.scale.width;
    const height = this.scale.height;
    this.world = getWorld(this.worldIndex);
    const w = this.world;

    // Cielo (degradado por sede)
    this.skyGfx.clear();
    this.skyGfx.fillGradientStyle(w.skyTop, w.skyTop, w.skyBottom, w.skyBottom, 1);
    this.skyGfx.fillRect(0, 0, width, height);

    // Cancha inferior (usa fieldTopY/fieldH para mantenerse anclada abajo en cualquier alto)
    const fieldTopY = this.fieldTopY;
    this.fieldGfx.clear();
    this.fieldGfx.fillStyle(w.fieldColor, 1);
    this.fieldGfx.fillRect(0, fieldTopY, width, this.fieldH);
    this.fieldGfx.fillStyle(0x000000, 0.15);
    this.fieldGfx.fillRect(0, fieldTopY, width, 10);

    this.buildStands(w, animate);
    this.updateHud();
  }

  // Convierte 0xRRGGBB a string css
  hex(c) { return '#' + c.toString(16).padStart(6, '0'); }

  // Genera una textura de público (tileable verticalmente) para hacer scroll fluido
  makeCrowdTexture(key, world, w, dense = true) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const tileH = 260;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = tileH;
    const ctx = canvas.getContext('2d');

    // Base de hormigón con sombreado lateral (profundidad hacia el interior)
    ctx.fillStyle = this.hex(world.standColor);
    ctx.fillRect(0, 0, w, tileH);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.45)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, tileH);

    // Paleta de camisetas (público) con acento de la sede
    const shirts = [0xffffff, world.standAccent, 0xff4d4d, 0x3aa0ff, 0x222222, 0xcccccc, 0x33cc66, 0xffae00];
    const skins = ['#f0c8a0', '#d9a066', '#8d5524', '#ffe0bd'];

    const rowH = 26;                 // espaciado de filas (260/26 = 10 filas exactas => tileable)
    const seatStep = dense ? 13 : 18;
    for (let y = rowH; y <= tileH; y += rowH) {
      // Escalón de grada (sombra + borde acento)
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, y - 4, w, 4);
      ctx.fillStyle = this.hex(world.standAccent);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, y - 5, w, 1.5);
      ctx.globalAlpha = 1;

      // Público de la fila
      for (let x = 6; x < w - 4; x += seatStep) {
        const jx = x + Phaser.Math.Between(-2, 2);
        const bodyY = y - rowH + 8 + Phaser.Math.Between(-1, 1);
        const shirt = Phaser.Utils.Array.GetRandom(shirts);
        // Cuerpo (camiseta)
        ctx.fillStyle = this.hex(shirt);
        this.roundRect(ctx, jx - 4, bodyY + 4, 9, 9, 2);
        ctx.fill();
        // Cabeza
        ctx.fillStyle = Phaser.Utils.Array.GetRandom(skins);
        ctx.beginPath();
        ctx.arc(jx, bodyY + 2, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.textures.addCanvas(key, canvas);
    return key;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Tribunas laterales: 2 capas de scroll (parallax) + barandilla + entrada animada
  buildStands(world, animate = true) {
    const height = this.scale.height;
    const width = this.scale.width;
    const standW = Math.max(120, width * 0.17);

    // Limpiar tribunas previas
    if (this.standObjs) this.standObjs.forEach((o) => o.destroy());
    this.standTiles = [];
    this.standObjs = [];
    this.standRegions = [];

    // Texturas (capa lejana menos densa, capa cercana densa)
    const backKey = this.makeCrowdTexture(`crowd_back_${this.worldIndex}`, world, Math.round(standW), false);
    const frontKey = this.makeCrowdTexture(`crowd_front_${this.worldIndex}`, world, Math.round(standW), true);

    [0, 1].forEach((side) => {
      const isLeft = side === 0;
      const x = isLeft ? 0 : width - standW;
      this.standRegions.push({ x, w: standW });

      // Capa lejana (parte superior, más oscura, scroll lento)
      const back = this.add.tileSprite(x, 0, standW, height, backKey).setOrigin(0, 0).setDepth(-82);
      back.setTint(0x777777);
      back.setAlpha(0.85);
      back.scrollSpeed = world.parallaxSpeed * 1.2;

      // Capa cercana (público brillante, scroll rápido)
      const front = this.add.tileSprite(x, 0, standW, height, frontKey).setOrigin(0, 0).setDepth(-74);
      front.scrollSpeed = world.parallaxSpeed * 2.4;

      // Sombra de profundidad hacia el campo + viñeta superior
      const shade = this.add.graphics().setDepth(-72);
      const innerX = isLeft ? standW : x;
      shade.fillStyle(0x000000, 0.0);
      // gradiente vertical (oscurece arriba para dar "techo")
      shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
      shade.fillRect(x, 0, standW, height * 0.35);

      // Barandilla/valla luminosa en el borde interior
      const railColor = world.standAccent;
      const rail = this.add.rectangle(innerX, 0, 7, height, railColor, 0.95).setOrigin(0.5, 0).setDepth(-70);
      const railGlow = this.add.rectangle(innerX, 0, 22, height, railColor, 0.18).setOrigin(0.5, 0).setDepth(-71);

      this.standTiles.push(back, front);
      this.standObjs.push(back, front, shade, rail, railGlow);

      // Entrada animada: la tribuna "crece" desde el muro exterior hacia el campo
      if (animate) {
        [back, front].forEach((o) => {
          if (!isLeft) { o.setOrigin(1, 0); o.x = width; }
          o.scaleX = 0;
        });
        this.tweens.add({
          targets: [back, front],
          scaleX: 1,
          ease: 'Cubic.Out',
          duration: 650,
          delay: side * 120,
        });
        shade.alpha = 0;
        this.tweens.add({ targets: shade, alpha: 1, duration: 500, delay: 250 + side * 120 });
        [rail, railGlow].forEach((o) => {
          const targetAlpha = o === rail ? 0.95 : 0.18;
          o.alpha = 0; o.scaleY = 0;
          this.tweens.add({ targets: o, alpha: targetAlpha, scaleY: 1, ease: 'Back.Out', duration: 500, delay: 350 + side * 120 });
        });
      }
    });
  }

  // Destellos de cámara que recorren las tribunas (inmersión)
  spawnCrowdFlash() {
    if (this.isGameOver || !this.standRegions || this.standRegions.length === 0) return;
    const region = Phaser.Utils.Array.GetRandom(this.standRegions);
    const fx = region.x + Phaser.Math.Between(8, region.w - 8);
    const fy = Phaser.Math.Between(20, this.scale.height * 0.6);
    const flash = this.add.circle(fx, fy, Phaser.Math.Between(2, 4), 0xffffff, 1).setDepth(-69);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.4,
      duration: Phaser.Math.Between(180, 420),
      onComplete: () => flash.destroy()
    });
  }

  startPhysics() {
    this.isGameOver = false;
    this.physics.world.resume();
  }

  startLevel() {
    this.inTransition = false;
    this.ball.clearTint();
    this.ball.setVelocity(0, 0);
    this.ball.setGravityY(this.world.gravityBase);
    // El balón aparece a la MISMA altura (apex) que alcanza tras un rebote normal,
    // para que la primera caída se sienta igual que las siguientes dominadas.
    const contactY = this.playerBaseY() + this.bodyTopOffset;
    const spawnY = Math.max(70, contactY - this.scale.height * 0.40);
    this.ball.setPosition(this.scale.width / 2, spawnY);
    this.physics.world.resume();
    this.updateHud();
  }

  // ===================== UPDATE =====================
  update(time) {
    if (this.isGameOver || this.inTransition) return;
    const width = this.scale.width;
    const height = this.scale.height;

    // Progreso del nivel = toques hacia los 21 (la dificultad BAJA conforme avanza)
    this.levelProgress = this.style21 / TOUCHES_PER_LEVEL;

    // Parallax: tribunas desplazándose (sensación de avance). El público "pasa" hacia el jugador.
    const speedMul = 1 + (this.levelProgress || 0) * 0.5;
    if (this.standTiles) {
      this.standTiles.forEach((t) => {
        t.tilePositionY -= (t.scrollSpeed || 1) * speedMul;
      });
    }

    if (this.ball && this.fireEmitter.on) {
      this.fireEmitter.setPosition(this.ball.x, this.ball.y);
    }

    const pointer = this.input.activePointer;
    const leftPressed = (this.cursors && this.cursors.left.isDown) || (this.keys && this.keys.a.isDown);
    const rightPressed = (this.cursors && this.cursors.right.isDown) || (this.keys && this.keys.d.isDown);

    if (pointer.isDown || leftPressed || rightPressed) {
      if ((pointer.isDown && pointer.x < width / 2) || leftPressed) {
        this.leftGlow.setAlpha(1); this.rightGlow.setAlpha(0);
        this.player.setVelocityX(-400); this.player.flipX = true;
      } else {
        this.leftGlow.setAlpha(0); this.rightGlow.setAlpha(1);
        this.player.setVelocityX(400); this.player.flipX = false;
      }
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim.key !== 'walk') {
        this.player.play('walk');
      }
      this.dustEmitter.setPosition(this.player.x, this.player.y + 200);
      this.dustEmitter.emitParticle(1);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.stop();
      this.player.setFrame(0);
      this.leftGlow.setAlpha(this.leftGlow.alpha * 0.8);
      this.rightGlow.setAlpha(this.rightGlow.alpha * 0.8);
    }

    // Clamp manual de la posición del jugador para evitar que quede atrapado o salga de la pantalla
    const margin = this.bodyHalf;
    if (this.player.x < margin) {
      this.player.x = margin;
      if (this.player.body.velocity.x < 0) {
        this.player.setVelocityX(0);
      }
    } else if (this.player.x > width - margin) {
      this.player.x = width - margin;
      if (this.player.body.velocity.x > 0) {
        this.player.setVelocityX(0);
      }
    }

    // TOQUE: el balón rebota al tocar CUALQUIER parte del personaje (cabeza→piernas)
    if (this.ball && this.ball.body) {
      const descending = this.ball.body.velocity.y > 0;
      const onCooldown = (this.time.now - this.lastHitTime) < HIT_COOLDOWN_MS;
      const dx = this.ball.x - this.player.x;
      const topY = this.player.y + this.bodyTopOffset;
      const botY = this.player.y + this.bodyBottomOffset;
      const withinX = Math.abs(dx) <= this.bodyHalf + 28;   // + radio del balón
      const withinY = this.ball.y >= topY && this.ball.y <= botY;
      if (descending && withinX && withinY && !onCooldown) {
        this.catchBall(dx);
      }
      this.prevBallY = this.ball.y;
    }

    // Sombra PERFECT (silueta hacia el lado que camina)
    this.updatePerfectShadow();

    // Sombra del balón
    if (this.ball && this.ballShadow) {
      this.ballShadow.clear();
      const groundY = this.fieldTopY;
      const distance = groundY - this.ball.y;
      if (distance > 0 && this.ball.y < groundY) {
        const shadowAlpha = Phaser.Math.Clamp(1 - distance / 600, 0.4, 0.9);
        const shadowScale = Phaser.Math.Clamp(1 - distance / 800, 0.6, 1.8);
        this.ballShadow.fillStyle(0x000000, shadowAlpha);
        this.ballShadow.fillEllipse(this.ball.x, groundY, 70 * shadowScale, 20 * shadowScale);
      }
    }
  }

  // Centro X del pie PERFECT, hacia el lado que camina el jugador
  perfectFootX() {
    const facing = this.player.flipX ? -1 : 1;
    return this.player.x + facing * this.footOffset;
  }

  // Actualiza la sombra "PERFECT" (silueta del personaje hacia el lado que camina)
  updatePerfectShadow() {
    if (!this.perfectGhost || !this.player || !this.world) return;
    const facing = this.player.flipX ? -1 : 1;
    const gx = this.perfectFootX();

    this.perfectGhost.setPosition(gx, this.player.y);
    this.perfectGhost.setScale(this.playerScale * facing, this.playerScale); // refleja hacia el lado que camina
    this.perfectGhost.setFrame(this.player.frame.name);                       // mismo gesto que el jugador

    // Resaltar en verde cuando el balón viene bajando alineado con el pie
    const dx = this.ball.x - gx;
    const inY = this.ball.y > this.player.y + this.bodyTopOffset - 60
      && this.ball.y < this.player.y + this.bodyBottomOffset;
    const aligned = this.ball.body && this.ball.body.velocity.y > 0
      && inY && Math.abs(dx) < this.world.perfectWindow;
    this.perfectGhost.setTint(aligned ? 0x00FF66 : 0x000000);
    this.perfectGhost.setAlpha(aligned ? 0.55 : 0.22);
  }

  // ===================== GOLPEO (contacto con el cuerpo del personaje) =====================
  // dx = distancia horizontal del balón respecto al jugador (ya validado dentro del cuerpo)
  catchBall(dx) {
    this.lastHitTime = this.time.now;
    const ball = this.ball;
    const player = this.player;
    const facing = player.flipX ? -1 : 1;   // lado hacia donde camina (donde está el pie)
    const footX = this.perfectFootX();

    // PERFECT = el balón pega en el PIE (la sombra), hacia el lado que camina.
    // Cabeza/centro/cuerpo = NORMAL (igual rebota).
    // El margen de error se achica brutalmente por nivel y por dominada
    const levelDiff = this.worldIndex;
    const progress = Math.min(1, (this.style21 + 1) / TOUCHES_PER_LEVEL);
    const currentPerfectWindow = Math.max(6, this.world.perfectWindow - (levelDiff * 8) - (progress * 10));
    const isPerfect = Math.abs(ball.x - footX) < currentPerfectWindow;
    const hitX = ball.x;
    const hitY = ball.y;

    // Cada toque (perfect o normal) cuenta hacia los 21 dominadas
    this.totalHits++;
    this.style21 += 1;
    this.doKick(facing, isPerfect);

    if (isPerfect) {
      this.perfectCombo++;
    } else {
      this.perfectCombo = 0;
      if (this.feverActive) { this.fireEmitter.stop(); this.feverActive = false; }
    }

    const isFever = this.perfectCombo >= 5;
    const justEnteredFever = isPerfect && this.perfectCombo === 5 && !this.feverActive;
    if (isFever) {
      this.feverActive = true;
      if (!this.fireEmitter.on) this.fireEmitter.start();
    }
    if (justEnteredFever) this.triggerFever();

    const multiplier = isFever ? this.perfectCombo : 1;
    this.score += (isPerfect ? 2 : 1) * multiplier;

    // Dificultad CRECIENTE dentro del nivel: la gravedad sube en CADA dominada
    const gravity = this.world.gravityBase * (1 + LEVEL_EASE * progress);
    ball.setGravityY(gravity);

    // Rebote de ALTURA CONSTANTE por sede, vuelve a ser alto para aprovechar el espacio,
    // ya que la verdadera dificultad ahora será la velocidad HORIZONTAL.
    const totalG = this.physics.world.gravity.y + gravity;
    const baseApex = Math.max(0.35, 0.40 - (levelDiff * 0.02) - (progress * 0.02));
    const targetApex = this.scale.height * (isPerfect ? baseApex + 0.04 : baseApex);
    const bounceY = -Math.sqrt(2 * totalG * targetApex);
    ball.setVelocityY(bounceY);

    // Dirección horizontal: El verdadero desafío. Angulos cada vez más abiertos y rápidos.
    const chaosMultiplier = (1 + progress * 1.5) * (1 + levelDiff * 0.8); // Multiplicador gigante en niveles altos
    const chaos = this.world.lateralChaos * chaosMultiplier;
    
    let horiz;
    if (isPerfect) {
      // Incluso los "Perfect" en niveles altos te hacen moverte un poco
      const basePerfect = Phaser.Math.Between(60, 150);
      horiz = -Math.sign(dx || 1) * (basePerfect + (levelDiff * 50));
    } else {
      // Si fallas el perfect, el desvío es EXTREMO hacia los lados
      const lateralPush = dx * 4; 
      horiz = Phaser.Math.Clamp(lateralPush, -chaos, chaos) + Phaser.Math.Between(-100, 100);
      // Forzar que el error se pague con un sprint
      if (Math.abs(horiz) < 200 * (levelDiff + 1)) {
          horiz = Math.sign(horiz || 1) * (200 + Phaser.Math.Between(50, 150) * levelDiff);
      }
    }
    ball.setVelocityX(horiz);

    // Rotación más agresiva con el nivel y CADA dominada
    const spinDirection = dx > 0 ? 1 : -1;
    ball.setAngularVelocity(isPerfect ? spinDirection * (800 + levelDiff * 100 + progress * 200) : spinDirection * (400 + levelDiff * 50 + progress * 100));

    if (isPerfect) {
      this.cameras.main.shake(110, 0.011);
      this.sparkEmitter.explode(15, hitX, hitY);
      this.showFloatingText('PERFECT!', hitX, hitY - 40, '#00FF66', multiplier);
    } else {
      this.showFloatingText('+1', hitX, hitY - 40, '#FFFFFF', 1);
    }

    this.updateHud();

    // ¡21 toques! → cambio de sede INSTANTÁNEO
    if (this.style21 >= TOUCHES_PER_LEVEL) {
      this.levelUp();
    }
  }

  // Animación clara de "subir el pie y patear": estirón + inclinación hacia el balón
  doKick(facing, isPerfect = false) {
    const s = this.playerScale;
    this.tweens.killTweensOf(this.player);
    this.player.setAngle(0);
    this.player.setScale(s);
    const tilt = facing * (isPerfect ? 24 : 14);
    this.tweens.add({
      targets: this.player,
      angle: tilt,
      scaleX: s * 0.9,
      scaleY: s * 1.18,   // estirón hacia arriba (gesto de patear)
      duration: 120,
      yoyo: true,
      ease: 'Back.Out',
      onComplete: () => { this.player.setAngle(0); this.player.setScale(s); }
    });
    // Destello en el punto de contacto del balón
    const kickFlash = this.add.circle(this.ball.x, this.ball.y, isPerfect ? 26 : 16, isPerfect ? 0x00FF66 : 0xFFFFFF, 0.7).setDepth(6);
    this.tweens.add({ targets: kickFlash, scale: 2, alpha: 0, duration: 220, onComplete: () => kickFlash.destroy() });
  }

  // Momento "WOW": al lograr 3 PERFECT seguidos todo explota a máximo furor
  triggerFever() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.flash(280, 240, 185, 11);
    this.cameras.main.shake(280, 0.02);

    // Explosión de chispas grande
    this.sparkEmitter.explode(60, this.player.x, this.player.y - 20);
    // Ráfaga de flashes del público (la grada enloquece)
    for (let i = 0; i < 14; i++) this.spawnCrowdFlash();

    // Onda expansiva
    const ring = this.add.circle(this.player.x, this.player.y, 20, 0xF0B90B, 0.0).setStrokeStyle(6, 0xF0B90B, 0.9).setDepth(35);
    this.tweens.add({ targets: ring, scale: 12, alpha: 0, duration: 500, ease: 'Cubic.Out', onComplete: () => ring.destroy() });

    // Texto grandote
    const t = this.add.text(width / 2, height * 0.4, '🔥 ¡FIEBRE! 🔥\n¡TODO AL MÁXIMO!', {
      fontFamily: 'Montserrat', fontSize: '42px', color: '#F0B90B', align: 'center', fontStyle: 'italic', stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5).setDepth(45).setScale(0);
    this.tweens.add({
      targets: t, scale: 1, duration: 350, ease: 'Back.Out',
      onComplete: () => this.tweens.add({ targets: t, alpha: 0, scale: 1.3, delay: 600, duration: 400, onComplete: () => t.destroy() })
    });
  }

  showFloatingText(msg, x, y, color, multiplier) {
    const finalMsg = multiplier > 1 ? `${msg} x${multiplier}` : msg;
    const fontSize = multiplier > 2 ? '42px' : '32px';
    const text = this.add.text(x, y, finalMsg, {
      fontSize, fill: color, fontFamily: 'Arial Black', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: text, y: y - 120, alpha: 0, duration: 800, ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  // ===================== CAMBIO DE SEDE INSTANTÁNEO =====================
  levelUp() {
    const width = this.scale.width;

    // El mundo cambia al instante (sin pausar la física: el balón sigue en juego)
    this.worldIndex++;
    this.perfectCombo = 0;
    this.style21 = 0;
    this.feverActive = false;
    this.fireEmitter.stop();

    // Flash rápido + reconstrucción de la sede con tribunas animadas
    this.cameras.main.flash(220, 240, 185, 11);
    this.buildWorld(true);

    // Empujón del balón hacia arriba para mantener el ritmo (mismo apex que un rebote normal)
    const totalG = this.physics.world.gravity.y + this.world.gravityBase;
    this.ball.setVelocityY(-Math.sqrt(2 * totalG * this.scale.height * 0.40));

    // Aviso breve de la nueva sede (no detiene el juego)
    const banner = this.add.text(width / 2, this.scale.height * 0.32,
      `${this.world.bandera} SEDE ${this.worldIndex + 1}\n${this.world.ciudad}`, {
        fontFamily: 'Montserrat', fontSize: '30px', color: '#F0B90B', align: 'center', fontStyle: 'italic', stroke: '#000000', strokeThickness: 6
      }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: banner, alpha: 0, y: banner.y - 40, duration: 1200, ease: 'Quad.Out', onComplete: () => banner.destroy() });

    this.updateHud();
  }

  // ===================== GAME OVER =====================
  handleDrop() {
    if (this.isGameOver || this.inTransition) return;
    this.isGameOver = true;
    this.physics.world.pause();
    this.player.anims.stop();
    this.fireEmitter.stop();
    this.ball.setTint(0xff0000);

    const finalWorld = getWorld(this.worldIndex);
    this.updateHud();
    if (this.onGameOver) {
      this.onGameOver({ score: this.score, worldIndex: this.worldIndex, ciudad: finalWorld.ciudad, estadio: finalWorld.estadio });
    }
  }

  updateHud() {
    if (!this.onHud || !this.world) return;
    this.onHud({
      score: this.score,
      ciudad: this.world.ciudad,
      estadio: this.world.estadio,
      bandera: this.world.bandera,
      worldNumber: this.worldIndex + 1,
      totalWorlds: WORLDS.length,
      touches: this.style21,
      goal: TOUCHES_PER_LEVEL,
      combo: this.perfectCombo,
    });
  }
}
