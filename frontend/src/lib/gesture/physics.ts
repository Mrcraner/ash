import { clamp, lerp } from '@/lib/gesture/recognize'
import { AUTO_SPIN_SPEED, CHINA_FACING_Y, DEFAULT_GLOBE_SCALE, DEFAULT_TILT_X, PITCH_MAX, PITCH_MIN, resetSceneRotation, rotationVelocity, sceneRotation } from '@/lib/scene/rotation'
import { useAshStore } from '@/stores/ashStore'

/** Both hands offline this long → hard reset to defaults. */
export const HANDS_DOWN_RESET_MS = 3 * 60 * 1000

export const SCALE_MIN = 0.42
export const SCALE_MAX = 2.85
/** Terrain lands at near-fullscreen fill after globe → map. */
export const TERRAIN_FULL_SCALE = SCALE_MAX
/** Mouse wheel: globe zoomed past this → ease into terrain. */
export const TERRAIN_ENTER_SCALE = 1.55
/** Mouse wheel: terrain zoomed near gesture-mode min → ease back to globe. */
export const TERRAIN_EXIT_SCALE = 0.5

const SCALE_FOLLOW = 18
const SCALE_DAMP = 5.5
/** Fist-drag: normalized hand delta → radians (direct follow, no inertia). */
const ROT_FOLLOW_YAW = 4.2
const ROT_FOLLOW_PITCH = 2.8
const ROT_DAMP = 2.8
const MAX_ROT_VEL = 9
/** Ease current scale toward terrain/globe settle target (no overlay flash). */
const SCALE_EASE = 5.5

let transitionLockUntil = 0
let lastRightX: number | null = null
let lastRightY: number | null = null
let handsDownSince: number | null = null
let rafStarted = false
/** True while primary-button drag is active in mouse control mode. */
let mouseDragActive = false
/** Soft settle target after mode switch (null = none). */
let scaleEaseTarget: number | null = null

export const scalePhysics = {
  value: DEFAULT_GLOBE_SCALE,
  velocity: 0,
  lastPinch: null as number | null,
  lastOpenness: null as number | null,
  lastTime: 0,
  /** Editing session anchor: size when hand engaged. */
  relScale: null as number | null,
  /** Editing session anchor: openness/pinch when hand engaged. */
  relSample: null as number | null,
}

export const landmarkPhysics = {
  value: 1,
  velocity: 0,
  lastPinch: null as number | null,
  lastTime: 0,
  relHeight: null as number | null,
  relPinch: null as number | null,
}

/**
 * Start a relative scale session from the current locked size.
 * Kept for landmark / legacy callers.
 */
export function beginRelativeScaleSession(sample: number): void {
  scalePhysics.relScale = scalePhysics.value
  scalePhysics.relSample = sample
  scalePhysics.lastOpenness = sample
  scalePhysics.lastPinch = sample
  scalePhysics.lastTime = performance.now()
  scalePhysics.velocity = 0
}

export function beginRelativeLandmarkSession(pinchNorm: number): void {
  landmarkPhysics.relHeight = landmarkPhysics.value
  landmarkPhysics.relPinch = pinchNorm
  landmarkPhysics.lastPinch = pinchNorm
  landmarkPhysics.lastTime = performance.now()
  landmarkPhysics.velocity = 0
}

/**
 * Absolute left-hand scale: fist → SCALE_MIN, fully open → SCALE_MAX.
 * Uses finger extension (0–4) so open/close clearly drives map size, not landmarks.
 */
export function driveScaleFromLeft(kind: 'pinch' | 'openness', sample: number, now: number): void {
  const dt = scalePhysics.lastTime > 0 ? Math.min(0.05, (now - scalePhysics.lastTime) / 1000) : 0.016
  // sample is either openness 0–1 or already a 0–1 t from caller
  const t = clamp(sample, 0, 1)
  const desired = lerp(SCALE_MIN, SCALE_MAX, t)

  scalePhysics.velocity += (desired - scalePhysics.value) * SCALE_FOLLOW * dt
  scalePhysics.value = clamp(scalePhysics.value + scalePhysics.velocity * dt, SCALE_MIN, SCALE_MAX)
  scalePhysics.velocity = lerp(scalePhysics.velocity, 0, 1 - Math.exp(-SCALE_DAMP * dt))

  if (kind === 'pinch') scalePhysics.lastPinch = sample
  else scalePhysics.lastOpenness = sample
  scalePhysics.lastTime = now

  syncScaleToStore()
}

/** @deprecated Landmark height — left open/fist now drives map scale only. */
export function driveLandmarkFromPinch(_pinchNorm: number, _now: number): void {
  // no-op: open/fist must not change landmark height
}

/**
 * Right-fist drag: scene follows hand motion 1:1 (no inertia).
 * Yaw is free-spin; pitch is clamped like mouse drag.
 */
export function driveRotationFromRight(mirroredX: number, screenY: number): void {
  if (lastRightX !== null && lastRightY !== null) {
    const dx = mirroredX - lastRightX
    const dy = screenY - lastRightY
    sceneRotation.y += dx * ROT_FOLLOW_YAW
    sceneRotation.x = clamp(sceneRotation.x + dy * ROT_FOLLOW_PITCH, PITCH_MIN, PITCH_MAX)
    rotationVelocity.y = 0
    rotationVelocity.x = 0
    const store = useAshStore.getState()
    store.setAutoRotate(false)
    store.setRotation(sceneRotation.y, sceneRotation.x)
  }
  lastRightX = mirroredX
  lastRightY = screenY
}

export function clearRightSwipeTracking(): void {
  lastRightX = null
  lastRightY = null
}

export function clearLeftScaleTracking(): void {
  scalePhysics.lastPinch = null
  scalePhysics.lastOpenness = null
  scalePhysics.lastTime = 0
  scalePhysics.relScale = null
  scalePhysics.relSample = null
}

export function clearLandmarkTracking(): void {
  landmarkPhysics.lastPinch = null
  landmarkPhysics.lastTime = 0
  landmarkPhysics.relHeight = null
  landmarkPhysics.relPinch = null
}

function syncScaleToStore(): void {
  const store = useAshStore.getState()
  if (store.sceneMode === 'globe') {
    store.setGlobeScale(scalePhysics.value)
  } else {
    store.setTerrainScale(scalePhysics.value)
  }
}

/**
 * Dual-hand / wheel mode swap — keeps current scale as start, then eases
 * to max (terrain) or default (globe) for a continuous feel.
 */
export function switchSceneMode(dir: 'to-terrain' | 'to-globe'): boolean {
  if (performance.now() < transitionLockUntil) return false
  const store = useAshStore.getState()
  if (dir === 'to-terrain' && store.sceneMode === 'terrain') return false
  if (dir === 'to-globe' && store.sceneMode === 'globe') return false

  transitionLockUntil = performance.now() + 1100
  scalePhysics.velocity = 0
  rotationVelocity.y = 0
  rotationVelocity.x = 0

  if (dir === 'to-terrain') {
    store.setSceneMode('terrain')
    store.setTerrainScale(scalePhysics.value)
    store.setGlobeScale(DEFAULT_GLOBE_SCALE)
    scaleEaseTarget = TERRAIN_FULL_SCALE
  } else {
    store.setSceneMode('globe')
    store.setGlobeScale(scalePhysics.value)
    store.setTerrainScale(TERRAIN_FULL_SCALE)
    scaleEaseTarget = DEFAULT_GLOBE_SCALE
  }

  store.setTransitioning(false, null)
  clearLeftScaleTracking()
  clearLandmarkTracking()
  clearRightSwipeTracking()
  store.setScaleMode('locked')
  store.setScaleSettling(false)
  store.setScaleFlash('locked')
  window.setTimeout(() => {
    if (useAshStore.getState().scaleFlash === 'locked') {
      useAshStore.getState().setScaleFlash(null)
    }
  }, 1200)
  return true
}

/** HUD / legacy: jump straight into terrain at fullscreen fill. */
export function enterTerrainFullscreen(): void {
  const store = useAshStore.getState()
  transitionLockUntil = performance.now() + 700
  store.setSceneMode('terrain')
  scalePhysics.value = TERRAIN_FULL_SCALE
  scalePhysics.velocity = 0
  scaleEaseTarget = null
  store.setTerrainScale(TERRAIN_FULL_SCALE)
  store.setGlobeScale(DEFAULT_GLOBE_SCALE)
  store.setTransitioning(false, null)
  freezeScaleInertia()
  store.setScaleMode('locked')
  store.setScaleSettling(false)
}

/** HUD: return to default globe orbit size. */
export function enterGlobeDefault(): void {
  const store = useAshStore.getState()
  transitionLockUntil = performance.now() + 700
  store.setSceneMode('globe')
  scalePhysics.value = DEFAULT_GLOBE_SCALE
  scalePhysics.velocity = 0
  scaleEaseTarget = null
  store.setGlobeScale(DEFAULT_GLOBE_SCALE)
  store.setTransitioning(false, null)
  freezeScaleInertia()
  store.setScaleMode('locked')
  store.setScaleSettling(false)
}

/** @deprecated Instant path — kept for SceneModeTransition unmount safety. */
export function completeTransition(): void {
  const store = useAshStore.getState()
  const dir = store.transitionDir
  if (dir === 'to-terrain') {
    enterTerrainFullscreen()
  } else if (dir === 'to-globe') {
    enterGlobeDefault()
  } else {
    store.setTransitioning(false, null)
  }
}

export function noteHandsPresence(anyHand: boolean, now: number): void {
  const store = useAshStore.getState()

  if (!anyHand) {
    clearRightSwipeTracking()
    clearLeftScaleTracking()
    clearLandmarkTracking()

    if (handsDownSince === null) handsDownSince = now
    // Resume idle spin as soon as both hands leave
    if (Math.abs(rotationVelocity.y) < 0.05 && Math.abs(rotationVelocity.x) < 0.05) {
      store.setAutoRotate(true)
    }

    if (now - handsDownSince >= HANDS_DOWN_RESET_MS) {
      hardReset()
    }
    return
  }

  handsDownSince = null
}

export function hardReset(): void {
  resetSceneRotation()
  scalePhysics.value = DEFAULT_GLOBE_SCALE
  scalePhysics.velocity = 0
  landmarkPhysics.value = 1
  landmarkPhysics.velocity = 0
  scaleEaseTarget = null
  clearLeftScaleTracking()
  clearLandmarkTracking()
  clearRightSwipeTracking()
  handsDownSince = null
  transitionLockUntil = 0
  useAshStore.getState().resetInteraction()
}

export function freezeScaleInertia(): void {
  scalePhysics.velocity = 0
  landmarkPhysics.velocity = 0
  clearLeftScaleTracking()
  clearLandmarkTracking()
}

/** Mouse-drag yaw / pitch when holographic (camera) interaction is off. */
export function applyMouseRotation(deltaYaw: number, deltaPitch: number): void {
  sceneRotation.y += deltaYaw
  sceneRotation.x = clamp(sceneRotation.x + deltaPitch, PITCH_MIN, PITCH_MAX)
  rotationVelocity.y = 0
  rotationVelocity.x = 0
  const store = useAshStore.getState()
  store.setAutoRotate(false)
  store.setRotation(sceneRotation.y, sceneRotation.x)
}

/** Mouse-wheel zoom; crosses enter/exit thresholds → smooth mode switch. */
export function nudgeScale(delta: number): void {
  const store = useAshStore.getState()
  if (store.transitioning || scaleEaseTarget !== null) return

  scalePhysics.value = clamp(scalePhysics.value + delta, SCALE_MIN, SCALE_MAX)
  scalePhysics.velocity = 0
  syncScaleToStore()

  // Only switch when zooming toward the other mode (not while backing off)
  if (store.sceneMode === 'globe' && delta > 0 && scalePhysics.value >= TERRAIN_ENTER_SCALE) {
    switchSceneMode('to-terrain')
  } else if (store.sceneMode === 'terrain' && delta < 0 && scalePhysics.value <= TERRAIN_EXIT_SCALE) {
    switchSceneMode('to-globe')
  }
}

/** Flick inertia after mouse drag release. */
export function injectRotationVelocity(yawVel: number, pitchVel = 0): void {
  rotationVelocity.y = clamp(yawVel, -MAX_ROT_VEL, MAX_ROT_VEL)
  rotationVelocity.x = clamp(pitchVel, -MAX_ROT_VEL, MAX_ROT_VEL)
  if (Math.abs(rotationVelocity.y) > 0.05 || Math.abs(rotationVelocity.x) > 0.05) {
    useAshStore.getState().setAutoRotate(false)
  }
}

export function setMouseDragActive(active: boolean): void {
  mouseDragActive = active
  if (!active && Math.abs(rotationVelocity.y) < 0.05 && Math.abs(rotationVelocity.x) < 0.05) {
    useAshStore.getState().setAutoRotate(true)
  }
}

/**
 * Per-frame settle + auto-spin. Start once from the camera layer.
 */
export function tickInteractionPhysics(dt: number): void {
  const store = useAshStore.getState()

  // Soft settle after mode switch (globe ⇄ terrain) — no overlay, just scale ease.
  if (scaleEaseTarget !== null) {
    const t = 1 - Math.exp(-SCALE_EASE * dt)
    scalePhysics.value = lerp(scalePhysics.value, scaleEaseTarget, t)
    if (Math.abs(scalePhysics.value - scaleEaseTarget) < 0.02) {
      scalePhysics.value = scaleEaseTarget
      scaleEaseTarget = null
    }
    syncScaleToStore()
  }

  // Scale soft-follow only while editing — locked size must hold still
  if (store.scaleMode === 'editing' && scaleEaseTarget === null && Math.abs(scalePhysics.velocity) > 0.0005) {
    scalePhysics.value = clamp(scalePhysics.value + scalePhysics.velocity * dt, SCALE_MIN, SCALE_MAX)
    scalePhysics.velocity = lerp(scalePhysics.velocity, 0, 1 - Math.exp(-SCALE_DAMP * dt))
    syncScaleToStore()
  }

  // Mouse flick inertia only (hand drag has none)
  const spinning =
    Math.abs(rotationVelocity.y) > 0.0008 || Math.abs(rotationVelocity.x) > 0.0008
  if (spinning) {
    sceneRotation.y += rotationVelocity.y * dt
    sceneRotation.x = clamp(sceneRotation.x + rotationVelocity.x * dt, PITCH_MIN, PITCH_MAX)
    if (sceneRotation.x <= PITCH_MIN || sceneRotation.x >= PITCH_MAX) {
      rotationVelocity.x = 0
    } else {
      rotationVelocity.x = lerp(rotationVelocity.x, 0, 1 - Math.exp(-ROT_DAMP * dt))
    }
    rotationVelocity.y = lerp(rotationVelocity.y, 0, 1 - Math.exp(-ROT_DAMP * dt))
    store.setAutoRotate(false)
    store.setRotation(sceneRotation.y, sceneRotation.x)
  } else if (store.autoRotate) {
    sceneRotation.y += AUTO_SPIN_SPEED * dt
  } else if (!store.holoInteractionEnabled && !mouseDragActive) {
    store.setAutoRotate(true)
    sceneRotation.y += AUTO_SPIN_SPEED * dt
  }
}

export function ensurePhysicsLoop(): void {
  if (rafStarted || typeof window === 'undefined') return
  rafStarted = true
  let last = performance.now()

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    tickInteractionPhysics(dt)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

export function bootstrapPhysicsFromStore(): void {
  scalePhysics.value = useAshStore.getState().globeScale || DEFAULT_GLOBE_SCALE
  sceneRotation.y = CHINA_FACING_Y
  sceneRotation.x = DEFAULT_TILT_X
}
