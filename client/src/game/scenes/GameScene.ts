import Phaser from 'phaser';
import { AssetGenerator } from '../../assets/AssetGenerator';
import { CounterType, IngredientType, KitchenItem, PlayerInput, OrderRecipe } from '../types';
import { KitchenCounter } from '../entities/KitchenCounter';
import { Player } from '../entities/Player';
import { MobileControls } from '../../controls/MobileControls';
import { RecipeManager } from '../recipes/RecipeManager';
import { SoundManager } from '../systems/SoundManager';
import { NetworkManager } from '../../multiplayer/NetworkManager';

interface RemoteChef {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  nameLabel: Phaser.GameObjects.Text;
  heldItemSprite?: Phaser.GameObjects.Sprite;
  targetX: number;
  targetY: number;
}

export class GameScene extends Phaser.Scene {
  public isMultiplayer = false;
  private network = NetworkManager.getInstance();

  private player!: Player;
  private counters: KitchenCounter[] = [];
  private counterMap = new Map<string, KitchenCounter>();
  private counterGroup!: Phaser.Physics.Arcade.StaticGroup;
  private mobileControls!: MobileControls;
  private recipeManager!: RecipeManager;

  // Remote Players
  private remotePlayers = new Map<string, RemoteChef>();

  // Desktop keyboard controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  // HUD
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private modeText!: Phaser.GameObjects.Text;
  private orderContainer!: Phaser.GameObjects.Container;
  private orderCards: Phaser.GameObjects.Container[] = [];

  // Match state
  private matchTimeRemaining = 180;
  private isGameOver = false;
  private lastNetworkSendTime = 0;
  private networkScore = 0;
  private networkCombo = 1;
  private currentRoomCode = '';

  constructor() {
    super('GameScene');
  }

  init(data: { isMultiplayer?: boolean; roomCode?: string; players?: any[] }) {
    this.isMultiplayer = Boolean(data && data.isMultiplayer);
    this.currentRoomCode = (data && data.roomCode) || this.network.room?.state?.roomCode || '';
  }

  create() {
    // 1. Generate procedural graphic textures
    AssetGenerator.generateAll(this);

    // 2. Build Kitchen Layout
    this.createKitchenMap();

    // 3. Initialize Recipe and Sound systems
    this.recipeManager = new RecipeManager();
    const sound = SoundManager.getInstance();

    // 4. Create Local Player Chef at OPEN SPACE (not on table!)
    this.player = new Player(this, 540, 278);

    // Physics Colliders: Player vs Counters
    this.physics.add.collider(this.player.sprite, this.counterGroup);

    // 5. Input Controls Setup
    this.setupDesktopInputs();
    this.mobileControls = new MobileControls(this);

    // 6. Setup HUD UI
    this.setupHUD();

    // 7. Setup Multiplayer Listeners if online
    if (this.isMultiplayer && this.network.room) {
      this.setupMultiplayerSync();
    }

    // Trigger audio init on click
    this.input.once('pointerdown', () => {
      sound.init();
    });
  }

  private setupMultiplayerSync() {
    const room = this.network.room!;
    const sound = SoundManager.getInstance();

    // 1. Real-time remote player move
    room.onMessage('remote_player_move', (data: { id: string; name: string; color: string; x: number; y: number; facingX: number; facingY: number }) => {
      if (data.id === this.network.mySessionId) return;

      let chef = this.remotePlayers.get(data.id);
      if (!chef) {
        chef = this.createRemotePlayer(data.id, data.name, data.color, data.x, data.y);
      }
      chef.targetX = data.x;
      chef.targetY = data.y;
      if (data.facingX < -0.2) chef.sprite.setFlipX(true);
      else if (data.facingX > 0.2) chef.sprite.setFlipX(false);
    });

    // 2. Remote player held item update
    room.onMessage('held_update', (data: { id: string; heldItem: any }) => {
      if (data.id === this.network.mySessionId) return;
      const chef = this.remotePlayers.get(data.id);
      if (!chef) return;

      if (!data.heldItem) {
        chef.heldItemSprite?.destroy();
        chef.heldItemSprite = undefined;
      } else {
        let tex = `item_${data.heldItem.type}`;
        if (data.heldItem.type === 'plate' && data.heldItem.plateContents?.length >= 4) {
          tex = 'item_burger';
        }
        if (!chef.heldItemSprite) {
          chef.heldItemSprite = this.add.sprite(0, -28, tex).setScale(0.8);
          chef.container.add(chef.heldItemSprite);
        } else {
          chef.heldItemSprite.setTexture(tex);
        }
      }
    });

    // 3. Counter state update from other players
    room.onMessage('counter_update', (data: any) => {
      const counter = this.counterMap.get(data.id);
      if (!counter) return;

      if (!data.item) {
        counter.currentItem = null;
        counter.updateItemVisual();
      } else {
        counter.currentItem = {
          id: `item_${data.id}`,
          type: data.item.type,
          plateContents: data.item.plateContents ? [...data.item.plateContents] : []
        };
        counter.updateItemVisual();
      }

      if (counter.type === CounterType.CUTTING_BOARD) {
        if (data.cutProgress > 0) counter.showProgressBar(data.cutProgress, 0x3b82f6);
        else counter.hideProgressBar();
      }

      if (counter.type === CounterType.STOVE) {
        if (data.stoveState === 'cooking') counter.showProgressBar(data.cookingTimer / 6.0, 0xf59e0b);
        else if (data.stoveState === 'burning') counter.showProgressBar((data.cookingTimer - 6.0) / 6.0, 0xef4444);
        else counter.hideProgressBar();
      }
    });

    // 4. Orders update from server
    room.onMessage('orders_update', (orders: any[]) => {
      const converted = orders.map(o => ({
        id: o.id,
        name: o.name,
        requiredIngredients: o.requiredIngredients as IngredientType[],
        maxTime: o.maxTime,
        remainingTime: o.remainingTime,
        rewardPoints: o.rewardPoints,
        iconTexture: 'item_burger'
      }));
      this.updateOrderTickets(converted);
    });

    // 5. Score & Combo update
    room.onMessage('score_update', (data: { score: number; combo: number }) => {
      this.networkScore = data.score;
      this.networkCombo = data.combo;
      this.scoreText.setText(`ĐIỂM: ${data.score}`);
      this.comboText.setText(`COMBO: x${data.combo}`);
    });

    // 6. Sound broadcast
    room.onMessage('play_sound', (data: { sound: string; points?: number }) => {
      if (data.sound === 'order_complete') {
        sound.playOrderComplete();
        if (data.points) this.showFloatingText(400, 140, `+${data.points}!`, '#10b981');
      } else if (data.sound === 'pickup') sound.playPickup();
      else if (data.sound === 'drop') sound.playDrop();
      else if (data.sound === 'trash') {
        sound.playTrash();
        if (data.points) this.showFloatingText(400, 140, 'SAI MÓN! -30', '#ef4444');
      }
    });

    // 7. Player Leave
    room.onMessage('remote_player_leave', (data: { id: string }) => {
      if (this.remotePlayers.has(data.id)) {
        this.remotePlayers.get(data.id)?.container.destroy();
        this.remotePlayers.delete(data.id);
      }
    });

    // 8. Game Over
    room.onMessage('game_over', (data: { finalScore: number }) => {
      this.endGame(data.finalScore);
    });
  }

  private createRemotePlayer(sessionId: string, name: string, color: string, x: number, y: number): RemoteChef {
    const container = this.add.container(x, y).setDepth(29);
    const sprite = this.add.sprite(0, 0, 'chef_player');

    const hexColor = parseInt((color || '#dc2626').replace('#', '0x'), 16);
    sprite.setTint(hexColor);

    const nameLabel = this.add.text(0, -32, name || 'Chef', {
      font: 'bold 11px Arial',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    container.add([sprite, nameLabel]);

    const chef: RemoteChef = {
      container,
      sprite,
      nameLabel,
      targetX: x,
      targetY: y
    };
    this.remotePlayers.set(sessionId, chef);
    return chef;
  }

  private createKitchenMap() {
    this.counterGroup = this.physics.add.staticGroup();

    const tileSize = 64;
    const startX = 352;
    const startY = 150;

    // Floor tiles
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 9; c++) {
        this.add.image(startX + c * tileSize, startY + r * tileSize, 'floor_tile').setDepth(1);
      }
    }

    const addCounter = (c: number, r: number, type: CounterType) => {
      const id = `counter_${c}_${r}`;
      const x = startX + c * tileSize;
      const y = startY + r * tileSize;
      const counter = new KitchenCounter(this, x, y, type, id);
      this.counters.push(counter);
      this.counterMap.set(id, counter);

      const staticBody = this.counterGroup.create(x, y, undefined) as Phaser.Physics.Arcade.Sprite;
      staticBody.setSize(tileSize, tileSize);
      staticBody.setVisible(false);
    };

    // TOP ROW
    addCounter(0, 0, CounterType.CLEAR);
    addCounter(1, 0, CounterType.CLEAR);
    addCounter(2, 0, CounterType.DELIVERY);
    addCounter(3, 0, CounterType.DELIVERY);
    addCounter(4, 0, CounterType.CLEAR);
    addCounter(5, 0, CounterType.CLEAR);
    addCounter(6, 0, CounterType.TRASH);
    addCounter(7, 0, CounterType.CLEAR);
    addCounter(8, 0, CounterType.CLEAR);

    // LEFT COLUMN
    addCounter(0, 1, CounterType.CRATE_BREAD);
    addCounter(0, 2, CounterType.CRATE_MEAT);
    addCounter(0, 3, CounterType.STOVE);
    addCounter(0, 4, CounterType.STOVE);
    addCounter(0, 5, CounterType.CLEAR);

    // RIGHT COLUMN
    addCounter(8, 1, CounterType.CRATE_LETTUCE);
    addCounter(8, 2, CounterType.CRATE_TOMATO);
    addCounter(8, 3, CounterType.CUTTING_BOARD);
    addCounter(8, 4, CounterType.CUTTING_BOARD);
    addCounter(8, 5, CounterType.CLEAR);

    // BOTTOM ROW
    addCounter(0, 6, CounterType.CLEAR);
    addCounter(1, 6, CounterType.CRATE_PLATE);
    addCounter(2, 6, CounterType.CRATE_PLATE);
    addCounter(3, 6, CounterType.CLEAR);
    addCounter(4, 6, CounterType.CLEAR);
    addCounter(5, 6, CounterType.CLEAR);
    addCounter(6, 6, CounterType.CLEAR);
    addCounter(7, 6, CounterType.CLEAR);
    addCounter(8, 6, CounterType.CLEAR);

    // CENTER ISLAND TABLE
    addCounter(3, 3, CounterType.CLEAR);
    addCounter(4, 3, CounterType.CLEAR);
    addCounter(5, 3, CounterType.CLEAR);
  }

  private setupDesktopInputs() {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  private setupHUD() {
    const { width } = this.scale;

    this.add.rectangle(width / 2, 35, width, 70, 0x0f172a, 0.85).setScrollFactor(0).setDepth(200);

    this.orderContainer = this.add.container(20, 10).setScrollFactor(0).setDepth(201);

    this.scoreText = this.add.text(width / 2, 20, 'ĐIỂM: 0', {
      font: 'bold 24px Arial',
      color: '#fbbf24'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.comboText = this.add.text(width / 2, 44, 'COMBO: x1', {
      font: 'bold 12px Arial',
      color: '#34d399'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.timerText = this.add.text(width - 40, 30, '03:00', {
      font: 'bold 24px Arial',
      color: '#ffffff'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(201);

    const code = this.currentRoomCode || (this.network.room as any)?.options?.roomCode || '';
    const modeLabel = this.isMultiplayer
      ? `PHÒNG ONLINE: ${code || '...'}`
      : 'CHẾ ĐỘ: SOLO LUYỆN TẬP';

    this.modeText = this.add.text(width - 40, 52, modeLabel, {
      font: 'bold 11px Arial',
      color: this.isMultiplayer ? '#38bdf8' : '#a0aec0'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(201);

    // Leave room button
    const exitBtn = this.add.rectangle(width - 15, 12, 18, 18, 0xef4444).setInteractive().setDepth(210);
    this.add.text(width - 15, 12, '✕', { font: 'bold 11px Arial', color: '#ffffff' }).setOrigin(0.5).setDepth(211);
    exitBtn.on('pointerdown', () => {
      this.network.leaveRoom();
      this.scene.start('LobbyScene');
    });
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;
    const deltaSeconds = delta / 1000;

    // Timer update
    this.matchTimeRemaining -= deltaSeconds;
    if (this.matchTimeRemaining <= 0) {
      this.matchTimeRemaining = 0;
      this.endGame(this.isMultiplayer ? this.networkScore : this.recipeManager.score);
    }

    const mins = Math.floor(this.matchTimeRemaining / 60);
    const secs = Math.floor(this.matchTimeRemaining % 60);
    this.timerText.setText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    if (this.matchTimeRemaining < 30) this.timerText.setColor('#ef4444');

    // Update orders & counters
    if (!this.isMultiplayer) {
      this.recipeManager.update(deltaSeconds);
      this.updateOrderTickets(this.recipeManager.getOrders());
    }

    for (const counter of this.counters) {
      counter.update(deltaSeconds);
    }

    // Controls
    const input = this.collectInputs();

    // Player action & movement (Instant local response!)
    this.player.update(deltaSeconds, input, this.counters, (item: KitchenItem) => {
      this.handleDelivery(item);
    });

    // Multiplayer Networking
    if (this.isMultiplayer && this.network.room) {
      // Send move update
      const now = Date.now();
      if (now - this.lastNetworkSendTime > 50) {
        this.network.sendMove(
          Math.round(this.player.sprite.x),
          Math.round(this.player.sprite.y),
          this.player.facingDirection.x,
          this.player.facingDirection.y
        );
        this.lastNetworkSendTime = now;
      }

      // If user pressed interact, notify server
      if (input.pickupDropJustPressed) {
        const nearest = this.findFacingCounter();
        if (nearest) {
          this.network.sendInteract(nearest.id);
        }
      }

      // If user held cutting action, notify server
      if (input.actionHeld) {
        const nearest = this.findFacingCounter();
        if (nearest && nearest.type === CounterType.CUTTING_BOARD) {
          this.network.sendAction(nearest.id, deltaSeconds);
        }
      } else {
        this.network.stopAction();
      }

      // Lerp remote players
      this.remotePlayers.forEach(chef => {
        chef.container.x = Phaser.Math.Linear(chef.container.x, chef.targetX, 0.35);
        chef.container.y = Phaser.Math.Linear(chef.container.y, chef.targetY, 0.35);
      });
    }

    this.mobileControls.postUpdate();
  }

  private findFacingCounter(): KitchenCounter | null {
    const interactDistance = 55;
    let closest: KitchenCounter | null = null;
    let minDistance = interactDistance;

    const reachX = this.player.sprite.x + this.player.facingDirection.x * 28;
    const reachY = this.player.sprite.y + this.player.facingDirection.y * 28;

    for (const counter of this.counters) {
      const dist = Phaser.Math.Distance.Between(reachX, reachY, counter.x, counter.y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = counter;
      }
    }

    return closest;
  }

  private handleDelivery(plateItem: KitchenItem) {
    if (!this.isMultiplayer) {
      const result = this.recipeManager.tryDeliver(plateItem);
      const sound = SoundManager.getInstance();

      if (result.success) {
        sound.playOrderComplete();
        this.scoreText.setText(`ĐIỂM: ${this.recipeManager.score}`);
        this.comboText.setText(`COMBO: x${this.recipeManager.combo}`);
        this.showFloatingText(400, 140, `+${result.pointsEarned}!`, '#10b981');
      } else {
        sound.playTrash();
        this.showFloatingText(400, 140, 'SAI MÓN! -30', '#ef4444');
        this.scoreText.setText(`ĐIỂM: ${this.recipeManager.score}`);
      }
    }
  }

  private collectInputs(): PlayerInput {
    let dx = 0;
    let dy = 0;

    if (this.cursors) {
      if (this.cursors.left.isDown || this.keyA?.isDown) dx -= 1;
      if (this.cursors.right.isDown || this.keyD?.isDown) dx += 1;
      if (this.cursors.up.isDown || this.keyW?.isDown) dy -= 1;
      if (this.cursors.down.isDown || this.keyS?.isDown) dy += 1;
    }

    if (Math.hypot(this.mobileControls.moveVector.x, this.mobileControls.moveVector.y) > 0.1) {
      dx = this.mobileControls.moveVector.x;
      dy = this.mobileControls.moveVector.y;
    }

    const actionHeld = Boolean(this.keySpace?.isDown || this.mobileControls.isActionPressed);
    const actionJustPressed = Boolean(Phaser.Input.Keyboard.JustDown(this.keySpace) || this.mobileControls.isActionJustPressed);
    const pickupDropJustPressed = Boolean(Phaser.Input.Keyboard.JustDown(this.keyE) || this.mobileControls.isPickupJustPressed);

    return { dx, dy, actionHeld, actionJustPressed, pickupDropJustPressed };
  }

  private showFloatingText(x: number, y: number, text: string, color: string) {
    const txt = this.add.text(x, y, text, {
      font: 'bold 22px Arial',
      color
    }).setOrigin(0.5).setDepth(300);

    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => txt.destroy()
    });
  }

  private updateOrderTickets(orders: OrderRecipe[]) {
    if (this.orderCards.length !== orders.length) {
      this.orderCards.forEach(c => c.destroy());
      this.orderCards = [];

      orders.forEach((order, index) => {
        const cardX = index * 115;
        const card = this.add.container(cardX, 0);

        const bg = this.add.rectangle(50, 24, 105, 48, 0x1e293b, 0.95)
          .setStrokeStyle(2, 0x475569);

        const title = this.add.text(50, 8, order.name, {
          font: 'bold 9px Arial',
          color: '#f8fafc'
        }).setOrigin(0.5);

        const iconContainer = this.add.container(50, 24);
        order.requiredIngredients.forEach((ing, i) => {
          const icon = this.add.sprite((i - (order.requiredIngredients.length - 1) / 2) * 16, 0, `item_${ing}`).setScale(0.45);
          iconContainer.add(icon);
        });

        const timeBarBg = this.add.rectangle(50, 42, 95, 4, 0x334155);
        const timeBarFill = this.add.rectangle(5, 42, 95, 4, 0x10b981).setOrigin(0, 0.5);

        card.add([bg, title, iconContainer, timeBarBg, timeBarFill]);
        this.orderContainer.add(card);
        this.orderCards.push(card);
      });
    }

    orders.forEach((order, index) => {
      const card = this.orderCards[index];
      if (!card) return;
      const fill = card.getAt(4) as Phaser.GameObjects.Rectangle;
      if (fill) {
        const ratio = Math.max(0, order.remainingTime / order.maxTime);
        fill.width = ratio * 95;
        if (ratio < 0.25) fill.setFillStyle(0xef4444);
        else if (ratio < 0.5) fill.setFillStyle(0xf59e0b);
        else fill.setFillStyle(0x10b981);
      }
    });
  }

  private endGame(finalScore: number) {
    this.isGameOver = true;
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(500);

    const dialog = this.add.container(width / 2, height / 2).setDepth(501);
    const box = this.add.rectangle(0, 0, 360, 240, 0x1e293b).setStrokeStyle(3, 0xf59e0b);
    const title = this.add.text(0, -70, 'HẾT GIỜ!', { font: 'bold 28px Arial', color: '#fbbf24' }).setOrigin(0.5);
    const score = this.add.text(0, -20, `TỔNG ĐIỂM: ${finalScore || 0}`, { font: 'bold 22px Arial', color: '#ffffff' }).setOrigin(0.5);

    const starRating = (finalScore || 0) >= 500 ? '⭐⭐⭐ ĐẦU BẾP 5 SAO!' : (finalScore || 0) >= 250 ? '⭐⭐ ĐẦU BẾP CHUYÊN NGHIỆP' : '⭐ TẬP SỰ';
    const rank = this.add.text(0, 20, starRating, { font: 'bold 16px Arial', color: '#34d399' }).setOrigin(0.5);

    const btn = this.add.rectangle(0, 70, 160, 42, 0x2563eb).setInteractive();
    const btnText = this.add.text(0, 70, 'VỀ SẢNH CHỜ', { font: 'bold 16px Arial', color: '#ffffff' }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      this.network.leaveRoom();
      this.scene.start('LobbyScene');
    });

    dialog.add([box, title, score, rank, btn, btnText]);
  }
}
