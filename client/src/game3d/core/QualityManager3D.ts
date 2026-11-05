import * as THREE from 'three';

export type GraphicsQualityTier = 'MOBILE_LOW' | 'MOBILE_MEDIUM' | 'DESKTOP_HIGH';

export interface QualityProfile {
  tier: GraphicsQualityTier;
  maxPixelRatio: number;
  antialias: boolean;
  shadowMapEnabled: boolean;
  shadowMapSize: number;
  shadowMapType: THREE.ShadowMapType;
  enablePendantPointLights: boolean;
  enableFirePointLight: boolean;
  enableSmallPropShadows: boolean;
  maxParticles: number;
  particleSpawnMultiplier: number;
}

export class QualityManager3D {
  private static currentProfile: QualityProfile;
  private static fpsSampleAccum = 0;
  private static fpsFrameCount = 0;
  private static downgraded = false;

  public static detectInitialProfile(): QualityProfile {
    const isCoarse =
      typeof window.matchMedia === 'function' &&
      (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(any-pointer: coarse)').matches);
    const hasTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    const isMobileUA =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
    const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 560;
    const isMobile = Boolean(isCoarse || hasTouch || isMobileUA || isSmallScreen);

    if (!isMobile) {
      this.currentProfile = this.getProfileForTier('DESKTOP_HIGH');
      return this.currentProfile;
    }

    const cores = (navigator as any).hardwareConcurrency || 4;
    const deviceMem = (navigator as any).deviceMemory || 4;
    const isLowEndMobile = cores <= 4 || deviceMem <= 3 || Math.min(window.innerWidth, window.innerHeight) <= 380;

    this.currentProfile = this.getProfileForTier(isLowEndMobile ? 'MOBILE_LOW' : 'MOBILE_MEDIUM');
    return this.currentProfile;
  }

  public static getProfile(): QualityProfile {
    if (!this.currentProfile) {
      return this.detectInitialProfile();
    }
    return this.currentProfile;
  }

  public static getProfileForTier(tier: GraphicsQualityTier): QualityProfile {
    switch (tier) {
      case 'MOBILE_LOW':
        return {
          tier: 'MOBILE_LOW',
          maxPixelRatio: 1.15,
          antialias: false,
          shadowMapEnabled: true,
          shadowMapSize: 512,
          shadowMapType: THREE.BasicShadowMap,
          enablePendantPointLights: false,
          enableFirePointLight: false,
          enableSmallPropShadows: false,
          maxParticles: 32,
          particleSpawnMultiplier: 0.5
        };
      case 'MOBILE_MEDIUM':
        return {
          tier: 'MOBILE_MEDIUM',
          maxPixelRatio: 1.4,
          antialias: false,
          shadowMapEnabled: true,
          shadowMapSize: 1024,
          shadowMapType: THREE.PCFShadowMap,
          enablePendantPointLights: false,
          enableFirePointLight: true,
          enableSmallPropShadows: false,
          maxParticles: 64,
          particleSpawnMultiplier: 0.75
        };
      case 'DESKTOP_HIGH':
      default:
        return {
          tier: 'DESKTOP_HIGH',
          maxPixelRatio: 2.0,
          antialias: true,
          shadowMapEnabled: true,
          shadowMapSize: 2048,
          shadowMapType: THREE.PCFSoftShadowMap,
          enablePendantPointLights: true,
          enableFirePointLight: true,
          enableSmallPropShadows: true,
          maxParticles: 140,
          particleSpawnMultiplier: 1.0
        };
    }
  }

  /**
   * Monitors real-time frame times and automatically downgrades MOBILE_MEDIUM -> MOBILE_LOW
   * if average FPS drops below 42 FPS over a 3.0-second window.
   */
  public static monitorFrame(delta: number, renderer: THREE.WebGLRenderer): boolean {
    if (this.downgraded || !this.currentProfile || this.currentProfile.tier === 'MOBILE_LOW') {
      return false;
    }
    if (delta <= 0 || delta > 0.5) return false;

    this.fpsSampleAccum += delta;
    this.fpsFrameCount++;

    if (this.fpsSampleAccum >= 3.0) {
      const avgFps = this.fpsFrameCount / this.fpsSampleAccum;
      this.fpsSampleAccum = 0;
      this.fpsFrameCount = 0;

      if (avgFps < 42 && this.currentProfile.tier === 'MOBILE_MEDIUM') {
        this.downgraded = true;
        this.currentProfile = this.getProfileForTier('MOBILE_LOW');
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.currentProfile.maxPixelRatio));
        return true;
      }
    }
    return false;
  }
}
