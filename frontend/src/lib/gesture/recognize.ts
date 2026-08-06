import { HAND_LANDMARK } from '@/lib/hand/landmarks'
import type { GestureState, HandLandmark, TrackedHand } from '@/types/interaction'

const TIP_INDICES = [
  HAND_LANDMARK.THUMB_TIP,
  HAND_LANDMARK.INDEX_TIP,
  HAND_LANDMARK.MIDDLE_TIP,
  HAND_LANDMARK.RING_TIP,
  HAND_LANDMARK.PINKY_TIP,
] as const

export function distance3(a: HandLandmark, b: HandLandmark): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.hypot(dx, dy, dz)
}

export function palmSize(landmarks: HandLandmark[]): number {
  const wrist = landmarks[HAND_LANDMARK.WRIST]
  const middle = landmarks[HAND_LANDMARK.MIDDLE_MCP]
  if (!wrist || !middle) return 0.1
  return Math.max(distance3(wrist, middle), 0.04)
}

export function pinchDistance(landmarks: HandLandmark[]): number {
  const thumb = landmarks[HAND_LANDMARK.THUMB_TIP]
  const index = landmarks[HAND_LANDMARK.INDEX_TIP]
  if (!thumb || !index) return 1
  return distance3(thumb, index)
}

/** 0 = fist, 1 = fully open. */
export function handOpenness(landmarks: HandLandmark[]): number {
  const wrist = landmarks[HAND_LANDMARK.WRIST]
  if (!wrist) return 0
  const size = palmSize(landmarks)
  let sum = 0
  for (const tip of TIP_INDICES) {
    const point = landmarks[tip]
    if (point) sum += distance3(wrist, point)
  }
  const avg = sum / TIP_INDICES.length
  return clamp((avg / size - 1.2) / 1.8, 0, 1)
}

export function analyzeHand(
  landmarks: HandLandmark[],
  handedness: 'Left' | 'Right',
): TrackedHand {
  const size = palmSize(landmarks)
  const pinch = pinchDistance(landmarks)
  return {
    landmarks,
    handedness,
    palmSize: size,
    pinchDistance: pinch / size,
    openness: handOpenness(landmarks),
  }
}

export function recognizeGesture(hand: TrackedHand | null): GestureState {
  if (!hand) return { type: 'none', confidence: 0, pinchDistance: 0 }

  const pinch = hand.pinchDistance
  if (pinch < 0.55) {
    return { type: 'pinch', confidence: 0.9, pinchDistance: pinch }
  }
  if (hand.openness > 0.7) {
    return { type: 'open', confidence: hand.openness, pinchDistance: pinch }
  }
  if (hand.openness < 0.25) {
    return { type: 'closed', confidence: 1 - hand.openness, pinchDistance: pinch }
  }
  return { type: 'none', confidence: 0.4, pinchDistance: pinch }
}

/** Pinch-driven globe scale: fingers apart → larger Earth. */
export function pinchToGlobeScale(pinchNorm: number): number {
  const t = clamp((pinchNorm - 0.25) / 1.35, 0, 1)
  return 0.65 + t * 1.55
}

export function shouldSwitchToTerrain(globeScale: number, threshold = 1.72): boolean {
  return globeScale >= threshold
}

export function pinchToLandmarkHeight(pinchNorm: number): number {
  const t = clamp((pinchNorm - 0.15) / 1.5, 0, 1)
  return 0.3 + t * 1.9
}

/** Index tip extended past middle tip (pointing / hover). */
export function isIndexExtended(landmarks: HandLandmark[]): boolean {
  const wrist = landmarks[HAND_LANDMARK.WRIST]
  const indexTip = landmarks[HAND_LANDMARK.INDEX_TIP]
  const indexPip = landmarks[HAND_LANDMARK.INDEX_PIP]
  const middleTip = landmarks[HAND_LANDMARK.MIDDLE_TIP]
  if (!wrist || !indexTip || !indexPip || !middleTip) return false
  return distance3(wrist, indexTip) > distance3(wrist, middleTip) * 1.05
}

const FINGER_RAYS = [
  [HAND_LANDMARK.INDEX_TIP, HAND_LANDMARK.INDEX_PIP, HAND_LANDMARK.INDEX_MCP],
  [HAND_LANDMARK.MIDDLE_TIP, HAND_LANDMARK.MIDDLE_PIP, HAND_LANDMARK.MIDDLE_MCP],
  [HAND_LANDMARK.RING_TIP, HAND_LANDMARK.RING_PIP, HAND_LANDMARK.RING_MCP],
  [HAND_LANDMARK.PINKY_TIP, HAND_LANDMARK.PINKY_PIP, HAND_LANDMARK.PINKY_MCP],
] as const

/** How many of index/middle/ring/pinky are stretched out (0–4). */
export function countExtendedFingers(landmarks: HandLandmark[]): number {
  const wrist = landmarks[HAND_LANDMARK.WRIST]
  if (!wrist) return 0
  let n = 0
  for (const [tipI, pipI, mcpI] of FINGER_RAYS) {
    const tip = landmarks[tipI]
    const pip = landmarks[pipI]
    const mcp = landmarks[mcpI]
    if (!tip || !pip || !mcp) continue
    const dTip = distance3(wrist, tip)
    const dPip = distance3(wrist, pip)
    const dMcp = distance3(wrist, mcp)
    if (dTip > dPip * 1.08 && dTip > dMcp * 1.22) n += 1
  }
  return n
}

/**
 * Fully clenched fist only (right-hand drag): tips curled into palm + thumb tucked.
 * Stricter than mode-switch curl.
 */
export function isFist(landmarks: HandLandmark[]): boolean {
  if (countExtendedFingers(landmarks) > 0) return false
  if (handOpenness(landmarks) > 0.2) return false

  const wrist = landmarks[HAND_LANDMARK.WRIST]
  const indexMcp = landmarks[HAND_LANDMARK.INDEX_MCP]
  const middleMcp = landmarks[HAND_LANDMARK.MIDDLE_MCP]
  const thumbTip = landmarks[HAND_LANDMARK.THUMB_TIP]
  if (!wrist || !indexMcp || !middleMcp || !thumbTip) return false

  const size = palmSize(landmarks)

  for (const [tipI, , mcpI] of FINGER_RAYS) {
    const tip = landmarks[tipI]
    const mcp = landmarks[mcpI]
    if (!tip || !mcp) return false
    if (distance3(tip, mcp) / size > 0.52) return false
    if (distance3(wrist, tip) / size > 1.4) return false
  }

  const thumbToIndex = distance3(thumbTip, indexMcp) / size
  const thumbToMiddle = distance3(thumbTip, middleMcp) / size
  if (thumbToIndex > 0.82 && thumbToMiddle > 0.88) return false

  return true
}

/** Loose fist for dual-hand mode switch (fingers curled, thumb optional). */
export function isCurlFist(landmarks: HandLandmark[]): boolean {
  return countExtendedFingers(landmarks) === 0
}

/** Open palm: at least three fingers stretched. */
export function isHandOpen(landmarks: HandLandmark[]): boolean {
  return countExtendedFingers(landmarks) >= 3
}

/**
 * OK gesture: thumb tip touches index tip, middle/ring/pinky extended.
 */
export function isOkGesture(landmarks: HandLandmark[]): boolean {
  const wrist = landmarks[HAND_LANDMARK.WRIST]
  const thumbTip = landmarks[HAND_LANDMARK.THUMB_TIP]
  const indexTip = landmarks[HAND_LANDMARK.INDEX_TIP]
  const middleTip = landmarks[HAND_LANDMARK.MIDDLE_TIP]
  const ringTip = landmarks[HAND_LANDMARK.RING_TIP]
  const pinkyTip = landmarks[HAND_LANDMARK.PINKY_TIP]
  const middleMcp = landmarks[HAND_LANDMARK.MIDDLE_MCP]
  const ringMcp = landmarks[HAND_LANDMARK.RING_MCP]
  const pinkyMcp = landmarks[HAND_LANDMARK.PINKY_MCP]
  if (!wrist || !thumbTip || !indexTip || !middleTip || !ringTip || !pinkyTip) return false
  if (!middleMcp || !ringMcp || !pinkyMcp) return false

  const size = palmSize(landmarks)
  const loop = distance3(thumbTip, indexTip) / size
  if (loop > 0.42) return false

  const extended = (tip: HandLandmark, mcp: HandLandmark) =>
    distance3(wrist, tip) > distance3(wrist, mcp) * 1.28

  return extended(middleTip, middleMcp) && extended(ringTip, ringMcp) && extended(pinkyTip, pinkyMcp)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
