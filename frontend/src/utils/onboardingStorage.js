const ONBOARDING_VERSION = 'v1'

const buildStorageKey = (userId) =>
  `umnaapp:onboarding:${ONBOARDING_VERSION}:${userId || 'anon'}`

export const hasSeenOnboarding = (userId) => {
  try {
    return localStorage.getItem(buildStorageKey(userId)) === '1'
  } catch {
    return false
  }
}

export const markOnboardingSeen = (userId) => {
  try {
    localStorage.setItem(buildStorageKey(userId), '1')
  } catch {
    /* storage may be disabled - safe to ignore */
  }
}
