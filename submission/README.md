# Submission

**Public links:** [showcase page](https://ac265640.github.io/UdyamSync/) · [play the video](https://ac265640.github.io/UdyamSync/UdyamSync_Demo.mp4) · [open the PDF](https://ac265640.github.io/UdyamSync/UdyamSync_Submission.pdf) · [view the PPT in the browser](https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fac265640.github.io%2FUdyamSync%2FUdyamSync_Submission.pptx)

| File | What it is |
|---|---|
| [`UdyamSync_Submission.pdf`](UdyamSync_Submission.pdf) | The 10-slide submission document (PDF) |
| [`UdyamSync_Submission.pptx`](UdyamSync_Submission.pptx) | The same deck as PowerPoint, on the Airtel SYNC template |
| [`UdyamSync_Demo.mp4`](UdyamSync_Demo.mp4) | 2 min 27 s demo video, 1080p, with voiceover |
| [`UdyamSync_Architecture.pdf`](UdyamSync_Architecture.pdf) | Solution architecture diagram (vector PDF; PNG in `docs/architecture.png`) |
| [`UdyamSync_Privacy_Note.pdf`](UdyamSync_Privacy_Note.pdf) | 1-page data privacy and security note |

## How they are built (reproducible)

Everything is generated from the running prototype (API on :8000, web on :5173). Install the tools once with `cd tools && npm install playwright pptxgenjs kokoro-js`. Set `CHROME_PATH` to a Chromium or headless-shell binary if Playwright's default isn't installed.

| Step | Command (from `tools/`) | Output |
|---|---|---|
| App screenshots | `node capture.mjs` | `../../docs/screenshots/*.png` |
| Architecture diagram | `node snap.mjs ../assets/architecture.html ../../docs/architecture.png` | `docs/architecture.png` |
| Architecture PDF / slide image | headless Chromium `page.pdf()` of `assets/architecture.html`; `node snap.mjs ../assets/architecture_slide.html ../assets/crops/architecture_slide.png 1920 800` | `UdyamSync_Architecture.pdf`, slide image |
| Privacy note | headless Chromium `page.pdf()` of `assets/privacy_note.html` (A4) | `UdyamSync_Privacy_Note.pdf` |
| Deck | `node build_deck.cjs` | `UdyamSync_Submission.pptx` (export PDF with LibreOffice) |
| Voiceover | `node tts.mjs` | `video/audio/*.wav` from `video/script.json` (Kokoro, free and local) |
| Motion cards | `node render_cards.mjs` | hook, title and close cards rendered frame by frame from paused GSAP timelines |
| App footage | `node record.mjs` | Playwright recordings of the real app, paced to each voice line |
| Final video | `./build_video.sh` | `UdyamSync_Demo.mp4` (H.264 + AAC, −16 LUFS, faststart) |
