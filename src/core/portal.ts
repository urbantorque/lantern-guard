/** A separate build keeps portal onboarding out of the standalone and native editions. */
export const crazyGamesBuild = import.meta.env.MODE === 'crazygames' ||
  (import.meta.env.DEV && new URLSearchParams(location.search).get('portal') === 'crazygames')

