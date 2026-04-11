import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

export default function useSpeechRecognition({ onTranscript, langCode = 'en-US' }) {
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const onTranscriptRef = useRef(onTranscript)
  const shouldBeRecordingRef = useRef(false)
  const restartTimeoutRef = useRef(null)
  const isStartingRef = useRef(false)
  const [supported, setSupported] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [lastError, setLastError] = useState('')

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognitionImpl =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionImpl) {
      console.warn('Speech Recognition API not supported in this browser')
      setSupported(false)
      return
    }

    let recognition
    let isActiveInstance = true
    try {
      recognition = new SpeechRecognitionImpl()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = langCode
    } catch (error) {
      console.error('Failed to initialize Speech Recognition:', error)
      setSupported(false)
      return
    }

    recognition.onstart = () => {
      if (!isActiveInstance) return
      console.log('Speech recognition started')
      isStartingRef.current = false
      setIsRecording(true)
      setLastError('')
    }

    const scheduleRestart = (delayMs = 220) => {
      if (!isActiveInstance || !shouldBeRecordingRef.current) return
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current)
      }

      restartTimeoutRef.current = window.setTimeout(() => {
        if (!isActiveInstance || !shouldBeRecordingRef.current) return
        if (isStartingRef.current) return

        try {
          isStartingRef.current = true
          recognition.start()
        } catch (error) {
          isStartingRef.current = false
          console.warn('Delayed restart failed:', error)
          setLastError(`restart-failed: ${error?.message || 'Unknown restart error'}`)
        }
      }, delayMs)
    }

    recognition.onend = () => {
      if (!isActiveInstance) return
      console.log('Speech recognition ended')
      setIsRecording(false)

      // Only restart if user still wants to record
      if (!shouldBeRecordingRef.current) return

      console.log('Scheduling recognition restart...')
      scheduleRestart(220)
    }

    recognition.onerror = (event) => {
      if (!isActiveInstance) return
      console.error('Speech Recognition error:', event?.error)
      const code = event?.error || 'unknown'
      setLastError(code)
      
      // Completely ignore no-speech errors - keep listening
      if (code === 'no-speech') {
        console.log('No speech yet, but continuing to listen...')
        scheduleRestart(320)
        return
      }

      // Transient errors can happen when tab focus changes or device jitters.
      if (code === 'aborted' || code === 'audio-capture' || code === 'network') {
        scheduleRestart(320)
        return
      }
      
      // Permission denied - stop permanently
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        console.error('Microphone permission DENIED by user or system')
        setIsRecording(false)
        shouldBeRecordingRef.current = false
        isStartingRef.current = false
      }
    }

    recognition.onresult = (event) => {
      if (!isActiveInstance) return
      
      let final = ''
      let interim = ''
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }

      if (final) {
         finalTranscriptRef.current += ' ' + final
      }

      const combined = (finalTranscriptRef.current + ' ' + interim).trim()
      
      onTranscriptRef.current?.({
        transcript: combined,
        finalTranscript: finalTranscriptRef.current,
        interimTranscript: interim
      })
    }

    recognitionRef.current = recognition
    setSupported(true)

    return () => {
      isActiveInstance = false
      shouldBeRecordingRef.current = false
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current)
      }
      recognition.stop()
      recognitionRef.current = null
    }
  }, [langCode])

  const reset = useCallback(() => {
    finalTranscriptRef.current = ''
    onTranscriptRef.current?.({ transcript: '', finalTranscript: '', interimTranscript: '' })
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      console.warn('Recognition not initialized')
      setLastError('not-initialized')
      return
    }
    
    setLastError('')

    try {
      shouldBeRecordingRef.current = true

      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current)
      }

      if (isRecording || isStartingRef.current) {
        console.log('Recognition start() skipped - already active')
        return
      }

      isStartingRef.current = true
      recognitionRef.current.start()
      console.log('Recognition start() called')
    } catch (error) {
      isStartingRef.current = false
      if (error?.name === 'InvalidStateError' || error?.message?.includes('already started')) {
        // Safe to ignore, it's already running.
        console.log('Recognition already started.')
      } else {
        console.error('Failed to start recognition:', error)
        setLastError(`start-failed: ${error?.message || 'Unknown start error'}`)
      }
    }
  }, [])

  const stop = useCallback(() => {
    shouldBeRecordingRef.current = false
    isStartingRef.current = false
    if (restartTimeoutRef.current) {
      window.clearTimeout(restartTimeoutRef.current)
    }
    setIsRecording(false)
    recognitionRef.current?.stop()
  }, [])

  return useMemo(() => ({
    start,
    stop,
    reset,
    supported,
    isRecording,
    lastError,
    recognitionRef,
    finalTranscriptRef,
  }), [start, stop, reset, supported, isRecording, lastError])
}
