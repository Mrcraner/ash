import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { AdditiveBlending, DoubleSide, type BufferAttribute, type BufferGeometry, type Group, type Mesh } from 'three'
import { scalePhysics } from '@/lib/gesture/physics'
import { DEFAULT_GLOBE_SCALE, sceneRotation } from '@/lib/scene/rotation'

const SATELLITE_COUNT = 72
const RING_COLOR = '#69e0f0'

/**
 * Textured Earth + purple geometric shell + flat cyan ring + satellite points.
 */
export function GlobeEarth() {
  const groupRef = useRef<Group>(null)
  const shellRef = useRef<Mesh>(null)

  const [dayMap, normalMap, lightsMap] = useTexture([
    '/textures/earth_day.jpg',
    '/textures/earth_normal.jpg',
    '/textures/earth_lights.jpg',
  ])

  useFrame((_, dt) => {
    const group = groupRef.current
    if (!group) return

    group.rotation.y = sceneRotation.y
    group.rotation.x = sceneRotation.x
    group.scale.setScalar(scalePhysics.value)

    if (shellRef.current) {
      shellRef.current.rotation.y -= dt * 0.04
      shellRef.current.rotation.z += dt * 0.015
    }
  })

  return (
    <group ref={groupRef} scale={DEFAULT_GLOBE_SCALE}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={dayMap}
          normalMap={normalMap}
          emissiveMap={lightsMap}
          emissive="#3cffd0"
          emissiveIntensity={0.65}
          roughness={0.7}
          metalness={0.12}
        />
      </mesh>

      <mesh scale={1.035}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#4de8ff" transparent opacity={0.08} side={DoubleSide} depthWrite={false} />
      </mesh>

      <mesh ref={shellRef} scale={1.18}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color="#9b6bff" wireframe transparent opacity={0.55} depthWrite={false} />
      </mesh>

      <mesh scale={1.28}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#6b4dff" wireframe transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* Flat 2D planetary ring (screenshot 1) */}
      <mesh rotation={[Math.PI / 2.45, 0.12, 0.28]}>
        <ringGeometry args={[1.32, 1.52, 128]} />
        <meshBasicMaterial color={RING_COLOR} transparent opacity={0.78} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.45, 0.12, 0.28]}>
        <ringGeometry args={[1.38, 1.46, 128]} />
        <meshBasicMaterial color={RING_COLOR} transparent opacity={0.35} side={DoubleSide} depthWrite={false} />
      </mesh>

      <SatelliteField />
    </group>
  )
}

function SatelliteField() {
  const geoRef = useRef<BufferGeometry>(null)
  const seedRef = useRef<{ positions: Float32Array; velocities: Float32Array } | null>(null)

  if (!seedRef.current) {
    const positions = new Float32Array(SATELLITE_COUNT * 3)
    const velocities = new Float32Array(SATELLITE_COUNT * 3)
    for (let i = 0; i < SATELLITE_COUNT; i += 1) {
      const radius = 1.05 + Math.random() * 0.55
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
      velocities[i * 3] = (Math.random() - 0.5) * 0.08
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.08
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08
    }
    seedRef.current = { positions, velocities }
  }

  const { positions, velocities } = seedRef.current

  useFrame((state, dt) => {
    const attr = geoRef.current?.getAttribute('position') as BufferAttribute | undefined
    if (!attr) return

    const t = state.clock.elapsedTime
    for (let i = 0; i < SATELLITE_COUNT; i += 1) {
      const ix = i * 3
      let x = attr.array[ix] as number
      let y = attr.array[ix + 1] as number
      let z = attr.array[ix + 2] as number

      x += velocities[ix]! * dt + Math.sin(t * 0.7 + i) * 0.002
      y += velocities[ix + 1]! * dt + Math.cos(t * 0.55 + i * 1.3) * 0.002
      z += velocities[ix + 2]! * dt + Math.sin(t * 0.4 + i * 0.7) * 0.002

      const r = Math.hypot(x, y, z)
      const target = 1.1 + (i % 7) * 0.07
      if (r > 0.001) {
        const pull = (target - r) * 0.35 * dt
        x += (x / r) * pull
        y += (y / r) * pull
        z += (z / r) * pull
      }

      attr.array[ix] = x
      attr.array[ix + 1] = y
      attr.array[ix + 2] = z
    }
    attr.needsUpdate = true
  })

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#6ef7ff" size={0.035} transparent opacity={0.95} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
    </points>
  )
}
