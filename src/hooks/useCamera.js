import { useCallback, useEffect, useRef, useState } from 'react'
import '@mediapipe/camera_utils'
import '@mediapipe/face_mesh'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function distance(a, b) {
  return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0))
}

const MEDIA_PIPE_CAMERA_URL = '/mediapipe/camera_utils/camera_utils.js'
const MEDIA_PIPE_FACE_MESH_URL = '/mediapipe/face_mesh/face_mesh.js'

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Document is not available.'))
      return
    }

    const existing = document.querySelector(`script[data-src="${src}"]`)
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve()
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.defer = false
    script.dataset.src = src
    script.onload = () => {
      script.setAttribute('data-loaded', 'true')
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

async function ensureMediaPipeReady() {
  if (window.Camera && window.FaceMesh) return

  await loadScriptOnce(MEDIA_PIPE_CAMERA_URL)
  await loadScriptOnce(MEDIA_PIPE_FACE_MESH_URL)

  if (!window.Camera || !window.FaceMesh) {
    throw new Error('MediaPipe runtime is not available from local assets.')
  }
}

export default function useCamera() {
  const videoRef = useRef(null)
  const cameraRef = useRef(null)
  const faceMeshRef = useRef(null)
  const frameLoopRef = useRef(null)
  const missFramesRef = useRef(0)
  const eyeContactRef = useRef(0)
  const eyeTimelineRef = useRef([])

  const [isEnabled, setIsEnabled] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [eyeContact, setEyeContact] = useState(0)
  const [confidence, setConfidence] = useState(0)
  const [cameraError, setCameraError] = useState('')
  const eyeContactInstantRef = useRef(0)

  useEffect(() => {
    ensureMediaPipeReady().catch((error) => {
      setCameraError(error?.message || 'Failed to load local MediaPipe runtime files.')
    })
  }, [])

  useEffect(() => {
    let timer = null
    if (isEnabled) {
      timer = window.setInterval(() => {
        eyeTimelineRef.current.push(Math.round(eyeContactRef.current))
      }, 1000)
    }

    return () => {
      if (timer) window.clearInterval(timer)
    }
  }, [isEnabled])

  useEffect(() => {
    return () => {
      cameraRef.current?.stop()
      if (frameLoopRef.current) {
        window.cancelAnimationFrame(frameLoopRef.current)
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const enableCamera = useCallback(async () => {
    if (!videoRef.current) return

    try {
      setCameraError('')
      cameraRef.current?.stop()
      if (frameLoopRef.current) {
        window.cancelAnimationFrame(frameLoopRef.current)
        frameLoopRef.current = null
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      })

      videoRef.current.srcObject = stream
      try {
        await videoRef.current.play()
      } catch {
        // Some browsers auto-play video only after the stream is attached; keep going.
      }
      setPermissionDenied(false)
      setIsEnabled(true)
      missFramesRef.current = 0

      await ensureMediaPipeReady()

      const FaceMeshCtor = window.FaceMesh
      if (!FaceMeshCtor) {
        setCameraError('Face tracking could not load. Reload the page and try again.')
        setFaceDetected(false)
        setConfidence(0)
        setEyeContact(0)
        return
      }

      const faceMesh = new FaceMeshCtor({
        locateFile: (file) => {
          // Prefer assets hosted by this app to avoid CDN/network restrictions.
          return `/mediapipe/face_mesh/${file}`
        },
      })

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.15,
        minTrackingConfidence: 0.15,
        useCpuInference: true,
      })

      faceMeshRef.current = faceMesh

      let smoothedConfidence = 0
      let lastVideoTime = -1

      faceMesh.onResults((results) => {
        const landmarks = results.multiFaceLandmarks?.[0]

        if (!landmarks) {
          missFramesRef.current += 1
          if (missFramesRef.current > 40) {
            setFaceDetected(false)
            setEyeContact(0)
            setConfidence(0)
          }
          return
        }

        missFramesRef.current = 0
        setFaceDetected(true)

        const leftEyeOuter = landmarks[33]
        const rightEyeOuter = landmarks[263]
        const nose = landmarks[1]

        const eyeCenter = ((leftEyeOuter?.x || 0.5) + (rightEyeOuter?.x || 0.5)) / 2
        const eyeWidth = Math.max(0.001, Math.abs((rightEyeOuter?.x || 0.5) - (leftEyeOuter?.x || 0.5)))
        const gazeOffsetRatio = Math.abs((nose?.x || 0.5) - eyeCenter) / eyeWidth
        const instantEyeContact = clamp(100 - gazeOffsetRatio * 90, 0, 100)

        eyeContactInstantRef.current = eyeContactInstantRef.current * 0.82 + instantEyeContact * 0.18
        eyeContactRef.current = eyeContactInstantRef.current
        setEyeContact(eyeContactInstantRef.current)

        const mouthLeft = landmarks[61]
        const mouthRight = landmarks[291]
        const leftCheek = landmarks[234]
        const rightCheek = landmarks[454]

        const faceWidth = distance(leftCheek, rightCheek)
        const centerOffset = Math.abs((nose?.x || 0.5) - 0.5)
        const alignmentScore = clamp(100 - centerOffset * 220, 0, 100)
        const distanceScore = clamp(100 - Math.abs(faceWidth - 0.32) * 260, 0, 100)
        const expressionScore = clamp(distance(mouthLeft, mouthRight) * 120, 0, 100)

        const instantConfidence = clamp(alignmentScore * 0.45 + distanceScore * 0.35 + expressionScore * 0.2, 0, 100)
        smoothedConfidence = smoothedConfidence * 0.78 + instantConfidence * 0.22
        setConfidence(smoothedConfidence)
      })

      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          frameLoopRef.current = window.requestAnimationFrame(tick)
          return
        }

        if (videoRef.current.currentTime !== lastVideoTime) {
          lastVideoTime = videoRef.current.currentTime
          try {
            await faceMesh.send({ image: videoRef.current })
          } catch (error) {
            setCameraError(error?.message || 'Face tracking runtime error.')
          }
        }

        frameLoopRef.current = window.requestAnimationFrame(tick)
      }

      frameLoopRef.current = window.requestAnimationFrame(tick)
    } catch (error) {
      const message = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
        ? 'Camera permission was denied. Please allow camera access in the browser.'
        : error?.message || 'Camera could not start.'

      setCameraError(message)
      setPermissionDenied(Boolean(error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'))
      setIsEnabled(false)
      setFaceDetected(false)
      setConfidence(0)
      setEyeContact(0)
    }
  }, [])

  return {
    videoRef,
    enableCamera,
    isEnabled,
    permissionDenied,
    faceDetected,
    eyeContact,
    confidence,
    eyeTimeline: eyeTimelineRef.current,
    cameraError,
  }
}
