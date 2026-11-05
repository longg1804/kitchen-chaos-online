import { IngredientType } from '../types';

export interface RecipeStep {
  station: 'crate' | 'cutting_board' | 'stove' | 'plate' | 'delivery';
  description: string;
}

export interface DetailedRecipe {
  id: string;
  name: string;
  category: 'burger' | 'salad' | 'pizza' | 'sushi' | 'soup_pasta' | 'street_food';
  ingredients: IngredientType[];
  steps: string[];
  baseReward: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  iconTexture: string;
}

export const CAMPAIGN_RECIPES: Record<string, DetailedRecipe> = {
  // --- WORLD 1: BURGER & BASIC ---
  BURGER_CLASSIC: {
    id: 'BURGER_CLASSIC',
    name: 'Burger Cổ Điển',
    category: 'burger',
    ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY],
    steps: ['Lấy bánh mì & thịt bò', 'Nướng thịt trên bếp', 'Kẹp thịt vào bánh & giao món'],
    baseReward: 70,
    difficulty: 1,
    iconTexture: 'item_burger'
  },
  BURGER_CHEESE: {
    id: 'BURGER_CHEESE',
    name: 'Burger Phô Mai',
    category: 'burger',
    ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.SLICED_CHEESE],
    steps: ['Nướng thịt bò', 'Cắt lát phô mai', 'Kẹp phô mai & thịt vào bánh'],
    baseReward: 90,
    difficulty: 1,
    iconTexture: 'item_burger'
  },
  BURGER_COMPLETE: {
    id: 'BURGER_COMPLETE',
    name: 'Burger Đầy Đủ',
    category: 'burger',
    ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO],
    steps: ['Nướng thịt bò', 'Cắt xà lách & cà chua', 'Xếp đều lên bánh & đĩa'],
    baseReward: 110,
    difficulty: 2,
    iconTexture: 'item_burger'
  },

  // --- WORLD 2: FARM & SALAD / SOUP ---
  FRESH_SALAD: {
    id: 'FRESH_SALAD',
    name: 'Salad Tươi Mát',
    category: 'salad',
    ingredients: [IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO],
    steps: ['Cắt nhỏ xà lách', 'Cắt lát cà chua', 'Bày vào đĩa phục vụ'],
    baseReward: 60,
    difficulty: 1,
    iconTexture: 'item_salad'
  },
  FARM_DELUXE_SALAD: {
    id: 'FARM_DELUXE_SALAD',
    name: 'Salad Trang Trại Đặc Biệt',
    category: 'salad',
    ingredients: [IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO, IngredientType.SLICED_CHEESE, IngredientType.SLICED_ONION],
    steps: ['Cắt xà lách, cà chua, hành tây & phô mai', 'Trộn đều lên đĩa'],
    baseReward: 120,
    difficulty: 2,
    iconTexture: 'item_salad'
  },

  // --- WORLD 3: PIZZA HOUSE ---
  PIZZA_CHEESE: {
    id: 'PIZZA_CHEESE',
    name: 'Pizza Phô Mai Nướng',
    category: 'pizza',
    ingredients: [IngredientType.BREAD, IngredientType.SLICED_CHEESE, IngredientType.SLICED_TOMATO],
    steps: ['Chuẩn bị đế bánh', 'Thái phô mai & cà chua sốt', 'Nướng vàng trên bếp'],
    baseReward: 100,
    difficulty: 2,
    iconTexture: 'item_pizza'
  },
  PIZZA_MUSHROOM: {
    id: 'PIZZA_MUSHROOM',
    name: 'Pizza Nấm Thập Cẩm',
    category: 'pizza',
    ingredients: [IngredientType.BREAD, IngredientType.SLICED_CHEESE, IngredientType.SLICED_MUSHROOM, IngredientType.SLICED_TOMATO],
    steps: ['Cắt nấm & phô mai', 'Phủ sốt cà chua lên đế bánh', 'Nướng chín giòn'],
    baseReward: 130,
    difficulty: 3,
    iconTexture: 'item_pizza'
  },

  // --- WORLD 4: SUSHI & SEAFOOD ---
  SUSHI_SALMON: {
    id: 'SUSHI_SALMON',
    name: 'Sushi Cá Hồi',
    category: 'sushi',
    ingredients: [IngredientType.COOKED_FISH, IngredientType.CHOPPED_LETTUCE],
    steps: ['Nướng cá hồi áp chảo', 'Cắt rau ghém ăn kèm', 'Cuộn và đặt lên đĩa'],
    baseReward: 115,
    difficulty: 2,
    iconTexture: 'item_sushi'
  },
  SEAFOOD_PLATTER: {
    id: 'SEAFOOD_PLATTER',
    name: 'Hải Sản Tôm Cá Nướng',
    category: 'sushi',
    ingredients: [IngredientType.COOKED_FISH, IngredientType.COOKED_SHRIMP, IngredientType.SLICED_TOMATO],
    steps: ['Nướng tôm & cá', 'Thái cà chua trang trí', 'Bày đĩa hải sản cao cấp'],
    baseReward: 145,
    difficulty: 3,
    iconTexture: 'item_seafood'
  },

  // --- WORLD 5 & 6: ADVANCED & CHAOTIC ---
  SUPER_BURGER: {
    id: 'SUPER_BURGER',
    name: 'Burger Siêu Cấp Hoàng Gia',
    category: 'burger',
    ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.SLICED_CHEESE, IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO],
    steps: ['Nướng thịt', 'Cắt đủ 3 loại rau & phô mai', 'Xếp 5 tầng nguyên liệu'],
    baseReward: 160,
    difficulty: 4,
    iconTexture: 'item_burger'
  },
  CHICKEN_FEAST: {
    id: 'CHICKEN_FEAST',
    name: 'Gà Nướng Khoai Chiên',
    category: 'street_food',
    ingredients: [IngredientType.COOKED_CHICKEN, IngredientType.CHOPPED_POTATO, IngredientType.SLICED_TOMATO],
    steps: ['Nấu gà chín vàng', 'Thái khoai tây chiên', 'Phục vụ kèm sốt cà chua'],
    baseReward: 140,
    difficulty: 3,
    iconTexture: 'item_chicken'
  }
};
