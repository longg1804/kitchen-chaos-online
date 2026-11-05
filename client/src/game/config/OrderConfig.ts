import { IngredientType } from '../types';

/**
 * ORDER TIMING CONFIG (Centralized balancing file)
 *
 * Order time is NOT fixed. It is derived from the dish complexity:
 *   complexityScore = ingredientCount * ingredientWeight
 *                   + chopSteps      * chopWeight
 *                   + cookSteps      * cookWeight
 *
 * The score maps into one of three tiers, and is linearly interpolated inside the tier range:
 *   - Simple  : 100–120 s
 *   - Medium  : 130–155 s
 *   - Complex : 160–190 s
 *
 * Final time is then scaled by the player-count & difficulty multipliers.
 *
 * NOTE: This file only affects ORDER deadlines. Cooking / burn timings live in CookingConfig.ts
 * and are intentionally untouched.
 *
 * ⚠️ Keep in sync with server/src/config/OrderConfig.ts (server is authoritative in multiplayer).
 */
export type OrderDifficulty = 'easy' | 'normal' | 'hard';

export const OrderConfig = {
  weights: {
    ingredient: 1,
    chop: 1,
    cook: 2
  },

  tiers: [
    { id: 'simple', maxScore: 5, scoreMin: 0, minTime: 100, maxTime: 120 },
    { id: 'medium', maxScore: 8, scoreMin: 6, minTime: 130, maxTime: 155 },
    { id: 'complex', maxScore: 99, scoreMin: 9, minTime: 160, maxTime: 190, scoreCap: 12 }
  ],

  /** Solo players get more time, larger teams slightly less to keep coordination pressure. */
  playerCountMultiplier: { 1: 1.1, 2: 1.0, 3: 0.95, 4: 0.92 } as Record<number, number>,

  difficultyMultiplier: { easy: 1.15, normal: 1.0, hard: 0.85 } as Record<OrderDifficulty, number>,

  /**
   * Overtime grace: when the timer hits 0, the order stays deliverable for this many seconds
   * (card flashes red) so it never vanishes right as players are finishing the plate.
   */
  expireGraceSeconds: 6,

  /** Seconds between new orders, max simultaneous orders. */
  spawnIntervalSeconds: 20,
  maxConcurrentOrders: 3,

  /** Score penalty when an order fully expires (after grace). */
  expirePenalty: 30
};

const CHOP_TYPES = new Set<string>([
  IngredientType.CHOPPED_LETTUCE,
  IngredientType.SLICED_TOMATO,
  IngredientType.SLICED_CHEESE,
  IngredientType.SLICED_ONION,
  IngredientType.CHOPPED_POTATO
]);

const COOK_TYPES = new Set<string>([
  IngredientType.COOKED_PATTY,
  IngredientType.COOKED_CHICKEN,
  IngredientType.COOKED_FISH,
  IngredientType.COOKED_SHRIMP,
  IngredientType.FRIED_EGG
]);

export function getOrderComplexityScore(ingredients: string[]): number {
  const w = OrderConfig.weights;
  let chop = 0;
  let cook = 0;
  for (const ing of ingredients) {
    if (CHOP_TYPES.has(ing)) chop++;
    if (COOK_TYPES.has(ing)) cook++;
  }
  return ingredients.length * w.ingredient + chop * w.chop + cook * w.cook;
}

/**
 * Computes the order deadline (seconds) from recipe ingredients, player count & difficulty.
 */
export function computeOrderTime(
  ingredients: string[],
  playerCount: number = 1,
  difficulty: OrderDifficulty = 'normal'
): number {
  const score = getOrderComplexityScore(ingredients);
  const tier = OrderConfig.tiers.find((t) => score <= t.maxScore) || OrderConfig.tiers[OrderConfig.tiers.length - 1];
  const scoreMax = (tier as any).scoreCap ?? tier.maxScore;
  const span = Math.max(1, scoreMax - tier.scoreMin);
  const t = Math.max(0, Math.min(1, (score - tier.scoreMin) / span));
  const base = tier.minTime + (tier.maxTime - tier.minTime) * t;

  const pc = Math.max(1, Math.min(4, Math.round(playerCount)));
  const pMul = OrderConfig.playerCountMultiplier[pc] ?? 1;
  const dMul = OrderConfig.difficultyMultiplier[difficulty] ?? 1;
  return Math.round(base * pMul * dMul);
}
