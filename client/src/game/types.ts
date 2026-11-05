export enum IngredientType {
  BREAD = 'bread',
  RAW_MEAT = 'raw_meat',
  COOKED_PATTY = 'cooked_patty',
  BURNT_PATTY = 'burnt_patty',
  LETTUCE = 'lettuce',
  CHOPPED_LETTUCE = 'chopped_lettuce',
  TOMATO = 'tomato',
  SLICED_TOMATO = 'sliced_tomato',
  CHEESE = 'cheese',
  SLICED_CHEESE = 'sliced_cheese',
  PLATE = 'plate'
}

export interface KitchenItem {
  id: string;
  type: IngredientType;
  plateContents?: IngredientType[];
}

export enum CounterType {
  CLEAR = 'clear',               // Bàn trống đặt đồ
  CRATE_BREAD = 'crate_bread',   // Thùng bánh mì
  CRATE_MEAT = 'crate_meat',     // Thùng thịt sống
  CRATE_LETTUCE = 'crate_lettuce', // Thùng xà lách
  CRATE_TOMATO = 'crate_tomato', // Thùng cà chua
  CRATE_CHEESE = 'crate_cheese', // Thùng phô mai
  CRATE_PLATE = 'crate_plate',   // Giá để đĩa
  CUTTING_BOARD = 'cutting_board', // Thớt cắt
  STOVE = 'stove',               // Bếp nướng chảo
  DELIVERY = 'delivery',         // Bàn phục vụ món
  TRASH = 'trash',               // Thùng rác
  CONVEYOR_LEFT = 'conveyor_left',   // Băng chuyền trôi sang trái
  CONVEYOR_RIGHT = 'conveyor_right'  // Băng chuyền trôi sang phải
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
  throwJustPressed: boolean;
}

export enum ChefSkin {
  CLASSIC = 'chef_classic',
  PANDA = 'chef_panda',
  FOX = 'chef_fox',
  ROBOT = 'chef_robot'
}

export enum KitchenMapId {
  TRADITIONAL = 'traditional',
  CONVEYOR = 'conveyor',
  SPLIT_KITCHEN = 'split_kitchen'
}
