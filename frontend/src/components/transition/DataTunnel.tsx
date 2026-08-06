import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdditiveBlending } from 'three'
import type { BufferAttribute, BufferGeometry, Group, Mesh } from 'three'

interface DataTunnelProps {
  onComplete: () => void
}

const PARTICLE_COUNT = 1400
const RING_COUNT = 22

export function DataTunnel({ onComplete }: DataTunnelProps) {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(onComplete, reducedMotion ? 180 : 820)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="data-tunnel" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 4], fov: 72 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#00040a']} />
        <fog attach="fog" args={['#001b2a', 3, 19]} />
        <TunnelScene />
      </Canvas>
      <div className="data-tunnel__rays" />
      <div className="data-tunnel__flare" />
      <div className="data-tunnel__flash" />
      <div className="data-tunnel__label">NEURAL HANDSHAKE // ESTABLISHED</div>
    </div>
  )
}

function TunnelScene() {
  const groupRef = useRef<Group>(null)
  const geometryRef = useRef<BufferGeometry>(null)
  const ringRefs = useRef<Array<Mesh | null>>([])

  const positions = useMemo(() => {
    const points = new Float32Array(PARTICLE_COUNT * 3)

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const angle = Math.random() * Math.PI * 2
      const radius = 1.25 + Math.random() * 2.8
      points[index * 3] = Math.cos(angle) * radius
      points[index * 3 + 1] = Math.sin(angle) * radius
      points[index * 3 + 2] = 2 - Math.random() * 22
    }

    return points
  }, [])

  const rings = useMemo(
    () => Array.from({ length: RING_COUNT }, (_, index) => 2 - index * 1.15),
    [],
  )

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.22
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.8) * 0.035
    }

    const positionAttribute = geometryRef.current?.getAttribute('position') as
      | BufferAttribute
      | undefined

    if (positionAttribute) {
      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const zIndex = index * 3 + 2
        let z = positionAttribute.array[zIndex] as number
        z += delta * 31
        if (z > 4) z -= 22
        positionAttribute.array[zIndex] = z
      }
      positionAttribute.needsUpdate = true
    }

    ringRefs.current.forEach((ring) => {
      if (!ring) return
      ring.position.z += delta * 26
      if (ring.position.z > 4) ring.position.z -= RING_COUNT * 1.15
      ring.rotation.z += delta * 0.35
    })
  })

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#65f8ff"
          size={0.05}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>

      {rings.map((z, index) => (
        <mesh
          key={z}
          ref={(node) => {
            ringRefs.current[index] = node
          }}
          position={[0, 0, z]}
          rotation={[0, 0, index * 0.37]}
          scale={[1 + (index % 3) * 0.09, 0.68 + (index % 4) * 0.06, 1]}
        >
          <torusGeometry args={[2.05, index % 4 === 0 ? 0.035 : 0.012, 5, 64]} />
          <meshBasicMaterial
            color={index % 4 === 0 ? '#d8ffff' : '#00d9ff'}
            transparent
            opacity={index % 4 === 0 ? 0.85 : 0.38}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
