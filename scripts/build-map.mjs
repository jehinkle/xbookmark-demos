// Prep-time: project a state's counties from us-atlas into SVG path strings.
import fs from 'node:fs'
import { feature } from 'topojson-client'
import { geoAlbers, geoPath } from 'd3-geo'
const fips = process.argv[2] || '47', out = process.argv[3]
const topo = JSON.parse(fs.readFileSync('node_modules/us-atlas/counties-10m.json'))
const fc = feature(topo, topo.objects.counties)
fc.features = fc.features.filter(f => String(f.id).startsWith(fips))
const proj = geoAlbers().fitSize([360, 150], fc)
const gp = geoPath(proj)
const paths = Object.fromEntries(fc.features.map(f => [f.id, gp(f).replace(/(\.\d)\d+/g, '$1')]))
fs.writeFileSync(out, JSON.stringify({ w: 360, h: 150, paths }))
console.log(Object.keys(paths).length)
