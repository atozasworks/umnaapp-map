import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslate } from '../lib/i18n'
import { useAuth } from '../contexts/AuthContext'
import { ATOZAS_POST_LOGOUT_PATH } from '../utils/atozasSso'
import AppLogo from '../components/AppLogo'
import NotificationSettings from '../components/NotificationSettings'
import api from '../services/api'

// Parse the lightweight legal-document markup stored in the DB into blocks.
// A line beginning with "# " is a section heading; blank lines separate
// paragraphs. This avoids injecting raw HTML from admin-edited content.
const parseLegalBlocks = (content) => {
  const lines = String(content || '').split('\n')
  const blocks = []
  let para = []
  const flush = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ') })
      para = []
    }
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (line.startsWith('# ')) {
      flush()
      blocks.push({ type: 'h', text: line.slice(2).trim() })
    } else {
      para.push(line)
    }
  }
  flush()
  return blocks
}

const formatLegalDate = (iso) => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return null
  }
}

// Shown only if the DB-backed content cannot be fetched (offline / not migrated).
const PRIVACY_FALLBACK_BLOCKS = [
  { type: 'h', text: 'Information We Collect' },
  { type: 'p', text: 'We collect information you provide directly, such as your name, email address, and profile picture when you create an account. We also collect location data when you use our mapping features, and usage data to improve our services.' },
  { type: 'h', text: 'How We Use Your Information' },
  { type: 'p', text: 'Your information is used to provide and improve our mapping services, personalize your experience, manage your account, and communicate important updates. Location data is used solely for map functionality and is not shared with third parties.' },
  { type: 'h', text: 'Data Storage & Security' },
  { type: 'p', text: 'We implement industry-standard security measures to protect your data. Your personal information is stored securely and encrypted during transmission. We retain your data only as long as necessary to provide our services.' },
  { type: 'h', text: 'Your Rights' },
  { type: 'p', text: 'You have the right to access, update, or delete your personal information at any time through your account settings. You can also request a copy of your data or ask us to stop processing your information.' },
  { type: 'h', text: 'Contact Us' },
  { type: 'p', text: 'If you have questions about this privacy policy or your data, please contact us through the Feedback option in the app.' },
]

const TERMS_FALLBACK_BLOCKS = [
  { type: 'h', text: 'Acceptance of Terms' },
  { type: 'p', text: 'By accessing and using UMNAAPP, you accept and agree to be bound by these terms. If you do not agree to these terms, please do not use the application.' },
  { type: 'h', text: 'User Account' },
  { type: 'p', text: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration and to update it as necessary. One person may maintain only one account.' },
  { type: 'h', text: 'Acceptable Use' },
  { type: 'p', text: 'You agree to use the app only for lawful purposes. You must not submit false or misleading place information, spam, or any content that violates applicable laws. Abuse of the platform may result in account suspension.' },
  { type: 'h', text: 'User Contributions' },
  { type: 'p', text: 'When you add places, reviews, or photos, you grant UMNAAPP a non-exclusive license to use this content within the service. You retain ownership of your contributions and can delete them at any time.' },
  { type: 'h', text: 'Disclaimer' },
  { type: 'p', text: 'Map data and directions are provided for informational purposes only. We do not guarantee the accuracy of mapping data, route calculations, or place information. Always exercise personal judgment when navigating.' },
  { type: 'h', text: 'Changes to Terms' },
  { type: 'p', text: 'We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the updated terms. We will notify users of significant changes.' },
]

const MAX_AVATAR_SIZE = 200

const resizeImageToDataUrl = (file, maxSize = MAX_AVATAR_SIZE) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize
          width = maxSize
        } else {
          width = (width / height) * maxSize
          height = maxSize
        }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })

const BackLink = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="group inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900 mb-6 transition-colors"
  >
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100/80 text-sky-700 group-hover:bg-sky-200/80 transition-colors">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
      </svg>
    </span>
    {label}
  </button>
)

const SectionHeading = ({ children, subtitle }) => (
  <div className="mb-5">
    <h2 className="text-xl font-semibold tracking-tight text-slate-900">{children}</h2>
    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
  </div>
)

const MenuRow = ({ icon, iconTone, title, subtitle, onClick, delay = 0 }) => {
  const tones = {
    sky: 'from-sky-500 to-cyan-400 shadow-sky-500/25 text-white',
    teal: 'from-teal-500 to-emerald-400 shadow-teal-500/25 text-white',
    amber: 'from-amber-500 to-orange-400 shadow-amber-500/25 text-white',
    slate: 'from-slate-600 to-slate-500 shadow-slate-500/20 text-white',
    rose: 'from-rose-500 to-pink-400 shadow-rose-500/25 text-white',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="settings-menu-row group w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-2xl text-left transition-all duration-200 hover:bg-white/80 active:scale-[0.99] animate-slide-up"
    >
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${tones[iconTone] || tones.sky} shadow-md flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 tracking-tight">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      <svg className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

const SettingsPage = () => {
  const navigate = useNavigate()
  const { user, logout, updateProfile, updateProfilePicture } = useAuth()
  const [activeSection, setActiveSection] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false)
  const [legalDocs, setLegalDocs] = useState({ privacy: null, terms: null })
  const [legalLoading, setLegalLoading] = useState(false)
  const profileFileInputRef = useRef(null)

  const tSettings = useTranslate('Settings')
  const tAccount = useTranslate('Account')
  const tPrivacyPolicy = useTranslate('Privacy Policy')
  const tTermsConditions = useTranslate('Terms and Conditions')
  const tProfile = useTranslate('Profile')
  const tEditProfile = useTranslate('Edit Profile')
  const tName = useTranslate('Name')
  const tEmail = useTranslate('Email')
  const tMemberSince = useTranslate('Member since')
  const tSave = useTranslate('Save')
  const tCancel = useTranslate('Cancel')
  const tLogout = useTranslate('Logout')
  const tBack = useTranslate('Back')
  const tChangePhoto = useTranslate('Change photo')
  const tLogoutConfirm = useTranslate('Are you sure you want to logout?')
  const tYes = useTranslate('Yes')
  const tNo = useTranslate('No')

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Lazily fetch the DB-backed legal document when its section is opened.
  useEffect(() => {
    const type = activeSection === 'privacy' ? 'privacy' : activeSection === 'terms' ? 'terms' : null
    if (!type || legalDocs[type]) return
    let cancelled = false
    setLegalLoading(true)
    api
      .get(`/public/legal/${type}`)
      .then(({ data }) => {
        if (!cancelled && data?.document) {
          setLegalDocs((prev) => ({ ...prev, [type]: data.document }))
        }
      })
      .catch(() => {
        /* keep built-in fallback content on failure */
      })
      .finally(() => {
        if (!cancelled) setLegalLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeSection, legalDocs])

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      showToast('Name must be at least 2 characters', 'error')
      return
    }
    setSaving(true)
    const result = await updateProfile({ name: editName.trim() })
    setSaving(false)
    if (result.success) {
      setEditMode(false)
      showToast('Profile updated successfully')
    } else {
      showToast(result.error || 'Failed to update profile', 'error')
    }
  }

  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPicture(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      const result = await updateProfilePicture(dataUrl)
      if (!result.success) showToast(result.error || 'Failed to update photo', 'error')
      else showToast('Photo updated')
    } catch {
      showToast('Failed to process image', 'error')
    }
    setUploadingPicture(false)
    e.target.value = ''
  }

  const handleLogout = async () => {
    await logout()
    window.location.replace(ATOZAS_POST_LOGOUT_PATH)
  }

  const handleTogglePublicProfile = async () => {
    const next = !(user?.profilePublic !== false)
    const result = await updateProfile({ profilePublic: next })
    if (result.success) showToast(next ? 'Profile is now public' : 'Profile is now private')
    else showToast(result.error || 'Failed to update', 'error')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  const initials = (user?.name || user?.email || 'U').charAt(0).toUpperCase()
  const isPublic = user?.profilePublic !== false

  // --- Section renderers ---

  const renderAccountSection = () => (
    <div className="animate-fade-in">
      <BackLink onClick={() => setActiveSection(null)} label={tBack} />
      <SectionHeading subtitle="Manage your identity and visibility">{tAccount}</SectionHeading>

      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(14,165,233,0.18)]">
        {/* Profile banner */}
        <div className="relative h-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-400" />
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.25) 0%, transparent 35%)',
          }} />
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full border border-white/20 animate-float" />
          <div className="absolute right-10 bottom-2 w-16 h-16 rounded-full border border-white/15 animate-float-delayed" />
        </div>

        <div className="px-5 -mt-12 relative z-10">
          <input
            ref={profileFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfileImageChange}
          />
          <button
            type="button"
            onClick={() => profileFileInputRef.current?.click()}
            disabled={uploadingPicture}
            className="relative w-[88px] h-[88px] rounded-full overflow-hidden bg-white border-[3px] border-white shadow-xl flex items-center justify-center group disabled:opacity-60 ring-4 ring-sky-100/50"
            aria-label={tChangePhoto}
          >
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-full h-full object-cover" width={96} height={96} decoding="async" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sky-100 to-cyan-50 flex items-center justify-center">
                <span className="text-3xl font-bold text-sky-700">{initials}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              {uploadingPicture ? (
                <svg className="w-6 h-6 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
          </button>
          <p className="text-xs text-slate-400 mt-2 ml-1">{tChangePhoto}</p>
        </div>

        <div className="px-5 py-5">
          {!editMode ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{tName}</p>
                  <p className="text-[15px] font-semibold text-slate-800 mt-0.5">{user?.name || '—'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{tEmail}</p>
                  <p className="text-[15px] text-slate-700 mt-0.5 break-all">{user?.email || '—'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{tMemberSince}</p>
                  <p className="text-[15px] text-slate-700 mt-0.5">{formatDate(user?.createdAt)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setEditMode(true); setEditName(user?.name || '') }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-sky-500/25 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {tEditProfile}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{tName}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 outline-none text-sm transition-all"
                  autoFocus
                />
              </div>
              <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{tEmail}</p>
                <p className="text-sm text-slate-500 mt-0.5 italic break-all">{user?.email || '—'}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  {tCancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-semibold hover:from-sky-400 hover:to-cyan-400 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-md shadow-sky-500/20"
                >
                  {saving && (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {tSave}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mx-5 border-t border-slate-100" />

        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Public profile</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Let others see your contributions, reviews and badges.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={handleTogglePublicProfile}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
              isPublic ? 'bg-sky-500' : 'bg-slate-300'
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isPublic ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className="mx-5 border-t border-slate-100" />

        <div className="px-5 py-4">
          <button
            type="button"
            onClick={() => setConfirmLogoutVisible(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-2xl text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {tLogout}
          </button>
        </div>
      </div>
    </div>
  )

  const renderNotificationsSection = () => (
    <div className="animate-fade-in">
      <BackLink onClick={() => setActiveSection(null)} label={tBack} />
      <SectionHeading subtitle="Choose how and when we reach you">Notifications</SectionHeading>
      <NotificationSettings onToast={showToast} />
    </div>
  )

  const renderLegalSection = (type, heading, fallbackBlocks) => {
    const doc = legalDocs[type]
    const blocks = doc?.content ? parseLegalBlocks(doc.content) : fallbackBlocks
    const updated = formatLegalDate(doc?.updatedAt)
    return (
      <div className="animate-fade-in">
        <BackLink onClick={() => setActiveSection(null)} label={tBack} />
        <SectionHeading>{doc?.title || heading}</SectionHeading>

        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(15,23,42,0.08)] p-6 space-y-5 text-sm text-slate-600 leading-relaxed">
          {legalLoading && !doc ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-slate-100 rounded-lg animate-pulse" style={{ width: `${70 + i * 8}%` }} />
              ))}
            </div>
          ) : (
            <>
              {blocks.map((b, i) =>
                b.type === 'h' ? (
                  <h3 key={i} className="font-semibold text-slate-900 text-[15px] tracking-tight pt-1 first:pt-0">{b.text}</h3>
                ) : (
                  <p key={i}>{b.text}</p>
                )
              )}
              {updated && (
                <p className="text-xs text-slate-400 pt-3 border-t border-slate-100">
                  Last updated: {updated}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  const renderPrivacyPolicy = () =>
    renderLegalSection('privacy', tPrivacyPolicy, PRIVACY_FALLBACK_BLOCKS)

  const renderTermsConditions = () =>
    renderLegalSection('terms', tTermsConditions, TERMS_FALLBACK_BLOCKS)

  const renderMainMenu = () => (
    <div className="space-y-6 md:space-y-8">
      {/* Identity hero */}
      <button
        type="button"
        onClick={() => setActiveSection('account')}
        className="settings-identity group relative w-full overflow-hidden rounded-3xl text-left animate-slide-up"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-400" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.35) 0%, transparent 45%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.2) 0%, transparent 40%)',
          }}
        />
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-white/20 animate-float" />
        <div className="absolute right-16 bottom-0 w-20 h-20 rounded-full border border-white/15 animate-float-delayed" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 rounded-full border border-white/10 hidden md:block" />

        <div className="relative flex items-center gap-4 sm:gap-5 px-5 sm:px-8 py-6 sm:py-8 md:py-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white/20 border-2 border-white/50 shadow-lg flex items-center justify-center flex-shrink-0 ring-4 ring-white/15">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-full h-full object-cover" width={80} height={80} decoding="async" />
            ) : (
              <span className="text-2xl sm:text-3xl font-bold text-white">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-2xl font-semibold text-white tracking-tight truncate drop-shadow-sm">
              {user?.name || 'Your account'}
            </p>
            <p className="text-sm sm:text-base text-white/80 truncate mt-0.5">{user?.email || tProfile}</p>
            <span className="inline-flex items-center gap-1.5 mt-2.5 text-[11px] sm:text-xs font-semibold text-white/90 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${isPublic ? 'bg-emerald-300' : 'bg-white/50'}`} />
              {isPublic ? 'Public profile' : 'Private profile'}
            </span>
          </div>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Settings grid — stacks on mobile, fills page on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
        {/* You */}
        <section className="min-w-0">
          <p className="settings-section-label">You</p>
          <div className="settings-panel h-full">
            <MenuRow
              delay={60}
              iconTone="sky"
              title={tAccount}
              subtitle={`${tProfile}, ${tEditProfile}`}
              onClick={() => setActiveSection('account')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <div className="mx-3.5 border-t border-slate-100/80" />
            <MenuRow
              delay={110}
              iconTone="teal"
              title="My Contributions"
              subtitle="Places, reviews, photos & stats"
              onClick={() => navigate('/my-contributions')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Preferences */}
        <section className="min-w-0">
          <p className="settings-section-label">Preferences</p>
          <div className="settings-panel h-full">
            <MenuRow
              delay={160}
              iconTone="amber"
              title="Notifications"
              subtitle="Push alerts & category preferences"
              onClick={() => setActiveSection('notifications')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Legal */}
        <section className="min-w-0 md:col-span-2 xl:col-span-1">
          <p className="settings-section-label">Legal</p>
          <div className="settings-panel h-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1">
            <MenuRow
              delay={210}
              iconTone="slate"
              title={tPrivacyPolicy}
              subtitle="Data collection & your rights"
              onClick={() => setActiveSection('privacy')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
            <div className="mx-3.5 border-t border-slate-100/80 md:hidden xl:block col-span-full" />
            <MenuRow
              delay={260}
              iconTone="slate"
              title={tTermsConditions}
              subtitle="Usage rules & guidelines"
              onClick={() => setActiveSection('terms')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          </div>
        </section>
      </div>
    </div>
  )

  return (
    <div className="settings-page min-h-[100dvh] relative overflow-x-hidden">
      {/* Atmospheric background */}
      <div className="settings-page-bg" aria-hidden>
        <div className="absolute inset-0 bg-[#f4f8fc]" />
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.14),transparent_65%)]" />
        <div className="absolute top-[30%] -left-24 w-72 h-72 rounded-full bg-cyan-300/20 blur-[80px] animate-pulse-glow" />
        <div className="absolute bottom-[10%] -right-20 w-80 h-80 rounded-full bg-sky-400/15 blur-[90px] animate-pulse-glow" style={{ animationDelay: '1.2s' }} />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Top bar */}
      <nav className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/50 pt-[env(safe-area-inset-top)]">
        <div className="w-full max-w-[1400px] mx-auto flex items-center gap-3 px-4 sm:px-6 lg:px-10 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-xl hover:bg-sky-50 active:bg-sky-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700"
            aria-label={tBack}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <AppLogo decorative imgClassName="h-7 w-auto object-contain flex-shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 truncate">
              {tSettings}
            </h1>
          </div>
        </div>
      </nav>

      {/* Content — full page width on home; readable width for detail sections */}
      <main className={`relative z-10 w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-24 ${
        activeSection ? 'max-w-3xl' : 'max-w-[1400px]'
      }`}>
        {activeSection === 'account' && renderAccountSection()}
        {activeSection === 'notifications' && renderNotificationsSection()}
        {activeSection === 'privacy' && renderPrivacyPolicy()}
        {activeSection === 'terms' && renderTermsConditions()}
        {!activeSection && renderMainMenu()}
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium text-white transition-all animate-slide-up backdrop-blur-sm ${
            toast.type === 'error' ? 'bg-rose-600/95' : 'bg-emerald-600/95'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Logout confirmation */}
      {confirmLogoutVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center animate-slide-up border border-white/60">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{tLogoutConfirm}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogoutVisible(false)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                {tNo}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 px-4 py-3 rounded-2xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/25"
              >
                {tYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
