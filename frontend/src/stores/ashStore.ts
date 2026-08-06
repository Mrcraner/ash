import { create } from 'zustand'
import { CHINA_FACING_Y, DEFAULT_GLOBE_SCALE, DEFAULT_TILT_X } from '@/lib/scene/rotation'
import type { FloatingPanelState, GestureState, HudMetrics, ScaleControlMode, SceneMode, TrackedHand } from '@/types/interaction'

export type TransitionDir = 'to-terrain' | 'to-globe' | null

interface AshStore {
  sceneMode: SceneMode
  terrainHeightScale: number
  terrainScale: number
  globeScale: number
  rotationY: number
  rotationX: number
  autoRotate: boolean
  transitioning: boolean
  transitionDir: TransitionDir
  /** locked = hold size; editing = left hand drives scale. */
  scaleMode: ScaleControlMode
  /** True while waiting ~1s after left hand enters before arming baseline. */
  scaleSettling: boolean
  /** Brief flash after OK lock/unlock. */
  scaleFlash: 'locked' | 'editing' | null
  leftHand: TrackedHand | null
  rightHand: TrackedHand | null
  leftOnline: boolean
  rightOnline: boolean
  floatingPanel: FloatingPanelState | null
  gesture: GestureState
  metrics: HudMetrics
  cameraReady: boolean
  /** Camera + hand tracking; when false, mouse rotates / wheel zooms. */
  holoInteractionEnabled: boolean
  /** Voice control (agent mic) — UI flag until speech pipeline lands. */
  voiceControlEnabled: boolean
  setSceneMode: (mode: SceneMode) => void
  setTerrainHeightScale: (scale: number) => void
  setTerrainScale: (scale: number) => void
  setGlobeScale: (scale: number) => void
  setRotation: (y: number, x?: number) => void
  setAutoRotate: (on: boolean) => void
  setTransitioning: (on: boolean, dir?: TransitionDir) => void
  setScaleMode: (mode: ScaleControlMode) => void
  setScaleSettling: (settling: boolean) => void
  setScaleFlash: (flash: 'locked' | 'editing' | null) => void
  setHands: (left: TrackedHand | null, right: TrackedHand | null) => void
  setFloatingPanel: (panel: FloatingPanelState | null) => void
  setGesture: (gesture: GestureState) => void
  setMetrics: (metrics: Partial<HudMetrics>) => void
  setCameraReady: (ready: boolean) => void
  setHoloInteractionEnabled: (on: boolean) => void
  setVoiceControlEnabled: (on: boolean) => void
  resetInteraction: () => void
}

const IDLE_GESTURE: GestureState = { type: 'none', confidence: 0, pinchDistance: 0 }

export const useAshStore = create<AshStore>(set => ({
  sceneMode: 'globe',
  terrainHeightScale: 1,
  terrainScale: 1,
  globeScale: DEFAULT_GLOBE_SCALE,
  rotationY: CHINA_FACING_Y,
  rotationX: DEFAULT_TILT_X,
  autoRotate: true,
  transitioning: false,
  transitionDir: null,
  scaleMode: 'locked',
  scaleSettling: false,
  scaleFlash: null,
  leftHand: null,
  rightHand: null,
  leftOnline: false,
  rightOnline: false,
  floatingPanel: null,
  gesture: IDLE_GESTURE,
  metrics: { trackingConfidence: 0, systemLoad: 0 },
  cameraReady: false,
  holoInteractionEnabled: true,
  voiceControlEnabled: false,
  setSceneMode: sceneMode => set({ sceneMode }),
  setTerrainHeightScale: terrainHeightScale => set({ terrainHeightScale }),
  setTerrainScale: terrainScale => set({ terrainScale }),
  setGlobeScale: globeScale => set({ globeScale }),
  setRotation: (rotationY, rotationX) => set(s => ({ rotationY, rotationX: rotationX ?? s.rotationX })),
  setAutoRotate: autoRotate => set({ autoRotate }),
  setTransitioning: (transitioning, transitionDir = null) => set({ transitioning, transitionDir: transitioning ? transitionDir : null }),
  setScaleMode: scaleMode => set({ scaleMode }),
  setScaleSettling: scaleSettling => set({ scaleSettling }),
  setScaleFlash: scaleFlash => set({ scaleFlash }),
  setHands: (leftHand, rightHand) =>
    set({
      leftHand,
      rightHand,
      leftOnline: leftHand !== null,
      rightOnline: rightHand !== null,
    }),
  setFloatingPanel: floatingPanel => set({ floatingPanel }),
  setGesture: gesture => set({ gesture }),
  setMetrics: metrics => set(s => ({ metrics: { ...s.metrics, ...metrics } })),
  setCameraReady: cameraReady => set({ cameraReady }),
  setHoloInteractionEnabled: holoInteractionEnabled =>
    set(s =>
      holoInteractionEnabled
        ? { holoInteractionEnabled }
        : {
            holoInteractionEnabled,
            cameraReady: false,
            leftHand: null,
            rightHand: null,
            leftOnline: false,
            rightOnline: false,
            floatingPanel: null,
            gesture: IDLE_GESTURE,
            scaleMode: 'locked' as const,
            scaleSettling: false,
            scaleFlash: null,
            metrics: { ...s.metrics, trackingConfidence: 0 },
          }
    ),
  setVoiceControlEnabled: voiceControlEnabled => set({ voiceControlEnabled }),
  resetInteraction: () =>
    set({
      sceneMode: 'globe',
      terrainHeightScale: 1,
      terrainScale: 1,
      globeScale: DEFAULT_GLOBE_SCALE,
      rotationY: CHINA_FACING_Y,
      rotationX: DEFAULT_TILT_X,
      autoRotate: true,
      transitioning: false,
      transitionDir: null,
      scaleMode: 'locked',
      scaleSettling: false,
      scaleFlash: null,
      floatingPanel: null,
      gesture: IDLE_GESTURE,
    }),
}))
