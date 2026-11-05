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
        0% { opacity: 0; transform: translateY(-32px) scale(0.86); }
        70% { opacity: 1; transform: translateY(4px) scale(1.03); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes hudTimerPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35); }
        50% { transform: scale(1.06); box-shadow: 0 0 22px rgba(239, 68, 68, 0.75); }
      }
      @keyframes hudUrgentCard {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
      }
      @keyframes hudGoldenTicketFly {
        0% { transform: scale(1.08) rotate(0deg); opacity: 1; }
        35% { transform: scale(1.16) rotate(-14deg) translate(-8px, -6px); opacity: 1; }
        100% { transform: scale(0.75) rotate(-24deg) translate(-90px, -65px); opacity: 0; }
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

  /**
   * Overcooked! All You Can Eat 2-Tier Hanging Order Tickets (Matches Reference Images 2 & 3!)
   * - Tier 1 (Top Square Card): Beveled White/Grey Paper Frame + Recessed Top Timer Bar + Top-Down Circular Dish Illustration
   * - Tier 2 (Bottom Hanging Strips): Vertical Light-Blue Ingredient Tags (#a8d0e6) with White Circle Ingredient Icon
   *   and Solid-Black Prep Tool Silhouette Icon (Frying Pan 🍳 or Chopping Knife 🔪) at the bottom!
   * - Golden Ticket Fly-Off Animation when an order is completed!
   */
  public updateOrders(orders: OrderRecipe[]) {
    const activeIds = new Set(orders.map((o) => o.id));

    // Handle removed orders: if completed while time remained, play Golden Ticket Fly-Off animation!
    for (const [id, entry] of this.orderCardEls.entries()) {
      if (!activeIds.has(id) && !entry.removing) {
        if (entry.lastRatio > 0.04) {
          entry.removing = true;
          // Transform top square into Overcooked Golden Crown Ticket (Matches Reference Image 2!)
          entry.topSquare.style.background = 'linear-gradient(135deg, #fef08a 0%, #eab308 55%, #ca8a04 100%)';
          entry.topSquare.style.borderColor = '#fde047';
          entry.topSquare.style.boxShadow = '0 0 22px rgba(250, 204, 21, 0.9), 0 6px 16px rgba(0,0,0,0.45)';
          entry.fill.style.background = '#ec4899'; // Vibrant magenta bar on Golden Ticket
          entry.wrapper.style.animation = 'hudGoldenTicketFly 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards';
          setTimeout(() => {
            if (entry.wrapper.parentNode) {
              entry.wrapper.parentNode.removeChild(entry.wrapper);
            }
            this.orderCardEls.delete(id);
          }, 550);
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
        const cardWidth = Math.max(88, stripCount * 32 + (stripCount - 1) * 3);

        // Outer Wrapper holding Top Dish Square + Bottom Hanging Light-Blue Ingredient Strips
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: stretch;
          width: ${cardWidth}px;
          filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.42));
          animation: hudOrderEnter 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          user-select: none;
        `;

        // 1. TOP SQUARE CARD (White/Light-Grey Beveled Ticket Frame with Top Timer Bar & Center Dish Plate)
        const topSquare = document.createElement('div');
        topSquare.style.cssText = `
          position: relative;
          background: linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 86%, #f8fafc 100%);
          border: 3px solid #f1f5f9;
          border-bottom: 4px solid #f8fafc;
          border-radius: 4px 4px 2px 2px;
          height: 82px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 0 5px 4px 5px;
          box-sizing: border-box;
          overflow: hidden;
        `;

        // Top Recessed Timer Slot (Matches Reference Images 2 & 3!)
        const timerSlot = document.createElement('div');
        timerSlot.style.cssText = `
          width: calc(100% - 4px);
          height: 11px;
          background: #525b66;
          border-left: 2px solid #f8fafc;
          border-right: 2px solid #f8fafc;
          border-bottom: 2px solid #94a3b8;
          position: relative;
          overflow: hidden;
        `;

        const progressFill = document.createElement('div');
        progressFill.style.cssText = `
          width: ${ratio * 100}%;
          height: 100%;
          background: ${barColor};
          border-right: 2.5px solid #ffffff;
          box-sizing: border-box;
          transition: width 0.15s linear, background-color 0.25s ease;
        `;
        timerSlot.appendChild(progressFill);
        topSquare.appendChild(timerSlot);

        // Center Top-Down Circular Dish Illustration
        const dishBox = document.createElement('div');
        dishBox.style.cssText = `
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1px;
        `;
        dishBox.innerHTML = this.getDishPlateSVG(order);
        topSquare.appendChild(dishBox);

        wrapper.appendChild(topSquare);

        // 2. BOTTOM HANGING LIGHT-BLUE INGREDIENT STRIPS (Matches Reference Images 2 & 3!)
        const stripsRow = document.createElement('div');
        stripsRow.style.cssText = `
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: flex-start;
          gap: 3px;
          padding: 0 2px;
        `;

        order.requiredIngredients.forEach((ing) => {
          const toolSvg = this.getPrepToolBlackSVG(ing);
          const hasPrep = toolSvg !== '';
          const strip = document.createElement('div');
          strip.style.cssText = `
            flex: 1;
            min-width: 28px;
            height: ${hasPrep ? '58px' : '36px'};
            background: linear-gradient(180deg, #9ecae3 0%, #b5d8ec 100%);
            border: 1.5px solid #7eaac4;
            border-top: 2px solid #6b95b0;
            border-radius: 0 0 5px 5px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: 4px 2px 4px 2px;
            box-sizing: border-box;
            box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.14);
          `;

          // White Circular Ingredient Icon at Top of Strip
          const ingCircle = document.createElement('div');
          ingCircle.style.cssText = `
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
          `;
          ingCircle.innerHTML = this.getRawIngredientSVG(ing);
          strip.appendChild(ingCircle);

          // Black Silhouette Tool Icon at Bottom of Strip (if cooking/chopping is required!)
          if (hasPrep) {
            const toolBox = document.createElement('div');
            toolBox.style.cssText = `
              width: 22px;
              height: 20px;
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

      // Update live bar width, color & urgency animation without recreating DOM
      entry.lastRatio = ratio;
      entry.fill.style.width = `${ratio * 100}%`;
      entry.fill.style.background = barColor;
      if (ratio <= 0.22) {
        entry.topSquare.style.borderColor = '#ef4444';
        entry.wrapper.style.animation = 'hudUrgentCard 0.45s infinite';
      } else {
        entry.topSquare.style.borderColor = '#f1f5f9';
        entry.wrapper.style.animation = 'none';
      }
    });
  }

  /**
   * High-Contrast Top-Down Circular Dish Illustration SVG for the Top Ticket Square (Matches Images 2 & 3)
   */
  private getDishPlateSVG(order: OrderRecipe): string {
    const req = order.requiredIngredients;
    const hasBread = req.includes(IngredientType.BREAD);
    const hasCheese = req.includes(IngredientType.SLICED_CHEESE);
    const hasLettuce = req.includes(IngredientType.CHOPPED_LETTUCE);
    const hasTomato = req.includes(IngredientType.SLICED_TOMATO);
    const hasMeat = req.includes(IngredientType.COOKED_PATTY);

    if (hasBread) {
      // Top-down Burger on a White Ceramic Plate with lettuce frills, tomato/cheese peeking out & sesame bun
      return `
        <svg width="58" height="58" viewBox="0 0 64 64">
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
      // Seared Steak Plate
      return `
        <svg width="58" height="58" viewBox="0 0 64 64">
          <circle cx="32" cy="31" r="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="2.5"/>
          <ellipse cx="32" cy="32" rx="19" ry="14" transform="rotate(-12 32 32)" fill="#7c2d12" stroke="#431407" stroke-width="2.2"/>
          <line x1="22" y1="26" x2="36" y2="38" stroke="#290d02" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="28" y1="23" x2="42" y2="35" stroke="#290d02" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      `;
    }

    // Fresh Garden Salad on Plate
    return `
      <svg width="58" height="58" viewBox="0 0 64 64">
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
   * Crisp Cartoon Ingredient SVG inside the White Circle of each Light-Blue Hanging Strip (Matches Images 2 & 3)
   */
  private getRawIngredientSVG(type: IngredientType): string {
    switch (type) {
      case IngredientType.BREAD:
        return `
          <svg width="20" height="20" viewBox="0 0 32 32">
            <ellipse cx="16" cy="17" rx="11" ry="9" fill="#f59e0b" stroke="#78350f" stroke-width="2.2"/>
            <ellipse cx="12" cy="14" rx="1.6" ry="0.9" fill="#fef9c3"/>
            <ellipse cx="17" cy="13" rx="1.6" ry="0.9" fill="#fef9c3"/>
            <ellipse cx="20" cy="16" rx="1.6" ry="0.9" fill="#fef9c3"/>
          </svg>
        `;
      case IngredientType.COOKED_PATTY:
        // Raw Marbled Red Ribeye Steak Icon (like Image 3 col 3!)
        return `
          <svg width="20" height="20" viewBox="0 0 32 32">
            <ellipse cx="16" cy="16" rx="12" ry="8.5" transform="rotate(-22 16 16)" fill="#fda4af" stroke="#881337" stroke-width="2.2"/>
            <ellipse cx="16.5" cy="16" rx="9.5" ry="6.5" transform="rotate(-22 16.5 16)" fill="#e11d48"/>
            <circle cx="12" cy="16" r="2.6" fill="#ffffff" stroke="#881337" stroke-width="1.4"/>
            <path d="M15,13 Q19,16 23,12" fill="none" stroke="#ffe4e6" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        `;
      case IngredientType.CHOPPED_LETTUCE:
        return `
          <svg width="20" height="20" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="10.5" fill="#22c55e" stroke="#14532d" stroke-width="2.2"/>
            <path d="M10,16 Q16,10 22,16 Q16,22 10,16 Z" fill="#86efac"/>
          </svg>
        `;
      case IngredientType.SLICED_TOMATO:
        // Plump Red Tomato with Green Star Calyx (like Image 2 col 2!)
        return `
          <svg width="20" height="20" viewBox="0 0 32 32">
            <circle cx="16" cy="17" r="10" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
            <polygon points="16,5 18,10 23,9 19,13 21,17 16,14 11,17 13,13 9,9 14,10" fill="#16a34a" stroke="#14532d" stroke-width="1.2"/>
          </svg>
        `;
      case IngredientType.SLICED_CHEESE:
        return `
          <svg width="20" height="20" viewBox="0 0 32 32">
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
   * Solid-Black Silhouette Prep Tool Icon at the Bottom of the Light-Blue Hanging Strip (Matches Image 2!)
   * - Cooked Patty -> Black Frying Pan with Handle + 3 Wavy Steam Lines
   * - Chopped Veggies/Cheese -> Black Cleaver / Chopping Icon
   * - Bread -> Empty string (shorter strip, no prep needed!)
   */
  private getPrepToolBlackSVG(type: IngredientType): string {
    if (type === IngredientType.COOKED_PATTY) {
      // Exact Black Frying Pan + 3 Steam Waves Silhouette from Reference Image 2!
      return `
        <svg width="22" height="19" viewBox="0 0 28 24">
          <path d="M7,9 Q9,6 7,3 M12,9 Q14,6 12,3 M17,9 Q19,6 17,3" fill="none" stroke="#090d16" stroke-width="2" stroke-linecap="round"/>
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
      // Solid Black Chopping Knife & Board Silhouette
      return `
        <svg width="22" height="19" viewBox="0 0 28 24">
          <path d="M4,15 L19,6 L22,11 L7,18 Z" fill="#090d16"/>
          <rect x="20" y="5" width="5" height="2.6" rx="1" transform="rotate(-28 20 5)" fill="#090d16"/>
          <rect x="3" y="20" width="22" height="2.6" rx="1" fill="#090d16"/>
        </svg>
      `;
    }
    return '';
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
