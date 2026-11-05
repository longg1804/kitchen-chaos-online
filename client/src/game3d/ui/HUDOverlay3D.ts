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
  private lastDisplayedScore = -1;
  private lastDisplayedCombo = -1;
  private lastDisplayedTimerSec = -1;
  private lastDashCdState = '';
  private orderCardEls: Map<
    string,
    {
      wrapper: HTMLElement;
      topSquare: HTMLElement;
      fill: HTMLElement;
      lastRatio: number;
      removing?: boolean;
    }
  > = new Map();
  private onExitCallback: () => void;
  private onScreenshotCallback?: () => void;

  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private joystickPointerId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private joystickThumbEl!: HTMLElement;
  private joystickBaseEl!: HTMLElement;
  private joystickDirGlowEl!: HTMLElement;
  private mobileControlsRoot!: HTMLElement;
  private desktopHintEl!: HTMLElement;
  private mobileHintEl!: HTMLElement;
  private mobileHintTimer: number | null = null;
  private ordersWrapperEl!: HTMLElement;
  private ordersToggleBtnEl!: HTMLButtonElement;
  private ordersCollapsed = false;
  private isTouchMode = false;

  private boundOnResize: () => void;
  private boundOnResetInputs: () => void;
  private boundOnFirstTouch: () => void;

  constructor(onExit: () => void, onScreenshot?: () => void) {
    this.onExitCallback = onExit;
    this.onScreenshotCallback = onScreenshot;
    this.isTouchMode = this.detectTouchOrMobileDevice();

    // Hide global #fs-btn while HUD is active to prevent top-right overlap
    const globalFsBtn = document.getElementById('fs-btn');
    if (globalFsBtn) {
      globalFsBtn.style.display = 'none';
    }

    this.container = document.createElement('div');
    this.container.id = 'hud-overlay-3d';
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 50;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    this.injectHUDKeyframes();
    this.buildTopBar();
    this.buildOrdersList();
    this.buildInteractionPrompt();
    this.buildMobileControls();
    this.buildControlHints();
    this.buildGameOverModal();

    this.applyDeviceModeLayout();

    this.boundOnResize = () => {
      this.isTouchMode = this.detectTouchOrMobileDevice() || this.isTouchMode;
      this.applyDeviceModeLayout();
    };
    this.boundOnResetInputs = () => {
      if (document.hidden || !document.hasFocus()) {
        this.resetAllInputs();
      }
      this.applyDeviceModeLayout();
    };
    this.boundOnFirstTouch = () => {
      if (!this.isTouchMode) {
        this.isTouchMode = true;
        this.applyDeviceModeLayout();
      }
    };

    window.addEventListener('resize', this.boundOnResize);
    window.addEventListener('orientationchange', this.boundOnResize);
    document.addEventListener('fullscreenchange', this.boundOnResize);
    window.addEventListener('blur', this.boundOnResetInputs);
    document.addEventListener('visibilitychange', this.boundOnResetInputs);
    window.addEventListener('touchstart', this.boundOnFirstTouch, { passive: true });

    document.body.appendChild(this.container);
  }

  public isMobileTouchMode(): boolean {
    return this.isTouchMode;
  }

  private detectTouchOrMobileDevice(): boolean {
    const hasCoarsePointer =
      typeof window.matchMedia === 'function' &&
      (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(any-pointer: coarse)').matches);
    const hasTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    const hasOntouchstart = 'ontouchstart' in window;
    const isMobileViewport = window.innerWidth <= 920 || window.innerHeight <= 540;
    const isMobileUA =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
    return Boolean(hasCoarsePointer || hasTouchPoints || hasOntouchstart || isMobileViewport || isMobileUA);
  }

  public resetAllInputs() {
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickPointerId = null;
    this.inputs.moveX = 0;
    this.inputs.moveZ = 0;
    this.inputs.isActionPressed = false;
    this.inputs.isPickupJustPressed = false;
    this.inputs.isActionJustPressed = false;
    this.inputs.isThrowJustPressed = false;
    this.inputs.isDashJustPressed = false;
    if (this.joystickThumbEl) {
      this.joystickThumbEl.style.transform = 'translate3d(0px, 0px, 0)';
    }
    if (this.joystickDirGlowEl) {
      this.joystickDirGlowEl.style.opacity = '0';
    }
    if (this.joystickBaseEl) {
      this.joystickBaseEl.style.borderColor = 'rgba(255, 255, 255, 0.55)';
    }
  }

  private applyDeviceModeLayout() {
    if (!this.mobileControlsRoot || !this.desktopHintEl || !this.mobileHintEl) return;

    if (this.isTouchMode) {
      this.mobileControlsRoot.style.display = 'block';
      this.joystickBaseEl.style.display = 'flex';
      this.desktopHintEl.style.display = 'none';
      this.mobileHintEl.style.display = 'flex';
      this.promptEl.style.bottom = 'calc(clamp(12px, 2.4vh, 22px) + env(safe-area-inset-bottom, 0px))';
      this.promptEl.style.maxWidth = 'calc(100vw - 320px)';
    } else {
      this.mobileControlsRoot.style.display = 'none';
      this.desktopHintEl.style.display = 'block';
      this.mobileHintEl.style.display = 'none';
      this.promptEl.style.bottom = '42px';
      this.promptEl.style.maxWidth = '86vw';
    }
  }

  private injectHUDKeyframes() {
    if (document.getElementById('hud-3d-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'hud-3d-keyframes';
    style.textContent = `
      @keyframes hudOrderEnter {
        0% { opacity: 0; transform: translateY(-24px) scale(0.88); }
        70% { opacity: 1; transform: translateY(3px) scale(1.02); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes hudTimerPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 3px 12px rgba(239, 68, 68, 0.35); }
        50% { transform: scale(1.06); box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
      }
      @keyframes hudUrgentCard {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
      }
      @keyframes hudGoldenTicketFly {
        0% { transform: scale(1.06) rotate(0deg); opacity: 1; }
        35% { transform: scale(1.14) rotate(-12deg) translate(-6px, -5px); opacity: 1; }
        100% { transform: scale(0.75) rotate(-22deg) translate(-80px, -55px); opacity: 0; }
      }
      #hud-orders-scroll::-webkit-scrollbar {
        height: 4px;
      }
      #hud-orders-scroll::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.45);
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  private buildTopBar() {
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      position: absolute;
      top: calc(clamp(6px, 1.4vh, 10px) + env(safe-area-inset-top, 0px));
      right: calc(clamp(8px, 1.8vw, 14px) + env(safe-area-inset-right, 0px));
      display: flex;
      gap: clamp(5px, 1.1vw, 9px);
      align-items: center;
      pointer-events: auto;
      z-index: 65;
    `;

    // Score & Combo Badge
    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.92));
      border: 2px solid #fbbf24;
      border-radius: 13px;
      padding: clamp(4px, 0.9vh, 6px) clamp(9px, 1.6vw, 14px);
      color: #fbbf24;
      font-weight: 900;
      font-size: clamp(12px, 2.3vmin, 16px);
      letter-spacing: 0.3px;
      box-shadow: 0 3px 12px rgba(251, 191, 36, 0.25);
      text-align: center;
      backdrop-filter: blur(8px);
      white-space: nowrap;
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease;
    `;
    this.scoreEl.innerHTML = '🪙 0 <span style="color:#fef08a;font-size:0.82em;">(x1)</span>';
    topBar.appendChild(this.scoreEl);

    // Match Timer Badge
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.92));
      border: 2px solid #38bdf8;
      border-radius: 13px;
      padding: clamp(4px, 0.9vh, 6px) clamp(9px, 1.6vw, 13px);
      color: #38bdf8;
      font-weight: 900;
      font-size: clamp(12px, 2.3vmin, 16px);
      letter-spacing: 0.3px;
      box-shadow: 0 3px 12px rgba(56, 189, 248, 0.25);
      backdrop-filter: blur(8px);
      white-space: nowrap;
      transition: border-color 0.2s, color 0.2s;
    `;
    this.timerEl.innerText = '⏱ 03:00';
    topBar.appendChild(this.timerEl);

    // Screenshot Button
    if (this.onScreenshotCallback) {
      const snapBtn = document.createElement('button');
      snapBtn.type = 'button';
      snapBtn.innerHTML = '📸';
      snapBtn.title = 'Chụp ảnh màn hình [P]';
      snapBtn.style.cssText = `
        background: rgba(30, 41, 59, 0.9);
        border: 1.5px solid #38bdf8;
        color: #38bdf8;
        padding: clamp(4px, 0.9vh, 6px) clamp(8px, 1.4vw, 11px);
        border-radius: 11px;
        font-size: clamp(12px, 2.1vmin, 14px);
        font-weight: 800;
        cursor: pointer;
        backdrop-filter: blur(6px);
        transition: transform 0.1s;
      `;
      snapBtn.onclick = () => this.onScreenshotCallback && this.onScreenshotCallback();
      topBar.appendChild(snapBtn);
    }

    // Fullscreen Toggle Button (integrated cleanly into top bar so #fs-btn never overlaps!)
    const fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.innerHTML = '⛶';
    fsBtn.title = 'Toàn màn hình';
    fsBtn.style.cssText = `
      background: rgba(30, 41, 59, 0.9);
      border: 1.5px solid #64748b;
      color: #f8fafc;
      padding: clamp(4px, 0.9vh, 6px) clamp(8px, 1.4vw, 11px);
      border-radius: 11px;
      font-size: clamp(12px, 2.1vmin, 14px);
      font-weight: 800;
      cursor: pointer;
      backdrop-filter: blur(6px);
    `;
    fsBtn.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        try {
          if (screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock('landscape').catch(() => {});
          }
        } catch (_) {}
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };
    topBar.appendChild(fsBtn);

    // Exit Button
    const exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.innerHTML = '🚪 Thoát';
    exitBtn.style.cssText = `
      background: rgba(30, 41, 59, 0.9);
      border: 1.5px solid #475569;
      color: #f8fafc;
      padding: clamp(4px, 0.9vh, 6px) clamp(8px, 1.5vw, 12px);
      border-radius: 11px;
      font-size: clamp(11px, 2vmin, 13px);
      font-weight: 800;
      cursor: pointer;
      backdrop-filter: blur(6px);
      white-space: nowrap;
      transition: background 0.15s;
    `;
    exitBtn.onclick = () => this.onExitCallback();
    topBar.appendChild(exitBtn);

    this.container.appendChild(topBar);
  }

  /**
   * Compact Overcooked 2 Horizontal Order Ticker Bar (PHẦN 3.1)
   * Includes a collapse/expand button and horizontal scroll so Order Cards never block kitchen gameplay!
   */
  private buildOrdersList() {
    this.ordersWrapperEl = document.createElement('div');
    this.ordersWrapperEl.style.cssText = `
      position: absolute;
      top: calc(clamp(6px, 1.4vh, 10px) + env(safe-area-inset-top, 0px));
      left: calc(clamp(8px, 1.8vw, 14px) + env(safe-area-inset-left, 0px));
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 6px;
      max-width: calc(100vw - clamp(255px, 44vw, 390px) - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
      z-index: 60;
      pointer-events: none;
    `;

    // Collapse / Expand Orders Toggle Pill (for compact mobile screens when multiple orders arrive)
    this.ordersToggleBtnEl = document.createElement('button');
    this.ordersToggleBtnEl.type = 'button';
    this.ordersToggleBtnEl.innerHTML = '📋 0 ▾';
    this.ordersToggleBtnEl.title = 'Thu gọn / Mở rộng danh sách đơn hàng';
    this.ordersToggleBtnEl.style.cssText = `
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.9);
      border: 1.5px solid #38bdf8;
      border-radius: 10px;
      padding: 4px 8px;
      color: #e0f2fe;
      font-size: clamp(10px, 1.9vmin, 12px);
      font-weight: 900;
      cursor: pointer;
      white-space: nowrap;
      backdrop-filter: blur(6px);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
      flex-shrink: 0;
    `;
    this.ordersToggleBtnEl.onclick = () => {
      this.ordersCollapsed = !this.ordersCollapsed;
      this.ordersContainer.style.display = this.ordersCollapsed ? 'none' : 'flex';
      const count = this.orderCardEls.size;
      this.ordersToggleBtnEl.innerHTML = `📋 ${count} ${this.ordersCollapsed ? '▸' : '▾'}`;
    };
    this.ordersWrapperEl.appendChild(this.ordersToggleBtnEl);

    this.ordersContainer = document.createElement('div');
    this.ordersContainer.id = 'hud-orders-scroll';
    this.ordersContainer.style.cssText = `
      display: flex;
      flex-direction: row;
      gap: clamp(5px, 1.1vw, 8px);
      pointer-events: auto;
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 4px;
      touch-action: pan-x;
      -webkit-overflow-scrolling: touch;
    `;
    this.ordersWrapperEl.appendChild(this.ordersContainer);
    this.container.appendChild(this.ordersWrapperEl);
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
      padding: 5px 14px;
      color: #f8fafc;
      font-size: clamp(11px, 2vmin, 13px);
      font-weight: 800;
      letter-spacing: 0.2px;
      box-shadow: 0 5px 16px rgba(0, 0, 0, 0.45);
      pointer-events: none;
      backdrop-filter: blur(8px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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

  /**
   * Compact Overcooked 2-Tier Hanging Order Tickets (PHẦN 3.1)
   * - Includes Recipe Name, Points Badge (+120đ), Progress Bar, Circular Dish Illustration,
   *   and Hanging Light-Blue Ingredient + Prep Tool Strips in a compact footprint that never blocks the kitchen!
   */
  public updateOrders(orders: OrderRecipe[]) {
    const activeIds = new Set(orders.map((o) => o.id));

    if (this.ordersToggleBtnEl) {
      this.ordersToggleBtnEl.innerHTML = `📋 ${orders.length} ${this.ordersCollapsed ? '▸' : '▾'}`;
    }

    // Handle removed orders: if completed while time remained, play Golden Ticket Fly-Off animation!
    for (const [id, entry] of this.orderCardEls.entries()) {
      if (!activeIds.has(id) && !entry.removing) {
        if (entry.lastRatio > 0.04) {
          entry.removing = true;
          entry.topSquare.style.background = 'linear-gradient(135deg, #fef08a 0%, #eab308 55%, #ca8a04 100%)';
          entry.topSquare.style.borderColor = '#fde047';
          entry.topSquare.style.boxShadow = '0 0 18px rgba(250, 204, 21, 0.9), 0 4px 12px rgba(0,0,0,0.45)';
          entry.fill.style.background = '#ec4899';
          entry.wrapper.style.animation = 'hudGoldenTicketFly 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards';
          setTimeout(() => {
            if (entry.wrapper.parentNode) {
              entry.wrapper.parentNode.removeChild(entry.wrapper);
            }
            this.orderCardEls.delete(id);
          }, 500);
        } else {
          if (entry.wrapper.parentNode) {
            entry.wrapper.parentNode.removeChild(entry.wrapper);
          }
          this.orderCardEls.delete(id);
        }
      }
    }

    orders.forEach((order) => {
      let entry = this.orderCardEls.get(order.id);
      const ratio = Math.max(0, Math.min(1, order.remainingTime / order.maxTime));
      const barColor = ratio > 0.48 ? '#65a30d' : ratio > 0.24 ? '#eab308' : '#ef4444';

      if (!entry) {
        const stripCount = order.requiredIngredients.length;
        const cardWidth = Math.max(68, stripCount * 22 + (stripCount - 1) * 2 + 4);
        const shortName = order.name.replace('Burger ', '');

        // Outer Wrapper holding Top Dish Square + Bottom Hanging Light-Blue Ingredient Strips
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: stretch;
          width: ${cardWidth}px;
          flex-shrink: 0;
          filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.4));
          animation: hudOrderEnter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          user-select: none;
        `;

        // 1. TOP SQUARE CARD (Compact Beveled Ticket Frame with Progress Bar, Dish Icon, Name & Points)
        const topSquare = document.createElement('div');
        topSquare.style.cssText = `
          position: relative;
          background: linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 86%, #f8fafc 100%);
          border: 2px solid #f1f5f9;
          border-bottom: 3px solid #f8fafc;
          border-radius: 5px 5px 2px 2px;
          height: clamp(56px, 12.5vmin, 66px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 0 3px 2px 3px;
          box-sizing: border-box;
          overflow: hidden;
        `;

        // Top Recessed Timer Slot
        const timerSlot = document.createElement('div');
        timerSlot.style.cssText = `
          width: calc(100% - 2px);
          height: 7px;
          background: #475569;
          border-left: 1.5px solid #f8fafc;
          border-right: 1.5px solid #f8fafc;
          border-bottom: 1.5px solid #94a3b8;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        `;

        const progressFill = document.createElement('div');
        progressFill.style.cssText = `
          width: ${ratio * 100}%;
          height: 100%;
          background: ${barColor};
          border-right: 2px solid #ffffff;
          box-sizing: border-box;
          transition: width 0.15s linear, background-color 0.25s ease;
        `;
        timerSlot.appendChild(progressFill);
        topSquare.appendChild(timerSlot);

        // Center Top-Down Circular Dish Illustration
        const dishBox = document.createElement('div');
        dishBox.style.cssText = `
          width: clamp(36px, 8vmin, 42px);
          height: clamp(36px, 8vmin, 42px);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: -1px;
        `;
        dishBox.innerHTML = this.getDishPlateSVG(order);
        topSquare.appendChild(dishBox);

        // Compact Recipe Name + Points Footer inside Top Card
        const metaRow = document.createElement('div');
        metaRow.style.cssText = `
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 9px;
          font-weight: 900;
          line-height: 1;
          color: #0f172a;
          padding: 0 1px;
          box-sizing: border-box;
        `;
        metaRow.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%;">${shortName}</span><span style="color:#b45309;">+${order.rewardPoints}</span>`;
        topSquare.appendChild(metaRow);

        wrapper.appendChild(topSquare);

        // 2. BOTTOM HANGING LIGHT-BLUE INGREDIENT STRIPS (Compact height so kitchen stays clear!)
        const stripsRow = document.createElement('div');
        stripsRow.style.cssText = `
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: flex-start;
          gap: 2px;
          padding: 0 1px;
        `;

        order.requiredIngredients.forEach((ing) => {
          const toolSvg = this.getPrepToolBlackSVG(ing);
          const hasPrep = toolSvg !== '';
          const strip = document.createElement('div');
          strip.style.cssText = `
            flex: 1;
            min-width: 20px;
            height: ${hasPrep ? '38px' : '23px'};
            background: linear-gradient(180deg, #9ecae3 0%, #b5d8ec 100%);
            border: 1px solid #7eaac4;
            border-top: 1.5px solid #6b95b0;
            border-radius: 0 0 4px 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: 2px 1px;
            box-sizing: border-box;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.14);
          `;

          // White Circular Ingredient Icon at Top of Strip
          const ingCircle = document.createElement('div');
          ingCircle.style.cssText = `
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          `;
          ingCircle.innerHTML = this.getRawIngredientSVG(ing);
          strip.appendChild(ingCircle);

          // Black Silhouette Tool Icon at Bottom of Strip
          if (hasPrep) {
            const toolBox = document.createElement('div');
            toolBox.style.cssText = `
              width: 16px;
              height: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
            `;
            toolBox.innerHTML = toolSvg;
            strip.appendChild(toolBox);
          }

          stripsRow.appendChild(strip);
        });

        wrapper.appendChild(stripsRow);
        this.ordersContainer.appendChild(wrapper);

        entry = { wrapper, topSquare, fill: progressFill, lastRatio: ratio };
        this.orderCardEls.set(order.id, entry);
      }

      if (entry.removing) return;

      // Update live bar width, color & urgency animation without recreating DOM (throttled to >0.3% change)
      if (Math.abs(ratio - entry.lastRatio) > 0.003) {
        entry.lastRatio = ratio;
        entry.fill.style.width = `${(ratio * 100).toFixed(1)}%`;
        entry.fill.style.background = barColor;
        if (ratio <= 0.22) {
          entry.topSquare.style.borderColor = '#ef4444';
          entry.wrapper.style.animation = 'hudUrgentCard 0.45s infinite';
        } else {
          entry.topSquare.style.borderColor = '#f1f5f9';
          entry.wrapper.style.animation = 'none';
        }
      }
    });
  }

  /**
   * High-Contrast Top-Down Circular Dish Illustration SVG for the Top Ticket Square
   */
  private getDishPlateSVG(order: OrderRecipe): string {
    const req = order.requiredIngredients;
    const hasBread = req.includes(IngredientType.BREAD);
    const hasCheese = req.includes(IngredientType.SLICED_CHEESE);
    const hasLettuce = req.includes(IngredientType.CHOPPED_LETTUCE);
    const hasTomato = req.includes(IngredientType.SLICED_TOMATO);
    const hasMeat = req.includes(IngredientType.COOKED_PATTY);

    if (hasBread) {
      return `
        <svg width="100%" height="100%" viewBox="0 0 64 64">
          <circle cx="32" cy="33" r="29" fill="rgba(0,0,0,0.22)"/>
          <circle cx="32" cy="31" r="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="2.5"/>
          <circle cx="32" cy="31" r="21" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1.5"/>
          ${
            hasLettuce
              ? `<path d="M12,31 Q10,20 20,16 Q32,10 44,16 Q54,20 52,31 Q54,42 44,47 Q32,53 20,47 Q10,42 12,31 Z" fill="#22c55e" stroke="#14532d" stroke-width="2"/>`
              : ''
          }
          ${
            hasCheese
              ? `<polygon points="15,20 49,18 51,44 14,43" fill="#facc15" stroke="#854d0e" stroke-width="2"/>`
              : ''
          }
          ${
            hasTomato
              ? `<circle cx="44" cy="22" r="8" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.8"/>
                 <circle cx="20" cy="40" r="8" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.8"/>`
              : ''
          }
          ${
            hasMeat
              ? `<circle cx="32" cy="32" r="18.5" fill="#78350f" stroke="#451a03" stroke-width="2"/>`
              : ''
          }
          <circle cx="32" cy="30" r="16.5" fill="#f59e0b" stroke="#78350f" stroke-width="2.2"/>
          <path d="M21,24 A13,10 0 0,1 43,24" fill="none" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round"/>
          <ellipse cx="27" cy="24" rx="2.2" ry="1.2" transform="rotate(-20 27 24)" fill="#fef9c3"/>
          <ellipse cx="34" cy="22" rx="2.2" ry="1.2" transform="rotate(15 34 22)" fill="#fef9c3"/>
          <ellipse cx="38" cy="28" rx="2.2" ry="1.2" transform="rotate(25 38 28)" fill="#fef9c3"/>
          <ellipse cx="25" cy="31" rx="2.2" ry="1.2" transform="rotate(-10 25 31)" fill="#fef9c3"/>
          <ellipse cx="32" cy="34" rx="2.2" ry="1.2" fill="#fef9c3"/>
        </svg>
      `;
    }

    if (hasMeat && !hasBread) {
      return `
        <svg width="100%" height="100%" viewBox="0 0 64 64">
          <circle cx="32" cy="31" r="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="2.5"/>
          <ellipse cx="32" cy="32" rx="19" ry="14" transform="rotate(-12 32 32)" fill="#7c2d12" stroke="#431407" stroke-width="2.2"/>
          <line x1="22" y1="26" x2="36" y2="38" stroke="#290d02" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="28" y1="23" x2="42" y2="35" stroke="#290d02" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      `;
    }

    return `
      <svg width="100%" height="100%" viewBox="0 0 64 64">
        <circle cx="32" cy="31" r="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="2.5"/>
        <circle cx="32" cy="31" r="19" fill="#22c55e" stroke="#14532d" stroke-width="2"/>
        <circle cx="26" cy="27" r="7" fill="#4ade80"/>
        <circle cx="37" cy="34" r="7" fill="#4ade80"/>
        ${
          hasTomato
            ? `<circle cx="36" cy="25" r="6" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.6"/>
               <circle cx="26" cy="36" r="6" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.6"/>`
            : ''
        }
      </svg>
    `;
  }

  /**
   * Crisp Cartoon Ingredient SVG inside the White Circle of each Light-Blue Hanging Strip
   */
  private getRawIngredientSVG(type: IngredientType): string {
    switch (type) {
      case IngredientType.BREAD:
        return `
          <svg width="15" height="15" viewBox="0 0 32 32">
            <ellipse cx="16" cy="17" rx="11" ry="9" fill="#f59e0b" stroke="#78350f" stroke-width="2.2"/>
            <ellipse cx="12" cy="14" rx="1.6" ry="0.9" fill="#fef9c3"/>
            <ellipse cx="17" cy="13" rx="1.6" ry="0.9" fill="#fef9c3"/>
            <ellipse cx="20" cy="16" rx="1.6" ry="0.9" fill="#fef9c3"/>
          </svg>
        `;
      case IngredientType.COOKED_PATTY:
        return `
          <svg width="15" height="15" viewBox="0 0 32 32">
            <ellipse cx="16" cy="16" rx="12" ry="8.5" transform="rotate(-22 16 16)" fill="#fda4af" stroke="#881337" stroke-width="2.2"/>
            <ellipse cx="16.5" cy="16" rx="9.5" ry="6.5" transform="rotate(-22 16.5 16)" fill="#e11d48"/>
            <circle cx="12" cy="16" r="2.6" fill="#ffffff" stroke="#881337" stroke-width="1.4"/>
            <path d="M15,13 Q19,16 23,12" fill="none" stroke="#ffe4e6" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        `;
      case IngredientType.CHOPPED_LETTUCE:
        return `
          <svg width="15" height="15" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="10.5" fill="#22c55e" stroke="#14532d" stroke-width="2.2"/>
            <path d="M10,16 Q16,10 22,16 Q16,22 10,16 Z" fill="#86efac"/>
          </svg>
        `;
      case IngredientType.SLICED_TOMATO:
        return `
          <svg width="15" height="15" viewBox="0 0 32 32">
            <circle cx="16" cy="17" r="10" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
            <polygon points="16,5 18,10 23,9 19,13 21,17 16,14 11,17 13,13 9,9 14,10" fill="#16a34a" stroke="#14532d" stroke-width="1.2"/>
          </svg>
        `;
      case IngredientType.SLICED_CHEESE:
        return `
          <svg width="15" height="15" viewBox="0 0 32 32">
            <polygon points="5,22 27,23 19,7" fill="#facc15" stroke="#854d0e" stroke-width="2.2" stroke-linejoin="round"/>
            <circle cx="15" cy="18" r="2.2" fill="#ca8a04"/>
            <circle cx="20" cy="19" r="1.6" fill="#ca8a04"/>
          </svg>
        `;
      default:
        return '';
    }
  }

  /**
   * Solid-Black Silhouette Prep Tool Icon at the Bottom of the Light-Blue Hanging Strip
   */
  private getPrepToolBlackSVG(type: IngredientType): string {
    if (type === IngredientType.COOKED_PATTY) {
      return `
        <svg width="16" height="14" viewBox="0 0 28 24">
          <path d="M7,9 Q9,6 7,3 M12,9 Q14,6 12,3 M17,9 Q19,6 17,3" fill="none" stroke="#090d16" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M3,13 L20,13 L18,19 Q11.5,20.5 5,19 Z" fill="#090d16"/>
          <rect x="19" y="13.5" width="7.5" height="2.4" rx="1" fill="#090d16"/>
        </svg>
      `;
    }
    if (
      type === IngredientType.CHOPPED_LETTUCE ||
      type === IngredientType.SLICED_TOMATO ||
      type === IngredientType.SLICED_CHEESE
    ) {
      return `
        <svg width="16" height="14" viewBox="0 0 28 24">
          <path d="M4,15 L19,6 L22,11 L7,18 Z" fill="#090d16"/>
          <rect x="20" y="5" width="5" height="2.6" rx="1" transform="rotate(-28 20 5)" fill="#090d16"/>
          <rect x="3" y="20" width="22" height="2.6" rx="1" fill="#090d16"/>
        </svg>
      `;
    }
    return '';
  }

  public updateScoreAndTimer(score: number, combo: number, secondsRemaining: number) {
    if (score !== this.lastDisplayedScore || combo !== this.lastDisplayedCombo) {
      this.lastDisplayedScore = score;
      this.lastDisplayedCombo = combo;
      this.scoreEl.innerHTML = `🪙 ${score} <span style="color:#fef08a;font-size:0.84em;">(x${combo})</span>`;
      if (score !== this.lastScore) {
        if (score > this.lastScore) {
          this.scoreEl.style.transform = 'scale(1.15)';
          this.scoreEl.style.boxShadow = '0 0 22px rgba(251, 191, 36, 0.85)';
          setTimeout(() => {
            if (this.scoreEl) {
              this.scoreEl.style.transform = 'scale(1)';
              this.scoreEl.style.boxShadow = '0 3px 12px rgba(251, 191, 36, 0.25)';
            }
          }, 220);
        }
        this.lastScore = score;
      }
    }

    const wholeSec = Math.max(0, Math.floor(secondsRemaining));
    if (wholeSec !== this.lastDisplayedTimerSec) {
      this.lastDisplayedTimerSec = wholeSec;
      const m = Math.floor(wholeSec / 60).toString().padStart(2, '0');
      const s = Math.floor(wholeSec % 60).toString().padStart(2, '0');
      this.timerEl.innerText = `⏱ ${m}:${s}`;
      if (wholeSec <= 30) {
        this.timerEl.style.borderColor = '#ef4444';
        this.timerEl.style.color = '#f87171';
        this.timerEl.style.animation = 'hudTimerPulse 0.85s infinite';
      } else {
        this.timerEl.style.borderColor = '#38bdf8';
        this.timerEl.style.color = '#38bdf8';
        this.timerEl.style.animation = 'none';
      }
    }
  }

  /**
   * PHẦN 1 & PHẦN 2:
   * - Left Side: Always-Visible Cartoon Virtual Joystick (120–145px base, 48–60px knob) with 8-way analog drag
   *   and instant center snap-back on release/cancel/blur.
   * - Right Side: Ergonomic 2x2 Two-Thumb Action Button Cluster:
   *     [ 🎯 Ném (Secondary) ]   [ ✋ Cầm/Thả (Primary) ]
   *     [ ⚡ Lướt (Secondary) ]  [ 🔪 Cắt/Nấu (Primary) ]
   */
  private buildMobileControls() {
    this.mobileControlsRoot = document.createElement('div');
    this.mobileControlsRoot.id = 'hud-mobile-controls';
    this.mobileControlsRoot.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 55;
    `;

    // =========================================================================
    // 1. LEFT-HAND VIRTUAL JOYSTICK ZONE & ALWAYS-VISIBLE CARTOON JOYSTICK
    // =========================================================================
    const joyZone = document.createElement('div');
    joyZone.id = 'hud-joystick-zone';
    joyZone.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      width: 46vw;
      height: 62vh;
      max-width: 340px;
      max-height: 340px;
      pointer-events: auto;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    `;

    // Outer Circular Joystick Base (120px - 142px standard, always visible on touch/mobile!)
    this.joystickBaseEl = document.createElement('div');
    this.joystickBaseEl.id = 'hud-joystick-base';
    this.joystickBaseEl.style.cssText = `
      position: absolute;
      left: calc(clamp(16px, 3vw, 28px) + env(safe-area-inset-left, 0px));
      bottom: calc(clamp(16px, 3vh, 28px) + env(safe-area-inset-bottom, 0px));
      width: clamp(120px, 25vmin, 142px);
      height: clamp(120px, 25vmin, 142px);
      border-radius: 50%;
      background: radial-gradient(circle, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.68) 72%, rgba(30, 41, 59, 0.85) 100%);
      border: 3.5px solid rgba(255, 255, 255, 0.55);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45), inset 0 0 14px rgba(56, 189, 248, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    `;

    // Inner Guide Ring & 8-Direction Chevrons SVG
    const guideSvg = document.createElement('div');
    guideSvg.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    guideSvg.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="4 4"/>
        <!-- Cardinal Directional Triangles -->
        <polygon points="60,8 54,17 66,17" fill="rgba(255,255,255,0.52)"/>
        <polygon points="60,112 54,103 66,103" fill="rgba(255,255,255,0.52)"/>
        <polygon points="8,60 17,54 17,66" fill="rgba(255,255,255,0.52)"/>
        <polygon points="112,60 103,54 103,66" fill="rgba(255,255,255,0.52)"/>
        <!-- Diagonal Ticks -->
        <circle cx="24" cy="24" r="2.2" fill="rgba(255,255,255,0.28)"/>
        <circle cx="96" cy="24" r="2.2" fill="rgba(255,255,255,0.28)"/>
        <circle cx="24" cy="96" r="2.2" fill="rgba(255,255,255,0.28)"/>
        <circle cx="96" cy="96" r="2.2" fill="rgba(255,255,255,0.28)"/>
      </svg>
    `;
    this.joystickBaseEl.appendChild(guideSvg);

    // Directional Active Highlight Glow Layer
    this.joystickDirGlowEl = document.createElement('div');
    this.joystickDirGlowEl.style.cssText = `
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.1s ease;
    `;
    this.joystickBaseEl.appendChild(this.joystickDirGlowEl);

    // Inner Thumb Knob (48px - 58px standard, centered inside base, moves via GPU translate3d)
    this.joystickThumbEl = document.createElement('div');
    this.joystickThumbEl.id = 'hud-joystick-thumb';
    this.joystickThumbEl.style.cssText = `
      position: relative;
      width: clamp(48px, 10.8vmin, 58px);
      height: clamp(48px, 10.8vmin, 58px);
      border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #7dd3fc 0%, #38bdf8 48%, #0284c7 100%);
      border: 3px solid #ffffff;
      box-shadow: 0 5px 14px rgba(0, 0, 0, 0.5), 0 0 14px rgba(56, 189, 248, 0.75), inset 0 2px 4px rgba(255, 255, 255, 0.65);
      transform: translate3d(0px, 0px, 0);
      pointer-events: none;
      box-sizing: border-box;
      will-change: transform;
    `;
    this.joystickBaseEl.appendChild(this.joystickThumbEl);
    joyZone.appendChild(this.joystickBaseEl);

    // Helper to update joystick vector from clientX / clientY relative to joystick base center
    const updateJoystickFromPoint = (clientX: number, clientY: number) => {
      const rect = this.joystickBaseEl.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const maxR = Math.max(34, (rect.width - this.joystickThumbEl.offsetWidth) * 0.5 + 4);

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      let clampedX = dx;
      let clampedY = dy;
      if (dist > maxR) {
        clampedX = (dx / dist) * maxR;
        clampedY = (dy / dist) * maxR;
      }

      this.joystickThumbEl.style.transform = `translate3d(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px, 0)`;

      // Deadzone of 8% for crisp stop, analog intensity from 8% -> 100%
      const normDist = Math.min(1, dist / maxR);
      if (normDist < 0.08) {
        this.inputs.moveX = 0;
        this.inputs.moveZ = 0;
        this.joystickDirGlowEl.style.opacity = '0';
      } else {
        this.inputs.moveX = clampedX / maxR;
        this.inputs.moveZ = clampedY / maxR;
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        this.joystickDirGlowEl.style.background = `conic-gradient(from ${angleDeg - 40}deg, rgba(56, 189, 248, 0.85) 0deg, rgba(56, 189, 248, 0.85) 80deg, transparent 85deg)`;
        this.joystickDirGlowEl.style.opacity = String(Math.min(1, normDist * 1.15));
      }
    };

    const stopJoystick = () => {
      this.joystickActive = false;
      this.joystickTouchId = null;
      this.joystickPointerId = null;
      this.inputs.moveX = 0;
      this.inputs.moveZ = 0;
      this.joystickThumbEl.style.transform = 'translate3d(0px, 0px, 0)';
      this.joystickDirGlowEl.style.opacity = '0';
      this.joystickBaseEl.style.borderColor = 'rgba(255, 255, 255, 0.55)';
      this.joystickBaseEl.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.45), inset 0 0 14px rgba(56, 189, 248, 0.22)';
    };

    // Multitouch Touch Events for Left Joystick (Isolated by touch.identifier)
    joyZone.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.preventDefault();
        if (this.joystickTouchId === null && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          this.joystickTouchId = t.identifier;
          this.joystickActive = true;
          this.joystickCenter = { x: t.clientX, y: t.clientY };
          this.joystickBaseEl.style.borderColor = '#38bdf8';
          this.joystickBaseEl.style.boxShadow = '0 0 22px rgba(56, 189, 248, 0.65), inset 0 0 18px rgba(56, 189, 248, 0.35)';
          updateJoystickFromPoint(t.clientX, t.clientY);
        }
      },
      { passive: false }
    );

    joyZone.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        if (!this.joystickActive || this.joystickTouchId === null) return;
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.joystickTouchId) {
            updateJoystickFromPoint(t.clientX, t.clientY);
            break;
          }
        }
      },
      { passive: false }
    );

    const onJoyTouchEnd = (e: TouchEvent) => {
      if (this.joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          stopJoystick();
          break;
        }
      }
    };
    joyZone.addEventListener('touchend', onJoyTouchEnd, { passive: false });
    joyZone.addEventListener('touchcancel', onJoyTouchEnd, { passive: false });

    // Fallback Pointer Events (for touch-screen laptops / stylus / DevTools mouse emulation when touchstart doesn't fire)
    joyZone.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // Handled by touchstart for true multitouch
      e.preventDefault();
      if (this.joystickPointerId !== null) return;
      this.joystickPointerId = e.pointerId;
      this.joystickActive = true;
      try {
        joyZone.setPointerCapture(e.pointerId);
      } catch (_) {}
      this.joystickBaseEl.style.borderColor = '#38bdf8';
      updateJoystickFromPoint(e.clientX, e.clientY);
    });

    joyZone.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !this.joystickActive || e.pointerId !== this.joystickPointerId) return;
      e.preventDefault();
      updateJoystickFromPoint(e.clientX, e.clientY);
    });

    const onJoyPointerEnd = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerId !== this.joystickPointerId) return;
      stopJoystick();
    };
    joyZone.addEventListener('pointerup', onJoyPointerEnd);
    joyZone.addEventListener('pointercancel', onJoyPointerEnd);
    joyZone.addEventListener('lostpointercapture', onJoyPointerEnd);

    this.mobileControlsRoot.appendChild(joyZone);

    // =========================================================================
    // 2. RIGHT-HAND 2×2 CIRCULAR CARTOON ILLUSTRATED ACTION BUTTON CLUSTER (PHẦN 2)
    // Inspired directly by Reference Image 3 (media_1793894014046_fa988af0.jpg):
    // - Primary Buttons (Cầm/Thả, Cắt/Nấu): 76–90 CSS px (clamp(76px, 17.5vmin, 88px))
    // - Secondary Buttons (Ném, Lướt): 68–78 CSS px (clamp(68px, 15.2vmin, 78px))
    // - Grid Spacing: 12–16 CSS px (clamp(12px, 2.5vmin, 16px))
    // - Layout:
    //   Row 1: [ 🎯 Ném (Secondary) ]   [ ✋ Cầm/Thả (Primary) ]
    //   Row 2: [ 👟 Lướt (Secondary) ]  [ 🔪 Cắt/Nấu (Primary) ]
    // =========================================================================
    const btnCluster = document.createElement('div');
    btnCluster.id = 'hud-action-cluster';
    btnCluster.style.cssText = `
      position: absolute;
      right: calc(clamp(14px, 2.8vw, 24px) + env(safe-area-inset-right, 0px));
      bottom: calc(clamp(14px, 2.8vh, 24px) + env(safe-area-inset-bottom, 0px));
      display: grid;
      grid-template-columns: auto auto;
      grid-template-rows: auto auto;
      gap: clamp(12px, 2.5vmin, 16px);
      align-items: center;
      justify-items: center;
      pointer-events: auto;
      touch-action: none;
    `;

    // Top-Left (Secondary: 68-78px): Ném (Flying Cartoon Ingredient + Motion Arc)
    const throwBtn = this.createTouchButton(
      this.getCartoonActionSVG('THROW'),
      'Ném',
      '#7c3aed',
      '#5b21b6',
      'clamp(68px, 15.2vmin, 78px)',
      false,
      () => {
        this.inputs.isThrowJustPressed = true;
      }
    );

    // Top-Right (Primary: 76-88px): Cầm/Thả (Cartoon 5-Fingered Open Hand matching Ref Image 3)
    const pickupBtn = this.createTouchButton(
      this.getCartoonActionSVG('HAND'),
      'Cầm/Thả',
      '#10b981',
      '#047857',
      'clamp(76px, 17.5vmin, 88px)',
      true,
      () => {
        this.inputs.isPickupJustPressed = true;
      }
    );

    // Bottom-Left (Secondary: 68-78px): Lướt (Cartoon Speeding Boot + Motion Lines matching Ref Image 3)
    this.dashBtnEl = this.createTouchButton(
      this.getCartoonActionSVG('DASH'),
      'Lướt',
      '#2563eb',
      '#1d4ed8',
      'clamp(68px, 15.2vmin, 78px)',
      false,
      () => {
        this.inputs.isDashJustPressed = true;
      }
    );

    // Bottom-Right (Primary: 76-88px): Cắt/Nấu Contextual Smart Action (Cartoon Knife & Cucumber on Board matching Ref Image 3)
    this.actionBtnEl = this.createTouchButton(
      this.getCartoonActionSVG('CHOP'),
      'Cắt/Nấu',
      '#ea580c',
      '#c2410c',
      'clamp(76px, 17.5vmin, 88px)',
      true,
      () => {
        if (!this.actionBtnEnabled) return;
        this.inputs.isActionJustPressed = true;
      },
      (pressed) => {
        this.inputs.isActionPressed = this.actionBtnEnabled && pressed;
      }
    );

    // Append in exact 2x2 grid order: Top-Left (Ném), Top-Right (Cầm/Thả), Bottom-Left (Lướt), Bottom-Right (Cắt/Nấu)
    btnCluster.appendChild(throwBtn);
    btnCluster.appendChild(pickupBtn);
    btnCluster.appendChild(this.dashBtnEl);
    btnCluster.appendChild(this.actionBtnEl);

    this.mobileControlsRoot.appendChild(btnCluster);
    this.container.appendChild(this.mobileControlsRoot);

    this.updateContextualActionButton('🔪<br>Cắt/Nấu', '#475569', false);
  }

  /**
   * Custom Cartoon SVG Illustrations for Mobile Circular Action Buttons
   * Designed to match Reference Image 3 (media_1793894014046_fa988af0.jpg) with bold dark outlines,
   * warm cream highlights, and unmistakable cooking silhouettes.
   */
  private getCartoonActionSVG(
    kind: 'HAND' | 'CHOP' | 'COOK' | 'WASH' | 'DELIVER' | 'DASH' | 'THROW' | 'SPRAY' | 'CRATE'
  ): string {
    switch (kind) {
      case 'HAND':
        // Large 5-fingered warm-cream cartoon hand (exact match to Ref Image 3 bottom-right)
        return `
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <path d="M18,37 C13,34 10,30 12,26 C14,23 18,25 22,29 L22,17 C22,13 27,13 27,17 L27,26 L29,12 C29.5,8 35,8 35,12 L35,25 L37.5,14 C38.5,10 43.5,11 43,15 L41.5,27 L45,19 C46.5,15.5 51,17.5 49.5,21.5 L44.5,38 C42.5,46 36.5,51 28.5,51 C21,51 17.5,45.5 18,37 Z"
              fill="#fff7ed" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M24,39 Q31,34 36,42" fill="none" stroke="#d6c7b2" stroke-width="2.4" stroke-linecap="round"/>
          </svg>
        `;
      case 'DASH':
        // Cartoon dashing shoe/boot with 2 horizontal speed lines on the right (exact match to Ref Image 3 bottom-left)
        return `
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <!-- Speed lines -->
            <line x1="39" y1="24" x2="53" y2="24" stroke="#fff7ed" stroke-width="3.8" stroke-linecap="round"/>
            <line x1="42" y1="32" x2="51" y2="32" stroke="#fde68a" stroke-width="3.4" stroke-linecap="round"/>
            <!-- Cartoon Winged Boot -->
            <path d="M26,17 L34,27 L39,34 C41,37 39,42 34,44 L17,46 C12,46 10,42 12,38 L18,35 L15,28 C14,25 18,22 22,24 L26,17 Z"
              fill="#fff7ed" stroke="#1c1917" stroke-width="3.2" stroke-linejoin="round"/>
            <path d="M13,43 L36,41" stroke="#d6c7b2" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        `;
      case 'CHOP':
        // Cartoon chef knife chopping green cucumber slices on wooden board with 3 golden sparks (exact match to Ref Image 3 top-right)
        return `
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <!-- 3 Golden Action Sparks -->
            <polygon points="33,7 36,17 31,17" fill="#facc15"/>
            <polygon points="42,9 41,19 37,17" fill="#facc15"/>
            <polygon points="50,15 44,22 41,19" fill="#facc15"/>
            <!-- Wooden Cutting Board -->
            <polygon points="10,41 34,33 54,40 30,49" fill="#c27838" stroke="#1c1917" stroke-width="2.8" stroke-linejoin="round"/>
            <polygon points="10,41 30,49 30,53 10,45" fill="#854d0e" stroke="#1c1917" stroke-width="2.4" stroke-linejoin="round"/>
            <polygon points="30,49 54,40 54,44 30,53" fill="#9a5822" stroke="#1c1917" stroke-width="2.4" stroke-linejoin="round"/>
            <!-- Sliced Green Cucumber / Veggie on Board -->
            <ellipse cx="22" cy="38" rx="5.5" ry="4" fill="#22c55e" stroke="#1c1917" stroke-width="2.2"/>
            <ellipse cx="24" cy="38" rx="3" ry="3.2" fill="#bbf7d0" stroke="#15803d" stroke-width="1.5"/>
            <ellipse cx="31" cy="41" rx="3.5" ry="2.2" fill="#86efac" stroke="#1c1917" stroke-width="2"/>
            <ellipse cx="38" cy="42" rx="3.5" ry="2.2" fill="#86efac" stroke="#1c1917" stroke-width="2"/>
            <!-- Chef Knife Blade & Brown Handle -->
            <path d="M16,16 L25,22 L22,26 L13,20 Z" fill="#78350f" stroke="#1c1917" stroke-width="2.5" stroke-linejoin="round"/>
            <circle cx="18" cy="19" r="1.3" fill="#fde68a"/>
            <path d="M25,22 L49,36 C44,40 34,37 22,26 Z" fill="#f1f5f9" stroke="#1c1917" stroke-width="2.6" stroke-linejoin="round"/>
          </svg>
        `;
      case 'COOK':
        // Cartoon Frying Pan with sizzling patty & golden steam
        return `
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <path d="M22,19 Q25,13 22,8 M32,18 Q35,12 32,7 M41,20 Q44,14 41,9" fill="none" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
            <ellipse cx="29" cy="37" rx="17" ry="10" fill="#334155" stroke="#1c1917" stroke-width="3"/>
            <ellipse cx="29" cy="35" rx="14" ry="7.5" fill="#1e293b"/>
            <ellipse cx="29" cy="35" rx="9.5" ry="5.2" fill="#b45309" stroke="#1c1917" stroke-width="2.2"/>
            <path d="M44,34 L56,28 L58,32 L45,38 Z" fill="#ea580c" stroke="#1c1917" stroke-width="2.6" stroke-linejoin="round"/>
          </svg>
        `;
      case 'WASH':
        // Cartoon Sparkling Plate & Blue Water Droplets
        return `
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <circle cx="29" cy="35" r="16" fill="#ffffff" stroke="#1c1917" stroke-width="3"/>
            <circle cx="29" cy="35" r="10" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
            <path d="M46,16 C46,16 52,24 52,28 C52,31.5 49.3,34 46,34 C42.7,34 40,31.5 40,28 C40,24 46,16 46,16 Z" fill="#38bdf8" stroke="#1c1917" stroke-width="2.4"/>
            <polygon points="18,14 20,19 25,21 20,23 18,28 16,23 11,21 16,19" fill="#facc15"/>
          </svg>
        `;
      case 'DELIVER':
        // Cartoon Golden Service Bell / Cloche with Star
        return `
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <circle cx="32" cy="17" r="4" fill="#facc15" stroke="#1c1917" stroke-width="2.5"/>
            <path d="M14,41 C14,26 50,26 50,41 Z" fill="#fbbf24" stroke="#1c1917" stroke-width="3" stroke-linejoin="round"/>
            <rect x="10" y="41" width="44" height="6" rx="3" fill="#f59e0b" stroke="#1c1917" stroke-width="2.8"/>
            <polygon points="32,25 34,30 39,30 35,33 36.5,38 32,35 27.5,38 29,33 25,30 30,30" fill="#fffbeb"/>
          </svg>
        `;
      case 'SPRAY':
        // Cartoon Fire Extinguisher + White Foam Cloud
        return `
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <rect x="16" y="24" width="16" height="26" rx="5" fill="#ef4444" stroke="#1c1917" stroke-width="2.8"/>
            <rect x="20" y="17" width="8" height="7" fill="#94a3b8" stroke="#1c1917" stroke-width="2.4"/>
            <path d="M28,20 L38,18" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round"/>
            <circle cx="45" cy="26" r="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
            <circle cx="51" cy="32" r="7" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
            <circle cx="43" cy="35" r="5.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
          </svg>
        `;
      case 'CRATE':
        // Cartoon Wooden Ingredient Crate + Up Arrow
        return `
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <rect x="14" y="26" width="36" height="24" rx="4" fill="#d97706" stroke="#1c1917" stroke-width="3"/>
            <line x1="14" y1="36" x2="50" y2="36" stroke="#78350f" stroke-width="2.6"/>
            <polygon points="32,10 43,22 36,22 36,29 28,29 28,22 21,22" fill="#4ade80" stroke="#1c1917" stroke-width="2.5" stroke-linejoin="round"/>
          </svg>
        `;
      case 'THROW':
      default:
        // Cartoon Flying Burger/Tomato with Motion Arc & Target
        return `
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <path d="M12,44 Q24,16 46,22" fill="none" stroke="#fde047" stroke-width="3.4" stroke-dasharray="4 4" stroke-linecap="round"/>
            <circle cx="44" cy="26" r="11" fill="#ef4444" stroke="#1c1917" stroke-width="2.8"/>
            <polygon points="44,15 46,20 51,19 47,23 44,21 40,23 38,19 42,20" fill="#22c55e"/>
            <circle cx="20" cy="42" r="5" fill="#fff7ed" opacity="0.85"/>
          </svg>
        `;
    }
  }

  /**
   * Dynamically updates the Smart Contextual Action Button based on what equipment
   * and ingredient the player is facing/holding (Cắt, Nấu, Rửa, Giao món, Nhặt mặt, or Disabled).
   */
  public updateContextualActionButton(labelHtml: string, color: string, enabled: boolean) {
    if (!this.actionBtnEl) return;
    if (this.currentActionLabel === `${labelHtml}_${color}_${enabled}`) return;
    this.currentActionLabel = `${labelHtml}_${color}_${enabled}`;
    this.actionBtnEnabled = enabled;

    // Parse icon + label from labelHtml (e.g. "🔪<br>CẮT" -> cartoon SVG + friendly label "Cắt")
    const parts = labelHtml.split(/<br\s*\/?>/i);
    const iconEl = this.actionBtnEl.querySelector('.btn-icon') as HTMLElement | null;
    const textEl = this.actionBtnEl.querySelector('.btn-label') as HTMLElement | null;
    if (iconEl && textEl) {
      const rawText = (parts.length >= 2 ? parts[1] : parts[0]).trim();
      const friendly = this.formatFriendlyLabel(rawText);
      textEl.innerHTML = friendly;

      const upper = rawText.toUpperCase();
      if (upper.includes('NẤU')) {
        iconEl.innerHTML = this.getCartoonActionSVG('COOK');
      } else if (upper.includes('RỬA')) {
        iconEl.innerHTML = this.getCartoonActionSVG('WASH');
      } else if (upper.includes('GIAO')) {
        iconEl.innerHTML = this.getCartoonActionSVG('DELIVER');
      } else if (upper.includes('PHUN') || upper.includes('CHÁY')) {
        iconEl.innerHTML = this.getCartoonActionSVG('SPRAY');
      } else if (upper.includes('NHẶT')) {
        iconEl.innerHTML = this.getCartoonActionSVG('HAND');
      } else if (upper.includes('LẤY') || upper.includes('ĐẶT')) {
        iconEl.innerHTML = this.getCartoonActionSVG('CRATE');
      } else {
        iconEl.innerHTML = this.getCartoonActionSVG('CHOP');
      }
    }

    this.actionBtnEl.dataset.baseColor = color;
    this.actionBtnEl.style.background = `radial-gradient(circle at 32% 28%, ${this.lightenHex(color)} 0%, ${color} 68%, #182234 100%)`;
    if (enabled) {
      this.actionBtnEl.style.opacity = '1.0';
      this.actionBtnEl.style.filter = 'none';
      this.actionBtnEl.style.cursor = 'pointer';
      this.actionBtnEl.style.borderColor = '#fff7ed';
      this.actionBtnEl.style.boxShadow = `0 0 18px ${color}99, 0 6px 14px rgba(0, 0, 0, 0.55), inset 0 0 0 3px #182234, inset 0 3px 6px rgba(255, 255, 255, 0.38)`;
    } else {
      this.actionBtnEl.style.opacity = '0.52';
      this.actionBtnEl.style.filter = 'grayscale(38%)';
      this.actionBtnEl.style.cursor = 'default';
      this.actionBtnEl.style.borderColor = 'rgba(255, 247, 237, 0.72)';
      this.actionBtnEl.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.4), inset 0 0 0 3px #182234';
      this.inputs.isActionPressed = false;
    }
  }

  private formatFriendlyLabel(raw: string): string {
    const map: Record<string, string> = {
      'CẮT': 'Cắt',
      'NẤU': 'Nấu',
      'RỬA': 'Rửa',
      'GIAO MÓN': 'Giao món',
      'BỎ RÁC': 'Bỏ rác',
      'PHUN BỌT': 'Phun bọt',
      'ĐANG CHÁY': 'Đang cháy',
      'NHẶT MẶT BÀN': 'Nhặt mặt',
      'LẤY NGUYÊN LIỆU': 'Lấy đồ',
      'ĐẶT & LẤY': 'Đặt & Lấy',
      'ĐẶT KẾ BÊN': 'Đặt cạnh',
      'CẮT/NẤU': 'Cắt/Nấu',
      'CẮT NẤU': 'Cắt/Nấu'
    };
    const upper = raw.toUpperCase();
    return map[upper] || raw;
  }

  private lightenHex(hex: string): string {
    if (hex === '#f97316' || hex === '#ea580c') return '#fb923c';
    if (hex === '#10b981' || hex === '#059669') return '#34d399';
    if (hex === '#3b82f6' || hex === '#2563eb') return '#60a5fa';
    if (hex === '#8b5cf6' || hex === '#7c3aed') return '#a78bfa';
    if (hex === '#0ea5e9' || hex === '#0284c7') return '#38bdf8';
    if (hex === '#ef4444') return '#f87171';
    if (hex === '#f59e0b') return '#fbbf24';
    return '#64748b';
  }

  public showFloatingPopup(text: string, borderColor: string = '#fbbf24') {
    const popup = document.createElement('div');
    popup.innerHTML = text;
    popup.style.cssText = `
      position: absolute;
      top: clamp(68px, 14vh, 92px);
      left: 50%;
      transform: translate(-50%, 0) scale(0.85);
      background: rgba(15, 23, 42, 0.94);
      border: 2.5px solid ${borderColor};
      border-radius: 16px;
      padding: 6px 18px;
      color: #ffffff;
      font-weight: 900;
      font-size: clamp(14px, 2.8vmin, 19px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      z-index: 80;
      opacity: 1;
      white-space: nowrap;
      transition: transform 0.75s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.75s ease-out;
    `;
    this.container.appendChild(popup);
    requestAnimationFrame(() => {
      popup.style.transform = 'translate(-50%, -28px) scale(1.04)';
      popup.style.opacity = '0';
    });
    setTimeout(() => {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 800);
  }

  public updateDashCooldown(remainingSeconds: number, totalCooldown: number) {
    if (!this.dashBtnEl) return;
    const stateKey = remainingSeconds > 0 ? remainingSeconds.toFixed(1) : 'ready';
    if (stateKey === this.lastDashCdState) return;
    this.lastDashCdState = stateKey;

    const ringEl = this.dashBtnEl.querySelector('.dash-cooldown-ring') as HTMLElement | null;
    const cdTextEl = this.dashBtnEl.querySelector('.dash-cooldown-text') as HTMLElement | null;
    if (remainingSeconds > 0 && totalCooldown > 0) {
      const progress = Math.max(0, Math.min(1, 1 - remainingSeconds / totalCooldown));
      const deg = Math.round(progress * 360);
      this.dashBtnEl.style.opacity = '0.75';
      if (ringEl) {
        ringEl.style.background = `conic-gradient(rgba(56, 189, 248, 0.45) ${deg}deg, rgba(15, 23, 42, 0.82) ${deg}deg)`;
        ringEl.style.opacity = '1';
      }
      if (cdTextEl) {
        cdTextEl.innerText = `${remainingSeconds.toFixed(1)}s`;
        cdTextEl.style.opacity = '1';
      }
    } else {
      this.dashBtnEl.style.opacity = '1.0';
      if (ringEl) {
        ringEl.style.opacity = '0';
      }
      if (cdTextEl) {
        cdTextEl.style.opacity = '0';
      }
    }
  }

  private createTouchButton(
    iconSvg: string,
    labelText: string,
    color: string,
    activeColor: string,
    sizeCss: string,
    isPrimary: boolean,
    onTap: () => void,
    onHold?: (pressed: boolean) => void
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.tabIndex = -1;
    btn.dataset.baseColor = color;
    btn.style.cssText = `
      position: relative;
      width: ${sizeCss};
      height: ${sizeCss};
      border-radius: 50%;
      background: radial-gradient(circle at 32% 28%, ${this.lightenHex(color)} 0%, ${color} 68%, #182234 100%);
      border: 4px solid #fff7ed;
      color: #fff7ed;
      font-weight: 900;
      text-align: center;
      cursor: pointer;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.55), inset 0 0 0 3px #182234, inset 0 3px 6px rgba(255, 255, 255, 0.38);
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      outline: none;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0px;
      padding: 4px;
      box-sizing: border-box;
      transition: transform 0.07s ease, opacity 0.12s ease, box-shadow 0.15s ease;
    `;

    const ring = document.createElement('div');
    ring.className = 'dash-cooldown-ring';
    ring.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0;
      z-index: 3;
    `;
    btn.appendChild(ring);

    const cdText = document.createElement('div');
    cdText.className = 'dash-cooldown-text';
    cdText.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 900;
      color: #fef08a;
      text-shadow: 0 1px 3px rgba(0,0,0,0.95);
      pointer-events: none;
      opacity: 0;
      z-index: 4;
    `;
    btn.appendChild(cdText);

    const iconSpan = document.createElement('span');
    iconSpan.className = 'btn-icon';
    iconSpan.style.cssText = `
      position: relative;
      z-index: 2;
      pointer-events: none;
      width: ${isPrimary ? 'clamp(38px, 8.8vmin, 46px)' : 'clamp(33px, 7.6vmin, 40px)'};
      height: ${isPrimary ? 'clamp(38px, 8.8vmin, 46px)' : 'clamp(33px, 7.6vmin, 40px)'};
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: -1px;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45));
    `;
    iconSpan.innerHTML = iconSvg;
    btn.appendChild(iconSpan);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'btn-label';
    labelSpan.style.cssText = `
      position: relative;
      z-index: 2;
      pointer-events: none;
      font-size: ${isPrimary ? 'clamp(9.5px, 2vmin, 11px)' : 'clamp(9px, 1.85vmin, 10px)'};
      font-weight: 900;
      line-height: 1;
      letter-spacing: 0.15px;
      color: #fff7ed;
      text-shadow: 0 1.5px 3px rgba(0, 0, 0, 0.85);
      white-space: nowrap;
      margin-top: -1px;
    `;
    labelSpan.innerHTML = labelText;
    btn.appendChild(labelSpan);

    let activeTouchId: number | null = null;
    let activePointerId: number | null = null;

    const applyVisualPress = () => {
      btn.style.transform = 'scale(0.90)';
      btn.style.background = `radial-gradient(circle at 50% 50%, ${activeColor} 0%, #0f172a 100%)`;
      btn.style.borderColor = '#fde047';
    };

    const applyVisualRelease = () => {
      btn.style.transform = 'scale(1)';
      const base = btn.dataset.baseColor || color;
      btn.style.background = `radial-gradient(circle at 32% 28%, ${this.lightenHex(base)} 0%, ${base} 68%, #182234 100%)`;
      btn.style.borderColor = '#fff7ed';
    };

    // Dedicated Touch Listeners (Isolated per touch.identifier so holding Left Joystick never blocks Right Buttons!)
    btn.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        btn.blur();
        if (activeTouchId !== null || e.changedTouches.length === 0) return;
        activeTouchId = e.changedTouches[0].identifier;
        applyVisualPress();
        onTap();
        if (onHold) onHold(true);
      },
      { passive: false }
    );

    const onBtnTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          activeTouchId = null;
          applyVisualRelease();
          if (onHold) onHold(false);
          break;
        }
      }
    };
    btn.addEventListener('touchend', onBtnTouchEnd, { passive: false });
    btn.addEventListener('touchcancel', onBtnTouchEnd, { passive: false });

    // Non-touch Pointer Listeners (for Desktop mouse testing or stylus)
    btn.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        if (e.pointerType === 'touch') return; // Handled by touchstart
        e.preventDefault();
        e.stopPropagation();
        btn.blur();
        if (activePointerId !== null) return;
        activePointerId = e.pointerId;
        try {
          btn.setPointerCapture(e.pointerId);
        } catch (_) {}
        applyVisualPress();
        onTap();
        if (onHold) onHold(true);
      },
      { passive: false }
    );

    const onBtnPointerRelease = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      e.preventDefault();
      e.stopPropagation();
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      activePointerId = null;
      applyVisualRelease();
      if (onHold) onHold(false);
    };
    btn.addEventListener('pointerup', onBtnPointerRelease, { passive: false });
    btn.addEventListener('pointercancel', onBtnPointerRelease, { passive: false });
    btn.addEventListener('lostpointercapture', onBtnPointerRelease, { passive: false });

    // Prevent keyboard Space/Enter from ever activating the button
    btn.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    return btn;
  }

  /**
   * PHẦN 3.3: Device-Specific Control Hints
   * - Desktop: Shows keyboard hints ([WASD] | [Shift] | [E] | [Space/F] | [Q]).
   * - Mobile/Touch: Shows concise touch hint that auto-fades after 6s, plus a compact "?" button to toggle anytime!
   */
  private buildControlHints() {
    // 1. Desktop Keyboard Hint Bar
    this.desktopHintEl = document.createElement('div');
    this.desktopHintEl.style.cssText = `
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 4px 14px;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 700;
      pointer-events: none;
      backdrop-filter: blur(4px);
      white-space: nowrap;
    `;
    this.desktopHintEl.innerHTML =
      '⌨ <b>[WASD / ⬆⬅⬇➡]</b> Di chuyển &nbsp;|&nbsp; <b>[Shift]</b> Lướt &nbsp;|&nbsp; <b>[E]</b> Cầm/Thả &nbsp;|&nbsp; <b>[Space / F]</b> Cắt/Nấu/Nhặt mặt &nbsp;|&nbsp; <b>[Q]</b> Ném';
    this.container.appendChild(this.desktopHintEl);

    // 2. Mobile Touch Hint Bar (Compact + Auto-fading + '?' Toggle Button)
    this.mobileHintEl = document.createElement('div');
    this.mobileHintEl.style.cssText = `
      position: absolute;
      bottom: calc(4px + env(safe-area-inset-bottom, 0px));
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 6px;
      pointer-events: auto;
      z-index: 56;
    `;

    const helpTextPill = document.createElement('div');
    helpTextPill.style.cssText = `
      background: rgba(15, 23, 42, 0.84);
      border: 1px solid #38bdf8;
      border-radius: 999px;
      padding: 3px 10px;
      color: #e2e8f0;
      font-size: clamp(9.5px, 1.8vmin, 11px);
      font-weight: 700;
      white-space: nowrap;
      backdrop-filter: blur(4px);
      transition: opacity 0.35s ease;
    `;
    helpTextPill.innerHTML = '🕹️ <b>Trái:</b> Di chuyển &nbsp;•&nbsp; ✋ <b>Cầm/Thả:</b> Lấy/Đặt &nbsp;•&nbsp; 🔪 <b>Cắt/Nấu:</b> Thao tác';

    const helpBtn = document.createElement('button');
    helpBtn.type = 'button';
    helpBtn.innerHTML = '?';
    helpBtn.title = 'Ẩn / Hiện hướng dẫn điều khiển cảm ứng';
    helpBtn.style.cssText = `
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(30, 41, 59, 0.9);
      border: 1.5px solid #64748b;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    `;

    let hintVisible = true;
    const scheduleAutoHide = () => {
      if (this.mobileHintTimer !== null) window.clearTimeout(this.mobileHintTimer);
      this.mobileHintTimer = window.setTimeout(() => {
        hintVisible = false;
        helpTextPill.style.opacity = '0';
        helpTextPill.style.pointerEvents = 'none';
        setTimeout(() => {
          if (!hintVisible) helpTextPill.style.display = 'none';
        }, 350);
      }, 6500);
    };

    helpBtn.onclick = () => {
      hintVisible = !hintVisible;
      if (hintVisible) {
        helpTextPill.style.display = 'block';
        requestAnimationFrame(() => {
          helpTextPill.style.opacity = '1';
        });
        scheduleAutoHide();
      } else {
        if (this.mobileHintTimer !== null) window.clearTimeout(this.mobileHintTimer);
        helpTextPill.style.opacity = '0';
        setTimeout(() => {
          if (!hintVisible) helpTextPill.style.display = 'none';
        }, 350);
      }
    };

    this.mobileHintEl.appendChild(helpTextPill);
    this.mobileHintEl.appendChild(helpBtn);
    this.container.appendChild(this.mobileHintEl);

    scheduleAutoHide();
  }

  private buildGameOverModal() {
    this.gameOverEl = document.createElement('div');
    this.gameOverEl.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
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
      <div style="background: #1e293b; border: 3px solid #fbbf24; border-radius: 20px; padding: clamp(20px, 4vh, 32px) clamp(24px, 5vw, 40px); text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.8); max-width: 400px; width: 88%;">
        <h1 style="color: #fbbf24; font-size: clamp(26px, 6vmin, 36px); font-weight: 900; margin-bottom: 10px;">HẾT GIỜ!</h1>
        <p style="color: #94a3b8; font-size: clamp(13px, 2.6vmin, 15px); margin-bottom: 20px;">Nhà bếp đã hoàn thành ca phục vụ xuất sắc!</p>
        <div id="final-score" style="font-size: clamp(32px, 7vmin, 44px); font-weight: 900; color: #38bdf8; margin-bottom: 24px;">0 ĐIỂM</div>
        <button id="btn-back-lobby" style="background: #2563eb; color: #ffffff; border: none; padding: 12px 24px; font-size: 15px; font-weight: bold; border-radius: 12px; cursor: pointer; width: 100%;">
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
    window.removeEventListener('resize', this.boundOnResize);
    window.removeEventListener('orientationchange', this.boundOnResize);
    document.removeEventListener('fullscreenchange', this.boundOnResize);
    window.removeEventListener('blur', this.boundOnResetInputs);
    document.removeEventListener('visibilitychange', this.boundOnResetInputs);
    window.removeEventListener('touchstart', this.boundOnFirstTouch);
    if (this.mobileHintTimer !== null) {
      window.clearTimeout(this.mobileHintTimer);
    }
    const globalFsBtn = document.getElementById('fs-btn');
    if (globalFsBtn) {
      globalFsBtn.style.display = '';
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
