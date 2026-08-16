import { GoogleTagManager as NextGoogleTagManager } from "@next/third-parties/google"

// GTM container IDs always look like "GTM-XXXXXXX". Validating the shape means a malformed or
// forgotten env var silently disables the tag manager instead of shipping broken markup.
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/

function getGtmId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GTM_ID
  return id && GTM_ID_PATTERN.test(id) ? id : undefined
}

// Set NEXT_PUBLIC_GTM_ID to enable Google Tag Manager for an environment; leave it unset to
// disable the snippet entirely (e.g. local development).
export function GoogleTagManagerScript() {
  const gtmId = getGtmId()
  if (!gtmId) return null
  return <NextGoogleTagManager gtmId={gtmId} />
}

// Fallback for visitors with JavaScript disabled, per Google's install instructions. Must be
// rendered immediately after the opening <body> tag.
export function GoogleTagManagerNoscript() {
  const gtmId = getGtmId()
  if (!gtmId) return null
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  )
}
