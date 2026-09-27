import './style.css'
import { App } from './app'

import { initializePlatform } from './core/platform'

void initializePlatform().then(() => new App())
