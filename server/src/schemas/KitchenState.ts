import { Schema, type, ArraySchema, MapSchema } from '@colyseus/schema';

export class ItemState extends Schema {
  @type('string') type: string = '';
  @type(['string']) plateContents = new ArraySchema<string>();
}

export class PlayerState extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = 'Chef';
  @type('string') color: string = '#2563eb';
  @type('boolean') isHost: boolean = false;
  @type('boolean') isReady: boolean = false;
  @type('number') x: number = 400;
  @type('number') y: number = 320;
  @type('number') facingX: number = 0;
  @type('number') facingY: number = 1;
  @type('boolean') isChopping: boolean = false;
  @type(ItemState) heldItem: ItemState | null = null;
}

export class CounterState extends Schema {
  @type('string') id: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('string') type: string = ''; // clear, cutting_board, stove, etc.
  @type('number') cutProgress: number = 0;
  @type('string') stoveState: string = 'idle'; // idle, cooking, cooked, burnt
  @type('number') cookingTimer: number = 0;
  @type(ItemState) item: ItemState | null = null;
}

export class OrderState extends Schema {
  @type('string') id: string = '';
  @type('string') recipeKey: string = '';
  @type('string') name: string = '';
  @type('number') remainingTime: number = 60;
  @type('number') maxTime: number = 60;
  @type('number') rewardPoints: number = 100;
  @type(['string']) requiredIngredients = new ArraySchema<string>();
}

export class KitchenRoomState extends Schema {
  @type('string') roomCode: string = '';
  @type('string') gameState: string = 'LOBBY'; // 'LOBBY' | 'PLAYING' | 'GAME_OVER'
  @type('number') matchTimeRemaining: number = 180;
  @type('number') score: number = 0;
  @type('number') combo: number = 1;

  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: CounterState }) counters = new MapSchema<CounterState>();
  @type([OrderState]) orders = new ArraySchema<OrderState>();
}
