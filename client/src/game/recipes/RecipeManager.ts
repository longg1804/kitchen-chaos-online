import { IngredientType, KitchenItem, OrderRecipe } from '../types';
import { OrderConfig, OrderDifficulty, computeOrderTime } from '../config/OrderConfig';
import { CAMPAIGN_RECIPES, DetailedRecipe } from '../config/CampaignRecipes';

export class RecipeManager {
  private activeOrders: OrderRecipe[] = [];
  private maxConcurrentOrders = OrderConfig.maxConcurrentOrders;
  private orderCounter = 0;
  private spawnInterval = OrderConfig.spawnIntervalSeconds;
  private timeSinceLastSpawn = 0;
  private playerCount: number;
  private difficulty: OrderDifficulty;
  private allowedRecipeKeys: string[] = [];

  public score = 0;
  public combo = 1;

  // Recipe Catalog linked directly with CAMPAIGN_RECIPES
  public static RECIPES: { [key: string]: { name: string; ingredients: IngredientType[]; points: number; icon: string } } = {
    BURGER_CLASSIC: {
      name: CAMPAIGN_RECIPES.BURGER_CLASSIC.name,
      ingredients: CAMPAIGN_RECIPES.BURGER_CLASSIC.ingredients,
      points: CAMPAIGN_RECIPES.BURGER_CLASSIC.baseReward,
      icon: CAMPAIGN_RECIPES.BURGER_CLASSIC.iconTexture
    },
    BURGER_CHEESE: {
      name: CAMPAIGN_RECIPES.BURGER_CHEESE.name,
      ingredients: CAMPAIGN_RECIPES.BURGER_CHEESE.ingredients,
      points: CAMPAIGN_RECIPES.BURGER_CHEESE.baseReward,
      icon: CAMPAIGN_RECIPES.BURGER_CHEESE.iconTexture
    },
    BURGER_COMPLETE: {
      name: CAMPAIGN_RECIPES.BURGER_COMPLETE.name,
      ingredients: CAMPAIGN_RECIPES.BURGER_COMPLETE.ingredients,
      points: CAMPAIGN_RECIPES.BURGER_COMPLETE.baseReward,
      icon: CAMPAIGN_RECIPES.BURGER_COMPLETE.iconTexture
    },
    FRESH_SALAD: {
      name: CAMPAIGN_RECIPES.FRESH_SALAD.name,
      ingredients: CAMPAIGN_RECIPES.FRESH_SALAD.ingredients,
      points: CAMPAIGN_RECIPES.FRESH_SALAD.baseReward,
      icon: CAMPAIGN_RECIPES.FRESH_SALAD.iconTexture
    },
    FARM_DELUXE_SALAD: {
      name: CAMPAIGN_RECIPES.FARM_DELUXE_SALAD.name,
      ingredients: CAMPAIGN_RECIPES.FARM_DELUXE_SALAD.ingredients,
      points: CAMPAIGN_RECIPES.FARM_DELUXE_SALAD.baseReward,
      icon: CAMPAIGN_RECIPES.FARM_DELUXE_SALAD.iconTexture
    },
    PIZZA_CHEESE: {
      name: CAMPAIGN_RECIPES.PIZZA_CHEESE.name,
      ingredients: CAMPAIGN_RECIPES.PIZZA_CHEESE.ingredients,
      points: CAMPAIGN_RECIPES.PIZZA_CHEESE.baseReward,
      icon: CAMPAIGN_RECIPES.PIZZA_CHEESE.iconTexture
    },
    PIZZA_MUSHROOM: {
      name: CAMPAIGN_RECIPES.PIZZA_MUSHROOM.name,
      ingredients: CAMPAIGN_RECIPES.PIZZA_MUSHROOM.ingredients,
      points: CAMPAIGN_RECIPES.PIZZA_MUSHROOM.baseReward,
      icon: CAMPAIGN_RECIPES.PIZZA_MUSHROOM.iconTexture
    },
    SUSHI_SALMON: {
      name: CAMPAIGN_RECIPES.SUSHI_SALMON.name,
      ingredients: CAMPAIGN_RECIPES.SUSHI_SALMON.ingredients,
      points: CAMPAIGN_RECIPES.SUSHI_SALMON.baseReward,
      icon: CAMPAIGN_RECIPES.SUSHI_SALMON.iconTexture
    },
    SEAFOOD_PLATTER: {
      name: CAMPAIGN_RECIPES.SEAFOOD_PLATTER.name,
      ingredients: CAMPAIGN_RECIPES.SEAFOOD_PLATTER.ingredients,
      points: CAMPAIGN_RECIPES.SEAFOOD_PLATTER.baseReward,
      icon: CAMPAIGN_RECIPES.SEAFOOD_PLATTER.iconTexture
    },
    SUPER_BURGER: {
      name: CAMPAIGN_RECIPES.SUPER_BURGER.name,
      ingredients: CAMPAIGN_RECIPES.SUPER_BURGER.ingredients,
      points: CAMPAIGN_RECIPES.SUPER_BURGER.baseReward,
      icon: CAMPAIGN_RECIPES.SUPER_BURGER.iconTexture
    },
    CHICKEN_FEAST: {
      name: CAMPAIGN_RECIPES.CHICKEN_FEAST.name,
      ingredients: CAMPAIGN_RECIPES.CHICKEN_FEAST.ingredients,
      points: CAMPAIGN_RECIPES.CHICKEN_FEAST.baseReward,
      icon: CAMPAIGN_RECIPES.CHICKEN_FEAST.iconTexture
    }
  };

  constructor(
    playerCount: number = 1,
    difficulty: OrderDifficulty = 'normal',
    allowedRecipeKeys?: string[]
  ) {
    this.playerCount = playerCount;
    this.difficulty = difficulty;
    if (Array.isArray(allowedRecipeKeys) && allowedRecipeKeys.length > 0) {
      this.allowedRecipeKeys = allowedRecipeKeys.filter((k) => RecipeManager.RECIPES[k]);
    }
    if (this.allowedRecipeKeys.length === 0) {
      this.allowedRecipeKeys = Object.keys(RecipeManager.RECIPES);
    }
    this.spawnOrder();
    this.spawnOrder();
  }

  public setAllowedRecipes(recipeKeys: string[]) {
    if (Array.isArray(recipeKeys) && recipeKeys.length > 0) {
      this.allowedRecipeKeys = recipeKeys.filter((k) => RecipeManager.RECIPES[k]);
      if (this.allowedRecipeKeys.length === 0) {
        this.allowedRecipeKeys = Object.keys(RecipeManager.RECIPES);
      }
    }
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
    const recipeKeys = this.allowedRecipeKeys.length > 0 ? this.allowedRecipeKeys : Object.keys(RecipeManager.RECIPES);
    const chosenKey = recipeKeys[Math.floor(Math.random() * recipeKeys.length)];
    const template = RecipeManager.RECIPES[chosenKey] || RecipeManager.RECIPES.BURGER_CLASSIC;

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
