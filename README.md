# Euclid Rhythms — Bjorklund/Toussaint sequencer

Demo Lab throwaway inspired by [@anabology — "Claudia Explains: Euclid"](https://x.com/anabology/status/2112601639672566182).

**Branch:** `demo/2026-10-20-euclid-rhythms` · do **not** merge to `main` unless intentional.

- Circular SVG sequencer: hits as glowing nodes joined into an inscribed polygon, sweeping playhead, flash on hit
- Linear step rows with group brackets (e.g. 3-3-2) from the gaps between hits
- HITS / STEPS (3–24) / ROTATE / BPM, play/stop; Web Audio synthesized kick, snare, hat, bell, bass (no audio files)
- Presets: four on the floor, tresillo, dembow, cinquillo, bossa clave, bembé (with piano octave: white keys = hits)
- Up to 3 concentric layers sharing one playhead; optional bass = inverse of kick
- "Show the fold": Bjorklund stages animated + Euclid subtraction gcd trace

Audio starts only after a user click. No secrets, no network calls.

```bash
npm install && npm run dev
```
