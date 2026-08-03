import { create } from 'zustand'
import type { GestureState, HudMetrics, SceneMode } from '@/types/interaction'

interface AshStore {
  sceneMode: SceneMode
  terrainHeightScale: number
  globeScale: number
  gesture: GestureState
  metrics: HudMetrics
  cameraReady: boolean
  setSceneMode: (mode: SceneMode) => void
  setTerrainHeightScale: (scale: number) => void
  setGlobeScale: (scale: number) => void
  setGesture: (gesture: GestureState) => void
  setMetrics: (metrics: Partial<HudMetrics>) => void
  setCameraReady: (ready: boolean) => void
}

/**
 * Global UI / interaction state.
 * Gesture → 3D wiring will be implemented in later iterations.
 */
export const useAshStore = create<AshStore>((set) => ({
  sceneMode: 'globe',
  terrainHeightScale: 1,
  globeScale: 1,
  gesture: { type: 'none', confidence: 0, pinchDistance: 0 },
  metrics: { trackingConfidence: 0, systemLoad: 0 },
  cameraReady: false,
  setSceneMode: (sceneMode) => set({ sceneMode }),
  setTerrainHeightScale: (terrainHeightScale) => set({ terrainHeightScale }),
  setGlobeScale: (globeScale) => set({ globeScale }),
  setGesture: (gesture) => set({ gesture }),
  setMetrics: (metrics) => set((s) => ({ metrics: { ...s.metrics, ...metrics } })),
  setCameraReady: (cameraReady) => set({ cameraReady }),
}))
