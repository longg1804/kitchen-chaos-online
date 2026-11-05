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

  // Dash System (Overcooked 2 Responsive Dash: 220ms dash, 400ms cooldown after dash ends)
  private isDashing = false;
  private dashTimer = 0;
  private readonly dashDuration = 0.22; // 220ms
  private readonly dashCooldown = 0.40; // 400ms cooldown starting AFTER dash finishes
  private dashCooldownTimer = 0;
  private readonly dashSpeedMultiplier = 2.15;
  private dashDirection = { x: 0, z: 1 };
  private dashParticleTimer = 0;

  // Bound event listeners for clean teardown (prevents duplicate listeners)
  private boundKeyDown!: (e: KeyboardEvent) => void;
  private boundKeyUp!: (e: KeyboardEvent) => void;
  private boundBlur!: () => void;
  private boundResize!: () => void;

  // Remote Players
  private remotePlayers = new Map<string, { chef: ChefCharacter3D; targetX: number; targetZ: number; heldMesh?: THREE.Group }>();

  // Thrown Items in Flight
  private thrownItems: ThrownItem3D[] = [];

  // Active facing counter highlight & Smart Chopping / Smart Cooking State
  private targetCounterHighlight!: THREE.Mesh;
  private currentFacingCounter: Counter3DData | null = null;
  private activeChopCounter: Counter3DData | null = null;
  private activeCookCounter: Counter3DData | null = null;
  private cookAnimTimer = 0;
  private chopEffectTimer = 0;
  private isPlayerMoving = false;
  private lastSyncedAnim = 'IDLE';

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

    this.boundResize = this.onResize.bind(this);
    window.addEventListener('resize', this.boundResize);
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

    // Subtle square outer perimeter highlight around targeted counter (never occludes food items!)
    const ringGeo = new THREE.RingGeometry(0.64, 0.71, 4);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.targetCounterHighlight = new THREE.Mesh(ringGeo, ringMat);
    this.targetCounterHighlight.rotation.x = -Math.PI / 2;
    this.targetCounterHighlight.rotation.z = Math.PI / 4; // Align 4-sided ring into square border
    this.targetCounterHighlight.position.y = 0.842;
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
    this.boundKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts if typing in an input element
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Edge-detection: ignore key-repeat events when holding down a key!
      if (e.repeat || this.keys[e.code]) {
        return;
      }

      this.keys[e.code] = true;
      this.sound.init(); // Initialize audio on first keypress

      // Strict, non-overlapping action bindings:
      // [E] = Pick Up / Drop ONLY
      // [Space] = Smart Contextual Action (One-tap Chop / Cook / Wash / Deliver)
      // [Shift] = Dash ONLY
      // [Q] = Throw ONLY
      // [P] = Screenshot ONLY
      if (e.code === 'KeyE') {
        e.preventDefault();
        this.handlePickupDrop();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.handleSmartAction();
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        this.handleThrow();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        this.takeScreenshot();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        this.handleDash();
      }
    };

    this.boundKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    this.boundBlur = () => {
      // Clear held keys when window loses focus to prevent stuck movement/actions
      this.keys = {};
    };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
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
      const fZ = data.facingZ !== undefined ? data.facingZ : data.facingY;
      if (data.facingX !== undefined && fZ !== undefined) {
        const angle = Math.atan2(data.facingX, fZ);
        r.chef.setRotation(angle);
      }
    });

    // Remote player animation state sync
    room.onMessage('remote_player_anim', (data: { id: string; anim: string; counterId?: string }) => {
      if (data.id === this.network.mySessionId) return;
      const r = this.remotePlayers.get(data.id);
      if (!r) return;

      r.chef.isChopping = (data.anim === 'CHOP');
      r.chef.isCooking = (data.anim === 'COOK');
      if (data.anim === 'PICKUP' || data.anim === 'DROP' || data.anim === 'THROW' || data.anim === 'CELEBRATE') {
        r.chef.playOneShot(data.anim);
      }
      if (data.counterId) {
        const c = this.map.counters.get(data.counterId);
        if (c) {
          c.isActivelyChopping = (data.anim === 'CHOP');
        }
      } else {
        this.map.counters.forEach((c) => {
          if (c !== this.activeChopCounter) c.isActivelyChopping = false;
        });
      }
    });

    // 2. Remote held item update
    const handleHeldSync = (data: { id: string; item?: KitchenItem | null; heldItem?: KitchenItem | null }) => {
      if (data.id === this.network.mySessionId) return;
      const r = this.remotePlayers.get(data.id);
      if (!r) return;

      const syncedItem = data.item !== undefined ? data.item : (data.heldItem ?? null);
      r.chef.isHoldingItem = (syncedItem !== null);

      if (r.heldMesh) {
        r.chef.handAnchor.remove(r.heldMesh);
        r.heldMesh = undefined;
      }

      if (syncedItem) {
        r.heldMesh = Ingredient3DFactory.createMesh(syncedItem);
        r.heldMesh.position.set(0, 0, 0);
        r.chef.handAnchor.add(r.heldMesh);
      }
    };
    room.onMessage('remote_held_update', handleHeldSync);
    room.onMessage('held_update', handleHeldSync);

    // Remote player dash broadcast
    room.onMessage('remote_player_dash', (data: { id: string; dirX: number; dirZ: number; duration: number }) => {
      const r = this.remotePlayers.get(data.id);
      if (r) {
        r.chef.triggerDash(data.duration || this.dashDuration);
        this.sound.playDash();
        this.particles.emitDashDust(r.chef.group.position.x, 0, r.chef.group.position.z, data.dirX, data.dirZ);
      }
    });

    // 3. Remote counter update
    const handleCounterSync = (data: {
      id: string;
      item: KitchenItem | null;
      cutProgress?: number;
      stoveState?: StoveState;
      cookingTimer?: number;
    }) => {
      const counter = this.map.counters.get(data.id);
      if (!counter) return;

      counter.itemHolder.clear();
      counter.currentItem = data.item;
      if (data.cutProgress !== undefined) counter.cutProgress = data.cutProgress;
      if (data.stoveState !== undefined) counter.stoveState = data.stoveState;
      if (data.cookingTimer !== undefined) counter.cookingTimer = data.cookingTimer;

      if (data.item) {
        const mesh = Ingredient3DFactory.createMesh(data.item);
        counter.itemHolder.add(mesh);
      }
    };
    room.onMessage('remote_counter_update', handleCounterSync);
    room.onMessage('counter_update', handleCounterSync);

    // 4. Remote thrown item
    room.onMessage('remote_throw_item', (data: { item: KitchenItem; fromX: number; fromZ: number; toX: number; toZ: number }) => {
      const thrown = new ThrownItem3D(data.item, data.fromX, data.fromZ, data.toX, data.toZ);
      this.thrownItems.push(thrown);
      this.scene.add(thrown.mesh);
      this.sound.playThrow();
    });

    // 5. Score & orders sync from host
    const handleScoreSync = (data: { score: number; combo: number }) => {
      this.recipeManager.score = data.score;
      this.recipeManager.combo = data.combo;
    };
    room.onMessage('remote_score_update', handleScoreSync);
    room.onMessage('score_update', handleScoreSync);

    room.onMessage('remote_orders_update', (data: { orders: any[] }) => {
      this.hud.updateOrders(data.orders);
    });
    room.onMessage('orders_update', (orders: any[]) => {
      if (Array.isArray(orders)) {
        this.hud.updateOrders(orders);
      }
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

    // Dash Cooldown Update (only ticks when not currently dashing)
    if (!this.isDashing && this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= delta;
      if (this.dashCooldownTimer < 0) this.dashCooldownTimer = 0;
    }
    this.hud.updateDashCooldown(this.dashCooldownTimer, this.dashCooldown);

    // 3. Local Player Movement & Physics
    this.handleMovement(delta);

    // 4. Stoves, Chopping & Station 3D Progress Bars
    this.updateKitchenSimulation(delta);
    this.map.updateStations(delta);

    // 5. Thrown items in flight
    for (let i = this.thrownItems.length - 1; i >= 0; i--) {
      const thrown = this.thrownItems[i];
      const done = thrown.update(delta);
      if (done) {
        this.scene.remove(thrown.mesh);
        this.thrownItems.splice(i, 1);
        this.particles.emitChopCrumbs(thrown.targetX, 0.88, thrown.targetZ);
        this.landThrownItem(thrown.item, thrown.targetX, thrown.targetZ);
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
    // Handle Active Dash Movement (220ms burst with smooth deceleration & zero recovery freeze)
    if (this.isDashing) {
      this.isPlayerMoving = true;
      this.cancelActiveWorkOnMove();

      this.dashTimer -= delta;
      this.dashParticleTimer += delta;
      if (this.dashParticleTimer >= 0.045) {
        this.dashParticleTimer = 0;
        this.particles.emitDashDust(this.playerPos.x, 0, this.playerPos.z, this.dashDirection.x, this.dashDirection.z);
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.dashTimer = 0;
        // Cooldown (0.40s) starts AFTER Dash finishes!
        this.dashCooldownTimer = this.dashCooldown;
      }

      // Smooth cubic ease-out deceleration toward the end of the dash
      const progress = Math.max(0, Math.min(1, 1 - this.dashTimer / this.dashDuration));
      const dynamicMultiplier = 1 + (this.dashSpeedMultiplier - 1) * (1 - progress * progress * 0.45);
      const dashSpeed = this.playerSpeed * dynamicMultiplier;
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
    this.isPlayerMoving = isMoving;

    if (isMoving) {
      // Immediately cancel any active chopping/cooking animation if player moves!
      // (Cutting board retains its current cutProgress; stove continues cooking on its own)
      this.cancelActiveWorkOnMove();

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

  private cancelActiveWorkOnMove() {
    if (this.activeChopCounter) {
      this.activeChopCounter.isActivelyChopping = false;
      this.activeChopCounter = null;
      this.localPlayer.isChopping = false;
      this.syncPlayerAnim('IDLE');
      if (this.config.isMultiplayer && this.network.room) {
        this.network.room.send('stop_action');
      }
    }
    if (this.activeCookCounter) {
      this.activeCookCounter = null;
      this.cookAnimTimer = 0;
      this.localPlayer.isCooking = false;
      this.syncPlayerAnim('IDLE');
    }
  }

  private isChoppable(type: IngredientType): boolean {
    return (
      type === IngredientType.LETTUCE ||
      type === IngredientType.TOMATO ||
      type === IngredientType.CHEESE ||
      type === IngredientType.ONION ||
      type === IngredientType.POTATO
    );
  }

  private isCookable(type: IngredientType): boolean {
    return type === IngredientType.RAW_MEAT || type === IngredientType.COOKED_PATTY;
  }

  private faceCounter(counter: Counter3DData) {
    const dx = counter.x - this.playerPos.x;
    const dz = counter.z - this.playerPos.z;
    const len = Math.hypot(dx, dz) || 1;
    this.facingDir = { x: dx / len, z: dz / len };
    this.localPlayer.setRotation(Math.atan2(this.facingDir.x, this.facingDir.z));
  }

  private syncPlayerAnim(anim: string, counterId?: string) {
    const key = `${anim}_${counterId || ''}`;
    if (this.lastSyncedAnim === key) return;
    this.lastSyncedAnim = key;
    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('player_anim', { anim, counterId });
    }
  }

  private updateFacingCounter() {
    // Check counter in front of player (or nearest reachable counter within interaction radius)
    const checkX = this.playerPos.x + this.facingDir.x * 0.82;
    const checkZ = this.playerPos.z + this.facingDir.z * 0.82;

    let closest: Counter3DData | null = null;
    let minDist = 0.98;

    for (const c of this.map.counters.values()) {
      const dist = Math.hypot(c.x - checkX, c.z - checkZ);
      if (dist < minDist) {
        minDist = dist;
        closest = c;
      }
    }

    this.currentFacingCounter = closest;

    if (closest) {
      this.targetCounterHighlight.position.set(closest.x, 0.842, closest.z);
      this.targetCounterHighlight.visible = true;
    } else {
      this.targetCounterHighlight.visible = false;
    }

    // Update Contextual Smart Action Button (Phase 7)
    this.updateContextualHUD();
  }

  private updateContextualHUD() {
    const c = this.currentFacingCounter;
    if (!c) {
      this.hud.updateContextualActionButton('CẮT<br>NẤU', '#475569', false);
      return;
    }

    if (c.type === CounterType.CUTTING_BOARD) {
      const canChopBoard = c.currentItem !== null && c.currentItem !== undefined && this.isChoppable(c.currentItem.type);
      const canPlaceAndChop = !c.currentItem && this.heldItem !== null && this.isChoppable(this.heldItem.type);
      this.hud.updateContextualActionButton(
        '🔪<br>CẮT',
        canChopBoard || canPlaceAndChop ? '#f97316' : '#475569',
        canChopBoard || canPlaceAndChop
      );
      return;
    }

    if (c.type === CounterType.STOVE) {
      const canCookStove = c.currentItem !== null && c.currentItem !== undefined && this.isCookable(c.currentItem.type);
      const canPlaceAndCook = !c.currentItem && this.heldItem !== null && this.isCookable(this.heldItem.type);
      this.hud.updateContextualActionButton(
        '🍳<br>NẤU',
        canCookStove || canPlaceAndCook ? '#ea580c' : '#475569',
        canCookStove || canPlaceAndCook
      );
      return;
    }

    if (c.id === 'counter_1_-3') {
      // Sink
      this.hud.updateContextualActionButton('💧<br>RỬA', '#0284c7', true);
      return;
    }

    if (c.type === CounterType.DELIVERY) {
      const canDeliver = this.heldItem !== null && this.heldItem.type === IngredientType.PLATE;
      this.hud.updateContextualActionButton(
        '🛎️<br>GIAO MÓN',
        canDeliver ? '#10b981' : '#475569',
        canDeliver
      );
      return;
    }

    this.hud.updateContextualActionButton('CẮT<br>NẤU', '#475569', false);
  }

  private updateKitchenSimulation(delta: number) {
    // 1. SMART CHOPPING SYSTEM (Continuous Auto-Chop after single tap until completed or player moves!)
    if (this.activeChopCounter) {
      const c = this.activeChopCounter;
      const dist = Math.hypot(c.x - this.playerPos.x, c.z - this.playerPos.z);

      if (
        this.isPlayerMoving ||
        this.isDashing ||
        dist > 1.45 ||
        !c.currentItem ||
        !this.isChoppable(c.currentItem.type)
      ) {
        // Interrupted by movement or item removed -> stop chopping, retain progress!
        c.isActivelyChopping = false;
        this.activeChopCounter = null;
        this.localPlayer.isChopping = false;
        this.syncPlayerAnim('IDLE');
      } else {
        // Continue automatic chopping!
        c.isActivelyChopping = true;
        this.localPlayer.isChopping = true;
        this.faceCounter(c);

        c.cutProgress += delta * 0.50; // Exactly 2.0 seconds total from 0% to 100%
        this.chopEffectTimer += delta;
        if (this.chopEffectTimer >= 0.22) {
          this.chopEffectTimer = 0;
          this.sound.playChop();
          this.particles.emitChopCrumbs(c.x, 0.95, c.z);
          if (this.config.isMultiplayer && this.network.room) {
            this.network.room.send('player_action', { counterId: c.id, delta: 0.22 });
          }
        }

        if (c.cutProgress >= 1.0) {
          // Chopping complete!
          c.cutProgress = 0;
          c.isActivelyChopping = false;
          this.activeChopCounter = null;
          this.localPlayer.isChopping = false;

          this.transformSlicedIngredient(c.currentItem);
          c.itemHolder.clear();
          c.itemHolder.add(Ingredient3DFactory.createMesh(c.currentItem));
          this.map.triggerCounterBounce(c.id);
          this.sound.playPickup();
          this.broadcastCounterUpdate(c);
          this.syncPlayerAnim('IDLE');
        }
      }
    }

    // 2. SMART COOKING CHEF ANIMATION TIMER (Chef stirs/tends pan while standing at stove)
    if (this.activeCookCounter) {
      const c = this.activeCookCounter;
      const dist = Math.hypot(c.x - this.playerPos.x, c.z - this.playerPos.z);
      this.cookAnimTimer -= delta;
      if (this.isPlayerMoving || this.isDashing || dist > 1.45 || !c.currentItem || this.cookAnimTimer <= 0) {
        this.activeCookCounter = null;
        this.cookAnimTimer = 0;
        this.localPlayer.isCooking = false;
        this.syncPlayerAnim('IDLE');
      } else {
        this.localPlayer.isCooking = true;
        this.faceCounter(c);
      }
    }

    // 3. AUTONOMOUS STOVE SIMULATION (Continues cooking in real-time even when player walks away!)
    this.map.counters.forEach((c) => {
      if (c.type === CounterType.STOVE && c.currentItem) {
        if (c.currentItem.type === IngredientType.RAW_MEAT || c.currentItem.type === IngredientType.COOKED_PATTY) {
          c.cookingTimer += delta;
          this.sound.playSizzle();
          this.particles.emitSteam(c.x, 0.96, c.z);

          if (c.currentItem.type === IngredientType.RAW_MEAT) {
            c.stoveState = StoveState.COOKING;
            // After 5.5s -> COOKED
            if (c.cookingTimer >= 5.5) {
              c.currentItem.type = IngredientType.COOKED_PATTY;
              c.stoveState = StoveState.COOKED;
              c.itemHolder.clear();
              c.itemHolder.add(Ingredient3DFactory.createMesh(c.currentItem));
              this.map.triggerCounterBounce(c.id);
              this.sound.playPickup();
              this.broadcastCounterUpdate(c);
            }
          } else if (c.currentItem.type === IngredientType.COOKED_PATTY) {
            if (c.cookingTimer >= 8.5 && c.cookingTimer < 11.0) {
              c.stoveState = StoveState.BURNING;
              if (Math.random() < 0.35) {
                this.particles.emitBurntSmoke(c.x, 0.98, c.z);
              }
            }
            // After 11s -> BURNT!
            if (c.cookingTimer >= 11.0) {
              c.currentItem.type = IngredientType.BURNT_PATTY;
              c.stoveState = StoveState.BURNT;
              this.particles.emitBurntSmoke(c.x, 0.98, c.z);
              c.itemHolder.clear();
              c.itemHolder.add(Ingredient3DFactory.createMesh(c.currentItem));
              this.broadcastCounterUpdate(c);
            }
          }
        }
      }
    });
  }

  private transformSlicedIngredient(item: KitchenItem) {
    if (item.type === IngredientType.LETTUCE) item.type = IngredientType.CHOPPED_LETTUCE;
    else if (item.type === IngredientType.TOMATO) item.type = IngredientType.SLICED_TOMATO;
    else if (item.type === IngredientType.CHEESE) item.type = IngredientType.SLICED_CHEESE;
    else if (item.type === IngredientType.ONION) item.type = IngredientType.SLICED_ONION;
    else if (item.type === IngredientType.POTATO) item.type = IngredientType.CHOPPED_POTATO;
  }

  private processMobileActions() {
    if (this.hud.inputs.isDashJustPressed) {
      this.hud.inputs.isDashJustPressed = false;
      this.handleDash();
    }
    if (this.hud.inputs.isActionJustPressed) {
      this.hud.inputs.isActionJustPressed = false;
      this.handleSmartAction();
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

  /**
   * Smart Contextual Action (Triggered by single press of [Space] or Mobile Contextual Button)
   * - Cutting Board: Auto-places held choppable ingredient & starts continuous auto-chopping!
   * - Stove: Auto-places held raw meat onto frying pan & starts cooking!
   * - Sink: Triggers quick dish/hand rinse animation & water splash!
   * - Delivery: Submits held plate!
   */
  private handleSmartAction() {
    this.sound.init();
    const counter = this.currentFacingCounter;
    if (!counter) return;

    // 1. SMART CHOPPING ON CUTTING BOARD
    if (counter.type === CounterType.CUTTING_BOARD) {
      // If holding a choppable ingredient and board is empty -> auto-place it onto the board!
      if (!counter.currentItem && this.heldItem && this.isChoppable(this.heldItem.type)) {
        counter.currentItem = this.heldItem;
        const mesh = Ingredient3DFactory.createMesh(this.heldItem);
        counter.itemHolder.clear();
        counter.itemHolder.add(mesh);
        this.setHeldItem(null);
        this.map.triggerCounterBounce(counter.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(counter);
      }

      // If board now has a choppable ingredient -> start continuous auto-chopping!
      if (counter.currentItem && this.isChoppable(counter.currentItem.type)) {
        this.faceCounter(counter);
        this.activeChopCounter = counter;
        counter.isActivelyChopping = true;
        this.localPlayer.isChopping = true;
        this.chopEffectTimer = 0.22; // Trigger first chop sound/crumb immediately
        this.syncPlayerAnim('CHOP', counter.id);
      }
      return;
    }

    // 2. SMART COOKING ON STOVE
    if (counter.type === CounterType.STOVE) {
      // If holding raw/cooked meat and stove is empty -> auto-place into frying pan!
      if (!counter.currentItem && this.heldItem && this.isCookable(this.heldItem.type)) {
        counter.currentItem = this.heldItem;
        counter.stoveState =
          this.heldItem.type === IngredientType.RAW_MEAT ? StoveState.COOKING : StoveState.COOKED;
        if (this.heldItem.type === IngredientType.RAW_MEAT) {
          counter.cookingTimer = 0;
        }
        const mesh = Ingredient3DFactory.createMesh(this.heldItem);
        counter.itemHolder.clear();
        counter.itemHolder.add(mesh);
        this.setHeldItem(null);
        this.map.triggerCounterBounce(counter.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(counter);
      }

      // Trigger chef cooking animation at stove
      if (counter.currentItem && this.isCookable(counter.currentItem.type)) {
        this.faceCounter(counter);
        this.activeCookCounter = counter;
        this.cookAnimTimer = 1.4;
        this.localPlayer.isCooking = true;
        this.particles.emitSteam(counter.x, 0.98, counter.z);
        this.syncPlayerAnim('COOK', counter.id);
      }
      return;
    }

    // 3. SINK INTERACTION
    if (counter.id === 'counter_1_-3') {
      this.faceCounter(counter);
      this.activeCookCounter = counter;
      this.cookAnimTimer = 0.8;
      this.localPlayer.isCooking = true;
      this.map.triggerCounterBounce(counter.id);
      this.particles.emitSteam(counter.x, 0.92, counter.z);
      this.sound.playPickup();
      this.syncPlayerAnim('COOK', counter.id);
      return;
    }

    // 4. DELIVERY COUNTER
    if (counter.type === CounterType.DELIVERY && this.heldItem && this.heldItem.type === IngredientType.PLATE) {
      this.handlePickupDrop();
    }
  }

  private handleDash() {
    // Only allow Dash when not already dashing and cooldown has finished
    if (this.isDashing || this.dashCooldownTimer > 0) return;

    this.cancelActiveWorkOnMove();
    this.isDashing = true;
    this.dashTimer = this.dashDuration;

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

    this.facingDir = { ...this.dashDirection };
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
    this.cancelActiveWorkOnMove();

    if (!this.currentFacingCounter) {
      // Nothing in front to interact with
      return;
    }

    const counter = this.currentFacingCounter;
    this.faceCounter(counter);

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
        this.localPlayer.playOneShot('PICKUP');
        this.syncPlayerAnim('PICKUP');
        this.map.triggerCounterBounce(counter.id);
        this.sound.playPickup();
      }
      return;
    }

    // 2. TRASH BIN (Dispose held item)
    if (counter.type === CounterType.TRASH) {
      if (this.heldItem) {
        this.sound.playTrash();
        this.setHeldItem(null);
        this.localPlayer.playOneShot('DROP');
        this.syncPlayerAnim('DROP');
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
          this.localPlayer.playOneShot('CELEBRATE');
          this.syncPlayerAnim('CELEBRATE');
          this.hud.showFloatingPopup(
            `🎉 +${result.pointsEarned} ĐIỂM! (COMBO x${this.recipeManager.combo})`,
            '#10b981'
          );

          if (this.config.isMultiplayer && this.network.room) {
            this.network.room.send('score_update', {
              score: this.recipeManager.score,
              combo: this.recipeManager.combo
            });
            this.network.room.send('orders_update', {
              orders: this.recipeManager.getOrders()
            });
          }
        } else {
          this.sound.playTrash();
          this.hud.showFloatingPopup('⚠️ SAI CÔNG THỨC MÓN ĂN!', '#ef4444');
        }
      }
      return;
    }

    // 4. CLEAR COUNTER / CUTTING BOARD / STOVE INTERACTION
    if (!this.heldItem && counter.currentItem) {
      // Pick up from counter (Note: picking up an item resets that counter's progress)
      this.setHeldItem(counter.currentItem);
      counter.currentItem = null;
      counter.cookingTimer = 0;
      counter.cutProgress = 0;
      counter.isActivelyChopping = false;
      counter.stoveState = StoveState.IDLE;
      counter.itemHolder.clear();
      this.localPlayer.playOneShot('PICKUP');
      this.syncPlayerAnim('PICKUP');
      this.map.triggerCounterBounce(counter.id);
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
      if (counter.type === CounterType.STOVE && this.heldItem.type === IngredientType.RAW_MEAT) {
        counter.stoveState = StoveState.COOKING;
        counter.cookingTimer = 0;
      }
      const mesh = Ingredient3DFactory.createMesh(this.heldItem);
      counter.itemHolder.add(mesh);
      this.setHeldItem(null);
      this.localPlayer.playOneShot('DROP');
      this.syncPlayerAnim('DROP');
      this.map.triggerCounterBounce(counter.id);
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
        this.localPlayer.playOneShot('DROP');
        this.syncPlayerAnim('DROP');
        this.map.triggerCounterBounce(counter.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(counter);
      } else if (this.heldItem.type === IngredientType.PLATE && counter.currentItem.type !== IngredientType.PLATE) {
        // Held plate picks up ingredient from counter!
        if (!this.heldItem.plateContents) this.heldItem.plateContents = [];
        this.heldItem.plateContents.push(counter.currentItem.type);

        counter.currentItem = null;
        counter.cookingTimer = 0;
        counter.stoveState = StoveState.IDLE;
        counter.itemHolder.clear();
        this.updateHeldMesh();
        this.localPlayer.playOneShot('PICKUP');
        this.syncPlayerAnim('PICKUP');
        this.map.triggerCounterBounce(counter.id);
        this.sound.playPickup();
        this.broadcastCounterUpdate(counter);
      }
    }
  }

  private landThrownItem(item: KitchenItem, x: number, z: number) {
    let closest: Counter3DData | null = null;
    let minDist = 0.85;
    for (const c of this.map.counters.values()) {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < minDist) {
        minDist = d;
        closest = c;
      }
    }

    if (closest && !closest.type.startsWith('crate_') && closest.type !== CounterType.TRASH && closest.type !== CounterType.DELIVERY) {
      if (!closest.currentItem) {
        if (closest.type === CounterType.STOVE && item.type !== IngredientType.RAW_MEAT && item.type !== IngredientType.COOKED_PATTY) {
          return;
        }
        closest.currentItem = item;
        if (closest.type === CounterType.STOVE && item.type === IngredientType.RAW_MEAT) {
          closest.stoveState = StoveState.COOKING;
          closest.cookingTimer = 0;
        }
        closest.itemHolder.clear();
        closest.itemHolder.add(Ingredient3DFactory.createMesh(item));
        this.map.triggerCounterBounce(closest.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(closest);
      }
    }
  }

  private handleThrow() {
    if (!this.heldItem) return;

    this.cancelActiveWorkOnMove();
    this.sound.playThrow();
    this.localPlayer.playOneShot('THROW');
    this.syncPlayerAnim('THROW');

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
        cutProgress: counter.cutProgress,
        stoveState: counter.stoveState,
        cookingTimer: counter.cookingTimer
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
    if (this.boundResize) window.removeEventListener('resize', this.boundResize);
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundKeyUp) window.removeEventListener('keyup', this.boundKeyUp);
    if (this.boundBlur) window.removeEventListener('blur', this.boundBlur);

    if (this.hud) {
      this.hud.destroy();
    }

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
