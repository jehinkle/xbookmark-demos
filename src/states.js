// Drop-in registry: add a state by adding <abbr>-raw.json (make-state-json.py) and <abbr>-map.json (build-map.mjs).
import tnRaw from './data/tn-raw.json'
import tnMap from './data/tn-map.json'
export const STATES = { TN: { raw: tnRaw, map: tnMap } }
