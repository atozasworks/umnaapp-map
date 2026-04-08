import logoUrl from '../../umnaapplogo.png'

/**
 * UMNAAPP wordmark / logo from frontend/umnaapplogo.png (bundled by Vite).
 */
export default function AppLogo({
  alt = 'UMNAAPP',
  /** When true, image is decorative (paired with visible app name); alt cleared for a11y */
  decorative = false,
  className = '',
  imgClassName = 'h-8 w-auto max-h-9 object-contain object-left',
}) {
  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <img
        src={logoUrl}
        alt={decorative ? '' : alt}
        aria-hidden={decorative ? true : undefined}
        className={imgClassName}
        decoding="async"
      />
    </span>
  )
}
