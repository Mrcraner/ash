import { useMemo } from 'react'
import * as THREE from 'three'
import { useAshStore } from '@/stores/ashStore'

/** Temporary terrain stand-in; height scale is wired for future gesture control. */
export function TerrainPlaceholder() {
  const heightScale = useAshStore((s) => s.terrainHeightScale)

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(3.2, 3.2, 48, 48)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z =
        Math.sin(x * 2.2) * Math.cos(y * 2.2) * 0.25 +
        Math.sin(x * 5.1 + y * 3.3) * 0.08
      pos.setZ(i, z)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2.6, 0, 0]}
      position={[0, -0.35, 0]}
      scale={[1, 1, heightScale]}
    >
      <meshStandardMaterial
        color="#041820"
        emissive="#00e5ff"
        emissiveIntensity={0.35}
        wireframe
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}
