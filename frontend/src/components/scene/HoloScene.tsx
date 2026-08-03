import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { GlobePlaceholder } from './GlobePlaceholder'
import { TerrainPlaceholder } from './TerrainPlaceholder'
import { useAshStore } from '@/stores/ashStore'

/**
 * Root WebGL scene. Globe / terrain business meshes come later;
 * this verifies R3F + Three.js pipeline boots correctly.
 */
export function HoloScene() {
  const sceneMode = useAshStore((s) => s.sceneMode)

  return (
    <Canvas
      className="holo-canvas"
      camera={{ position: [0, 1.2, 3.2], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#02060c']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 2]} intensity={1.1} color="#7ef9ff" />
      {sceneMode === 'globe' ? <GlobePlaceholder /> : <TerrainPlaceholder />}
      <OrbitControls enablePan={false} minDistance={1.5} maxDistance={6} />
    </Canvas>
  )
}
