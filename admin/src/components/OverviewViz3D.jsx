import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useNavigate } from 'react-router-dom'

const PALETTE = [
  '#38bdf8',
  '#fb923c',
  '#facc15',
  '#f472b6',
  '#a78bfa',
  '#4ade80',
  '#f87171',
  '#22d3ee',
  '#c084fc',
]

function nativeFromPointerEvent(e) {
  return e.nativeEvent ?? e
}

function makeSliceShape(innerR, outerR, a0, a1) {
  const shape = new THREE.Shape()
  const c0 = Math.cos(a0)
  const s0 = Math.sin(a0)
  const c1 = Math.cos(a1)
  const s1 = Math.sin(a1)
  shape.moveTo(innerR * c0, innerR * s0)
  shape.lineTo(outerR * c0, outerR * s0)
  shape.absarc(0, 0, outerR, a0, a1, false)
  shape.lineTo(innerR * c1, innerR * s1)
  shape.absarc(0, 0, innerR, a1, a0, true)
  return shape
}

function alignExtrudedPieGeometry(geometry, depth) {
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingBox()
  const yMin = geometry.boundingBox.min.y
  geometry.translate(0, -yMin, 0)
  geometry.computeVertexNormals()
  return geometry
}

function MicroBars({ midAngle, baseY, innerR, outerR, color, barStrength, modelLabel, modelCount, onHoverTip }) {
  const n = 5
  const r = ((innerR + outerR) / 2) * 0.92
  const wx = (a) => r * Math.cos(a)
  const wz = (a) => -r * Math.sin(a)
  const spread = 0.14
  const heights = useMemo(() => {
    const raw = Array.from({ length: n }, (_, i) => 0.35 + ((i * 37 + barStrength * 100) % 100) / 200)
    const s = raw.reduce((a, b) => a + b, 0)
    const scale = 0.55 * Math.min(1, barStrength + 0.35)
    return raw.map((h) => (h / s) * scale)
  }, [barStrength, n])

  const pushTip = (e) => {
    const ev = nativeFromPointerEvent(e)
    onHoverTip(ev, {
      label: modelLabel,
      count: modelCount,
      subtitle: 'Slice bars · ' + modelLabel,
    })
  }

  return (
    <group position={[0, baseY, 0]}>
      {heights.map((h, i) => {
        const a = midAngle + (i - (n - 1) / 2) * spread
        const x = wx(a)
        const z = wz(a)
        return (
          <mesh
            key={i}
            position={[x, h / 2, z]}
            castShadow
            receiveShadow
            onPointerOver={(e) => {
              e.stopPropagation()
              pushTip(e)
            }}
            onPointerMove={(e) => {
              e.stopPropagation()
              pushTip(e)
            }}
          >
            <boxGeometry args={[0.08, h, 0.08]} />
            <meshStandardMaterial
              color={color}
              metalness={0.25}
              roughness={0.45}
              emissive={color}
              emissiveIntensity={0.12}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function PieSlice({
  startAngle,
  angleSpan,
  innerR,
  outerR,
  depth,
  color,
  label,
  count,
  maxCount,
  onNavigate,
  onHoverTip,
}) {
  const meshRef = useRef(null)
  const [hovered, setHovered] = useState(false)

  const geometry = useMemo(() => {
    const shape = makeSliceShape(innerR, outerR, startAngle, startAngle + angleSpan)
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.03,
      bevelSegments: 2,
      curveSegments: 24,
    })
    return alignExtrudedPieGeometry(g, depth)
  }, [startAngle, angleSpan, innerR, outerR, depth])

  useFrame(() => {
    if (!meshRef.current) return
    const target = hovered ? 1.06 : 1
    const s = meshRef.current.scale.x
    const n = THREE.MathUtils.lerp(s, target, 0.12)
    meshRef.current.scale.setScalar(n)
  })

  const midAngle = startAngle + angleSpan / 2
  const barStrength = maxCount > 0 ? Math.min(1, count / maxCount) : 0

  const pushTip = (e) => {
    const ev = nativeFromPointerEvent(e)
    onHoverTip(ev, {
      label,
      count,
      subtitle: 'Pie slice · ' + label,
    })
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          pushTip(e)
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
          pushTip(e)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(label)
        }}
      >
        <meshStandardMaterial
          color={color}
          metalness={0.35}
          roughness={0.28}
          emissive={color}
          emissiveIntensity={hovered ? 0.18 : 0.06}
        />
      </mesh>
      <MicroBars
        midAngle={midAngle}
        baseY={depth + 0.02}
        innerR={innerR}
        outerR={outerR}
        color={color}
        barStrength={barStrength}
        modelLabel={label}
        modelCount={count}
        onHoverTip={onHoverTip}
      />
    </group>
  )
}

function RingBars({ segments, ringRadius, maxCount, onHoverTip }) {
  const n = segments.length
  if (n === 0) return null

  return (
    <group>
      {segments.map((seg, i) => {
        const t = i / n
        const angle = t * Math.PI * 2 + Math.PI / n
        const h = maxCount > 0 ? Math.max(0.12, (seg.count / maxCount) * 1.35) : 0.12
        const x = ringRadius * Math.cos(angle)
        const z = -ringRadius * Math.sin(angle)

        const pushTip = (e) => {
          const ev = nativeFromPointerEvent(e)
          onHoverTip(ev, {
            label: seg.label,
            count: seg.count,
            subtitle: 'Ring marker · ' + seg.label,
          })
        }

        return (
          <mesh
            key={seg.label}
            position={[x, h / 2, z]}
            castShadow
            receiveShadow
            onPointerOver={(e) => {
              e.stopPropagation()
              pushTip(e)
            }}
            onPointerMove={(e) => {
              e.stopPropagation()
              pushTip(e)
            }}
          >
            <cylinderGeometry args={[0.1, 0.12, h, 16]} />
            <meshStandardMaterial
              color="#4ade80"
              metalness={0.2}
              roughness={0.35}
              emissive="#22c55e"
              emissiveIntensity={0.08}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function Scene({ segments, onNavigate, onHoverTip }) {
  const innerR = 0.35
  const outerR = 1.85
  const depth = 0.38
  const total = segments.reduce((a, s) => a + s.count, 0)
  const maxCount = Math.max(...segments.map((s) => s.count), 1)

  const slices = useMemo(() => {
    if (total <= 0) return []
    const minAngle = 0.09
    let acc = 0
    return segments.map((seg, i) => {
      const share = seg.count / total
      let span = share * Math.PI * 2
      if (span < minAngle && seg.count > 0) span = minAngle
      const start = acc
      acc += span
      return {
        ...seg,
        startAngle: start,
        angleSpan: span,
        color: PALETTE[i % PALETTE.length],
      }
    })
  }, [segments, total])

  const ringRadius = outerR + 0.55

  return (
    <>
      <color attach="background" args={['#f4f6f8']} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-4, 6, -2]} intensity={0.35} color="#e0e7ff" />

      <Grid
        position={[0, -0.01, 0]}
        args={[24, 24]}
        cellSize={0.45}
        cellThickness={0.6}
        cellColor="#c5cad3"
        sectionSize={2.25}
        sectionThickness={1.1}
        sectionColor="#9ca3af"
        fadeDistance={28}
        fadeStrength={1}
        infiniteGrid
      />

      <group position={[0, 0, 0]}>
        {slices.map((s) => (
          <PieSlice
            key={s.label}
            startAngle={s.startAngle}
            angleSpan={s.angleSpan}
            innerR={innerR}
            outerR={outerR}
            depth={depth}
            color={s.color}
            label={s.label}
            count={s.count}
            maxCount={maxCount}
            onNavigate={onNavigate}
            onHoverTip={onHoverTip}
          />
        ))}
        <RingBars segments={segments} ringRadius={ringRadius} maxCount={maxCount} onHoverTip={onHoverTip} />
      </group>

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={4.2}
        maxDistance={11}
        target={[0, 0.35, 0]}
      />
    </>
  )
}

export default function OverviewViz3D({ segments, className = '' }) {
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  const [tip, setTip] = useState(null)

  const onNavigate = (label) => {
    navigate(`/data/${encodeURIComponent(label)}`)
  }

  const onHoverTip = useCallback((nativeEvent, data) => {
    if (!nativeEvent || !wrapRef.current || !data) return
    const rect = wrapRef.current.getBoundingClientRect()
    setTip({
      label: data.label,
      count: data.count,
      subtitle: data.subtitle,
      px: nativeEvent.clientX - rect.left + 12,
      py: nativeEvent.clientY - rect.top + 12,
    })
  }, [])

  const clearTip = useCallback(() => setTip(null), [])

  if (!segments?.length) {
    return (
      <div
        className={`flex min-h-[320px] items-center justify-center rounded-xl border border-admin-border/80 bg-[#f4f6f8] text-sm text-slate-600 ${className}`}
      >
        No counted tables to visualize — fix DB sync or add data.
      </div>
    )
  }

  return (
    <div
      ref={wrapRef}
      onPointerLeave={clearTip}
      className={`relative overflow-hidden rounded-xl border border-admin-border/80 bg-[#f4f6f8] shadow-inner ${className}`}
    >
      <div className="h-[380px] w-full md:h-[420px]">
        <Canvas shadows camera={{ position: [5.2, 4.1, 5.2], fov: 42 }} dpr={[1, 2]}>
          <Suspense fallback={null}>
            <Scene segments={segments} onNavigate={onNavigate} onHoverTip={onHoverTip} />
          </Suspense>
        </Canvas>
      </div>
      {tip && (
        <div
          className="pointer-events-none absolute z-20 max-w-[220px] rounded-lg border border-slate-200/95 bg-white/98 px-3 py-2 text-xs shadow-lg"
          style={{ left: tip.px, top: tip.py }}
        >
          <p className="font-mono text-sm font-semibold text-slate-900">{tip.label}</p>
          {tip.subtitle && <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{tip.subtitle}</p>}
          <p className="mt-1 tabular-nums text-slate-700">
            <span className="font-medium">{tip.count.toLocaleString()}</span> rows
          </p>
          <p className="mt-1 text-[10px] text-slate-400">Click pie slice to open data explorer</p>
        </div>
      )}
      <p className="border-t border-slate-200/80 bg-white/80 px-3 py-2 text-center text-[11px] text-slate-500">
        Drag to orbit · Scroll to zoom · Hover for names · Click a slice to browse rows
      </p>
    </div>
  )
}
