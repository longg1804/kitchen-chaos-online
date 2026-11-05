import { OrderRecipe, IngredientType } from '../../game/types';

export interface MobileInputsState {
  moveX: number;
  moveZ: number;
  isPickupJustPressed: boolean;
  isActionPressed: boolean;
  isActionJustPressed: boolean;
  isThrowJustPressed: boolean;
  isDashJustPressed: boolean;
}

export class HUDOverlay3D {
  public container: HTMLElement;
  public inputs: MobileInputsState = {
    moveX: 0,
    moveZ: 0,
    isPickupJustPressed: false,
    isActionPressed: false,
    isActionJustPressed: false,
    isThrowJustPressed: false,
    isDashJustPressed: false
  };

  private scoreEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private ordersContainer!: HTMLElement;
  private promptEl!: HTMLElement;
  private gameOverEl!: HTMLElement;
  private dashBtnEl?: HTMLElement;
  private actionBtnEl?: HTMLElement;
  private actionBtnEnabled = false;
  private currentActionLabel = '';
  private currentPromptKey = '';
  private lastScore = 0;
  private orderCardEls: Map<
    string,
    { card: HTMLElement; fill: HTMLElement; timeLabel: HTMLElement }
  > = new Map();
  private onExitCallback: () => void;
  private onScreenshotCallback?: () => void;

  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private joystickThumbEl!: HTMLElement;
  private joystickBaseEl!: HTMLElement;

  constructor(onExit: () => void, onScreenshot?: () => void) {
    this.onExitCallback = onExit;
    this.onScreenshotCallback = onScreenshot;
    this.container = document.createElement('div');
    this.container.id = 'hud-overlay-3d';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 50;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    this.injectHUDKeyframes();
    this.buildTopBar();
    this.buildOrdersList();
    this.buildInteractionPrompt();
    this.buildMobileControls();
    this.buildDesktopHints();
    this.buildGameOverModal();

    document.body.appendChild(this.container);
  }

  private injectHUDKeyframes() {
    if (document.getElementById('hud-3d-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'hud-3d-keyframes';
    style.textContent = `
      @keyframes hudOrderEnter {
        0% { opacity: 0; transform: translateY(-24px) scale(0.88); }
        70% { opacity: 1; transform: translateY(3px) scale(1.03); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes hudTimerPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35); }
        50% { transform: scale(1.06); box-shadow: 0 0 22px rgba(239, 68, 68, 0.75); }
      }
      @keyframes hudUrgentCard {
        0%, 100% { border-color: #ef4444; }
        50% { border-color: #fca5a5; }
      }
    `;
    document.head.appendChild(style);
  }

  private buildTopBar() {
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      position: absolute;
      top: 10px;
      right: 14px;
      display: flex;
      gap: 10px;
      align-items: center;
      pointer-events: auto;
    `;

    // Center: Score & Combo Badge
    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.92));
      border: 2.5px solid #fbbf24;
      border-radius: 16px;
      padding: 6px 16px;
      color: #fbbf24;
      font-weight: 900;
      font-size: 18px;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 14px rgba(251, 191, 36, 0.28);
      text-align: center;
      backdrop-filter: blur(8px);
      white-space: nowrap;
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease;
    `;
    this.scoreEl.innerHTML = '🪙 ĐIỂM: 0 <span style="color:#fef08a;font-size:14px;">(x1)</span>';
    topBar.appendChild(this.scoreEl);

    // Match Timer Badge
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.92));
      border: 2.5px solid #38bdf8;
      border-radius: 16px;
      padding: 6px 15px;
      color: #38bdf8;
      font-weight: 900;
      font-size: 18px;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 14px rgba(56, 189, 248, 0.28);
      backdrop-filter: blur(8px);
      white-space: nowrap;
      transition: border-color 0.2s, color 0.2s;
    `;
    this.timerEl.innerText = '⏱ 03:00';
    topBar.appendChild(this.timerEl);

    // Screenshot Button
    if (this.onScreenshotCallback) {
      const snapBtn = document.createElement('button');
      snapBtn.innerHTML = '📸 Chụp ảnh';
      snapBtn.title = 'Phím tắt [P] để chụp ảnh màn hình';
      snapBtn.style.cssText = `
        background: rgba(30, 41, 59, 0.88);
        border: 1.5px solid #38bdf8;
        color: #38bdf8;
        padding: 7px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        backdrop-filter: blur(6px);
        transition: transform 0.1s;
      `;
      snapBtn.onclick = () => this.onScreenshotCallback && this.onScreenshotCallback();
      topBar.appendChild(snapBtn);
    }

    // Exit Button
    const exitBtn = document.createElement('button');
    exitBtn.innerHTML = '🚪 Thoát';
    exitBtn.style.cssText = `
      background: rgba(30, 41, 59, 0.88);
      border: 1.5px solid #475569;
      color: #f8fafc;
      padding: 7px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      backdrop-filter: blur(6px);
      transition: background 0.15s;
    `;
    exitBtn.onclick = () => this.onExitCallback();
    topBar.appendChild(exitBtn);

    this.container.appendChild(topBar);
  }

  /**
   * Overcooked 2 Horizontal Order Ticker Bar
   * Positioned along top-left without occluding kitchen gameplay!
   */
  private buildOrdersList() {
    this.ordersContainer = document.createElement('div');
    this.ordersContainer.style.cssText = `
      position: absolute;
      top: 10px;
      left: 14px;
      display: flex;
      flex-direction: row;
      gap: 10px;
      pointer-events: none;
      max-width: calc(100vw - 410px);
      overflow-x: auto;
      padding-bottom: 4px;
    `;
    this.container.appendChild(this.ordersContainer);
  }

  /**
   * Contextual Interaction Prompt Pill (PHẦN 3)
   * Shows clear, non-overlapping action instructions above the bottom hint bar.
   */
  private buildInteractionPrompt() {
    this.promptEl = document.createElement('div');
    this.promptEl.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%) translateY(8px);
      background: rgba(15, 23, 42, 0.92);
      border: 2px solid #38bdf8;
      border-radius: 999px;
      padding: 6px 18px;
      color: #f8fafc;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.2px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
      pointer-events: none;
      backdrop-filter: blur(8px);
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.16s ease, transform 0.16s ease, border-color 0.16s ease;
    `;
    this.container.appendChild(this.promptEl);
  }

  public updateInteractionPrompt(textHtml: string, borderColor: string = '#38bdf8', visible: boolean = true) {
    const key = `${visible}_${borderColor}_${textHtml}`;
    if (this.currentPromptKey === key) return;
    this.currentPromptKey = key;

    if (!visible || !textHtml) {
      this.promptEl.style.opacity = '0';
      this.promptEl.style.transform = 'translateX(-50%) translateY(8px)';
      return;
    }

    this.promptEl.innerHTML = textHtml;
    this.promptEl.style.borderColor = borderColor;
    this.promptEl.style.opacity = '1';
    this.promptEl.style.transform = 'translateX(-50%) translateY(0)';
  }

  public updateOrders(orders: OrderRecipe[]) {
    const activeIds = new Set(orders.map((o) => o.id));

    // Remove expired or completed order cards
    for (const [id, entry] of this.orderCardEls.entries()) {
      if (!activeIds.has(id)) {
        if (entry.card.parentNode) {
          entry.card.parentNode.removeChild(entry.card);
        }
        this.orderCardEls.delete(id);
      }
    }

    orders.forEach((order) => {
      let entry = this.orderCardEls.get(order.id);
      const ratio = Math.max(0, Math.min(1, order.remainingTime / order.maxTime));
      const barColor = ratio > 0.45 ? '#10b981' : ratio > 0.22 ? '#f59e0b' : '#ef4444';

      if (!entry) {
        const card = document.createElement('div');
        card.style.cssText = `
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.93) 100%);
          border: 2px solid #38bdf8;
          border-radius: 14px;
          padding: 7px 11px;
          min-width: 154px;
          backdrop-filter: blur(8px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.48);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          animation: hudOrderEnter 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        `;

        // Top Row: Dish Icon Medallion + Recipe Name + Points Badge
        const header = document.createElement('div');
        header.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
          margin-bottom: 5px;
        `;
        const dishIcon = this.getDishIllustrationEmoji(order);
        header.innerHTML = `
          <div style="display:flex;align-items:center;gap:5px;">
            <span style="font-size:16px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4));">${dishIcon}</span>
            <span style="font-weight:900;font-size:12px;color:#f8fafc;white-space:nowrap;">${order.name}</span>
          </div>
          <span style="background:rgba(251,191,36,0.18);border:1px solid #fbbf24;border-radius:999px;padding:1px 6px;font-weight:900;font-size:11px;color:#fbbf24;">+${order.rewardPoints}đ</span>
        `;
        card.appendChild(header);

        // Middle Row: Ingredient Step Badges (shows ingredient + required action icon 🔪/🍳)
        const chips = document.createElement('div');
        chips.style.cssText = 'display: flex; gap: 4px; flex-wrap: nowrap; margin-bottom: 6px;';
        order.requiredIngredients.forEach((ing) => {
          const badgeInfo = this.getIngredientStepBadge(ing);
          const chip = document.createElement('div');
          chip.style.cssText = `
            background: #0f172a;
            border: 1px solid ${badgeInfo.border};
            border-radius: 7px;
            padding: 2px 5px;
            display: flex;
            align-items: center;
            gap: 2px;
            font-size: 12px;
            line-height: 1;
          `;
          chip.innerHTML = `<span>${badgeInfo.icon}</span>${
            badgeInfo.stepIcon
              ? `<span style="font-size:9px;opacity:0.9;">${badgeInfo.stepIcon}</span>`
              : ''
          }`;
          chips.appendChild(chip);
        });
        card.appendChild(chips);

        // Bottom Row: Countdown Progress Bar + Seconds Remaining
        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;align-items:center;gap:6px;';

        const progressBg = document.createElement('div');
        progressBg.style.cssText = `
          flex: 1;
          height: 5px;
          background: #1e293b;
          border-radius: 999px;
          overflow: hidden;
        `;
        const progressFill = document.createElement('div');
        progressFill.style.cssText = `
          width: ${ratio * 100}%;
          height: 100%;
          background: ${barColor};
          border-radius: 999px;
          transition: width 0.15s linear, background-color 0.25s ease;
        `;
        progressBg.appendChild(progressFill);

        const timeLabel = document.createElement('span');
        timeLabel.style.cssText = 'font-size:10px;font-weight:800;color:#94a3b8;min-width:22px;text-align:right;';
        timeLabel.innerText = `${Math.ceil(order.remainingTime)}s`;

        footer.appendChild(progressBg);
        footer.appendChild(timeLabel);
        card.appendChild(footer);

        this.ordersContainer.appendChild(card);
        entry = { card, fill: progressFill, timeLabel };
        this.orderCardEls.set(order.id, entry);
      }

      // Update live bar width, color & urgency animation without recreating DOM
      entry.fill.style.width = `${ratio * 100}%`;
      entry.fill.style.background = barColor;
      entry.timeLabel.innerText = `${Math.max(0, Math.ceil(order.remainingTime))}s`;
      if (ratio <= 0.22) {
        entry.card.style.borderColor = '#ef4444';
        entry.card.style.animation = 'hudUrgentCard 0.6s infinite';
        entry.timeLabel.style.color = '#f87171';
      } else if (ratio <= 0.45) {
        entry.card.style.borderColor = '#f59e0b';
        entry.card.style.animation = 'none';
        entry.timeLabel.style.color = '#fbbf24';
      } else {
        entry.card.style.borderColor = '#38bdf8';
        entry.card.style.animation = 'none';
        entry.timeLabel.style.color = '#94a3b8';
      }
    });
  }

  private getDishIllustrationEmoji(order: OrderRecipe): string {
    const req = order.requiredIngredients;
    if (req.includes(IngredientType.BREAD) && req.includes(IngredientType.SLICED_CHEESE)) return '🍔';
    if (req.includes(IngredientType.BREAD)) return '🍔';
    if (req.includes(IngredientType.COOKED_PATTY) && !req.includes(IngredientType.BREAD)) return '🥩';
    return '🥗';
  }

  private getIngredientStepBadge(type: IngredientType): { icon: string; stepIcon: string; border: string } {
    switch (type) {
      case IngredientType.BREAD:
        return { icon: '🍞', stepIcon: '', border: '#d97706' };
      case IngredientType.COOKED_PATTY:
        return { icon: '🥩', stepIcon: '🍳', border: '#ef4444' };
      case IngredientType.CHOPPED_LETTUCE:
        return { icon: '🥬', stepIcon: '🔪', border: '#22c55e' };
      case IngredientType.SLICED_TOMATO:
        return { icon: '🍅', stepIcon: '🔪', border: '#f43f5e' };
      case IngredientType.SLICED_CHEESE:
        return { icon: '🧀', stepIcon: '🔪', border: '#facc15' };
      default:
        return { icon: '🍴', stepIcon: '', border: '#475569' };
    }
  }

  public updateScoreAndTimer(score: number, combo: number, secondsRemaining: number) {
    this.scoreEl.innerHTML = `🪙 ĐIỂM: ${score} <span style="color:#fef08a;font-size:14px;">(x${combo})</span>`;
    if (score !== this.lastScore) {
      if (score > this.lastScore) {
        this.scoreEl.style.transform = 'scale(1.16)';
        this.scoreEl.style.boxShadow = '0 0 24px rgba(251, 191, 36, 0.85)';
        setTimeout(() => {
          if (this.scoreEl) {
            this.scoreEl.style.transform = 'scale(1)';
            this.scoreEl.style.boxShadow = '0 4px 14px rgba(251, 191, 36, 0.28)';
          }
        }, 220);
      }
      this.lastScore = score;
    }

    const m = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
    const s = Math.floor(secondsRemaining % 60).toString().padStart(2, '0');
    this.timerEl.innerText = `⏱ ${m}:${s}`;
    if (secondsRemaining <= 30) {
      this.timerEl.style.borderColor = '#ef4444';
      this.timerEl.style.color = '#f87171';
      this.timerEl.style.animation = 'hudTimerPulse 0.85s infinite';
    } else {
      this.timerEl.style.borderColor = '#38bdf8';
      this.timerEl.style.color = '#38bdf8';
      this.timerEl.style.animation = 'none';
    }
  }

  private buildMobileControls() {
    // 1. TOUCH JOYSTICK ZONE (Left screen)
    const joyZone = document.createElement('div');
    joyZone.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      width: 40vw;
      height: 50vh;
      pointer-events: auto;
      touch-action: none;
    `;

    this.joystickBaseEl = document.createElement('div');
    this.joystickBaseEl.style.cssText = `
      position: absolute;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      border: 3px solid rgba(255, 255, 255, 0.35);
      transform: translate(-50%, -50%);
      display: none;
      pointer-events: none;
    `;

    this.joystickThumbEl = document.createElement('div');
    this.joystickThumbEl.style.cssText = `
      position: absolute;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: #38bdf8;
      border: 2px solid #ffffff;
      transform: translate(-50%, -50%);
      pointer-events: none;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.8);
    `;
    this.joystickBaseEl.appendChild(this.joystickThumbEl);
    joyZone.appendChild(this.joystickBaseEl);

    // Joystick Touch Listeners
    joyZone.addEventListener('touchstart', (e: TouchEvent) => {
      if (this.joystickTouchId === null && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        this.joystickTouchId = t.identifier;
        this.joystickActive = true;
        this.joystickCenter = { x: t.clientX, y: t.clientY };
        this.joystickBaseEl.style.left = `${t.clientX}px`;
        this.joystickBaseEl.style.top = `${t.clientY}px`;
        this.joystickThumbEl.style.left = '50px';
        this.joystickThumbEl.style.top = '50px';
        this.joystickBaseEl.style.display = 'block';
      }
    }, { passive: false });

    joyZone.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.joystickActive) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.joystickTouchId) {
          const dx = t.clientX - this.joystickCenter.x;
          const dy = t.clientY - this.joystickCenter.y;
          const dist = Math.hypot(dx, dy);
          const maxR = 45;
          let clampedX = dx;
          let clampedY = dy;
          if (dist > maxR) {
            clampedX = (dx / dist) * maxR;
            clampedY = (dy / dist) * maxR;
          }
          this.joystickThumbEl.style.left = `${50 + clampedX}px`;
          this.joystickThumbEl.style.top = `${50 + clampedY}px`;
          this.inputs.moveX = clampedX / maxR;
          this.inputs.moveZ = clampedY / maxR;
        }
      }
    }, { passive: false });

    const endJoy = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickActive = false;
          this.joystickTouchId = null;
          this.joystickBaseEl.style.display = 'none';
          this.inputs.moveX = 0;
          this.inputs.moveZ = 0;
        }
      }
    };
    joyZone.addEventListener('touchend', endJoy);
    joyZone.addEventListener('touchcancel', endJoy);

    this.container.appendChild(joyZone);

    // 2. TOUCH ACTION BUTTONS (Right screen bottom safe area)
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 14px;
      align-items: flex-end;
      pointer-events: auto;
    `;

    // Dash / Sprint (Indigo with lightning)
    this.dashBtnEl = this.createTouchButton('⚡<br>LƯỚT', '#6366f1', '#4f46e5', 66, () => {
      this.inputs.isDashJustPressed = true;
    });

    // Pickup / Drop (Green)
    const pickupBtn = this.createTouchButton('CẦM<br>THẢ', '#10b981', '#059669', 72, () => {
      this.inputs.isPickupJustPressed = true;
    });

    //Contextual Smart Action Button (CẮT / NẤU / RỬA / GIAO MÓN) - Single-tap trigger!
    this.actionBtnEl = this.createTouchButton('🔪<br>CẮT', '#f97316', '#ea580c', 80, () => {
      if (!this.actionBtnEnabled) return;
      this.inputs.isActionJustPressed = true;
    }, (pressed) => {
      this.inputs.isActionPressed = this.actionBtnEnabled && pressed;
    });

    // Throw (Purple)
    const throwBtn = this.createTouchButton('NÉM', '#8b5cf6', '#7c3aed', 62, () => {
      this.inputs.isThrowJustPressed = true;
    });

    btnContainer.appendChild(this.dashBtnEl);
    btnContainer.appendChild(throwBtn);
    btnContainer.appendChild(pickupBtn);
    btnContainer.appendChild(this.actionBtnEl);
    this.container.appendChild(btnContainer);

    this.updateContextualActionButton('CẮT<br>NẤU', '#475569', false);
  }

  /**
   * Dynamically updates the Smart Contextual Action Button based on what equipment
   * and ingredient the player is facing/holding (CẮT, NẤU, RỬA, GIAO MÓN, or Disabled).
   */
  public updateContextualActionButton(labelHtml: string, color: string, enabled: boolean) {
    if (!this.actionBtnEl) return;
    if (this.currentActionLabel === `${labelHtml}_${color}_${enabled}`) return;
    this.currentActionLabel = `${labelHtml}_${color}_${enabled}`;
    this.actionBtnEnabled = enabled;

    const span = this.actionBtnEl.querySelector('span');
    if (span) {
      span.innerHTML = labelHtml;
    }

    this.actionBtnEl.dataset.baseColor = color;
    this.actionBtnEl.style.background = color;
    if (enabled) {
      this.actionBtnEl.style.opacity = '1.0';
      this.actionBtnEl.style.filter = 'none';
      this.actionBtnEl.style.cursor = 'pointer';
      this.actionBtnEl.style.boxShadow = `0 0 18px ${color}99, 0 4px 14px rgba(0, 0, 0, 0.45)`;
    } else {
      this.actionBtnEl.style.opacity = '0.38';
      this.actionBtnEl.style.filter = 'grayscale(65%)';
      this.actionBtnEl.style.cursor = 'default';
      this.actionBtnEl.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.25)';
      this.inputs.isActionPressed = false;
    }
  }

  public showFloatingPopup(text: string, borderColor: string = '#fbbf24') {
    const popup = document.createElement('div');
    popup.innerHTML = text;
    popup.style.cssText = `
      position: absolute;
      top: 90px;
      left: 50%;
      transform: translate(-50%, 0) scale(0.85);
      background: rgba(15, 23, 42, 0.94);
      border: 3px solid ${borderColor};
      border-radius: 18px;
      padding: 8px 22px;
      color: #ffffff;
      font-weight: 900;
      font-size: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      z-index: 80;
      opacity: 1;
      transition: transform 0.75s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.75s ease-out;
    `;
    this.container.appendChild(popup);
    requestAnimationFrame(() => {
      popup.style.transform = 'translate(-50%, -32px) scale(1.05)';
      popup.style.opacity = '0';
    });
    setTimeout(() => {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 800);
  }

  public updateDashCooldown(remainingSeconds: number, totalCooldown: number) {
    if (!this.dashBtnEl) return;
    const ringEl = this.dashBtnEl.querySelector('.dash-cooldown-ring') as HTMLElement | null;
    if (remainingSeconds > 0 && totalCooldown > 0) {
      const progress = Math.max(0, Math.min(1, 1 - remainingSeconds / totalCooldown));
      const deg = Math.round(progress * 360);
      this.dashBtnEl.style.opacity = '0.68';
      this.dashBtnEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
      if (ringEl) {
        ringEl.style.background = `conic-gradient(#38bdf8 ${deg}deg, rgba(15, 23, 42, 0.75) ${deg}deg)`;
        ringEl.style.opacity = '1';
      }
    } else {
      this.dashBtnEl.style.opacity = '1.0';
      this.dashBtnEl.style.boxShadow = '0 0 16px rgba(99, 102, 241, 0.85), 0 4px 14px rgba(0, 0, 0, 0.4)';
      if (ringEl) {
        ringEl.style.background = 'conic-gradient(#a5b4fc 360deg, transparent 360deg)';
        ringEl.style.opacity = '0';
      }
    }
  }

  private createTouchButton(
    html: string,
    color: string,
    activeColor: string,
    size: number,
    onTap: () => void,
    onHold?: (pressed: boolean) => void
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.tabIndex = -1;
    btn.style.cssText = `
      position: relative;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid #ffffff;
      color: #ffffff;
      font-weight: 900;
      font-size: ${size < 70 ? '11px' : '13px'};
      line-height: 1.2;
      text-align: center;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      outline: none;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.08s, opacity 0.12s, box-shadow 0.15s;
    `;

    const ring = document.createElement('div');
    ring.className = 'dash-cooldown-ring';
    ring.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0;
      mix-blend-mode: screen;
    `;
    btn.appendChild(ring);

    const label = document.createElement('span');
    label.style.cssText = 'position: relative; z-index: 2; pointer-events: none;';
    label.innerHTML = html;
    btn.appendChild(label);

    let activePointerId: number | null = null;

    const press = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      btn.blur();
      if (activePointerId !== null) return;
      activePointerId = e.pointerId;
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (_) {}
      btn.style.transform = 'scale(0.90)';
      btn.style.background = activeColor;
      onTap();
      if (onHold) onHold(true);
    };

    const release = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      activePointerId = null;
      btn.style.transform = 'scale(1)';
      btn.style.background = btn.dataset.baseColor || color;
      if (onHold) onHold(false);
    };

    btn.addEventListener('pointerdown', press, { passive: false });
    btn.addEventListener('pointerup', release, { passive: false });
    btn.addEventListener('pointercancel', release, { passive: false });
    btn.addEventListener('lostpointercapture', release, { passive: false });
    // Prevent keyboard Space/Enter from ever activating the button
    btn.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    return btn;
  }

  private buildDesktopHints() {
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 4px 14px;
      color: #94a3b8;
      font-size: 11px;
      font-weight: bold;
      pointer-events: none;
      backdrop-filter: blur(4px);
      white-space: nowrap;
    `;
    hint.innerHTML = '⌨ <b>[WASD / ⬆⬅⬇➡]</b> Di chuyển &nbsp;|&nbsp; <b>[Shift]</b> Lướt &nbsp;|&nbsp; <b>[E]</b> Lấy nguyên liệu / Đặt &nbsp;|&nbsp; <b>[Space / F]</b> Nhặt mặt thùng / Cắt / Nấu / 🧯 &nbsp;|&nbsp; <b>[Q]</b> Ném';
    this.container.appendChild(hint);
  }

  private buildGameOverModal() {
    this.gameOverEl = document.createElement('div');
    this.gameOverEl.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(11, 15, 25, 0.88);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 100;
      pointer-events: auto;
      backdrop-filter: blur(10px);
    `;

    this.gameOverEl.innerHTML = `
      <div style="background: #1e293b; border: 3px solid #fbbf24; border-radius: 20px; padding: 32px 40px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.8); max-width: 400px; width: 90%;">
        <h1 style="color: #fbbf24; font-size: 36px; font-weight: 900; margin-bottom: 12px;">HẾT GIỜ!</h1>
        <p style="color: #94a3b8; font-size: 15px; margin-bottom: 24px;">Nhà bếp đã hoàn thành ca phục vụ xuất sắc!</p>
        <div id="final-score" style="font-size: 44px; font-weight: 900; color: #38bdf8; margin-bottom: 28px;">0 ĐIỂM</div>
        <button id="btn-back-lobby" style="background: #2563eb; color: #ffffff; border: none; padding: 14px 28px; font-size: 16px; font-weight: bold; border-radius: 12px; cursor: pointer; width: 100%;">
          VỀ SẢNH CHÍNH
        </button>
      </div>
    `;

    const backBtn = this.gameOverEl.querySelector('#btn-back-lobby');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.onExitCallback());
    }

    this.container.appendChild(this.gameOverEl);
  }

  public showGameOver(score: number) {
    const finalScore = this.gameOverEl.querySelector('#final-score');
    if (finalScore) {
      finalScore.innerHTML = `${score} <span style="font-size: 24px; color: #fbbf24;">ĐIỂM</span>`;
    }
    this.gameOverEl.style.display = 'flex';
  }

  public destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
