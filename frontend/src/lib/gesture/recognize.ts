import type { GestureState, HandLandmark } from '@/types/interaction'

/**
 * Gesture recognition scaffold (swipe / pinch / tap).
 * Threshold-based scene switch & terrain height control will plug in here.
 */
export function recognizeGesture(_landmarks: HandLandmark[]): GestureState {
  return { type: 'none', confidence: 0, pinchDistance: 0 }
}

/** When pinch/energy threshold is crossed, switch globe → terrain. */
export function shouldSwitchToTerrain(_gesture: GestureState, _threshold = 0.85): boolean {
  return false
}
