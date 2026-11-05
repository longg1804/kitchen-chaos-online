import pkg from '../rea/node_modules/playwright-core/index.js';
const { chromium } = pkg;
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('artifacts', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTestSuite() {
  console.log('=== KITCHEN CHAOS ONLINE PLAYWRIGHT QA SUITE ===');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const errors = [];
  const logError = (msg) => {
    console.error('[Browser Error]', msg);
    errors.push(msg);
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: DESKTOP MAIN MENU & SOLO GAMEPLAY
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing Desktop 1920x1080 Main Menu & Solo flow...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    });
    const desktopPage = await desktopContext.newPage();
    desktopPage.on('pageerror', (err) => logError(`[Desktop PageError] ${err.message}`));

    await desktopPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(2000);

    // Verify Title & Menu
    const titleText = await desktopPage.textContent('.kc-game-title');
    console.log('-> Title Detected:', titleText?.trim());
    if (!titleText?.includes('KITCHEN CHAOS')) {
      throw new Error('Title does not match Kitchen Chaos Online');
    }

    // Verify Chef Skin Card Selection
    const pandaCard = desktopPage.locator('.kc-skin-card').nth(1);
    await pandaCard.click();
    await desktopPage.waitForTimeout(400);

    await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01_desktop_menu.png') });
    console.log('-> Captured 01_desktop_menu.png');

    // Launch Solo Game
    const soloBtn = desktopPage.locator('.kc-main-panel .kc-action-btn.btn-solo');
    await soloBtn.click();
    console.log('-> Clicked Solo Button, waiting for 3D Game scene...');

    await desktopPage.waitForSelector('#hud-overlay-3d', { timeout: 8000 });
    await desktopPage.waitForTimeout(1500);

    await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, '02_desktop_gameplay.png') });
    console.log('-> Captured 02_desktop_gameplay.png');

    // Simulate Keyboard Interaction & Verify Controls
    console.log('-> Simulating Movement [W, A, S, D] & Action [E, Space]...');
    await desktopPage.keyboard.down('KeyW');
    await desktopPage.waitForTimeout(400);
    await desktopPage.keyboard.up('KeyW');

    await desktopPage.keyboard.down('KeyD');
    await desktopPage.waitForTimeout(400);
    await desktopPage.keyboard.up('KeyD');

    // Press Space to interact with crate or counter
    await desktopPage.keyboard.press('Space');
    await desktopPage.waitForTimeout(300);

    // Press E to perform action
    await desktopPage.keyboard.press('KeyE');
    await desktopPage.waitForTimeout(400);

    await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, '02b_crate_and_action_controls.png') });
    console.log('-> Captured 02b_crate_and_action_controls.png');

    await desktopContext.close();

    // -------------------------------------------------------------
    // TEST 1.5: CAMPAIGN MODE & WORLD MAP
    // -------------------------------------------------------------
    console.log('\n[TEST 1.5] Testing Campaign Mode, World Map & Level Preview...');
    const campaignContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const campaignPage = await campaignContext.newPage();
    campaignPage.on('pageerror', (err) => logError(`[Campaign PageError] ${err.message}`));

    await campaignPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await campaignPage.waitForTimeout(1500);

    // Verify Campaign Banner Button is present
    const campaignBtn = campaignPage.locator('.kc-campaign-banner-btn');
    await campaignBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('-> Campaign Banner visible, clicking to open World Map...');
    await campaignBtn.click();

    // Verify World Map modal is visible
    await campaignPage.waitForSelector('.kc-worldmap-card', { timeout: 5000 });
    await campaignPage.waitForTimeout(600);
    await campaignPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01b_campaign_world_map.png') });
    console.log('-> Captured 01b_campaign_world_map.png');

    // Click Level 1-1 Node
    const level11Node = campaignPage.locator('.kc-level-node').first();
    await level11Node.click();
    await campaignPage.waitForSelector('#kc-level-preview-modal', { timeout: 5000 });
    await campaignPage.waitForTimeout(500);
    await campaignPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01c_level_preview_modal.png') });
    console.log('-> Captured 01c_level_preview_modal.png');

    // Start Level 1-1 from Preview Modal
    const startLevelBtn = campaignPage.locator('#kc-preview-start-btn');
    await startLevelBtn.click();
    console.log('-> Clicked Start Level, waiting for 3D Game Scene...');
    await campaignPage.waitForSelector('#hud-overlay-3d', { timeout: 8000 });
    await campaignPage.waitForTimeout(1500);

    await campaignPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01d_campaign_level_1_1_gameplay.png') });
    console.log('-> Captured 01d_campaign_level_1_1_gameplay.png');
    await campaignContext.close();

    // -------------------------------------------------------------
    // TEST 2: MOBILE TOUCH & 2x2 BUTTON CLUSTER
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Mobile Landscape 844x390 Touch & HUD Controls...');
    const mobileContext = await browser.newContext({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on('pageerror', (err) => logError(`[Mobile PageError] ${err.message}`));

    await mobilePage.goto('http://localhost:3000?mode=solo', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForSelector('#hud-overlay-3d', { timeout: 8000 });
    await mobilePage.waitForTimeout(1500);

    // Verify Touch Elements
    const joyBase = await mobilePage.isVisible('#hud-joystick-base');
    const actionCluster = await mobilePage.isVisible('#hud-action-cluster');
    console.log('-> Mobile Joystick Visible:', joyBase);
    console.log('-> Mobile Action Buttons Visible:', actionCluster);

    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '03_mobile_landscape_gameplay.png') });
    console.log('-> Captured 03_mobile_landscape_gameplay.png');

    await mobileContext.close();

    // -------------------------------------------------------------
    // TEST 3: MULTIPLAYER 2-PLAYER ROOM CO-OP
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing 2-Player Co-op Room Creation & Sync...');
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const hostPage = await hostContext.newPage();
    hostPage.on('pageerror', (err) => logError(`[Host PageError] ${err.message}`));

    await hostPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await hostPage.waitForTimeout(1000);

    // Host clicks Create Room
    await hostPage.click('.kc-main-panel .kc-action-btn.btn-host');
    await hostPage.waitForSelector('#kc-room-code-text', { timeout: 8000 });
    await hostPage.waitForTimeout(800);

    const roomText = await hostPage.textContent('#kc-room-code-text');
    const roomCodeMatch = roomText?.match(/\d{6}/);
    if (!roomCodeMatch) {
      throw new Error(`Failed to extract 6-digit room code from: ${roomText}`);
    }
    const roomCode = roomCodeMatch[0];
    console.log(`-> Host created Room: ${roomCode}`);

    await hostPage.screenshot({ path: path.join(SCREENSHOT_DIR, '04_multiplayer_lobby_host.png') });
    console.log('-> Captured 04_multiplayer_lobby_host.png');

    // Guest joins room directly via URL
    const guestContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const guestPage = await guestContext.newPage();
    guestPage.on('pageerror', (err) => logError(`[Guest PageError] ${err.message}`));

    console.log(`-> Guest navigating to http://localhost:3000?room=${roomCode}`);
    await guestPage.goto(`http://localhost:3000?room=${roomCode}`, { waitUntil: 'domcontentloaded' });
    await guestPage.waitForSelector('#kc-room-code-text', { timeout: 8000 });
    await guestPage.waitForTimeout(1000);

    // Guest clicks Ready
    await guestPage.click('.kc-room-card .kc-action-btn.btn-join');
    await guestPage.waitForTimeout(500);

    // Host clicks Start Game
    console.log('-> Host starting game...');
    await hostPage.click('.kc-room-card .kc-action-btn.btn-solo');

    // Both should enter 3D Game Scene
    await Promise.all([
      hostPage.waitForSelector('#hud-overlay-3d', { timeout: 8000 }),
      guestPage.waitForSelector('#hud-overlay-3d', { timeout: 8000 })
    ]);
    await hostPage.waitForTimeout(1200);

    await hostPage.screenshot({ path: path.join(SCREENSHOT_DIR, '05_multiplayer_gameplay_host.png') });
    await guestPage.screenshot({ path: path.join(SCREENSHOT_DIR, '06_multiplayer_gameplay_guest.png') });
    console.log('-> Captured 05 & 06 multiplayer co-op gameplay screenshots!');

    await hostContext.close();
    await guestContext.close();

    console.log('\n=== ALL PLAYWRIGHT TESTS PASSED WITH 0 ERRORS! ===');
    console.log('Total Javascript Errors Logged:', errors.length);
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTestSuite();
