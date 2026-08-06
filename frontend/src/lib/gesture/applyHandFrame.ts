import { clearLeftScaleTracking, clearLandmarkTracking, clearRightSwipeTracking, driveRotationFromRight, driveScaleFromLeft, ensurePhysicsLoop, freezeScaleInertia, noteHandsPresence, switchSceneMode } from '@/lib/gesture/physics'
import { analyzeHand, countExtendedFingers, isCurlFist, isFist, isHandOpen, isIndexExtended, isOkGesture, recognizeGesture } from '@/lib/gesture/recognize'
import { HAND_LANDMARK } from '@/lib/hand/landmarks'
import type { HandFrame } from '@/lib/hand/HandTracker'
import { TERRAIN_LANDMARKS } from '@/data/landmarks'
import { sceneRotation } from '@/lib/scene/rotation'
import { useAshStore } from '@/stores/ashStore'
import type { TrackedHand } from '@/types/interaction'

const LANDMARK_HIT_RADIUS = 0.16
const OK_HOLD_FRAMES = 4
const OK_COOLDOWN_MS = 900
/** Both hands open / both fists must hold this many frames to switch mode. */
const MODE_HOLD_FRAMES = 6
const MODE_COOLDOWN_MS = 1200
/** Consecutive tight-fist frames required before drag starts. */
const FIST_ENGAGE_FRAMES = 4

let prevLeftOnline = false
let okHold = 0
let okCooldownUntil = 0
let modeHold = 0
let modeHoldKind: 'open' | 'fist' | null = null
let modeCooldownUntil = 0
/** Consecutive tight-fist frames on right hand. */
let rightFistFrames = 0
let flashTimer: ReturnType<typeof setTimeout> | null = null

function flashScale(kind: 'locked' | 'editing'): void {
  const store = useAshStore.getState()
  store.setScaleFlash(kind)
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    useAshStore.getState().setScaleFlash(null)
  }, 1200)
}

function lockScale(): void {
  freezeScaleInertia()
  const store = useAshStore.getState()
  store.setScaleSettling(false)
  store.setScaleMode('locked')
  flashScale('locked')
}

/** Enter editing — absolute open/fist scale starts immediately. */
function unlockScale(): void {
  clearLeftScaleTracking()
  clearLandmarkTracking()
  const store = useAshStore.getState()
  store.setScaleMode('editing')
  store.setScaleSettling(false)
  flashScale('editing')
}

/**
 * Both open → terrain (ease to max). Both curl-fists → globe (ease to default).
 * Returns true only while holding a pose that can actually switch.
 */
function tryDualHandModeSwitch(left: TrackedHand, right: TrackedHand, now: number): boolean {
  // Mode switch uses looser curl fist (not the ultra-tight drag fist)
  const bothFist = isCurlFist(left.landmarks) && isCurlFist(right.landmarks)
  const bothOpen = isHandOpen(left.landmarks) && isHandOpen(right.landmarks)

  if (!bothFist && !bothOpen) {
    modeHold = 0
    modeHoldKind = null
    return false
  }

  const kind: 'open' | 'fist' = bothOpen ? 'open' : 'fist'
  const sceneMode = useAshStore.getState().sceneMode
  const canSwitch =
    (kind === 'open' && sceneMode === 'globe') || (kind === 'fist' && sceneMode === 'terrain')

  if (!canSwitch) {
    modeHold = 0
    modeHoldKind = null
    return false
  }

  if (modeHoldKind !== kind) {
    modeHoldKind = kind
    modeHold = 1
  } else {
    modeHold += 1
  }

  if (modeHold >= MODE_HOLD_FRAMES && now >= modeCooldownUntil) {
    const switched =
      kind === 'open' ? switchSceneMode('to-terrain') : switchSceneMode('to-globe')
    if (switched) {
      modeCooldownUntil = now + MODE_COOLDOWN_MS
      modeHold = 0
      modeHoldKind = null
      rightFistFrames = 0
    }
  }

  return true
}

/**
 * Consume one MediaPipe frame → absolute scale + fist-drag + dual-hand mode switch.
 */
export function applyHandFrame(frame: HandFrame): void {
  ensurePhysicsLoop()

  const store = useAshStore.getState()
  let left: TrackedHand | null = null
  let right: TrackedHand | null = null

  for (const hand of frame.hands) {
    const tracked = analyzeHand(hand.landmarks, hand.handedness)
    if (hand.handedness === 'Left') left = tracked
    else right = tracked
  }

  store.setHands(left, right)
  store.setMetrics({ trackingConfidence: frame.confidence })

  const now = performance.now()
  const anyHand = left !== null || right !== null
  noteHandsPresence(anyHand, now)

  // Left rising edge → start editing
  if (left && !prevLeftOnline) {
    unlockScale()
  }
  // Left falling edge → commit / lock
  if (!left && prevLeftOnline && store.scaleMode === 'editing') {
    lockScale()
  }
  prevLeftOnline = left !== null

  if (!anyHand) {
    store.setFloatingPanel(null)
    okHold = 0
    modeHold = 0
    modeHoldKind = null
    rightFistFrames = 0
    return
  }

  // —— Dual-hand: both open → terrain max, both fists → default globe ——
  if (left && right && tryDualHandModeSwitch(left, right, now)) {
    clearRightSwipeTracking()
    clearLeftScaleTracking()
    rightFistFrames = 0
    store.setFloatingPanel(null)
    store.setGesture({
      type: modeHoldKind === 'fist' ? 'closed' : 'open',
      confidence: 0.95,
      pinchDistance: right.pinchDistance,
    })
    return
  }

  // —— Right OK: toggle scale lock ——
  let rightIsOk = false
  if (right && isOkGesture(right.landmarks)) {
    rightIsOk = true
    okHold += 1
    if (okHold >= OK_HOLD_FRAMES && now >= okCooldownUntil) {
      okCooldownUntil = now + OK_COOLDOWN_MS
      okHold = 0
      if (useAshStore.getState().scaleMode === 'editing') lockScale()
      else unlockScale()
    }
    store.setGesture({ type: 'ok', confidence: 0.95, pinchDistance: right.pinchDistance })
  } else {
    okHold = 0
    store.setGesture(recognizeGesture(left ?? right))
  }

  // —— Left hand: absolute open→max / fist→min map scale (no landmark height) ——
  if (left && useAshStore.getState().scaleMode === 'editing') {
    store.setAutoRotate(false)
    // Finger stretch 0–4 → 0–1 (fist = min, fully open = max / fullscreen)
    const t = countExtendedFingers(left.landmarks) / 4
    driveScaleFromLeft('openness', t, now)
  } else if (!left) {
    clearLeftScaleTracking()
    clearLandmarkTracking()
  }

  // —— Right: fully clenched fist only → direct-follow rotate ——
  if (right && !rightIsOk && isFist(right.landmarks)) {
    rightFistFrames += 1
    const wrist = right.landmarks[HAND_LANDMARK.WRIST]
    const palm = right.landmarks[HAND_LANDMARK.MIDDLE_MCP] ?? wrist
    if (palm && rightFistFrames >= FIST_ENGAGE_FRAMES) {
      if (rightFistFrames === FIST_ENGAGE_FRAMES) clearRightSwipeTracking()
      driveRotationFromRight(1 - palm.x, palm.y)
    }
    store.setFloatingPanel(null)
  } else if (right && !rightIsOk) {
    rightFistFrames = 0
    clearRightSwipeTracking()
    const index = right.landmarks[HAND_LANDMARK.INDEX_TIP]
    const thumb = right.landmarks[HAND_LANDMARK.THUMB_TIP]
    if (store.sceneMode === 'terrain' && index && isIndexExtended(right.landmarks)) {
      const mx = 1 - index.x
      const tip = index
      const th = thumb
      const probe = th && Math.hypot(mx - (1 - th.x), tip.y - th.y) < 0.08 ? th : tip
      const px = 1 - probe.x
      const py = probe.y
      const hit = findNearestLandmark(px, py, sceneRotation.y)
      store.setFloatingPanel(hit ? { landmarkId: hit.id, x: px, y: py } : null)
    } else {
      store.setFloatingPanel(null)
    }
  } else {
    rightFistFrames = 0
    clearRightSwipeTracking()
    if (!right) store.setFloatingPanel(null)
  }
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}

function findNearestLandmark(screenX: number, screenY: number, rotationY: number) {
  let best: (typeof TERRAIN_LANDMARKS)[number] | null = null
  let bestDist = LANDMARK_HIT_RADIUS

  for (const lm of TERRAIN_LANDMARKS) {
    const cos = Math.cos(rotationY)
    const sin = Math.sin(rotationY)
    const rx = lm.x * cos - lm.z * sin
    const rz = lm.x * sin + lm.z * cos
    const sx = 0.5 + rx * 0.22
    const sy = 0.55 + rz * 0.16 - lm.baseHeight * 0.08
    const d = dist2(screenX, screenY, sx, sy)
    if (d < bestDist) {
      bestDist = d
      best = lm
    }
  }
  return best
}
