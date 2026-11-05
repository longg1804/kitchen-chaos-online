import { CAMPAIGN_WORLDS, LevelConfig } from './CampaignWorlds';

export interface LevelRecord {
  levelId: string;
  unlocked: boolean;
  stars: number; // 0, 1, 2, 3
  highScore: number;
  attempts: number;
}

const STORAGE_KEY = 'kitchen_chaos_campaign_progress_v2';

export class CampaignProgressManager {
  private static instance: CampaignProgressManager;
  private records: Map<string, LevelRecord> = new Map();

  private constructor() {
    this.load();
  }

  public static getInstance(): CampaignProgressManager {
    if (!CampaignProgressManager.instance) {
      CampaignProgressManager.instance = new CampaignProgressManager();
    }
    return CampaignProgressManager.instance;
  }

  private load() {
    this.records.clear();
    // Default: World 1-1 is always unlocked
    this.records.set('1-1', {
      levelId: '1-1',
      unlocked: true,
      stars: 0,
      highScore: 0,
      attempts: 0
    });

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.keys(parsed).forEach((lvlId) => {
            const item = parsed[lvlId];
            this.records.set(lvlId, {
              levelId: lvlId,
              unlocked: Boolean(item.unlocked),
              stars: Math.max(0, Math.min(3, Number(item.stars) || 0)),
              highScore: Math.max(0, Number(item.highScore) || 0),
              attempts: Math.max(0, Number(item.attempts) || 0)
            });
          });
        }
      }
    } catch (_) {
      // Storage unavailable or corrupted - keep defaults
    }

    // Ensure 1-1 remains unlocked
    const l11 = this.records.get('1-1')!;
    l11.unlocked = true;
    this.records.set('1-1', l11);
  }

  private save() {
    try {
      const obj: Record<string, LevelRecord> = {};
      this.records.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (_) {}
  }

  public getAllLevelsList(): LevelConfig[] {
    const list: LevelConfig[] = [];
    CAMPAIGN_WORLDS.forEach((world) => {
      world.levels.forEach((lvl) => {
        list.push(lvl);
      });
    });
    return list;
  }

  public getLevelConfig(levelId: string): LevelConfig | null {
    for (const world of CAMPAIGN_WORLDS) {
      for (const lvl of world.levels) {
        if (lvl.id === levelId) return lvl;
      }
    }
    return null;
  }

  public isLevelUnlocked(levelId: string): boolean {
    if (levelId === '1-1') return true;
    const r = this.records.get(levelId);
    return Boolean(r && r.unlocked);
  }

  public getLevelRecord(levelId: string): LevelRecord {
    let r = this.records.get(levelId);
    if (!r) {
      r = {
        levelId,
        unlocked: levelId === '1-1',
        stars: 0,
        highScore: 0,
        attempts: 0
      };
      this.records.set(levelId, r);
    }
    return r;
  }

  public getTotalStars(): number {
    let total = 0;
    this.records.forEach((r) => {
      total += r.stars;
    });
    return total;
  }

  public getNextLevel(currentLevelId: string): LevelConfig | null {
    const all = this.getAllLevelsList();
    const idx = all.findIndex((l) => l.id === currentLevelId);
    if (idx >= 0 && idx < all.length - 1) {
      return all[idx + 1];
    }
    return null;
  }

  public saveLevelResult(
    levelId: string,
    score: number
  ): { stars: number; newHighScore: boolean; nextUnlocked?: string } {
    const config = this.getLevelConfig(levelId);
    const record = this.getLevelRecord(levelId);
    record.attempts += 1;

    let starsEarned = 0;
    if (config && Array.isArray(config.starThresholds)) {
      const [s1, s2, s3] = config.starThresholds;
      if (score >= s3) starsEarned = 3;
      else if (score >= s2) starsEarned = 2;
      else if (score >= s1) starsEarned = 1;
    }

    const newHighScore = score > record.highScore;
    if (newHighScore) {
      record.highScore = score;
    }
    if (starsEarned > record.stars) {
      record.stars = starsEarned;
    }

    let nextUnlocked: string | undefined = undefined;
    // Overcooked style: If >= 1 star, unlock the next campaign level!
    if (starsEarned >= 1) {
      const next = this.getNextLevel(levelId);
      if (next) {
        const nextRec = this.getLevelRecord(next.id);
        if (!nextRec.unlocked) {
          nextRec.unlocked = true;
          this.records.set(next.id, nextRec);
          nextUnlocked = next.id;
        }
      }
    }

    this.records.set(levelId, record);
    this.save();

    return {
      stars: starsEarned,
      newHighScore,
      nextUnlocked
    };
  }

  public resetProgress() {
    this.records.clear();
    this.records.set('1-1', {
      levelId: '1-1',
      unlocked: true,
      stars: 0,
      highScore: 0,
      attempts: 0
    });
    this.save();
  }
}
