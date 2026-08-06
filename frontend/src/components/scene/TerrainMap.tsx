import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { TERRAIN_LANDMARKS } from '@/data/landmarks'
import { landmarkPhysics, scalePhysics } from '@/lib/gesture/physics'
import { sceneRotation } from '@/lib/scene/rotation'
import { useAshStore } from '@/stores/ashStore'

/**
 * Flowing wireframe topographic mesh.
 * Map scale ← left-hand open/fist (min↔fullscreen); landmarks keep base height.
 */
export function TerrainMap() {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const heightScale = useAshStore((s) => s.terrainHeightScale)
  const floatingPanel = useAshStore((s) => s.floatingPanel)
  const basePositions = useRef<Float32Array | null>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(3.6, 3.6, 64, 64)
    const pos = geo.attributes.position as THREE.BufferAttribute
    basePositions.current = new Float32Array(pos.array as Float32Array)
    return geo
  }, [])

  useFrame((state) => {
    const group = groupRef.current
    if (group) {
      group.rotation.y = sceneRotation.y
      group.rotation.x = sceneRotation.x
      group.scale.setScalar(scalePhysics.value)
    }

    const mesh = meshRef.current
    const base = basePositions.current
    if (!mesh || !base) return

    const hs = landmarkPhysics.value
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute
    const t = state.clock.elapsedTime
    for (let i = 0; i < pos.count; i += 1) {
      const x = base[i * 3]!
      const y = base[i * 3 + 1]!
      const wave =
        Math.sin(x * 2.1 + t * 0.55) * Math.cos(y * 2.0 + t * 0.4) * 0.22 +
        Math.sin(x * 5.2 + y * 3.1 + t * 0.8) * 0.07 +
        Math.sin((x + y) * 1.3 - t * 0.25) * 0.1
      pos.setZ(i, wave * hs)
    }
    pos.needsUpdate = true
  })

  return (
    <group ref={groupRef} position={[0, -0.2, 0]} scale={1}>
      <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.35, 0, 0]}>
        <meshStandardMaterial
          color="#031820"
          emissive="#00e5ff"
          emissiveIntensity={0.45}
          wireframe
          transparent
          opacity={0.92}
        />
      </mesh>

      {TERRAIN_LANDMARKS.map((lm) => {
        const h = lm.baseHeight * heightScale
        const active = floatingPanel?.landmarkId === lm.id
        return (
          <group key={lm.id} position={[lm.x, 0.02, lm.z]}>
            <mesh position={[0, h / 2, 0]}>
              <cylinderGeometry args={[0.008, 0.008, h, 6]} />
              <meshBasicMaterial color="#5af0ff" transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, h + 0.04, 0]}>
              <boxGeometry args={[0.06, 0.06, 0.06]} />
              <meshBasicMaterial color={active ? '#ff3b5c' : '#ff2244'} />
            </mesh>
            <mesh position={[0, h + 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.08, 0.11, 24]} />
              <meshBasicMaterial
                color="#00e5ff"
                transparent
                opacity={active ? 0.95 : 0.55}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Html position={[0.12, h + 0.12, 0]} distanceFactor={6} style={{ pointerEvents: 'none' }}>
              <div className="terrain-poi-label">{lm.name}</div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
