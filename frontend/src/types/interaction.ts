/** Shared domain types for holographic interaction (stubs). */

export type SceneMode = 'globe' | 'terrain'

export type GestureType = 'none' | 'swipe' | 'pinch' | 'tap' | 'point'

export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface GestureState {
  type: GestureType
  confidence: number
  /** Normalized pinch distance; used for scale / terrain height later. */
  pinchDistance: number
}

export interface HudMetrics {
  trackingConfidence: number
  systemLoad: number
}
