import type { Handedness } from '@/types/interaction'

export interface PoseAnchors {
  /** MediaPipe image space (not CSS-mirrored). */
  leftShoulder: { x: number; y: number } | null
  rightShoulder: { x: number; y: number } | null
  leftWrist: { x: number; y: number } | null
  rightWrist: { x: number; y: number } | null
}

interface StickySlot {
  label: Handedness
  /** Consecutive frames the opposite label was suggested. */
  contradictFrames: number
  lastSeen: number
  /** Smoothed wrist position for re-association. */
  x: number
  y: number
}

const SWITCH_CONFIRM_FRAMES = 10
const SLOT_TTL_MS = 700
const MIDLINE_MARGIN = 0.04

const slots: { left: StickySlot | null; right: StickySlot | null } = {
  left: null,
  right: null,
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}

function wristOf(landmarks: Array<{ x: number; y: number }>): { x: number; y: number } {
  const w = landmarks[0]
  if (w) return { x: w.x, y: w.y }
  const n = Math.max(landmarks.length, 1)
  return {
    x: landmarks.reduce((s, p) => s + p.x, 0) / n,
    y: landmarks.reduce((s, p) => s + p.y, 0) / n,
  }
}

/**
 * Classify using body pose: match hand wrist to pose left/right wrist,
 * else fall back to shoulder midline (front-camera image space).
 *
 * MediaPipe Pose labels are anatomical (person's Left/Right). On a selfie
 * camera the person's left body appears on the right of the image — we still
 * trust Pose's anatomical wrists/shoulders, never screen-side alone.
 */
export function classifyFromPose(
  landmarks: Array<{ x: number; y: number }>,
  pose: PoseAnchors | null,
): Handedness | null {
  const wrist = wristOf(landmarks)

  if (pose?.leftWrist && pose?.rightWrist) {
    const dL = dist(wrist.x, wrist.y, pose.leftWrist.x, pose.leftWrist.y)
    const dR = dist(wrist.x, wrist.y, pose.rightWrist.x, pose.rightWrist.y)
    // Require a clear winner so crossed arms don't flicker
    if (Math.abs(dL - dR) < 0.03) return null
    return dL < dR ? 'Left' : 'Right'
  }

  if (pose?.leftShoulder && pose?.rightShoulder) {
    const midX = (pose.leftShoulder.x + pose.rightShoulder.x) / 2
    // Front camera image: anatomical left shoulder has larger x than right shoulder.
    // Hand left of midline in image → anatomical right hand, and vice versa.
    if (wrist.x < midX - MIDLINE_MARGIN) return 'Right'
    if (wrist.x > midX + MIDLINE_MARGIN) return 'Left'
    return null
  }

  return null
}

/** Last-resort: front-camera image side → anatomical hand. */
export function classifyFromImageSide(landmarks: Array<{ x: number }>): Handedness {
  const avgX = landmarks.reduce((s, p) => s + p.x, 0) / Math.max(landmarks.length, 1)
  // Image-left → person's right hand (selfie)
  return avgX < 0.5 ? 'Right' : 'Left'
}

function pruneSlots(now: number): void {
  for (const key of ['left', 'right'] as const) {
    const slot = slots[key]
    if (slot && now - slot.lastSeen > SLOT_TTL_MS) slots[key] = null
  }
}

function assignSticky(
  suggested: Handedness,
  wrist: { x: number; y: number },
  now: number,
): Handedness {
  pruneSlots(now)

  // Re-attach to nearest existing sticky slot (tracking continuity)
  const candidates: Array<{ key: 'left' | 'right'; slot: StickySlot; d: number }> = []
  for (const key of ['left', 'right'] as const) {
    const slot = slots[key]
    if (!slot) continue
    candidates.push({ key, slot, d: dist(wrist.x, wrist.y, slot.x, slot.y) })
  }
  candidates.sort((a, b) => a.d - b.d)

  const nearest = candidates[0]
  if (nearest && nearest.d < 0.22) {
    const { slot } = nearest
    slot.x = slot.x * 0.7 + wrist.x * 0.3
    slot.y = slot.y * 0.7 + wrist.y * 0.3
    slot.lastSeen = now

    if (suggested === slot.label) {
      slot.contradictFrames = 0
      return slot.label
    }

    slot.contradictFrames += 1
    if (slot.contradictFrames < SWITCH_CONFIRM_FRAMES) {
      return slot.label
    }

    // Confirmed switch: move sticky ownership
    const otherKey = slot.label === 'Left' ? 'right' : 'left'
    const newKey = suggested === 'Left' ? 'left' : 'right'
    slots[nearest.key] = null
    slots[newKey] = {
      label: suggested,
      contradictFrames: 0,
      lastSeen: now,
      x: wrist.x,
      y: wrist.y,
    }
    // Clear conflicting other slot if it held the new label
    if (slots[otherKey]?.label === suggested) slots[otherKey] = null
    return suggested
  }

  // Fresh hand: occupy the slot for the suggested anatomical side
  const preferred = suggested === 'Left' ? 'left' : 'right'
  if (!slots[preferred]) {
    slots[preferred] = {
      label: suggested,
      contradictFrames: 0,
      lastSeen: now,
      x: wrist.x,
      y: wrist.y,
    }
    return suggested
  }

  // Preferred slot occupied by a different track — keep suggested without stealing yet
  return suggested
}

/**
 * Stable handedness for one detected hand in a frame.
 * Prefer pose wrists / shoulders; lock labels across frames to stop flicker.
 */
export function resolveHandednessStable(
  landmarks: Array<{ x: number; y: number }>,
  pose: PoseAnchors | null,
  _mpLabel: string,
  now: number,
): Handedness {
  const wrist = wristOf(landmarks)
  const fromPose = classifyFromPose(landmarks, pose)
  const suggested = fromPose ?? classifyFromImageSide(landmarks)
  return assignSticky(suggested, wrist, now)
}

export function resetHandednessState(): void {
  slots.left = null
  slots.right = null
}

/** When two hands claim the same label, keep the better pose match / split by side. */
export function dedupeHandLabels<T extends { x: number; y: number; z?: number }>(
  hands: Array<{ landmarks: T[]; handedness: Handedness }>,
  pose: PoseAnchors | null,
): Array<{ landmarks: T[]; handedness: Handedness }> {
  if (hands.length < 2) return hands

  const lefts = hands.filter((h) => h.handedness === 'Left')
  const rights = hands.filter((h) => h.handedness === 'Right')
  if (lefts.length <= 1 && rights.length <= 1) return hands

  // Force split by pose wrist distance or image x
  const scored = hands.map((h) => {
    const w = wristOf(h.landmarks)
    let score = w.x
    if (pose?.leftWrist && pose?.rightWrist) {
      const dL = dist(w.x, w.y, pose.leftWrist.x, pose.leftWrist.y)
      const dR = dist(w.x, w.y, pose.rightWrist.x, pose.rightWrist.y)
      score = dL - dR // negative → left
    }
    return { hand: h, score }
  })
  scored.sort((a, b) => a.score - b.score)
  // Lower score → Left, higher → Right (pose) ; or smaller image x → Right anatomically
  if (pose?.leftWrist && pose?.rightWrist) {
    return [
      { landmarks: scored[0]!.hand.landmarks, handedness: 'Left' as const },
      { landmarks: scored[1]!.hand.landmarks, handedness: 'Right' as const },
    ]
  }
  // Image: smaller x = anatomical Right
  return [
    { landmarks: scored[0]!.hand.landmarks, handedness: 'Right' as const },
    { landmarks: scored[1]!.hand.landmarks, handedness: 'Left' as const },
  ]
}
