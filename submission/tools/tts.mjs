// Voiceover: one Kokoro take per scene (free, local). Writes video/audio/<id>.wav and durations.json
import { KokoroTTS } from 'kokoro-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
const V = '../video'
const script = JSON.parse(readFileSync(`${V}/script.json`, 'utf8'))
mkdirSync(`${V}/audio`, { recursive: true })
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })
const durations = {}
for (const s of script.scenes) {
  const a = await tts.generate(s.vo, { voice: script.voice, speed: 1.0 })
  const f = `${V}/audio/${s.id}.wav`
  await a.save(f)
  durations[s.id] = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString())
  console.log(s.id, durations[s.id].toFixed(2))
}
writeFileSync(`${V}/durations.json`, JSON.stringify(durations, null, 2))
console.log('total', Object.values(durations).reduce((a, b) => a + b, 0).toFixed(1))
