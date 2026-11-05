import { IngredientType } from '../types';

/**
 * Centralized Cooking, Burn Timeline, Fire Spread & Extinguisher Configuration
 * Inspired by Overcooked 2 pacing — gives players enough time to multitask and coordinate.
 */
export const CookingConfig = {
  /**
   * Time in seconds to cook each raw ingredient to its COOKED state (Phase 1.1)
   */
  rawToCookedTime: {
    [IngredientType.RAW_MEAT]: 8.0,        // Thịt bò: 8 giây
    [IngredientType.CHICKEN]: 10.0,        // Thịt gà: 10 giây
    [IngredientType.POTATO]: 10.0,         // Khoai tây: 10 giây
    [IngredientType.CHOPPED_POTATO]: 10.0, // Khoai tây cắt: 10 giây
    [IngredientType.FISH]: 8.0,            // Cá: 8 giây
    [IngredientType.SHRIMP]: 7.0,          // Tôm: 7 giây
    [IngredientType.EGG]: 6.0              // Trứng: 6 giây
  } as Record<string, number>,

  /**
   * Post-cooked burn timeline (Phase 1.3):
   * - 0 to 5s after cooked: COOKED (Safe, green bar, checkmark icon)
   * - 5 to 10s after cooked: WARNING (Amber bar, warning icon ⚠️, slow beep)
   * - 10 to 13s after cooked: DANGER (Flashing red bar, fire icon 🔥, fast urgent beep, smoke)
   * - >= 13s after cooked: BURNT (Food turns charred black, stove catches fire!)
   */
  burnTimeline: {
    safeDuration: 5.0,    // 0–5s after cooked
    warningDuration: 5.0, // 5–10s after cooked
    dangerDuration: 3.0,  // 10–13s after cooked
    totalPostCookedTime: 13.0 // 5 + 5 + 3 = 13s after cooked
  },

  /**
   * Fire & Extinguisher System Parameters (Phase 2 & Phase 3)
   */
  fire: {
    extinguishDuration: 2.5, // Seconds of continuous foam spray to extinguish a burning station
    sprayRange: 3.0,         // 3.0 world units reach
    sprayAngleDeg: 45,       // 45-degree cone in front of the chef
    fireSpreadInterval: 8.0, // Seconds before an unextinguished fire spreads to an adjacent counter
    fireSpreadLimit: 3       // Max simultaneous burning counters so the kitchen remains recoverable
  },

  /**
   * Helper to get raw-to-cooked duration for an ingredient (defaults to 8.0s)
   */
  getCookDuration(type: IngredientType | string): number {
    return this.rawToCookedTime[type] ?? 8.0;
  },

  /**
   * Maps a raw ingredient to its cooked counterpart
   */
  getCookedCounterpart(type: IngredientType): IngredientType {
    switch (type) {
      case IngredientType.RAW_MEAT:
        return IngredientType.COOKED_PATTY;
      case IngredientType.CHICKEN:
        return IngredientType.COOKED_CHICKEN;
      case IngredientType.FISH:
        return IngredientType.COOKED_FISH;
      case IngredientType.SHRIMP:
        return IngredientType.COOKED_SHRIMP;
      case IngredientType.EGG:
        return IngredientType.FRIED_EGG;
      default:
        return IngredientType.COOKED_PATTY;
    }
  }
};
