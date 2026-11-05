export enum IngredientType {
  BREAD = 'bread',
  RAW_MEAT = 'raw_meat',
  COOKED_PATTY = 'cooked_patty',
  BURNT_PATTY = 'burnt_patty',
  LETTUCE = 'lettuce',
  CHOPPED_LETTUCE = 'chopped_lettuce',
  TOMATO = 'tomato',
  SLICED_TOMATO = 'sliced_tomato',
  PLATE = 'plate'
}

export interface KitchenItem {
  id: string;
  type: IngredientType;
  // If it's a plate, it can carry multiple ingredients!
  plateContents?: IngredientType[];
}

export enum CounterType {
  CLEAR = 'clear',               // Bàn trống đặt đồ
  CRATE_BREAD = 'crate_bread',   // Thùng bánh mì
  CRATE_MEAT = 'crate_meat',     // Thùng thịt sống
  CRATE_LETTUCE = 'crate_lettuce', // Thùng xà lách
  CRATE_TOMATO = 'crate_tomato', // Thùng cà chua
  CRATE_PLATE = 'crate_plate',   // Giá để đĩa
  CUTTING_BOARD = 'cutting_board', // Thớt cắt
  STOVE = 'stove',               // Bếp nướng chảo
  DELIVERY = 'delivery',         // Bàn phục vụ món
  TRASH = 'trash'                // Thùng rác
}

export enum StoveState {
  IDLE = 'idle',
  COOKING = 'cooking',
  COOKED = 'cooked',
  BURNING = 'burning',
  BURNT = 'burnt'
}

export interface OrderRecipe {
  id: string;
  name: string;
  requiredIngredients: IngredientType[];
  maxTime: number; // seconds
  remainingTime: number;
  rewardPoints: number;
  iconTexture: string;
}

export interface PlayerInput {
  dx: number;
  dy: number;
  actionJustPressed: boolean;
  actionHeld: boolean;
  pickupDropJustPressed: boolean;
}
