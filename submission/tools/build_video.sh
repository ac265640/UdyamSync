#!/usr/bin/env bash
# Assembles the demo: card renders + live-app recordings, each laid over its voiceover line.
# Output: ../UdyamSync_Demo.mp4 (1920x1080, 30 fps, H.264 + AAC, -16 LUFS, faststart)
set -euo pipefail
cd "$(dirname "$0")/../video"
mkdir -p scenes
LEAD=0.25   # voice starts a beat after the cut
: > scenes/list.txt
python3 - <<'EOF' > scenes/plan.tsv
import json
s=json.load(open('script.json')); d=json.load(open('durations.json'))
meta=json.load(open('raw/meta.json')) if __import__('os').path.exists('raw/meta.json') else {}
for x in s['scenes']:
    if x['type']=='card': print(x['id'],'card',0,round(d[x['id']]+0.7,3),sep='\t')
    else: m=meta[x['id']]; print(x['id'],'clip',round(m['offset'],3),round(m['length'],3),sep='\t')
EOF
while IFS=$'\t' read -r id kind off len; do
  if [ "$kind" = card ]; then src="clips/$id.mp4"; vf="scale=1920:1080,fps=30"; ss=0
  else src="raw/$id.webm"; vf="scale=1920:1080:flags=lanczos,fps=30"; ss="$off"; fi
  ffmpeg -nostdin -loglevel error -y -ss "$ss" -i "$src" -i "audio/$id.wav" -t "$len" \
    -filter_complex "[0:v]$vf,format=yuv420p,tpad=stop_mode=clone:stop_duration=2[v];[1:a]aresample=48000,adelay=$(python3 -c "print(int($LEAD*1000))")|$(python3 -c "print(int($LEAD*1000))"),apad[a]" \
    -map "[v]" -map "[a]" -t "$len" -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 192k -ar 48000 -ac 2 "scenes/$id.mp4"
  echo "file '$id.mp4'" >> scenes/list.txt
  printf '%-14s %s %6.2fs\n' "$id" "$kind" "$len"
done < scenes/plan.tsv
ffmpeg -loglevel error -y -f concat -safe 0 -i scenes/list.txt -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -r 30 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k -movflags +faststart ../UdyamSync_Demo.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 ../UdyamSync_Demo.mp4
