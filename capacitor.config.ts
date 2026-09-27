import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.lanternlocks.game',
  appName: 'Lanternlocks',
  webDir: 'dist',
  backgroundColor: '#081319',
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    backgroundColor: '#081319',
  },
}

export default config
