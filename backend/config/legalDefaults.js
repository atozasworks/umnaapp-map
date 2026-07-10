// Default seed content for editable legal documents.
//
// Content uses a tiny, safe markup: a line beginning with "# " is a section
// heading; blank lines separate paragraphs. The frontend renders this without
// injecting raw HTML, so it is safe to edit from the admin panel.

export const LEGAL_TYPES = ['privacy', 'terms']

export const DEFAULT_LEGAL_DOCS = {
  privacy: {
    type: 'privacy',
    title: 'Privacy Policy',
    content: [
      '# Information We Collect',
      'We collect information you provide directly, such as your name, email address, and profile picture when you create an account. We also collect location data when you use our mapping features, and usage data to improve our services.',
      '',
      '# How We Use Your Information',
      'Your information is used to provide and improve our mapping services, personalize your experience, manage your account, and communicate important updates. Location data is used solely for map functionality and is not shared with third parties.',
      '',
      '# Data Storage & Security',
      'We implement industry-standard security measures to protect your data. Your personal information is stored securely and encrypted during transmission. We retain your data only as long as necessary to provide our services.',
      '',
      '# Your Rights',
      'You have the right to access, update, or delete your personal information at any time through your account settings. You can also request a copy of your data or ask us to stop processing your information.',
      '',
      '# Contact Us',
      'If you have questions about this privacy policy or your data, please contact us through the Feedback option in the app.',
    ].join('\n'),
  },
  terms: {
    type: 'terms',
    title: 'Terms and Conditions',
    content: [
      '# Acceptance of Terms',
      'By accessing and using UMNAAPP, you accept and agree to be bound by these terms. If you do not agree to these terms, please do not use the application.',
      '',
      '# User Account',
      'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration and to update it as necessary. One person may maintain only one account.',
      '',
      '# Acceptable Use',
      'You agree to use the app only for lawful purposes. You must not submit false or misleading place information, spam, or any content that violates applicable laws. Abuse of the platform may result in account suspension.',
      '',
      '# User Contributions',
      'When you add places, reviews, or photos, you grant UMNAAPP a non-exclusive license to use this content within the service. You retain ownership of your contributions and can delete them at any time.',
      '',
      '# Disclaimer',
      'Map data and directions are provided for informational purposes only. We do not guarantee the accuracy of mapping data, route calculations, or place information. Always exercise personal judgment when navigating.',
      '',
      '# Changes to Terms',
      'We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the updated terms. We will notify users of significant changes.',
    ].join('\n'),
  },
}

export function defaultTitleFor(type) {
  return DEFAULT_LEGAL_DOCS[type]?.title || (type === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions')
}
