/**
 * SERVER ORDER TIMING CONFIG (authoritative in multiplayer)
 * ⚠️ Keep in sync with client/src/game/config/OrderConfig.ts
 *
 * Tiers (base time before multipliers):
 *   - Simple  : 100–120 s
 *   - Medium  : 130–155 s
 *   - Complex : 160–190 s
 */
export type OrderDifficulty = 'easy' | 'normal' | 'hard';

export const OrderConfig = {
  weights: { ingredient: 1, chop: 1, cook: 2 },
  tiers: [
    { id: 'simple', maxScore: 5, scoreMin: 0, scoreCap: 5, minTime: 100, maxTime: 120 },
    { id: 'medium', maxScore: 8, scoreMin: 6, scoreCap: 8, minTime: 130, maxTime: 155 },
    { id: 'complex', maxScore: 99, scoreMin: 9, scoreCap: 12, minTime: 160, maxTime: 190 }
  ],
  playerCountMultiplier: { 1: 1.1, 2: 1.0, 3: 0.95, 4: 0.92 } as Record<number, number>,
  difficultyMultiplier: { easy: 1.15, normal: 1.0, hard: 0.85 } as Record<OrderDifficulty, number>,
  expireGraceSeconds: 6,
  spawnIntervalSeconds: 20,
  maxConcurrentOrders: 3,
  expirePenalty: 30,
  wrongDeliveryPenalty: 20
};

const CHOP_TYPES = new Set(['chopped_lettuce', 'sliced_tomato', 'sliced_cheese', 'sliced_onion', 'chopped_potato']);
const COOK_TYPES = new Set(['cooked_patty', 'cooked_chicken', 'cooked_fish', 'cooked_shrimp', 'fried_egg']);

export function computeOrderTime(ingredients: string[], playerCount = 1, difficulty: OrderDifficulty = 'normal'): number {
  const w = OrderConfig.weights;
  let chop = 0;
  let cook = 0;
  for (const ing of ingredients) {
    if (CHOP_TYPES.has(ing)) chop++;
    if (COOK_TYPES.has(ing)) cook++;
  }
  const score = ingredients.length * w.ingredient + chop * w.chop + cook * w.cook;
  const tier = OrderConfig.tiers.find((t) => score <= t.maxScore) || OrderConfig.tiers[OrderConfig.tiers.length - 1];
  const span = Math.max(1, tier.scoreCap - tier.scoreMin);
  const t = Math.max(0, Math.min(1, (score - tier.scoreMin) / span));
  const base = tier.minTime + (tier.maxTime - tier.minTime) * t;
  const pc = Math.max(1, Math.min(4, Math.round(playerCount)));
  return Math.round(base * (OrderConfig.playerCountMultiplier[pc] ?? 1) * (OrderConfig.difficultyMultiplier[difficulty] ?? 1));
}
