import { IngredientType, KitchenItem, OrderRecipe } from '../types';
import { OrderConfig, OrderDifficulty, computeOrderTime } from '../config/OrderConfig';

export class RecipeManager {
  private activeOrders: OrderRecipe[] = [];
  private maxConcurrentOrders = OrderConfig.maxConcurrentOrders;
  private orderCounter = 0;
  private spawnInterval = OrderConfig.spawnIntervalSeconds;
  private timeSinceLastSpawn = 0;
  private playerCount: number;
  private difficulty: OrderDifficulty;

  public score = 0;
  public combo = 1;

  // Expanded Recipe Catalog (Phase 3)
  public static RECIPES: { [key: string]: { name: string; ingredients: IngredientType[]; points: number; icon: string } } = {
    BURGER_COMPLETE: {
      name: 'Burger Đầy Đủ',
      ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO],
      points: 100,
      icon: 'item_burger'
    },
    BURGER_CHEESE: {
      name: 'Burger Phô Mai',
      ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.SLICED_CHEESE],
      points: 80,
      icon: 'item_burger'
    },
    SUPER_BURGER: {
      name: 'Burger Siêu Cấp',
      ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.SLICED_CHEESE, IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO],
      points: 140,
      icon: 'item_burger'
    },
    FRESH_SALAD: {
      name: 'Salad Tươi Mát',
      ingredients: [IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO],
      points: 60,
      icon: 'item_salad'
    }
  };

  constructor(playerCount: number = 1, difficulty: OrderDifficulty = 'normal') {
    this.playerCount = playerCount;
    this.difficulty = difficulty;
    this.spawnOrder();
    this.spawnOrder();
  }

  public update(deltaSeconds: number): { completed: boolean; expired: boolean; scoreDelta: number } {
    let expired = false;
    let scoreDelta = 0;

    for (let i = this.activeOrders.length - 1; i >= 0; i--) {
      const order = this.activeOrders[i];
      order.remainingTime -= deltaSeconds;

      // Overtime grace: order stays deliverable for a few seconds after the bar empties
      if (order.remainingTime <= -OrderConfig.expireGraceSeconds) {
        this.activeOrders.splice(i, 1);
        this.combo = 1;
        scoreDelta -= OrderConfig.expirePenalty;
        this.score = Math.max(0, this.score - OrderConfig.expirePenalty);
        expired = true;
      }
    }

    this.timeSinceLastSpawn += deltaSeconds;
    if (this.activeOrders.length < this.maxConcurrentOrders && this.timeSinceLastSpawn >= this.spawnInterval) {
      this.spawnOrder();
      this.timeSinceLastSpawn = 0;
    }

    return { completed: false, expired, scoreDelta };
  }

  public spawnOrder() {
    if (this.activeOrders.length >= this.maxConcurrentOrders) return;

    this.orderCounter++;
    const recipeKeys = Object.keys(RecipeManager.RECIPES);
    const chosenKey = recipeKeys[Math.floor(Math.random() * recipeKeys.length)];
    const template = RecipeManager.RECIPES[chosenKey];

    const orderTime = computeOrderTime(template.ingredients, this.playerCount, this.difficulty);
    const order: OrderRecipe = {
      id: `order_${this.orderCounter}`,
      name: template.name,
      requiredIngredients: [...template.ingredients],
      maxTime: orderTime,
      remainingTime: orderTime,
      rewardPoints: template.points,
      iconTexture: template.icon
    };

    this.activeOrders.push(order);
  }

  public getOrders(): OrderRecipe[] {
    return this.activeOrders;
  }

  public setOrders(orders: OrderRecipe[]) {
    if (!Array.isArray(orders)) return;
    this.activeOrders = orders.map((o) => ({
      id: o.id,
      name: o.name,
      requiredIngredients: Array.isArray(o.requiredIngredients) ? [...o.requiredIngredients] : [],
      maxTime: o.maxTime || 120,
      remainingTime: o.remainingTime ?? o.maxTime ?? 120,
      rewardPoints: o.rewardPoints || 80,
      iconTexture: o.iconTexture || 'item_burger'
    }));
  }

  public tickClientTimersOnly(deltaSeconds: number) {
    for (let i = 0; i < this.activeOrders.length; i++) {
      this.activeOrders[i].remainingTime -= deltaSeconds;
    }
  }

  public tryDeliver(plateItem: KitchenItem): { success: boolean; pointsEarned: number } {
    if (plateItem.type !== IngredientType.PLATE || !plateItem.plateContents) {
      return { success: false, pointsEarned: 0 };
    }

    const contents = [...plateItem.plateContents].sort();

    for (let i = 0; i < this.activeOrders.length; i++) {
      const order = this.activeOrders[i];
      const required = [...order.requiredIngredients].sort();

      if (contents.length === required.length && contents.every((val, index) => val === required[index])) {
        const earned = order.rewardPoints * this.combo;
        this.score += earned;
        this.combo = Math.min(4, this.combo + 1);

        this.activeOrders.splice(i, 1);
        this.spawnOrder();

        return { success: true, pointsEarned: earned };
      }
    }

    // Wrong recipe penalty: reset combo to 1x and deduct wrongDeliveryPenalty
    const penalty = OrderConfig.wrongDeliveryPenalty;
    this.score = Math.max(0, this.score - penalty);
    this.combo = 1;
    return { success: false, pointsEarned: -penalty };
  }
}
