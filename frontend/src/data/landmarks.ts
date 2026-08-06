import type { LandmarkPoi } from '@/types/interaction'

export const TERRAIN_LANDMARKS: LandmarkPoi[] = [
  {
    id: 'echo',
    name: 'ECHO STATION',
    x: -0.85,
    z: 0.35,
    baseHeight: 0.55,
    detail: '目标区域 亚洲战区',
    coords: ['116.4074', '39.9042'],
  },
  {
    id: 'neon',
    name: 'NEON CITY',
    x: 0.45,
    z: -0.55,
    baseHeight: 0.48,
    detail: '都市核心节点 · 高密度信号',
    coords: ['121.4737', '31.2304'],
  },
  {
    id: 'cyber',
    name: 'CYBER DOCK',
    x: 0.95,
    z: 0.55,
    baseHeight: 0.42,
    detail: '港湾物流枢纽 · 在线',
    coords: ['113.2644', '23.1291'],
  },
  {
    id: 'solar',
    name: 'SOLAR ARRAY',
    x: -0.35,
    z: -0.85,
    baseHeight: 0.62,
    detail: '能源阵列 · 输出稳定',
    coords: ['104.0665', '30.5723'],
  },
  {
    id: 'ridge',
    name: 'NORTH RIDGE',
    x: 0.05,
    z: 0.95,
    baseHeight: 0.5,
    detail: '北部山脊侦察点',
    coords: ['108.9402', '34.3416'],
  },
]
