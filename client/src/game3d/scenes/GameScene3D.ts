import * as THREE from 'three';
import { IsometricCamera } from '../core/IsometricCamera';
import { Physics3D } from '../core/Physics3D';
import { KitchenMap3D, Counter3DData } from '../environment/KitchenMap3D';
import { ChefCharacter3D, ChefSkinId } from '../entities/ChefCharacter3D';
import { Ingredient3DFactory, ThrownItem3D } from '../entities/Ingredient3D';
import { ParticleSystem3D } from '../vfx/ParticleSystem3D';
import { HUDOverlay3D } from '../ui/HUDOverlay3D';
import { RecipeManager } from '../../game/recipes/RecipeManager';
import { SoundManager } from '../../game/systems/SoundManager';
import { NetworkManager } from '../../multiplayer/NetworkManager';
import { CounterType, IngredientType, KitchenItem, StoveState } from '../../game/types';

export interface GameScene3DConfig {
  isMultiplayer: boolean;
  roomCode?: string;
  mapId?: string;
  skin?: string;
  playerName?: string;
  onExit: () => void;
}

export class GameScene3D {
  private config: GameScene3DConfig;
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private cameraSystem!: IsometricCamera;
  private physics!: Physics3D;
  private map!: KitchenMap3D;
  private particles!: ParticleSystem3D;
  private hud!: HUDOverlay3D;

  private recipeManager!: RecipeManager;
  private sound = SoundManager.getInstance();
  private network = NetworkManager.getInstance();

  // Local Player
  private localPlayer!: ChefCharacter3D;
  private playerPos = { x: 0, z: 0 };
  private facingDir = { x: 0, z: 1 };
  private playerSpeed = 4.8;
  private heldItem: KitchenItem | null = null;
  private heldItemMesh: THREE.Group | null = null;

  // Dash System
  private isDashing = false;
  private dashTimer = 0;
  private readonly dashDuration = 0.28; // 280ms
  private readonly dashCooldown = 1.6; // 1.6s cooldown
  private dashCooldownTimer = 0;
  private readonly dashSpeedMultiplier = 2.2;
  private dashDirection = { x: 0, z: 1 };
  private dashParticleTimer = 0;

  // Remote Players
  private remotePlayers = new Map<string, { chef: ChefCharacter3D; targetX: number; targetZ: number; heldMesh?: THREE.Group }>();

  // Thrown Items in Flight
  private thrownItems: ThrownItem3D[] = [];

  // Active facing counter highlight
  private targetCounterHighlight!: THREE.Mesh;
  private currentFacingCounter: Counter3DData | null = null;

  // Game Loop & Match Timer
  private isRunning = false;
  private lastTime = 0;
  private matchTimeRemaining = 180;
  private isGameOver = false;
  private lastNetworkSendTime = 0;

  // Keyboard state
  private keys: { [key: string]: boolean } = {};

  constructor(container: HTMLElement, config: GameScene3DConfig) {
    this.container = container;
    this.config = config;

    this.initThree();
    this.initGame();
    this.setupInputs();

    if (this.config.isMultiplayer && this.network.room) {
      this.setupMultiplayerSync();
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.renderLoop.bind(this));
  }

  private initThree() {
    this.scene = new THREE.Scene();
    // Warm Cozy Restaurant Ambiance (No stark pitch black void)
    this.scene.background = new THREE.Color(0x182030);

    // High quality WebGL Renderer with Soft Cartoon Shadows
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    // Overcooked 2 Front-Facing Top-Down Oblique Camera with Auto-Framing
    this.cameraSystem = new IsometricCamera(window.innerWidth / window.innerHeight);

    // 1. Warm Cartoon Hemisphere Light (Peach Sky + Soft Slate Ground)
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x475569, 0.85);
    this.scene.add(hemiLight);

    // 2. Main Key Sun Light (Casts soft directional shadows)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
    sunLight.position.set(5, 14, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 35;
    sunLight.shadow.camera.left = -8;
    sunLight.shadow.camera.right = 8;
    sunLight.shadow.camera.top = 7;
    sunLight.shadow.camera.bottom = -7;
    sunLight.shadow.bias = -0.0003;
    this.scene.add(sunLight);

    // 3. Warm Ambient Fill
    const ambientLight = new THREE.AmbientLight(0xfffbeb, 0.4);
    this.scene.add(ambientLight);

    // 4. Cool Rim Light from Back for Cartoon Silhouettes
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.4);
    rimLight.position.set(-6, 9, -7);
    this.scene.add(rimLight);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private initGame() {
    this.physics = new Physics3D();
    this.map = new KitchenMap3D(this.scene, this.physics);
    this.map.buildMap(this.config.mapId || 'traditional');

    this.particles = new ParticleSystem3D(this.scene);
    this.recipeManager = new RecipeManager();

    // Spawn local chef in kitchen open area
    const skinId = (this.config.skin || 'chef_classic') as ChefSkinId;
    const name = this.config.playerName || 'Đầu Bếp';
    this.localPlayer = new ChefCharacter3D(skinId, name, !this.config.isMultiplayer || this.network.isHost);
    this.playerPos = { x: 0, z: 1.0 };
    this.localPlayer.group.position.set(this.playerPos.x, 0, this.playerPos.z);
    this.scene.add(this.localPlayer.group);

    // Highlight ring indicator for facing counter
    const ringGeo = new THREE.RingGeometry(0.35, 0.45, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    this.targetCounterHighlight = new THREE.Mesh(ringGeo, ringMat);
    this.targetCounterHighlight.rotation.x = -Math.PI / 2;
    this.targetCounterHighlight.position.y = 0.88;
    this.targetCounterHighlight.visible = false;
    this.scene.add(this.targetCounterHighlight);

    // Initialize HUD Overlay with Overcooked Top Ticker & Screenshot support
    this.hud = new HUDOverlay3D(
      () => {
        this.destroy();
        this.config.onExit();
      },
      () => {
        this.takeScreenshot();
      }
    );

    this.hud.updateOrders(this.recipeManager.getOrders());
  }

  private setupInputs() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys[e.code] = true;
      this.sound.init(); // Initialize audio on first keypress

      if (e.code === 'KeyE') this.handlePickupDrop();
      if (e.code === 'KeyQ') this.handleThrow();
      if (e.code === 'KeyP') this.takeScreenshot();
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') this.handleDash();
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    });
  }

  private setupMultiplayerSync() {
    const room = this.network.room!;

    // 1. Remote player movement & skin
    room.onMessage('remote_player_move', (data: any) => {
      if (data.id === this.network.mySessionId) return;

      let r = this.remotePlayers.get(data.id);
      if (!r) {
        const chef = new ChefCharacter3D((data.skin || 'chef_classic') as ChefSkinId, data.name, false);
        this.scene.add(chef.group);
        r = { chef, targetX: data.x, targetZ: data.y };
        this.remotePlayers.set(data.id, r);
      }

      r.targetX = data.x;
      r.targetZ = data.y;
      if (data.facingX !== undefined && data.facingZ !== undefined) {
        const angle = Math.atan2(data.facingX, data.facingZ);
        r.chef.setRotation(angle);
      }
    });

    // 2. Remote held item update
    room.onMessage('remote_held_update', (data: { id: string; item: KitchenItem | null }) => {
      if (data.id === this.network.mySessionId) return;
      const r = this.remotePlayers.get(data.id);
      if (!r) return;

      r.chef.isHoldingItem = (data.item !== null);

      if (r.heldMesh) {
        r.chef.handAnchor.remove(r.heldMesh);
        r.heldMesh = undefined;
      }

      if (data.item) {
        r.heldMesh = Ingredient3DFactory.createMesh(data.item);
        r.heldMesh.position.set(0, 0, 0);
        r.chef.handAnchor.add(r.heldMesh);
      }
    });

    // Remote player dash broadcast
    room.onMessage('remote_player_dash', (data: { id: string; dirX: number; dirZ: number; duration: number }) => {
      const r = this.remotePlayers.get(data.id);
      if (r) {
        r.chef.triggerDash(data.duration || 0.28);
        this.sound.playDash();
        this.particles.emitDashDust(r.chef.group.position.x, 0, r.chef.group.position.z, data.dirX, data.dirZ);
      }
    });

    // 3. Remote counter update
    room.onMessage('remote_counter_update', (data: { id: string; item: KitchenItem | null; stoveState?: StoveState }) => {
      const counter = this.map.counters.get(data.id);
      if (!counter) return;

      counter.itemHolder.clear();
      counter.currentItem = data.item;

      if (data.item) {
        const mesh = Ingredient3DFactory.createMesh(data.item);
        counter.itemHolder.add(mesh);
      }
    });

    // 4. Remote thrown item
    room.onMessage('remote_throw_item', (data: { item: KitchenItem; fromX: number; fromZ: number; toX: number; toZ: number }) => {
      const thrown = new ThrownItem3D(data.item, data.fromX, data.fromZ, data.toX, data.toZ);
      this.thrownItems.push(thrown);
      this.scene.add(thrown.mesh);
      this.sound.playThrow();
    });

    // 5. Score & orders sync from host
    room.onMessage('remote_score_update', (data: { score: number; combo: number }) => {
      this.recipeManager.score = data.score;
      this.recipeManager.combo = data.combo;
    });

    room.onMessage('remote_orders_update', (data: { orders: any[] }) => {
      this.hud.updateOrders(data.orders);
    });
  }

  private renderLoop(currentTime: number) {
    if (!this.isRunning) return;

    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(delta);
    this.renderer.render(this.scene, this.cameraSystem.camera);

    requestAnimationFrame(this.renderLoop.bind(this));
  }

  private update(delta: number) {
    if (this.isGameOver) return;

    // 1. Match Timer Countdown
    this.matchTimeRemaining -= delta;
    if (this.matchTimeRemaining <= 0) {
      this.matchTimeRemaining = 0;
      this.isGameOver = true;
      this.hud.showGameOver(this.recipeManager.score);
    }

    // 2. Recipe Orders update
    const orderResult = this.recipeManager.update(delta);
    this.hud.updateScoreAndTimer(this.recipeManager.score, this.recipeManager.combo, this.matchTimeRemaining);
    this.hud.updateOrders(this.recipeManager.getOrders());

    // Dash Cooldown Update
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= delta;
      if (this.dashCooldownTimer < 0) this.dashCooldownTimer = 0;
    }
    this.hud.updateDashCooldown(this.dashCooldownTimer, this.dashCooldown);

    // 3. Local Player Movement & Physics
    this.handleMovement(delta);

    // 4. Stoves & Chopping Logic
    this.updateKitchenSimulation(delta);

    // 5. Thrown items in flight
    for (let i = this.thrownItems.length - 1; i >= 0; i--) {
      const item = this.thrownItems[i];
      const done = item.update(delta);
      if (done) {
        this.scene.remove(item.mesh);
        this.thrownItems.splice(i, 1);
        this.particles.emitChopCrumbs(item.targetX, 0.88, item.targetZ);
      }
    }

    // 6. VFX & Particles
    this.particles.update(delta);

    // 7. Remote Players interpolation
    this.remotePlayers.forEach(r => {
      const dx = r.targetX - r.chef.group.position.x;
      const dz = r.targetZ - r.chef.group.position.z;
      const dist = Math.hypot(dx, dz);
      const isMoving = dist > 0.05;

      r.chef.group.position.x += dx * Math.min(1, delta * 12);
      r.chef.group.position.z += dz * Math.min(1, delta * 12);
      r.chef.update(delta, isMoving);
    });

    // 8. Camera follow
    this.cameraSystem.update(delta, { x: this.playerPos.x, y: 0, z: this.playerPos.z });

    // 9. Check facing counter for interaction & highlight
    this.updateFacingCounter();

    // 10. Handle mobile inputs
    this.processMobileActions();

    // 11. Multiplayer Network Sync throttled
    this.syncNetworkPosition();
  }

  private handleMovement(delta: number) {
    // Handle Active Dash Movement
    if (this.isDashing) {
      this.dashTimer -= delta;
      this.dashParticleTimer += delta;
      if (this.dashParticleTimer >= 0.05) {
        this.dashParticleTimer = 0;
        this.particles.emitDashDust(this.playerPos.x, 0, this.playerPos.z, this.dashDirection.x, this.dashDirection.z);
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.dashTimer = 0;
      }

      const dashSpeed = this.playerSpeed * this.dashSpeedMultiplier;
      const nextX = this.playerPos.x + this.dashDirection.x * dashSpeed * delta;
      const nextZ = this.playerPos.z + this.dashDirection.z * dashSpeed * delta;

      const resolved = this.physics.resolveCollision(nextX, nextZ, 0.38);
      this.playerPos.x = resolved.x;
      this.playerPos.z = resolved.z;

      this.localPlayer.group.position.x = this.playerPos.x;
      this.localPlayer.group.position.z = this.playerPos.z;
      this.localPlayer.update(delta, true);
      return;
    }

    let moveX = 0;
    let moveZ = 0;

    // Desktop keyboard
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    // Mobile Virtual Joystick
    if (this.hud.inputs.moveX !== 0 || this.hud.inputs.moveZ !== 0) {
      moveX = this.hud.inputs.moveX;
      moveZ = this.hud.inputs.moveZ;
    }

    const isMoving = Math.hypot(moveX, moveZ) > 0.1;

    if (isMoving) {
      // Normalize
      const len = Math.hypot(moveX, moveZ);
      const normX = moveX / len;
      const normZ = moveZ / len;

      this.facingDir = { x: normX, z: normZ };
      const targetAngle = Math.atan2(normX, normZ);
      this.localPlayer.setRotation(targetAngle);

      // Desired position
      const nextX = this.playerPos.x + normX * this.playerSpeed * delta;
      const nextZ = this.playerPos.z + normZ * this.playerSpeed * delta;

      // Smooth Circle-to-AABB slide collision against counters & walls!
      const resolved = this.physics.resolveCollision(nextX, nextZ, 0.38);
      this.playerPos.x = resolved.x;
      this.playerPos.z = resolved.z;
    }

    this.localPlayer.group.position.x = this.playerPos.x;
    this.localPlayer.group.position.z = this.playerPos.z;
    this.localPlayer.update(delta, isMoving);
  }

  private updateFacingCounter() {
    // Check counter in front of player
    const checkX = this.playerPos.x + this.facingDir.x * 0.85;
    const checkZ = this.playerPos.z + this.facingDir.z * 0.85;

    let closest: Counter3DData | null = null;
    let minDist = 0.95;

    for (const c of this.map.counters.values()) {
      const dist = Math.hypot(c.x - checkX, c.z - checkZ);
      if (dist < minDist) {
        minDist = dist;
        closest = c;
      }
    }

    this.currentFacingCounter = closest;

    if (closest) {
      this.targetCounterHighlight.position.set(closest.x, 0.88, closest.z);
      this.targetCounterHighlight.visible = true;
    } else {
      this.targetCounterHighlight.visible = false;
    }
  }

  private updateKitchenSimulation(delta: number) {
    const isActionPressed = this.keys['Space'] || this.hud.inputs.isActionPressed;

    this.map.counters.forEach(c => {
      // 1. CUTTING BOARD
      if (c.type === CounterType.CUTTING_BOARD) {
        if (this.currentFacingCounter === c && isActionPressed && c.currentItem) {
          // If item can be sliced
          if (c.currentItem.type === IngredientType.RAW_MEAT ||
              c.currentItem.type === IngredientType.LETTUCE ||
              c.currentItem.type === IngredientType.TOMATO ||
              c.currentItem.type === IngredientType.CHEESE) {
            this.localPlayer.currentAnim = 'chop';
            c.cutProgress += delta * 50; // Takes 2 seconds
            this.sound.playChop();
            this.particles.emitChopCrumbs(c.x, 0.95, c.z);

            if (c.cutProgress >= 100) {
              c.cutProgress = 0;
              this.transformSlicedIngredient(c.currentItem);
              // Update 3D mesh on board
              c.itemHolder.clear();
              c.itemHolder.add(Ingredient3DFactory.createMesh(c.currentItem));
              this.broadcastCounterUpdate(c);
            }
          }
        }
      }

      // 2. STOVE
      if (c.type === CounterType.STOVE && c.currentItem) {
        if (c.currentItem.type === IngredientType.RAW_MEAT || c.currentItem.type === IngredientType.COOKED_PATTY) {
          c.cookingTimer += delta;
          this.sound.playSizzle();
          this.particles.emitSteam(c.x, 0.96, c.z);

          // After 4s -> COOKED
          if (c.cookingTimer >= 4 && c.currentItem.type === IngredientType.RAW_MEAT) {
            c.currentItem.type = IngredientType.COOKED_PATTY;
            c.stoveState = StoveState.COOKED;
            c.itemHolder.clear();
            c.itemHolder.add(Ingredient3DFactory.createMesh(c.currentItem));
            this.broadcastCounterUpdate(c);
          }

          // After 10s -> BURNT!
          if (c.cookingTimer >= 10 && c.currentItem.type === IngredientType.COOKED_PATTY) {
            c.currentItem.type = IngredientType.BURNT_PATTY;
            c.stoveState = StoveState.BURNT;
            this.particles.emitBurntSmoke(c.x, 0.96, c.z);
            c.itemHolder.clear();
            c.itemHolder.add(Ingredient3DFactory.createMesh(c.currentItem));
            this.broadcastCounterUpdate(c);
          }
        }
      }
    });
  }

  private transformSlicedIngredient(item: KitchenItem) {
    if (item.type === IngredientType.LETTUCE) item.type = IngredientType.CHOPPED_LETTUCE;
    else if (item.type === IngredientType.TOMATO) item.type = IngredientType.SLICED_TOMATO;
    else if (item.type === IngredientType.CHEESE) item.type = IngredientType.SLICED_CHEESE;
  }

  private processMobileActions() {
    if (this.hud.inputs.isDashJustPressed) {
      this.hud.inputs.isDashJustPressed = false;
      this.handleDash();
    }
    if (this.hud.inputs.isPickupJustPressed) {
      this.hud.inputs.isPickupJustPressed = false;
      this.handlePickupDrop();
    }
    if (this.hud.inputs.isThrowJustPressed) {
      this.hud.inputs.isThrowJustPressed = false;
      this.handleThrow();
    }
  }

  private handleDash() {
    if (this.isDashing || this.dashCooldownTimer > 0) return;

    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashCooldownTimer = this.dashCooldown;

    // Movement direction or facing direction
    let moveX = 0;
    let moveZ = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    if (this.hud.inputs.moveX !== 0 || this.hud.inputs.moveZ !== 0) {
      moveX = this.hud.inputs.moveX;
      moveZ = this.hud.inputs.moveZ;
    }

    if (Math.hypot(moveX, moveZ) > 0.1) {
      const len = Math.hypot(moveX, moveZ);
      this.dashDirection = { x: moveX / len, z: moveZ / len };
    } else {
      this.dashDirection = { ...this.facingDir };
    }

    this.localPlayer.setRotation(Math.atan2(this.dashDirection.x, this.dashDirection.z));
    this.localPlayer.triggerDash(this.dashDuration);
    this.sound.playDash();
    this.particles.emitDashDust(this.playerPos.x, 0, this.playerPos.z, this.dashDirection.x, this.dashDirection.z);

    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('player_dash', {
        dirX: this.dashDirection.x,
        dirZ: this.dashDirection.z,
        duration: this.dashDuration
      });
    }
  }

  private handlePickupDrop() {
    this.sound.init();

    if (!this.currentFacingCounter) {
      // Nothing in front to interact with
      return;
    }

    const counter = this.currentFacingCounter;

    // 1. CRATES (Pick up raw items if hands are empty)
    if (counter.type.startsWith('crate_')) {
      if (!this.heldItem) {
        let spawnType: IngredientType = IngredientType.BREAD;
        if (counter.type === CounterType.CRATE_BREAD) spawnType = IngredientType.BREAD;
        else if (counter.type === CounterType.CRATE_MEAT) spawnType = IngredientType.RAW_MEAT;
        else if (counter.type === CounterType.CRATE_LETTUCE) spawnType = IngredientType.LETTUCE;
        else if (counter.type === CounterType.CRATE_TOMATO) spawnType = IngredientType.TOMATO;
        else if (counter.type === CounterType.CRATE_CHEESE) spawnType = IngredientType.CHEESE;
        else if (counter.type === CounterType.CRATE_PLATE) spawnType = IngredientType.PLATE;

        this.setHeldItem({
          id: `item_${Date.now()}_${Math.random()}`,
          type: spawnType,
          plateContents: spawnType === IngredientType.PLATE ? [] : undefined
        });
        this.sound.playPickup();
      }
      return;
    }

    // 2. TRASH BIN (Dispose held item)
    if (counter.type === CounterType.TRASH) {
      if (this.heldItem) {
        this.sound.playTrash();
        this.setHeldItem(null);
      }
      return;
    }

    // 3. DELIVERY COUNTER (Submit completed plate)
    if (counter.type === CounterType.DELIVERY) {
      if (this.heldItem && this.heldItem.type === IngredientType.PLATE) {
        const result = this.recipeManager.tryDeliver(this.heldItem);
        if (result.success) {
          this.sound.playDelivery();
          this.particles.emitDeliveryStars(counter.x, 1.2, counter.z);
          this.setHeldItem(null);
          this.localPlayer.currentAnim = 'celebrate';

          if (this.config.isMultiplayer && this.network.room) {
            this.network.room.send('score_update', {
              score: this.recipeManager.score,
              combo: this.recipeManager.combo
            });
            this.network.room.send('orders_update', {
              orders: this.recipeManager.getOrders()
            });
          }
        }
      }
      return;
    }

    // 4. CLEAR COUNTER / CUTTING BOARD / STOVE INTERACTION
    if (!this.heldItem && counter.currentItem) {
      // Pick up from counter
      this.setHeldItem(counter.currentItem);
      counter.currentItem = null;
      counter.cookingTimer = 0;
      counter.cutProgress = 0;
      counter.stoveState = StoveState.IDLE;
      counter.itemHolder.clear();
      this.sound.playPickup();
      this.broadcastCounterUpdate(counter);
    } else if (this.heldItem && !counter.currentItem) {
      // Drop onto empty counter
      // Check stove restrictions (only raw or cooked meat allowed on stove)
      if (counter.type === CounterType.STOVE &&
          this.heldItem.type !== IngredientType.RAW_MEAT &&
          this.heldItem.type !== IngredientType.COOKED_PATTY) {
        return;
      }

      counter.currentItem = this.heldItem;
      const mesh = Ingredient3DFactory.createMesh(this.heldItem);
      counter.itemHolder.add(mesh);
      this.setHeldItem(null);
      this.sound.playDrop();
      this.broadcastCounterUpdate(counter);
    } else if (this.heldItem && counter.currentItem) {
      // COMBINE: Plate + Ingredient assembly
      if (counter.currentItem.type === IngredientType.PLATE && this.heldItem.type !== IngredientType.PLATE) {
        // Add held ingredient onto plate on counter
        if (!counter.currentItem.plateContents) counter.currentItem.plateContents = [];
        counter.currentItem.plateContents.push(this.heldItem.type);

        counter.itemHolder.clear();
        counter.itemHolder.add(Ingredient3DFactory.createMesh(counter.currentItem));
        this.setHeldItem(null);
        this.sound.playDrop();
        this.broadcastCounterUpdate(counter);
      } else if (this.heldItem.type === IngredientType.PLATE && counter.currentItem.type !== IngredientType.PLATE) {
        // Held plate picks up ingredient from counter!
        if (!this.heldItem.plateContents) this.heldItem.plateContents = [];
        this.heldItem.plateContents.push(counter.currentItem.type);

        counter.currentItem = null;
        counter.itemHolder.clear();
        this.updateHeldMesh();
        this.sound.playPickup();
        this.broadcastCounterUpdate(counter);
      }
    }
  }

  private handleThrow() {
    if (!this.heldItem) return;

    this.sound.playThrow();
    const throwDistance = 3.2;
    const targetX = this.playerPos.x + this.facingDir.x * throwDistance;
    const targetZ = this.playerPos.z + this.facingDir.z * throwDistance;

    const thrown = new ThrownItem3D(this.heldItem, this.playerPos.x, this.playerPos.z, targetX, targetZ);
    this.thrownItems.push(thrown);
    this.scene.add(thrown.mesh);

    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('throw_item', {
        item: this.heldItem,
        fromX: this.playerPos.x,
        fromZ: this.playerPos.z,
        toX: targetX,
        toZ: targetZ
      });
    }

    this.setHeldItem(null);
  }

  private setHeldItem(item: KitchenItem | null) {
    this.heldItem = item;
    this.localPlayer.isHoldingItem = (item !== null);
    this.updateHeldMesh();

    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('held_update', { item: this.heldItem });
    }
  }

  private updateHeldMesh() {
    if (this.heldItemMesh) {
      this.localPlayer.handAnchor.remove(this.heldItemMesh);
      this.heldItemMesh = null;
    }

    if (this.heldItem) {
      this.heldItemMesh = Ingredient3DFactory.createMesh(this.heldItem);
      this.localPlayer.handAnchor.add(this.heldItemMesh);
    }
  }

  private broadcastCounterUpdate(counter: Counter3DData) {
    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('counter_update', {
        id: counter.id,
        item: counter.currentItem,
        stoveState: counter.stoveState
      });
    }
  }

  private syncNetworkPosition() {
    if (!this.config.isMultiplayer || !this.network.room) return;

    const now = performance.now();
    if (now - this.lastNetworkSendTime > 45) { // ~22 FPS networking
      this.lastNetworkSendTime = now;
      this.network.room.send('player_move', {
        x: this.playerPos.x,
        y: this.playerPos.z,
        facingX: this.facingDir.x,
        facingY: this.facingDir.z
      });
    }
  }

  private onResize() {
    this.cameraSystem.setAspect(window.innerWidth / window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public takeScreenshot() {
    this.renderer.render(this.scene, this.cameraSystem.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `kitchen_chaos_3d_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  public destroy() {
    this.isRunning = false;
    window.removeEventListener('resize', this.onResize.bind(this));

    if (this.hud) {
      this.hud.destroy();
    }

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
