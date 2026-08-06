/** Shared domain types for holographic interaction. */

export type SceneMode = 'globe' | 'terrain'

export type GestureType = 'none' | 'swipe' | 'pinch' | 'tap' | 'point' | 'open' | 'closed' | 'ok'

export type ScaleControlMode = 'locked' | 'editing'

export type Handedness = 'Left' | 'Right'

export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface TrackedHand {
  landmarks: HandLandmark[]
  handedness: Handedness
  /** Palm size used to normalize pinch / openness. */
  palmSize: number
  pinchDistance: number
  openness: number
}

export interface GestureState {
  type: GestureType
  confidence: number
  /** Normalized pinch distance; used for scale / terrain height. */
  pinchDistance: number
}

export interface HudMetrics {
  trackingConfidence: number
  systemLoad: number
}

export interface LandmarkPoi {
  id: string
  name: string
  /** Terrain-local XZ position. */
  x: number
  z: number
  baseHeight: number
  detail: string
  coords: [string, string]
}

export interface FloatingPanelState {
  landmarkId: string
  /** Normalized screen coords (mirrored video space, 0–1). */
  x: number
  y: number
}
