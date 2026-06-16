import { useEffect, useRef, useState } from 'react'
import { useTranslate } from '../lib/i18n'
import api from '../services/api'

const SUGGESTIONS = [
  'How do I register?',
  'How do I get directions?',
  'How do I add a place?',
  'How does place extraction work?',
]

const WELCOME =
  "Hi! I'm the UmnaApp Maps assistant. I can help you with registration, using the map, search, directions, adding places, reviews, favorites, notifications, extraction and polygon tools. How can I help?"

/**
 * Floating support chatbot for UmnaApp Maps.
 * Restricted (server-side) to map-app topics only. Works on the landing page
 * (logged out) and inside the map app.
 */
const MapAssistantChatbot = ({ context = null }) => {
  const tTitle = useTranslate('Map Assistant')
  const tSubtitle = useTranslate('Help with UmnaApp Maps')
  const tFaqMode = useTranslate('Offline FAQ mode')
  const tPlaceholder = useTranslate('Ask about UmnaApp Maps...')
  const tSend = useTranslate('Send')
  const tClose = useTranslate('Close')
  const tOpen = useTranslate('Open Map Assistant')
  const tThinking = useTranslate('Thinking...')
  const tTry = useTranslate('Try asking')
  const tError = useTranslate('Something went wrong. Please try again.')

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [faqMode, setFaqMode] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }])

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [messages, open, loading])

  const send = async (text) => {
    const content = String(text ?? input).trim()
    if (!content || loading) return

    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const payload = nextMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }))

      const body = { messages: payload }
      if (context && Number.isFinite(context.lat) && Number.isFinite(context.lng)) {
        body.context = { lat: context.lat, lng: context.lng }
      }
      const { data } = await api.post('/map/assistant', body)
      const reply = (data?.reply || '').trim() || tError
      setFaqMode(data?.aiEnabled === false)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: tError }])
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    send()
  }

  return (
    <>
      {/* Floating action button */}
      {!open && (
        <button
          type="button"
          aria-label={tOpen}
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-primary-600 text-white shadow-lg shadow-violet-500/30 transition-transform hover:scale-105 active:scale-95 touch-manipulation"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="8.5" cy="10" r="0.6" fill="currentColor" />
            <circle cx="12" cy="10" r="0.6" fill="currentColor" />
            <circle cx="15.5" cy="10" r="0.6" fill="currentColor" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-[59] bg-black/30 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed z-[60] flex flex-col bg-white shadow-2xl animate-slide-up inset-x-0 bottom-0 top-[15vh] rounded-t-2xl sm:inset-auto sm:bottom-5 sm:right-4 sm:top-auto sm:h-[34rem] sm:max-h-[80vh] sm:w-[24rem] sm:rounded-2xl overflow-hidden"
            role="dialog"
            aria-label={tTitle}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-violet-500 to-primary-600 px-4 py-3 text-white flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">{tTitle}</p>
                  <p className="text-[11px] text-white/80 leading-tight truncate">{faqMode ? tFaqMode : tSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label={tClose}
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-md'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
                  </div>
                </div>
              )}

              {messages.length <= 1 && !loading && (
                <div className="pt-1">
                  <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{tTry}</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 active:bg-violet-200 touch-manipulation"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-slate-200 bg-white p-2.5 flex-shrink-0" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                rows={1}
                placeholder={tPlaceholder}
                className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 max-h-28"
              />
              <button
                type="submit"
                aria-label={tSend}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary-600 text-white shadow-sm transition-opacity disabled:opacity-40 touch-manipulation"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}

export default MapAssistantChatbot
