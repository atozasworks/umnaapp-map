import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslate } from '../lib/i18n'
import { useAuth } from '../contexts/AuthContext'
import AppLogo from '../components/AppLogo'

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

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  // --- Section renderers ---

  const renderAccountSection = () => (
    <div className="animate-fade-in">
      <button
        onClick={() => setActiveSection(null)}
        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {tBack}
      </button>

      <h2 className="text-lg font-bold text-slate-800 mb-6">{tAccount}</h2>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Profile header with gradient */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-700 px-6 pt-8 pb-12 relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-8 w-20 h-20 rounded-full border-2 border-white" />
            <div className="absolute bottom-2 left-12 w-12 h-12 rounded-full border-2 border-white" />
          </div>
        </div>

        {/* Avatar overlapping header */}
        <div className="px-6 -mt-10 relative z-10">
          <input
            ref={profileFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfileImageChange}
          />
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => profileFileInputRef.current?.click()}
              disabled={uploadingPicture}
              className="w-20 h-20 rounded-full overflow-hidden bg-white border-4 border-white shadow-lg flex items-center justify-center group relative disabled:opacity-60"
            >
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-700">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
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
          </div>
          <p className="text-xs text-slate-500 mt-1.5 ml-1">{tChangePhoto}</p>
        </div>

        {/* Profile details */}
        <div className="px-6 py-5">
          {!editMode ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{tName}</p>
                <p className="text-base font-semibold text-slate-800 mt-0.5">{user?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{tEmail}</p>
                <p className="text-base text-slate-700 mt-0.5">{user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{tMemberSince}</p>
                <p className="text-base text-slate-700 mt-0.5">{formatDate(user?.createdAt)}</p>
              </div>

              <button
                onClick={() => { setEditMode(true); setEditName(user?.name || '') }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium text-sm rounded-xl transition-colors"
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
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{tName}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm transition-all"
                  autoFocus
                />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{tEmail}</p>
                <p className="text-base text-slate-500 mt-0.5 italic">{user?.email || '—'}</p>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  {tCancel}
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
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

        {/* Logout */}
        <div className="border-t border-slate-200 px-6 py-4">
          <button
            onClick={() => setConfirmLogoutVisible(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
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

  const renderPrivacyPolicy = () => (
    <div className="animate-fade-in">
      <button
        onClick={() => setActiveSection(null)}
        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {tBack}
      </button>

      <h2 className="text-lg font-bold text-slate-800 mb-4">{tPrivacyPolicy}</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
        <section>
          <h3 className="font-semibold text-slate-800 mb-2">Information We Collect</h3>
          <p>We collect information you provide directly, such as your name, email address, and profile picture when you create an account. We also collect location data when you use our mapping features, and usage data to improve our services.</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-2">How We Use Your Information</h3>
          <p>Your information is used to provide and improve our mapping services, personalize your experience, manage your account, and communicate important updates. Location data is used solely for map functionality and is not shared with third parties.</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-2">Data Storage & Security</h3>
          <p>We implement industry-standard security measures to protect your data. Your personal information is stored securely and encrypted during transmission. We retain your data only as long as necessary to provide our services.</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-2">Your Rights</h3>
          <p>You have the right to access, update, or delete your personal information at any time through your account settings. You can also request a copy of your data or ask us to stop processing your information.</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-2">Contact Us</h3>
          <p>If you have questions about this privacy policy or your data, please contact us through the Feedback option in the app.</p>
        </section>

        <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
          Last updated: June 2025
        </p>
      </div>
    </div>
  )

  const renderTermsConditions = () => (
    <div className="animate-fade-in">
      <button
        onClick={() => setActiveSection(null)}
        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {tBack}
      </button>

      <h2 className="text-lg font-bold text-slate-800 mb-4">{tTermsConditions}</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
        <section>
          <h3 className="font-semibold text-slate-800 mb-2">Acceptance of Terms</h3>
          <p>By accessing and using UMNAAPP, you accept and agree to be bound by these terms. If you do not agree to these terms, please do not use the application.</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-2">User Account</h3>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration and to update it as necessary. One person may maintain only one account.</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-2">Acceptable Use</h3>
          <p>You agree to use the app only for lawful purposes. You must not submit false or misleading place information, spam, or any content that violates applicable laws. Abuse of the platform may result in account suspension.</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-2">User Contributions</h3>
          <p>When you add places, reviews, or photos, you grant UMNAAPP a non-exclusive license to use this content within the service. You retain ownership of your contributions and can delete them at any time.</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-2">Disclaimer</h3>
          <p>Map data and directions are provided for informational purposes only. We do not guarantee the accuracy of mapping data, route calculations, or place information. Always exercise personal judgment when navigating.</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-2">Changes to Terms</h3>
          <p>We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the updated terms. We will notify users of significant changes.</p>
        </section>

        <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
          Last updated: June 2025
        </p>
      </div>
    </div>
  )

  const renderMainMenu = () => (
    <div className="space-y-2 animate-fade-in">
      {/* Account */}
      <button
        onClick={() => setActiveSection('account')}
        className="w-full flex items-center gap-4 px-4 py-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-primary-200 hover:shadow-md transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-800">{tAccount}</p>
          <p className="text-xs text-slate-500 mt-0.5">{tProfile}, {tEditProfile}</p>
        </div>
        <svg className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Privacy Policy */}
      <button
        onClick={() => setActiveSection('privacy')}
        className="w-full flex items-center gap-4 px-4 py-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-primary-200 hover:shadow-md transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-800">{tPrivacyPolicy}</p>
          <p className="text-xs text-slate-500 mt-0.5">Data collection & your rights</p>
        </div>
        <svg className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Terms & Conditions */}
      <button
        onClick={() => setActiveSection('terms')}
        className="w-full flex items-center gap-4 px-4 py-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-primary-200 hover:shadow-md transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-800">{tTermsConditions}</p>
          <p className="text-xs text-slate-500 mt-0.5">Usage rules & guidelines</p>
        </div>
        <svg className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/home')}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <AppLogo decorative imgClassName="h-7 w-auto object-contain flex-shrink-0" />
            <h1 className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent truncate">
              {tSettings}
            </h1>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-5 pb-20">
        {activeSection === 'account' && renderAccountSection()}
        {activeSection === 'privacy' && renderPrivacyPolicy()}
        {activeSection === 'terms' && renderTermsConditions()}
        {!activeSection && renderMainMenu()}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all animate-fade-in ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Logout confirmation */}
      {confirmLogoutVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 text-center animate-fade-in">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <p className="text-sm text-slate-700 mb-5">{tLogoutConfirm}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogoutVisible(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {tNo}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
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
