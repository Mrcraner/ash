import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { GlobeEarth } from './GlobeEarth'
import { TerrainMap } from './TerrainMap'
import { bootstrapPhysicsFromStore, ensurePhysicsLoop } from '@/lib/gesture/physics'
import { useAshStore } from '@/stores/ashStore'

/**
 * Root WebGL scene: textured Earth or flowing terrain, driven by hand gestures.
 */
export function HoloScene() {
  const sceneMode = useAshStore((s) => s.sceneMode)

  useEffect(() => {
    bootstrapPhysicsFromStore()
    ensurePhysicsLoop()
  }, [])

  return (
    <Canvas
      className="holo-canvas"
      camera={{ position: [0, 1.1, 3.8], fov: 40 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
      }}
      style={{ position: 'absolute', inset: 0, zIndex: 1 }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 2]} intensity={1.2} color="#7ef9ff" />
      <directionalLight position={[-3, -2, -4]} intensity={0.35} color="#9b6bff" />
      <Suspense fallback={null}>{sceneMode === 'globe' ? <GlobeEarth /> : <TerrainMap />}</Suspense>
    </Canvas>
  )
}
