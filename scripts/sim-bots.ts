import type { BotOpts } from './bot'

export const BOTS: BotOpts[] = [
  { name: 'balanced + routing', mix: {}, router: 'smart' },
  { name: 'balanced, no routing', mix: {}, router: 'none' },
  { name: 'balanced, random flips', mix: {}, router: 'random' },
  { name: 'sparks + bells + routing', mix: { wick: 3, bell: 2, cracker: 0.4, beam: 0.3 }, paths: { wick: 0 }, router: 'smart' },
  { name: 'heavy hitters + routing', mix: { beam: 3, cracker: 2, wick: 0.3 }, router: 'smart' },
  { name: 'garden economy + routing', mix: {}, gardens: 3, paths: { garden: 0 }, router: 'smart' },
  { name: 'no owls + routing', mix: {}, ban: ['owl'], router: 'smart' },
  { name: 'charms only (no taps)', mix: {}, router: 'none', charms: true },
  { name: 'greedy, parks on rich runs', mix: {}, router: 'park' },
  { name: 'sorts, parks from wave 12', mix: {}, router: 'park', parkFrom: 12 },
  { name: 'slow reactions (1.5s)', mix: {}, router: 'smart', reaction: 1.5 },
  { name: 'careful sorter (no greed)', mix: { beam: 1.6, cracker: 1.3 }, router: 'smart', greed: false },
  { name: 'careful sorter, beams', mix: { beam: 2.5, owl: 1.2 }, paths: { beam: 1, wick: 1 }, router: 'smart', greed: false },
]
