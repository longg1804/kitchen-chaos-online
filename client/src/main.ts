import Phaser from 'phaser';
import { LobbyScene } from './game/scenes/LobbyScene';
import { GameScene } from './game/scenes/GameScene';

// High-DPI Sharp Graphics Configuration
const dpr = window.devicePixelRatio || 1;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  // HD 1280x720 base resolution ensures super crisp text, vectors & sprites on PC and Mobile!
  width: 1280,
  height: 720,
  backgroundColor: '#0b0f19',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [LobbyScene, GameScene]
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
