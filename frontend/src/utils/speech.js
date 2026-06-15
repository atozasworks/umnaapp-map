/**
 * Thin wrapper around the Web Speech API (`speechSynthesis`) tuned for
 * turn-by-turn voice guidance.
 *
 * Responsibilities:
 *   - lazily resolve the best available voice for a BCP-47 language
 *   - speak prompts with sensible rate/pitch for clear navigation cues
 *   - support priority prompts that cancel queued chatter (e.g. "turn now")
 *   - mute/unmute without tearing down navigation state
 *   - survive the quirky async voice loading in Chrome
 */

/** Map app language codes (atozas-traslate) to BCP-47 speech locales. */
const LANG_TO_BCP47 = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  // Tulu has no standard TTS voice; it is written in the Kannada script, so we
  // use the Kannada voice to read Tulu prompts.
  tu: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
  or: 'or-IN',
  as: 'as-IN',
}

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function resolveSpeechLocale(appLanguage) {
  return LANG_TO_BCP47[appLanguage] || (appLanguage ? `${appLanguage}-IN` : 'en-IN')
}

class SpeechController {
  constructor() {
    this.supported = isSpeechSupported()
    this.muted = false
    this.locale = 'en-IN'
    this.voice = null
    this.voicesReady = false
    this._lastText = null
    this._lastSpokenAt = 0

    if (this.supported) {
      this._loadVoices()
      // Chrome loads voices asynchronously and fires this event when ready.
      try {
        window.speechSynthesis.addEventListener('voiceschanged', this._loadVoices)
      } catch {
        // Safari uses the onvoiceschanged property.
        window.speechSynthesis.onvoiceschanged = this._loadVoices
      }
    }
  }

  _loadVoices = () => {
    if (!this.supported) return
    const voices = window.speechSynthesis.getVoices()
    if (voices && voices.length) {
      this.voicesReady = true
      this._pickVoice()
    }
  }

  _pickVoice() {
    if (!this.supported) return
    const voices = window.speechSynthesis.getVoices()
    if (!voices?.length) return
    const target = this.locale.toLowerCase()
    const lang = target.split('-')[0]

    // Prefer an exact locale match, then same language, then any English voice.
    this.voice =
      voices.find((v) => v.lang?.toLowerCase() === target) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(lang)) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ||
      voices[0] ||
      null
  }

  setLanguage(appLanguage) {
    this.locale = resolveSpeechLocale(appLanguage)
    this._pickVoice()
  }

  setMuted(muted) {
    this.muted = Boolean(muted)
    if (this.muted) this.cancel()
  }

  isMuted() {
    return this.muted
  }

  cancel() {
    if (!this.supported) return
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* no-op */
    }
  }

  /**
   * Speak a prompt.
   * @param {string} text
   * @param {{ priority?: boolean }} options  priority cancels pending speech
   */
  speak(text, { priority = false } = {}) {
    if (!this.supported || this.muted || !text) return

    const now = Date.now()
    // Debounce identical prompts fired within a short window (GPS jitter guard).
    if (text === this._lastText && now - this._lastSpokenAt < 4000) return

    const synth = window.speechSynthesis
    if (priority) {
      synth.cancel()
    } else if (synth.speaking || synth.pending) {
      // Don't pile up non-priority chatter on top of an active prompt.
      return
    }

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = this.locale
    if (this.voice) utter.voice = this.voice
    utter.rate = 1.0
    utter.pitch = 1.0
    utter.volume = 1.0

    this._lastText = text
    this._lastSpokenAt = now

    try {
      // Resume is a Chrome workaround: synthesis can get stuck "paused".
      synth.resume()
      synth.speak(utter)
    } catch {
      /* no-op */
    }
  }

  /**
   * Unlock audio within a user gesture. Mobile browsers block speech that is
   * not initiated by a tap; speaking a tiny utterance on the "Start" press
   * primes the synthesizer so later prompts (fired from GPS updates) play.
   */
  unlock() {
    if (!this.supported || this.muted) return
    try {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      u.lang = this.locale
      window.speechSynthesis.resume()
      window.speechSynthesis.speak(u)
    } catch {
      /* no-op */
    }
  }

  /** Reset the debounce memory (e.g. after a reroute) so prompts repeat cleanly. */
  reset() {
    this._lastText = null
    this._lastSpokenAt = 0
    this.cancel()
  }
}

let singleton = null

/** Shared controller so a single voice queue is used across the app. */
export function getSpeechController() {
  if (!singleton) singleton = new SpeechController()
  return singleton
}
