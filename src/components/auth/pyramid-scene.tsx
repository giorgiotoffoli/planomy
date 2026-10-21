'use client'

import { Component, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { BufferGeometry, Color, Float32BufferAttribute, MathUtils, PerspectiveCamera, type Mesh } from 'three'
import { useReducedMotion } from 'motion/react'

function Fallback() {
  return <svg viewBox="0 0 300 320" className="h-full w-full p-12" aria-hidden="true">
    <defs>
      <linearGradient id="pyramid-left" x1="0" y1="0" x2="0.7" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#244dbd" /><stop offset=".5" stopColor="#35d9f1" /><stop offset="1" stopColor="#06132f" /></linearGradient>
      <linearGradient id="pyramid-right" x1="1" y1="0" x2="0.2" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#448bff" /><stop offset=".5" stopColor="#987aff" /><stop offset="1" stopColor="#081d50" /></linearGradient>
    </defs>
    <path fill="url(#pyramid-left)" d="M150 12 20 200 150 275Z" /><path fill="url(#pyramid-right)" d="M150 12 150 275 280 200Z" />
  </svg>
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Fallback /> : this.props.children }
}

type Interaction = { x: number; y: number; tiltX: number; tiltY: number; dragging: boolean; last: number; px: number; py: number }

function Pyramid({ interaction, reduced, spinToken }: { interaction: RefObject<Interaction>; reduced: boolean; spinToken: number }) {
  const mesh = useRef<Mesh>(null)
  const spin = useRef({ angle: 0, velocity: 0 })
  const geometry = useMemo(() => {
    // Keep the square base balanced, with a slightly taller apex.
    // The elevated camera reveals the base while the vertical axis stays upright.
    const r = 1.45
    const top = [0, r * 1.15, 0], left = [-r, 0, 0], front = [0, 0, r], right = [r, 0, 0], back = [0, 0, -r]
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute([
      ...top, ...left, ...front, ...top, ...front, ...right,
      ...top, ...right, ...back, ...top, ...back, ...left,
      ...left, ...back, ...right, ...left, ...right, ...front,
    ], 3))
    // Linear-space vertex colors blend across each crisp, flat face.
    const colors = [
      '#2457d5', '#38d9ed', '#040d27',
      '#3678ed', '#071538', '#a18aff',
      '#3678ed', '#a18aff', '#122b7d',
      '#2457d5', '#122b7d', '#38d9ed',
      '#0a2251', '#122b7d', '#8062bb',
      '#0a2251', '#8062bb', '#040d27',
    ].flatMap((hex) => new Color(hex).toArray())
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3))
    geo.translate(0, -0.5, 0)
    geo.computeVertexNormals()
    return geo
  }, [])
  useEffect(() => {
    if (spinToken > 0 && !reduced) spin.current.velocity += Math.PI * 4
  }, [reduced, spinToken])
  useFrame(({ clock }, delta) => {
    if (!mesh.current) return
    const state = interaction.current
    const t = clock.getElapsedTime()
    const settle = state.dragging ? 1 : Math.exp(-Math.max(0, performance.now() - state.last - 1600) / 500)
    spin.current.angle += spin.current.velocity * delta
    spin.current.velocity = MathUtils.damp(spin.current.velocity, 0, 3.2, delta)
    mesh.current.rotation.x = MathUtils.damp(mesh.current.rotation.x, state.x * settle + (reduced ? 0 : state.tiltY * 0.07), 5, delta)
    const idleRotation = reduced ? 0 : t * 0.08
    mesh.current.rotation.y = MathUtils.damp(mesh.current.rotation.y, state.y * settle + spin.current.angle + idleRotation + (reduced ? 0 : state.tiltX * 0.06), 5, delta)
    mesh.current.position.y = reduced ? 0 : Math.sin(t * 0.65) * 0.065
  })
  return <mesh ref={mesh} geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.34} metalness={0.25} flatShading /></mesh>
}

// The canvas extends beyond the interaction area to leave room for the
// shadow. Compensate its vertical FOV so the pyramid keeps its original size.
function ShadowFraming() {
  const get = useThree((state) => state.get)
  const size = useThree((state) => state.size)
  useLayoutEffect(() => {
    const camera = get().camera
    if (!(camera instanceof PerspectiveCamera)) return
    camera.fov = MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(39 / 2)) * 2))
    camera.updateProjectionMatrix()
  }, [get, size.width, size.height])
  return null
}

function subscribeVisibility(onChange: () => void) {
  const media = window.matchMedia('(min-width: 681px)')
  media.addEventListener('change', onChange)
  document.addEventListener('visibilitychange', onChange)
  return () => {
    media.removeEventListener('change', onChange)
    document.removeEventListener('visibilitychange', onChange)
  }
}
function sceneVisible() { return window.matchMedia('(min-width: 681px)').matches && !document.hidden }

export default function PyramidScene({ spinToken = 0 }: { spinToken?: number }) {
  const visible = useSyncExternalStore(subscribeVisibility, sceneVisible, () => false)
  const reduced = useReducedMotion() ?? false
  const interaction = useRef<Interaction>({ x: 0, y: 0, tiltX: 0, tiltY: 0, dragging: false, last: 0, px: 0, py: 0 })
  return (
    <div className="auth-pyramid" role="img" aria-label="Interactive Planomy pyramid. Drag to rotate, or use arrow keys. Press Home to reset." tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        const s = interaction.current
        const settle = Math.exp(-Math.max(0, performance.now() - s.last - 1600) / 500)
        s.x *= settle; s.y *= settle
        Object.assign(interaction.current, { dragging: true, px: event.clientX, py: event.clientY })
      }}
      onPointerMove={(event) => {
        const s = interaction.current
        const rect = event.currentTarget.getBoundingClientRect()
        s.tiltX = (event.clientX - rect.left) / rect.width * 2 - 1
        s.tiltY = (event.clientY - rect.top) / rect.height * 2 - 1
        if (s.dragging) {
          s.y += (event.clientX - s.px) * 0.008
          s.x += (event.clientY - s.py) * 0.008
          s.px = event.clientX; s.py = event.clientY
        }
      }}
      onPointerUp={(event) => {
        interaction.current.dragging = false
        interaction.current.last = performance.now()
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => { interaction.current.dragging = false; interaction.current.last = performance.now() }}
      onLostPointerCapture={() => { interaction.current.dragging = false; interaction.current.last = performance.now() }}
      onPointerLeave={() => { interaction.current.tiltX = 0; interaction.current.tiltY = 0 }}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return
        event.preventDefault()
        const s = interaction.current
        if (event.key === 'Home') { s.x = 0; s.y = 0 }
        else { s.y += event.key === 'ArrowLeft' ? -0.2 : event.key === 'ArrowRight' ? 0.2 : 0; s.x += event.key === 'ArrowUp' ? -0.2 : event.key === 'ArrowDown' ? 0.2 : 0 }
        s.last = performance.now()
      }}>
      <SceneBoundary>
        {visible ? <div className="auth-pyramid-canvas"><Canvas shadows camera={{ position: [0, 2.8, 7], fov: 39 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={<Fallback />}>
          <ShadowFraming />
          <ambientLight intensity={0.22} />
          {/* Upper-right key light, behind the model: the right face catches
              the light while its shadow projects forward and left. */}
          <directionalLight position={[5, 4, -3]} intensity={3.5} color="#d6e7ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-near={0.5} shadow-camera-far={20} shadow-bias={-0.0002} shadow-normalBias={0.025} shadow-radius={5} />
          <pointLight position={[-2.8, 0.4, 2]} intensity={0.45} color="#32dbff" />
          <pointLight position={[2, -0.1, -1]} intensity={1.5} color="#9c70ff" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.75, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <shadowMaterial transparent opacity={0.4} />
          </mesh>
          <Pyramid interaction={interaction} reduced={reduced} spinToken={spinToken} />
        </Canvas></div> : <Fallback />}
      </SceneBoundary>
    </div>
  )
}
