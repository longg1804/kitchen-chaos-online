import Phaser from 'phaser';
import { AssetGenerator } from '../../assets/AssetGenerator';
import { CounterType, IngredientType, KitchenItem, PlayerInput, OrderRecipe, ChefSkin, KitchenMapId } from '../types';
import { KitchenCounter } from '../entities/KitchenCounter';
import { Player } from '../entities/Player';
import { MobileControls } from '../../controls/MobileControls';
import { RecipeManager } from '../recipes/RecipeManager';
import { SoundManager } from '../systems/SoundManager';
import { NetworkManager } from '../../multiplayer/NetworkManager';
import { GameScene3D } from '../../game3d/scenes/GameScene3D';

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
  private gameScene3D?: GameScene3D;

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
  private keyQ!: Phaser.Input.Keyboard.Key;
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
  private currentMap: KitchenMapId = KitchenMapId.TRADITIONAL;
  private currentSkin: string = 'chef_classic';

  constructor() {
    super('GameScene');
  }

  init(data: { isMultiplayer?: boolean; roomCode?: string; mapId?: KitchenMapId; skin?: string }) {
    this.isMultiplayer = Boolean(data && data.isMultiplayer);
    this.currentRoomCode = (data && data.roomCode) || (this.network.room as any)?.options?.roomCode || '';
    this.currentMap = (data && data.mapId) || KitchenMapId.TRADITIONAL;
    this.currentSkin = (data && data.skin) || 'chef_classic';
  }

  create() {
    // 1. Hide 2D Phaser Canvas and launch 3D Three.js Isometric Engine
    if (this.game.canvas) {
      this.game.canvas.style.display = 'none';
    }

    const container = document.getElementById('game-container') || document.body;
    this.gameScene3D = new GameScene3D(container, {
      isMultiplayer: this.isMultiplayer,
      roomCode: this.currentRoomCode,
      mapId: this.currentMap,
      skin: this.currentSkin,
      playerName: localStorage.getItem('kitchen_chaos_player_name') || 'Đầu Bếp',
      onExit: () => {
        if (this.game.canvas) {
          this.game.canvas.style.display = 'block';
        }
        this.network.leaveRoom();
        this.scene.start('LobbyScene');
      }
    });

    this.events.once('shutdown', () => {
      this.gameScene3D?.destroy();
      this.gameScene3D = undefined;
      if (this.game.canvas) {
        this.game.canvas.style.display = 'block';
      }
    });
  }

  private setupMultiplayerSync() {
    const room = this.network.room!;
    const sound = SoundManager.getInstance();

    // 1. Remote player movement
    room.onMessage('remote_player_move', (data: { id: string; name: string; color: string; skin?: string; x: number; y: number; facingX: number; facingY: number }) => {
      if (data.id === this.network.mySessionId) return;

      let chef = this.remotePlayers.get(data.id);
      if (!chef) {
        chef = this.createRemotePlayer(data.id, data.name, data.color, data.skin || 'chef_classic', data.x, data.y);
      }
      chef.targetX = data.x;
      chef.targetY = data.y;
      if (data.facingX < -0.2) chef.sprite.setFlipX(true);
      else if (data.facingX > 0.2) chef.sprite.setFlipX(false);
    });

    // 2. Remote player held item
    room.onMessage('held_update', (data: { id: string; heldItem: any }) => {
      if (data.id === this.network.mySessionId) return;
      const chef = this.remotePlayers.get(data.id);
      if (!chef) return;

      if (!data.heldItem) {
        chef.heldItemSprite?.destroy();
        chef.heldItemSprite = undefined;
      } else {
        let tex = `item_${data.heldItem.type}`;
        if (data.heldItem.type === 'plate' && data.heldItem.plateContents?.length >= 3) {
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

    // 3. Remote Player Throw Animation
    room.onMessage('player_throw', (data: { id: string; item: any; startX: number; startY: number; targetX: number; targetY: number }) => {
      if (data.id === this.network.mySessionId) return;

      const flying = this.add.sprite(data.startX, data.startY, `item_${data.item.type}`).setDepth(45);
      this.tweens.add({
        targets: flying,
        x: data.targetX,
        y: data.targetY,
        duration: 350,
        ease: 'Quad.easeOut',
        onComplete: () => flying.destroy()
      });
      sound.playDrop();
    });

    // 4. Counter updates
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

    // 5. Orders update
    room.onMessage('orders_update', (orders: any[]) => {
      const converted = orders.map(o => ({
        id: o.id,
        name: o.name,
        requiredIngredients: o.requiredIngredients as IngredientType[],
        maxTime: o.maxTime,
        remainingTime: o.remainingTime,
        rewardPoints: o.rewardPoints,
        iconTexture: o.requiredIngredients.length === 2 && !o.requiredIngredients.includes('bread') ? 'item_salad' : 'item_burger'
      }));
      this.updateOrderTickets(converted);
    });

    // 6. Score & Combo
    room.onMessage('score_update', (data: { score: number; combo: number }) => {
      this.networkScore = data.score;
      this.networkCombo = data.combo;
      this.scoreText.setText(`ĐIỂM: ${data.score}`);
      this.comboText.setText(`COMBO: x${data.combo}`);
    });

    // 7. Sound
    room.onMessage('play_sound', (data: { sound: string; points?: number }) => {
      if (data.sound === 'order_complete') {
        sound.playOrderComplete();
        if (data.points) this.showFloatingText(640, 140, `+${data.points}!`, '#10b981');
      } else if (data.sound === 'pickup') sound.playPickup();
      else if (data.sound === 'drop') sound.playDrop();
      else if (data.sound === 'trash') {
        sound.playTrash();
        if (data.points) this.showFloatingText(640, 140, 'SAI MÓN! -30', '#ef4444');
      }
    });

    // 8. Player Leave
    room.onMessage('remote_player_leave', (data: { id: string }) => {
      if (this.remotePlayers.has(data.id)) {
        this.remotePlayers.get(data.id)?.container.destroy();
        this.remotePlayers.delete(data.id);
      }
    });

    // 9. Game Over
    room.onMessage('game_over', (data: { finalScore: number }) => {
      this.endGame(data.finalScore);
    });
  }

  private createRemotePlayer(sessionId: string, name: string, color: string, skin: string, x: number, y: number): RemoteChef {
    const container = this.add.container(x, y).setDepth(29);
    const sprite = this.add.sprite(0, 0, skin || 'chef_classic');

    const nameLabel = this.add.text(0, -32, name || 'Chef', {
      font: 'bold 12px Arial',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.65)',
      padding: { x: 5, y: 2 }
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

    // MAP VARIATION 1: Traditional Kitchen with Cheese & Salad
    if (this.currentMap === KitchenMapId.TRADITIONAL) {
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

      // LEFT COLUMN: Bread, Meat, Stove x2
      addCounter(0, 1, CounterType.CRATE_BREAD);
      addCounter(0, 2, CounterType.CRATE_MEAT);
      addCounter(0, 3, CounterType.STOVE);
      addCounter(0, 4, CounterType.STOVE);
      addCounter(0, 5, CounterType.CLEAR);

      // RIGHT COLUMN: Lettuce, Tomato, Cheese, Cutting x2
      addCounter(8, 1, CounterType.CRATE_LETTUCE);
      addCounter(8, 2, CounterType.CRATE_TOMATO);
      addCounter(8, 3, CounterType.CRATE_CHEESE);
      addCounter(8, 4, CounterType.CUTTING_BOARD);
      addCounter(8, 5, CounterType.CUTTING_BOARD);

      // BOTTOM ROW: Plate Crates & Clear
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
    // MAP VARIATION 2: Conveyor Kitchen
    else if (this.currentMap === KitchenMapId.CONVEYOR) {
      // Top Row
      addCounter(0, 0, CounterType.CLEAR);
      addCounter(2, 0, CounterType.DELIVERY);
      addCounter(3, 0, CounterType.DELIVERY);
      addCounter(6, 0, CounterType.TRASH);
      addCounter(8, 0, CounterType.CLEAR);

      // Left: Crates
      addCounter(0, 1, CounterType.CRATE_BREAD);
      addCounter(0, 2, CounterType.CRATE_MEAT);
      addCounter(0, 3, CounterType.CRATE_CHEESE);
      addCounter(0, 4, CounterType.STOVE);
      addCounter(0, 5, CounterType.STOVE);

      // Right: Veggies & Cutting
      addCounter(8, 1, CounterType.CRATE_LETTUCE);
      addCounter(8, 2, CounterType.CRATE_TOMATO);
      addCounter(8, 3, CounterType.CUTTING_BOARD);
      addCounter(8, 4, CounterType.CUTTING_BOARD);
      addCounter(8, 5, CounterType.CLEAR);

      // Bottom Row
      addCounter(0, 6, CounterType.CLEAR);
      addCounter(2, 6, CounterType.CRATE_PLATE);
      addCounter(6, 6, CounterType.CRATE_PLATE);
      addCounter(8, 6, CounterType.CLEAR);

      // Conveyor in the middle
      addCounter(3, 3, CounterType.CONVEYOR_LEFT);
      addCounter(4, 3, CounterType.CLEAR);
      addCounter(5, 3, CounterType.CONVEYOR_RIGHT);
    }
    // MAP VARIATION 3: Split Divided Kitchen (Must Throw ingredients!)
    else {
      // Top row
      addCounter(0, 0, CounterType.CRATE_BREAD);
      addCounter(1, 0, CounterType.CRATE_MEAT);
      addCounter(2, 0, CounterType.CRATE_CHEESE);
      addCounter(3, 0, CounterType.CRATE_LETTUCE);
      addCounter(4, 0, CounterType.CLEAR);
      addCounter(5, 0, CounterType.DELIVERY);
      addCounter(6, 0, CounterType.DELIVERY);
      addCounter(7, 0, CounterType.TRASH);
      addCounter(8, 0, CounterType.CLEAR);

      // Dividing Wall in the center (column 4 completely blocked!)
      addCounter(4, 1, CounterType.CLEAR);
      addCounter(4, 2, CounterType.CLEAR);
      addCounter(4, 3, CounterType.CLEAR);
      addCounter(4, 4, CounterType.CLEAR);
      addCounter(4, 5, CounterType.CLEAR);

      // Left Side: Crates & Prep
      addCounter(0, 3, CounterType.CRATE_TOMATO);
      addCounter(0, 6, CounterType.CRATE_PLATE);

      // Right Side: Cooking & Cutting
      addCounter(8, 2, CounterType.STOVE);
      addCounter(8, 3, CounterType.STOVE);
      addCounter(8, 4, CounterType.CUTTING_BOARD);
      addCounter(8, 5, CounterType.CUTTING_BOARD);
      addCounter(8, 6, CounterType.CRATE_PLATE);
    }
  }

  private setupDesktopInputs() {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  private setupHUD() {
    const { width } = this.scale;

    this.add.rectangle(width / 2, 40, width, 80, 0x0f172a, 0.9).setScrollFactor(0).setDepth(200);

    this.orderContainer = this.add.container(25, 12).setScrollFactor(0).setDepth(201);

    this.scoreText = this.add.text(width / 2, 24, 'ĐIỂM: 0', {
      font: '900 28px Arial',
      color: '#fbbf24'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.comboText = this.add.text(width / 2, 52, 'COMBO: x1', {
      font: 'bold 14px Arial',
      color: '#34d399'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.timerText = this.add.text(width - 50, 36, '03:00', {
      font: '900 28px Arial',
      color: '#ffffff'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(201);

    const code = this.currentRoomCode || (this.network.room as any)?.options?.roomCode || '';
    const modeLabel = this.isMultiplayer
      ? `PHÒNG ONLINE: ${code || '...'}`
      : 'CHẾ ĐỘ: SOLO LUYỆN TẬP';

    this.modeText = this.add.text(width - 50, 62, modeLabel, {
      font: 'bold 12px Arial',
      color: this.isMultiplayer ? '#38bdf8' : '#a0aec0'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(201);

    // Leave room button
    const exitBtn = this.add.rectangle(width - 20, 15, 24, 24, 0xef4444).setInteractive().setDepth(210);
    this.add.text(width - 20, 15, '✕', { font: 'bold 13px Arial', color: '#ffffff' }).setOrigin(0.5).setDepth(211);
    exitBtn.on('pointerdown', () => {
      this.network.leaveRoom();
      this.scene.start('LobbyScene');
    });
  }

  update(time: number, delta: number) {
    if (this.gameScene3D) {
      return;
    }

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

    if (!this.isMultiplayer) {
      this.recipeManager.update(deltaSeconds);
      this.updateOrderTickets(this.recipeManager.getOrders());
    }

    for (const counter of this.counters) {
      counter.update(deltaSeconds);
    }

    const input = this.collectInputs();

    // Player action & movement (Instant local response!)
    this.player.update(
      deltaSeconds,
      input,
      this.counters,
      (item: KitchenItem) => {
        this.handleDelivery(item);
      },
      (thrownItem, startX, startY, targetX, targetY) => {
        if (this.isMultiplayer && this.network.room) {
          this.network.room.send('player_throw', {
            item: thrownItem,
            startX,
            startY,
            targetX,
            targetY
          });
        }
      }
    );

    // Multiplayer Networking
    if (this.isMultiplayer && this.network.room) {
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

      if (input.pickupDropJustPressed) {
        const nearest = this.findFacingCounter();
        if (nearest) {
          this.network.sendInteract(nearest.id);
        }
      }

      if (input.actionHeld) {
        const nearest = this.findFacingCounter();
        if (nearest && nearest.type === CounterType.CUTTING_BOARD) {
          this.network.sendAction(nearest.id, deltaSeconds);
        }
      } else {
        this.network.stopAction();
      }

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
        this.showFloatingText(640, 140, `+${result.pointsEarned}!`, '#10b981');
      } else {
        sound.playTrash();
        this.showFloatingText(640, 140, 'SAI MÓN! -30', '#ef4444');
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
    const throwJustPressed = Boolean((this.keyQ && Phaser.Input.Keyboard.JustDown(this.keyQ)) || this.mobileControls.isThrowJustPressed);

    return { dx, dy, actionHeld, actionJustPressed, pickupDropJustPressed, throwJustPressed };
  }

  private showFloatingText(x: number, y: number, text: string, color: string) {
    const txt = this.add.text(x, y, text, {
      font: 'bold 24px Arial',
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
        const cardX = index * 125;
        const card = this.add.container(cardX, 0);

        const bg = this.add.rectangle(55, 26, 115, 52, 0x1e293b, 0.95)
          .setStrokeStyle(2, 0x475569);

        const title = this.add.text(55, 9, order.name, {
          font: 'bold 10px Arial',
          color: '#f8fafc'
        }).setOrigin(0.5);

        const iconContainer = this.add.container(55, 26);
        order.requiredIngredients.forEach((ing, i) => {
          const icon = this.add.sprite((i - (order.requiredIngredients.length - 1) / 2) * 16, 0, `item_${ing}`).setScale(0.48);
          iconContainer.add(icon);
        });

        const timeBarBg = this.add.rectangle(55, 45, 105, 5, 0x334155);
        const timeBarFill = this.add.rectangle(5, 45, 105, 5, 0x10b981).setOrigin(0, 0.5);

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
        fill.width = ratio * 105;
        if (ratio < 0.25) fill.setFillStyle(0xef4444);
        else if (ratio < 0.5) fill.setFillStyle(0xf59e0b);
        else fill.setFillStyle(0x10b981);
      }
    });
  }

  private endGame(finalScore: number) {
    this.isGameOver = true;
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setDepth(500);

    const dialog = this.add.container(width / 2, height / 2).setDepth(501);
    const box = this.add.rectangle(0, 0, 420, 260, 0x1e293b).setStrokeStyle(3, 0xf59e0b);
    const title = this.add.text(0, -80, 'HẾT GIỜ!', { font: '900 32px Arial', color: '#fbbf24' }).setOrigin(0.5);
    const score = this.add.text(0, -25, `TỔNG ĐIỂM: ${finalScore || 0}`, { font: 'bold 24px Arial', color: '#ffffff' }).setOrigin(0.5);

    const starRating = (finalScore || 0) >= 500 ? '⭐⭐⭐ ĐẦU BẾP 5 SAO!' : (finalScore || 0) >= 250 ? '⭐⭐ ĐẦU BẾP CHUYÊN NGHIỆP' : '⭐ TẬP SỰ';
    const rank = this.add.text(0, 20, starRating, { font: 'bold 18px Arial', color: '#34d399' }).setOrigin(0.5);

    const btn = this.add.rectangle(0, 80, 180, 46, 0x2563eb).setInteractive();
    const btnText = this.add.text(0, 80, 'VỀ SẢNH CHỜ', { font: 'bold 16px Arial', color: '#ffffff' }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      this.network.leaveRoom();
      this.scene.start('LobbyScene');
    });

    dialog.add([box, title, score, rank, btn, btnText]);
  }
}
