import { useTranslate } from 'atozas-traslate'

/** Translates arbitrary UI text (e.g. dynamic place categories) using the current app language. */
export default function TranslatedLabel({ text, as: Tag = 'span', className, ...rest }) {
  const translated = useTranslate(String(text ?? ''))
  return (
    <Tag className={className} {...rest}>
      {translated}
    </Tag>
  )
}
