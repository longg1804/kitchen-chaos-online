import { Room, Client } from 'colyseus';
import { KitchenRoomState, PlayerState, CounterState, ItemState, OrderState } from '../schemas/KitchenState';
import { ArraySchema } from '@colyseus/schema';

const CHEF_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706'];

export class KitchenRoom extends Room<KitchenRoomState> {
  maxClients = 4;
  private spawnInterval = 14;
  private timeSinceSpawn = 0;
  private orderCounter = 0;
  private currentMapId = 'traditional';

  // Expanded Recipe Catalog (Phase 3)
  private recipes = [
    {
      key: 'BURGER_COMPLETE',
      name: 'Burger Đầy Đủ',
      ingredients: ['bread', 'cooked_patty', 'chopped_lettuce', 'sliced_tomato'],
      points: 100
    },
    {
      key: 'BURGER_CHEESE',
      name: 'Burger Phô Mai',
      ingredients: ['bread', 'cooked_patty', 'sliced_cheese'],
      points: 80
    },
    {
      key: 'SUPER_BURGER',
      name: 'Burger Siêu Cấp',
      ingredients: ['bread', 'cooked_patty', 'sliced_cheese', 'chopped_lettuce', 'sliced_tomato'],
      points: 140
    },
    {
      key: 'FRESH_SALAD',
      name: 'Salad Tươi Mát',
      ingredients: ['chopped_lettuce', 'sliced_tomato'],
      points: 60
    }
  ];

  onCreate(options: any) {
    this.setState(new KitchenRoomState());

    const roomCode = options.roomCode || this.generateNumericRoomCode();
    this.state.roomCode = roomCode;
    this.setMetadata({ roomCode });

    console.log(`[KitchenRoom] Room created with 6-digit Code: ${roomCode}`);

    this.initKitchenMap();

    // Map change from host
    this.onMessage('change_map', (client, data: { mapId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.isHost) {
        this.currentMapId = data.mapId;
        this.broadcast('map_changed', { mapId: data.mapId });
      }
    });

    this.onMessage('set_ready', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.isReady = !player.isReady;
        this.broadcastPlayerList();
      }
    });

    this.onMessage('start_game', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.isHost) {
        this.state.gameState = 'PLAYING';
        this.state.matchTimeRemaining = 180;
        this.state.score = 0;
        this.state.combo = 1;

        this.spawnOrder();
        this.spawnOrder();

        const playersList = this.getPlayerListData();

        this.broadcast('game_started', {
          roomCode: this.state.roomCode,
          mapId: this.currentMapId,
          players: playersList
        });
      }
    });

    this.onMessage('player_move', (client, data: { x: number; y: number; facingX: number; facingY: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.facingX = data.facingX;
        player.facingY = data.facingY;

        this.broadcast('remote_player_move', {
          id: client.sessionId,
          name: player.name,
          color: player.color,
          x: data.x,
          y: data.y,
          facingX: data.facingX,
          facingY: data.facingY
        }, { except: client });
      }
    });

    // Throwing Mechanic Broadcast
    this.onMessage('player_throw', (client, data: { item: any; startX: number; startY: number; targetX: number; targetY: number }) => {
      this.broadcast('player_throw', {
        id: client.sessionId,
        item: data.item,
        startX: data.startX,
        startY: data.startY,
        targetX: data.targetX,
        targetY: data.targetY
      }, { except: client });
    });

    // Dash Synchronization with Anti-Spam Server Cooldown
    const lastDashMap = new Map<string, number>();
    this.onMessage('player_dash', (client, data: { dirX: number; dirZ: number; duration: number }) => {
      const now = Date.now();
      const last = lastDashMap.get(client.sessionId) || 0;
      if (now - last < 1300) {
        return;
      }
      lastDashMap.set(client.sessionId, now);

      this.broadcast('remote_player_dash', {
        id: client.sessionId,
        dirX: data.dirX,
        dirZ: data.dirZ,
        duration: data.duration || 0.28
      }, { except: client });
    });

    this.onMessage('held_update', (client, data: { item: any }) => {
      this.broadcast('remote_held_update', {
        id: client.sessionId,
        item: data.item
      }, { except: client });
    });

    this.onMessage('player_action', (client, data: { counterId: string; delta: number }) => {
      const player = this.state.players.get(client.sessionId);
      const counter = this.state.counters.get(data.counterId);

      if (player && counter) {
        if (counter.type === 'cutting_board' && counter.item) {
          player.isChopping = true;
          const canCut = ['lettuce', 'tomato', 'cheese'];
          if (canCut.includes(counter.item.type)) {
            counter.cutProgress += data.delta / 2.2;
            if (counter.cutProgress >= 1.0) {
              counter.cutProgress = 0;
              if (counter.item.type === 'lettuce') counter.item.type = 'chopped_lettuce';
              else if (counter.item.type === 'tomato') counter.item.type = 'sliced_tomato';
              else if (counter.item.type === 'cheese') counter.item.type = 'sliced_cheese';
            }
            this.broadcast('counter_update', {
              id: counter.id,
              type: counter.type,
              item: counter.item ? { type: counter.item.type, plateContents: [...counter.item.plateContents] } : null,
              cutProgress: counter.cutProgress,
              stoveState: counter.stoveState,
              cookingTimer: counter.cookingTimer
            });
          }
        }
      }
    });

    this.onMessage('stop_action', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) player.isChopping = false;
    });

    this.onMessage('player_interact', (client, data: { counterId: string; localHeldItem?: any }) => {
      const player = this.state.players.get(client.sessionId);
      const counter = this.state.counters.get(data.counterId);
      if (!player || !counter) return;
      this.handlePlayerInteract(player, counter, client, data.localHeldItem);
    });

    this.setSimulationInterval((deltaTime) => this.update(deltaTime / 1000));
  }

  public getPlayerListData() {
    const list: Array<{
      id: string;
      name: string;
      color: string;
      isHost: boolean;
      isReady: boolean;
      x: number;
      y: number;
    }> = [];

    this.state.players.forEach((player, sessionId) => {
      list.push({
        id: sessionId,
        name: player.name,
        color: player.color,
        isHost: player.isHost,
        isReady: player.isReady,
        x: player.x,
        y: player.y
      });
    });

    return list;
  }

  public broadcastPlayerList() {
    this.broadcast('players_update', this.getPlayerListData());
  }

  private handlePlayerInteract(player: PlayerState, counter: CounterState, client: Client, clientItem?: any) {
    if (counter.type === 'trash') {
      player.heldItem = null;
      this.broadcast('play_sound', { sound: 'trash' });
      this.broadcast('held_update', { id: client.sessionId, heldItem: null });
      return;
    }

    if (counter.type === 'delivery') {
      if (player.heldItem && player.heldItem.type === 'plate') {
        const result = this.tryDeliver(player.heldItem);
        player.heldItem = null;
        this.broadcast('held_update', { id: client.sessionId, heldItem: null });

        if (result.success) {
          this.state.score += result.points;
          this.state.combo = Math.min(4, this.state.combo + 1);
          this.broadcast('play_sound', { sound: 'order_complete', points: result.points });
          this.broadcast('score_update', { score: this.state.score, combo: this.state.combo });
          this.spawnOrder();
        } else {
          this.state.score = Math.max(0, this.state.score - 30);
          this.state.combo = 1;
          this.broadcast('play_sound', { sound: 'trash', points: -30 });
          this.broadcast('score_update', { score: this.state.score, combo: this.state.combo });
        }
      }
      return;
    }

    if (counter.type.startsWith('crate_')) {
      if (!player.heldItem) {
        const item = new ItemState();
        if (counter.type === 'crate_bread') item.type = 'bread';
        else if (counter.type === 'crate_meat') item.type = 'raw_meat';
        else if (counter.type === 'crate_lettuce') item.type = 'lettuce';
        else if (counter.type === 'crate_tomato') item.type = 'tomato';
        else if (counter.type === 'crate_cheese') item.type = 'cheese';
        else if (counter.type === 'crate_plate') {
          item.type = 'plate';
          item.plateContents = new ArraySchema<string>();
        }
        player.heldItem = item;
        this.broadcast('play_sound', { sound: 'pickup' });
        this.broadcast('held_update', {
          id: client.sessionId,
          heldItem: { type: item.type, plateContents: [...item.plateContents] }
        });
      }
      return;
    }

    if (player.heldItem) {
      if (!counter.item) {
        counter.item = player.heldItem;
        player.heldItem = null;
        this.broadcast('play_sound', { sound: 'drop' });
      } else {
        const allowed = ['bread', 'cooked_patty', 'chopped_lettuce', 'sliced_tomato', 'sliced_cheese'];

        if (counter.item.type === 'plate' && allowed.includes(player.heldItem.type)) {
          if (!counter.item.plateContents.includes(player.heldItem.type)) {
            counter.item.plateContents.push(player.heldItem.type);
            player.heldItem = null;
            this.broadcast('play_sound', { sound: 'drop' });
          }
        } else if (player.heldItem.type === 'plate' && allowed.includes(counter.item.type)) {
          if (!player.heldItem.plateContents.includes(counter.item.type)) {
            player.heldItem.plateContents.push(counter.item.type);
            counter.item = null;
            counter.cookingTimer = 0;
            counter.stoveState = 'idle';
            this.broadcast('play_sound', { sound: 'pickup' });
          }
        }
      }
    } else {
      if (counter.item) {
        player.heldItem = counter.item;
        counter.item = null;
        counter.cookingTimer = 0;
        counter.stoveState = 'idle';
        counter.cutProgress = 0;
        this.broadcast('play_sound', { sound: 'pickup' });
      }
    }

    this.broadcast('counter_update', {
      id: counter.id,
      type: counter.type,
      item: counter.item ? { type: counter.item.type, plateContents: [...counter.item.plateContents] } : null,
      cutProgress: counter.cutProgress,
      stoveState: counter.stoveState,
      cookingTimer: counter.cookingTimer
    });

    this.broadcast('held_update', {
      id: client.sessionId,
      heldItem: player.heldItem ? { type: player.heldItem.type, plateContents: [...player.heldItem.plateContents] } : null
    });
  }

  private tryDeliver(plateItem: ItemState): { success: boolean; points: number } {
    const contents = [...plateItem.plateContents].sort();

    for (let i = 0; i < this.state.orders.length; i++) {
      const order = this.state.orders[i];
      if (!order) continue;
      const req = [...order.requiredIngredients].sort();

      if (contents.length === req.length && contents.every((v, idx) => v === req[idx])) {
        const points = order.rewardPoints * this.state.combo;
        this.state.orders.splice(i, 1);
        return { success: true, points };
      }
    }

    return { success: false, points: 0 };
  }

  private spawnOrder() {
    if (this.state.orders.length >= 3) return;

    this.orderCounter++;
    const chosen = this.recipes[Math.floor(Math.random() * this.recipes.length)];

    const order = new OrderState();
    order.id = `order_${this.orderCounter}`;
    order.recipeKey = chosen.key;
    order.name = chosen.name;
    order.remainingTime = 65;
    order.maxTime = 65;
    order.rewardPoints = chosen.points;
    order.requiredIngredients = new ArraySchema<string>(...chosen.ingredients);

    this.state.orders.push(order);
    this.broadcastOrders();
  }

  private broadcastOrders() {
    const list = this.state.orders.map(o => ({
      id: o.id,
      name: o.name,
      remainingTime: o.remainingTime,
      maxTime: o.maxTime,
      rewardPoints: o.rewardPoints,
      requiredIngredients: [...o.requiredIngredients]
    }));
    this.broadcast('orders_update', list);
  }

  update(deltaSeconds: number) {
    if (this.state.gameState !== 'PLAYING') return;

    this.state.matchTimeRemaining -= deltaSeconds;
    if (this.state.matchTimeRemaining <= 0) {
      this.state.matchTimeRemaining = 0;
      this.state.gameState = 'GAME_OVER';
      this.broadcast('game_over', { finalScore: this.state.score });
      return;
    }

    let orderChanged = false;
    for (let i = this.state.orders.length - 1; i >= 0; i--) {
      const order = this.state.orders[i];
      if (!order) continue;
      order.remainingTime -= deltaSeconds;
      if (order.remainingTime <= 0) {
        this.state.orders.splice(i, 1);
        this.state.score = Math.max(0, this.state.score - 30);
        this.state.combo = 1;
        this.broadcast('play_sound', { sound: 'trash', points: -30 });
        this.broadcast('score_update', { score: this.state.score, combo: this.state.combo });
        orderChanged = true;
      }
    }

    this.timeSinceSpawn += deltaSeconds;
    if (this.state.orders.length < 3 && this.timeSinceSpawn >= this.spawnInterval) {
      this.spawnOrder();
      this.timeSinceSpawn = 0;
      orderChanged = true;
    }

    if (orderChanged) {
      this.broadcastOrders();
    }

    this.state.counters.forEach((counter) => {
      if (counter.type === 'stove' && counter.item) {
        if (counter.item.type === 'raw_meat') {
          counter.cookingTimer += deltaSeconds;
          counter.stoveState = 'cooking';
          if (counter.cookingTimer >= 5.5) {
            counter.item.type = 'cooked_patty';
            counter.stoveState = 'cooked';
            this.broadcast('counter_update', {
              id: counter.id,
              type: counter.type,
              item: { type: 'cooked_patty', plateContents: [] },
              cutProgress: 0,
              stoveState: 'cooked',
              cookingTimer: counter.cookingTimer
            });
          }
        } else if (counter.item.type === 'cooked_patty') {
          counter.cookingTimer += deltaSeconds;
          if (counter.cookingTimer >= 8.5 && counter.stoveState !== 'burning') {
            counter.stoveState = 'burning';
            this.broadcast('counter_update', {
              id: counter.id,
              type: counter.type,
              item: { type: 'cooked_patty', plateContents: [] },
              cutProgress: 0,
              stoveState: 'burning',
              cookingTimer: counter.cookingTimer
            });
          }
          if (counter.cookingTimer >= 11.0 && counter.stoveState !== 'burnt') {
            counter.item.type = 'burnt_patty';
            counter.stoveState = 'burnt';
            this.broadcast('counter_update', {
              id: counter.id,
              type: counter.type,
              item: { type: 'burnt_patty', plateContents: [] },
              cutProgress: 0,
              stoveState: 'burnt',
              cookingTimer: counter.cookingTimer
            });
          }
        }
      }
    });
  }

  onJoin(client: Client, options: { name?: string }) {
    client.send('room_code', this.state.roomCode);

    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = options.name || `Chef ${this.state.players.size + 1}`;
    player.color = CHEF_COLORS[this.state.players.size % CHEF_COLORS.length];

    const spawnOffsets = [
      { x: 540, y: 278 },
      { x: 740, y: 278 },
      { x: 540, y: 460 },
      { x: 740, y: 460 }
    ];
    const spot = spawnOffsets[this.state.players.size % spawnOffsets.length];
    player.x = spot.x;
    player.y = spot.y;

    if (this.state.players.size === 0) {
      player.isHost = true;
      player.isReady = true;
    }

    this.state.players.set(client.sessionId, player);
    this.broadcastPlayerList();
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    const wasHost = player?.isHost;

    this.state.players.delete(client.sessionId);
    console.log(`[KitchenRoom] Player ${client.sessionId} left room ${this.state.roomCode}`);

    if (wasHost && this.state.players.size > 0) {
      const nextHost = this.state.players.values().next().value;
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.isReady = true;
      }
    }

    this.broadcastPlayerList();
    this.broadcast('remote_player_leave', { id: client.sessionId });
  }

  private generateNumericRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private initKitchenMap() {
    const tileSize = 64;
    const startX = 352;
    const startY = 150;

    const add = (c: number, r: number, type: string) => {
      const id = `counter_${c}_${r}`;
      const counter = new CounterState();
      counter.id = id;
      counter.x = startX + c * tileSize;
      counter.y = startY + r * tileSize;
      counter.type = type;
      this.state.counters.set(id, counter);
    };

    // TOP ROW
    add(0, 0, 'clear');
    add(1, 0, 'clear');
    add(2, 0, 'delivery');
    add(3, 0, 'delivery');
    add(4, 0, 'clear');
    add(5, 0, 'clear');
    add(6, 0, 'trash');
    add(7, 0, 'clear');
    add(8, 0, 'clear');

    // LEFT COLUMN
    add(0, 1, 'crate_bread');
    add(0, 2, 'crate_meat');
    add(0, 3, 'stove');
    add(0, 4, 'stove');
    add(0, 5, 'clear');

    // RIGHT COLUMN (with Cheese crate)
    add(8, 1, 'crate_lettuce');
    add(8, 2, 'crate_tomato');
    add(8, 3, 'crate_cheese');
    add(8, 4, 'cutting_board');
    add(8, 5, 'cutting_board');

    // BOTTOM ROW
    add(0, 6, 'clear');
    add(1, 6, 'crate_plate');
    add(2, 6, 'crate_plate');
    add(3, 6, 'clear');
    add(4, 6, 'clear');
    add(5, 6, 'clear');
    add(6, 6, 'clear');
    add(7, 6, 'clear');
    add(8, 6, 'clear');

    // CENTER ISLAND
    add(3, 3, 'clear');
    add(4, 3, 'clear');
    add(5, 3, 'clear');
  }
}
