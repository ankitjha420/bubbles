import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/Addons.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import GUI from 'lil-gui'
import {settings} from './gui.ts'
import gsap from 'gsap'
import vert from '../shaders/vert.glsl?raw'
import frag from '../shaders/frag.glsl?raw'
import planeFrag from '../shaders/plane-frag.glsl?raw'
import planeVert from '../shaders/plane-vert.glsl?raw'

// constants ->
const device = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
}

export class Sketch {
    canvas: HTMLCanvasElement
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    clock: THREE.Clock
    controls: OrbitControls
    gui: GUI
    time: number
    trailLength: number
    mesh?: THREE.Mesh
    planeMesh?: THREE.Mesh
    material?: THREE.Material
    geometry?: THREE.BufferGeometry
    stats?: Stats
    ambientLight?: THREE.AmbientLight
    directionalLight?: THREE.DirectionalLight
    pointerTrail: THREE.Vector2[]
    mousePosition: THREE.Vector2

    constructor(canvas: HTMLCanvasElement) {
        this.time = 0
        this.mousePosition = new THREE.Vector2(0, 0)

        this.canvas = canvas
        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(
            35,
            device.width / device.height,
            0.01,
            1000
        )
        this.camera.position.set(0, 0, 6)
        this.scene.add(this.camera)

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
        })
        this.renderer.setSize(device.width, device.height)
        this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2))
        this.renderer.setClearColor(0x000000, 1)
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

        this.controls = new OrbitControls(this.camera, canvas)
        this.gui = new GUI({
            width: 340,
            title: 'Settings',
        })
        this.clock = new THREE.Clock()

        this.trailLength = 15
        this.pointerTrail = Array.from({length: this.trailLength}, () => {
            return new THREE.Vector2(0, 0)
        })

        this.initStats()
        this.init()
    }

    addGeometry(): void {
        // common uniforms ->
        const uniforms = {
            time: {value: 0},
            uResolution: {value: new THREE.Vector2(device.width, device.height)},
            uPointerTrail: {value: this.pointerTrail}
        }

        // add plane ->
        const plane = new THREE.PlaneGeometry(2, 2)
        const planeMaterial = new THREE.RawShaderMaterial({
            fragmentShader: planeFrag,
            vertexShader: planeVert,
            uniforms
        })
        this.planeMesh = new THREE.Mesh(plane, planeMaterial)

        this.geometry = new THREE.IcosahedronGeometry(1, 4)
        this.material = new THREE.ShaderMaterial({
            fragmentShader: frag,
            vertexShader: vert,
            uniforms
        })
        this.mesh = new THREE.Mesh(this.geometry, this.material)

        // this.scene.add(this.mesh)
        this.scene.add(this.planeMesh)
        this.addLights()
        this.addHelpers()
    }

    updatePointerTrail(): void {
        for (let i = this.trailLength - 1; i > 0; i--) {
            this.pointerTrail[i].copy(this.pointerTrail[i - 1])
        }
        this.pointerTrail[0].copy(this.mousePosition)
    }

    createMouseTracker(): void {
        this.canvas.addEventListener('mousemove', (event) => {
            const rect = this.canvas.getBoundingClientRect()
            this.mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            this.mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        })
    }

    render(): void {
        this.stats?.begin()
        this.time += 0.01

        this.updatePointerTrail()
        // @ts-ignore
        this.planeMesh!.material.uniforms.time.value = this.time

        this.controls.update()
        this.renderer.render(this.scene, this.camera)
        this.stats?.end()
        requestAnimationFrame(this.render.bind(this))
    }

    init(): void {
        this.addGeometry()
        this.resize()
        this.render()
        this.createMouseTracker()
    }

    initStats(): void {
        this.stats = new Stats()
        this.stats.showPanel(0)
        this.stats.addPanel(new Stats.Panel('MB', '#f8f', '#212'))
        this.stats.dom.style.cssText = 'position:absolute;top:0;left:0;'
        document.body.appendChild(this.stats.dom)
    }

    addLights(): void {
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2)
        this.directionalLight.target = this.mesh!
        this.directionalLight.position.set(5, 5, 5)
        this.directionalLight.castShadow = true
        this.directionalLight.shadow.mapSize.width = 1024
        this.directionalLight.shadow.mapSize.height = 1024

        this.scene.add(this.directionalLight)

        this.ambientLight = new THREE.AmbientLight(
            new THREE.Color(1, 1, 1),
            0.5
        )
        this.scene.add(this.ambientLight)
    }

    resize(): void {
        window.addEventListener('resize', this.onResize.bind(this))
    }

    onResize(): void {
        device.width = window.innerWidth
        device.height = window.innerHeight

        this.camera.aspect = device.width / device.height
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(device.width, device.height)
    }

    addHelpers(): void {
        const geometrySettings = this.gui.addFolder('Geometry settings').close()
        const ambientLightSettings = this.gui.addFolder('Light settings').close()

        const eventsSettings = this.gui.addFolder('Trigger events')

        geometrySettings.add(this.mesh!.position, 'y')
            .name('y position')
            .min(-2)
            .max(2)
            .step(0.01)

        geometrySettings.add(this.mesh!, 'visible').name('visibility')

        settings.spin = () => {
            gsap.to(this.mesh!.rotation, {
                duration: 1,
                y: this.mesh!.rotation.y + Math.PI * 2,
            })
        }

        eventsSettings.add(settings, 'spin').name('spin')

        ambientLightSettings
            .addColor(settings, 'ambientLightColor')
            .name('ambient light color')
            .onChange(() => {
                this.ambientLight!.color.set(settings.ambientLightColor)
            })

        ambientLightSettings
            .add(this.ambientLight!, 'intensity')
            .name('ambient light intensity')
            .min(0)
            .max(10)
            .step(0.1)
    }
}