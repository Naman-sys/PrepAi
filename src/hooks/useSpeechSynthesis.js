import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { pickVoiceForLanguage } from '../utils/languages'

export default function useSpeechSynthesis({ langCode = 'en-US' } = {}) {
  const utteranceRef = useRef(null)
  const voiceRef = useRef(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceName, setVoiceName] = useState('Loading...')

  const initVoice = useCallback(() => {
    const voice = pickVoiceForLanguage(langCode)
    if (voice) {
      voiceRef.current = voice
      setVoiceName(voice.name)
    }
  }, [langCode])

  useEffect(() => {
    initVoice()
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = initVoice
    }

    const handleUnload = () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      handleUnload()
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [initVoice])

  const speak = useCallback((text, options = {}) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      options.onEnd?.()
      return
    }

    window.speechSynthesis.cancel()

    if (!voiceRef.current) {
      const voice = pickVoiceForLanguage(langCode)
      if (voice) {
        voiceRef.current = voice
        setVoiceName(voice.name)
      }
    }

    const utterance = new SpeechSynthesisUtterance(text)

    if (voiceRef.current) {
      utterance.voice = voiceRef.current
      utterance.lang = voiceRef.current.lang
    } else {
      utterance.lang = langCode
    }

    utterance.rate = options.rate ?? 0.95
    utterance.pitch = options.pitch ?? 1.1
    utterance.volume = options.volume ?? 1

    utterance.onstart = () => { setIsSpeaking(true); options.onStart?.() }
    utterance.onend = () => { setIsSpeaking(false); options.onEnd?.() }
    utterance.onerror = () => { setIsSpeaking(false); options.onError?.() }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [langCode])

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }, [])

  return useMemo(() => ({ speak, cancel, isSpeaking, utteranceRef, voiceName }), [speak, cancel, isSpeaking, voiceName])
}
