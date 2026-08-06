/** Shared scene orientation — China faces the camera by default. */

/** Approx. yaw that presents eastern China toward +Z camera. */
export const CHINA_FACING_Y = -1.92
export const DEFAULT_TILT_X = 0.12
export const DEFAULT_GLOBE_SCALE = 0.58

export const sceneRotation = {
  y: CHINA_FACING_Y,
  x: DEFAULT_TILT_X,
}

/** Continuous spin / gesture velocity (rad/s) — yaw (y) + pitch (x). */
export const rotationVelocity = {
  y: 0,
  x: 0,
}

/** Pitch clamp — matches mouse drag limits. */
export const PITCH_MIN = -1.15
export const PITCH_MAX = 1.15

export const AUTO_SPIN_SPEED = 0.08

export function resetSceneRotation(): void {
  sceneRotation.y = CHINA_FACING_Y
  sceneRotation.x = DEFAULT_TILT_X
  rotationVelocity.y = 0
  rotationVelocity.x = 0
}
