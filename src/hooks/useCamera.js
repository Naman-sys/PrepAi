import { useCallback, useEffect, useRef, useState } from 'react'
import '@mediapipe/camera_utils'
import '@mediapipe/face_mesh'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function distance(a, b) {
  return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0))
}

export default function useCamera() {
  const videoRef = useRef(null)
  const cameraRef = useRef(null)
  const faceMeshRef = useRef(null)
  const missFramesRef = useRef(0)
  const eyeContactRef = useRef(0)
  const eyeTimelineRef = useRef([])

  const [isEnabled, setIsEnabled] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [eyeContact, setEyeContact] = useState(0)
  const [confidence, setConfidence] = useState(0)
  const eyeContactInstantRef = useRef(0)

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
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const enableCamera = useCallback(async () => {
    if (!videoRef.current) return

    try {
      const FaceMeshCtor = window.FaceMesh
      const CameraCtor = window.Camera
      if (!FaceMeshCtor || !CameraCtor) {
        throw new Error('MediaPipe camera modules are unavailable')
      }

      cameraRef.current?.stop()
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      })

      videoRef.current.srcObject = stream
      setPermissionDenied(false)
      setIsEnabled(true)
      missFramesRef.current = 0

      const faceMesh = new FaceMeshCtor({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
      })

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.35,
        minTrackingConfidence: 0.35,
      })

      let smoothedConfidence = 0

      faceMesh.onResults((results) => {
        const landmarks = results.multiFaceLandmarks?.[0]

        if (!landmarks) {
          missFramesRef.current += 1
          if (missFramesRef.current > 40) {
            setFaceDetected(false)
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

      faceMeshRef.current = faceMesh

      const camera = new CameraCtor(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            try {
              await faceMesh.send({ image: videoRef.current })
            } catch {
              // Keep camera stream alive if a frame occasionally fails.
            }
          }
        },
        width: 640,
        height: 480,
        facingMode: 'user',
      })

      cameraRef.current = camera
      await camera.start()
    } catch (error) {
      setPermissionDenied(true)
      setIsEnabled(false)
      setFaceDetected(false)
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
  }
}
