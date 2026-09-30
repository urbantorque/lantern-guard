import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.lanternlocks.game',
  appName: 'Nightward',
  webDir: 'dist',
  backgroundColor: '#233443',
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    backgroundColor: '#233443',
  },
}

export default config
