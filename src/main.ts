import './fixed-style.css'
import { FixedApp } from './fixed-app'

import { initializePlatform } from './core/platform'

void initializePlatform().then(() => new FixedApp())
