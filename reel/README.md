# Duniya Ki Jung, Hindustan Ke Jawan — 90 sec box-style reel

A 90-second vertical (1080×1920, 30 fps) documentary reel in Hinglish about Indian
soldiers in World War 1 and World War 2. Every character, ship, map and monument is
drawn in code from 3D boxes.

- `out/reel.mp4` is the finished reel, with burnt-in captions and a generated music track.
- `reel.html` is the animation. Open it in a browser to preview (click to pause).
- `render.js` renders the MP4: `node render.js` (needs Playwright + Chromium and ffmpeg).
  `node render.js --stills 10,45` saves single frames.

## Scene plan and voiceover script (Hinglish)

Read this over the video if you want a voiceover. The lines match the on-screen captions.

| Time | Scene | Voiceover / caption |
|---|---|---|
| 0–6s | Title: soldiers rise, "Duniya Ki Jung / Hindustan Ke Jawan" | Ek kahani jo history books mein chhoti reh gayi... |
| 6–14s | Troop ship leaves India, "1914" stamp | Saal 1914. Europe mein pehla World War shuru hua. Aur India se jahaaz nikal pade — British Empire ke liye ladne. |
| 14–24s | Box grid fills, counter to 13,00,000 | WW1 mein lagbhag 13 lakh Indians ne service di. British Empire ki kisi bhi colony se sabse zyada! |
| 24–34s | Rainy trench, spotlight on Khudadad Khan, VC | France ke trenches — thand, keechad aur goliyon ki baarish. Khudadad Khan — Victoria Cross jeetne wale pehle Indian soldier. |
| 34–42s | Box map of the fronts, lancer gallops | France, Gallipoli, Mesopotamia, East Africa — har front pe Indian jawan. 1918 — Haifa mein Indian ghudsawar lancers ne shehar jeet liya. |
| 42–48s | War graves, counter to 74,000+ | Par 74,000 se zyada jawan kabhi ghar wapas nahi aaye. |
| 48–56s | 1918 → 1939 flip, marching army, 25,00,000 | Phir aaya 1939. Duniya ek baar phir jung mein. 25 lakh Indians — itihaas ki sabse badi volunteer army! |
| 56–66s | Desert / Italy / Burma panels, "1944" | North Africa ke registan, Italy ke pahaad, Burma ke jungle... 1944 — Kohima aur Imphal mein Japan ki fauj ko India ki seema pe roka gaya. |
| 66–74s | Night Paris, Noor Inayat Khan at her radio | Noor Inayat Khan — Nazi-occupied Paris mein secret radio operator. Unki bahaduri ke liye unhe George Cross mila. |
| 74–82s | Medals rain, 87,000+ and 30+ VC cards | WW2 mein 87,000 se zyada Indian soldiers shaheed hue. Aur Indian Army ne 30+ Victoria Cross jeete. |
| 82–90s | India Gate builds from boxes, "Jai Hind" | Delhi ka India Gate — inhi shaheedon ki yaad mein. Unki kahani yaad rakho. Jai Hind. |

To add a recorded voiceover (`vo.m4a`) over the music:

```sh
ffmpeg -i out/reel.mp4 -i vo.m4a -filter_complex \
  "[0:a]volume=0.35[m];[m][1:a]amix=inputs=2:duration=first[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac out/reel-vo.mp4
```

## Facts used

The figures are the commonly cited rounded ones (Commonwealth War Graves Commission and
standard histories):

- WW1: about 1.3 million Indian soldiers served. More than 74,000 died.
- Khudadad Khan (129th Baluchis) was the first Indian soldier to win the Victoria Cross,
  near Ypres in October 1914.
- Haifa, 23 September 1918: Jodhpur and Mysore Lancers took the town.
- WW2: about 2.5 million men, the largest volunteer army in history. More than 87,000 died.
  Indian soldiers won 30+ Victoria Crosses.
- Kohima and Imphal (1944) stopped the Japanese advance into India.
- Noor Inayat Khan, SOE wireless operator in occupied Paris, codename "Madeleine",
  was awarded the George Cross after her death.
- India Gate commemorates soldiers of the British Indian Army who died in 1914–1921.
