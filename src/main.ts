import './fixed-style.css'
import './miniature-style.css'
import './nocturne-style.css'
import './siege-style.css'
import './craft-style.css'
import { FixedApp } from './fixed-app'

import { initializePlatform } from './core/platform'

void initializePlatform().then(() => new FixedApp())
