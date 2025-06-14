import { Sketch } from './components/sketch'

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas')
    if (canvas) {
        new Sketch(canvas as HTMLCanvasElement)
    }
})