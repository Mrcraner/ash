import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useAshStore } from '@/stores/ashStore'

/** Temporary earth stand-in; replace with textured globe + rings later. */
export function GlobePlaceholder() {
  const ref = useRef<Mesh>(null)
  const scale = useAshStore((s) => s.globeScale)

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.15
  })

  return (
    <group scale={scale}>
      <mesh ref={ref}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color="#062033"
          emissive="#00e5ff"
          emissiveIntensity={0.25}
          wireframe
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.25, 0.02, 8, 64]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}
