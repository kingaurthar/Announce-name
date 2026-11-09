# শেষ ফোন কল — ElevenLabs Voice Script

Generate these 20 clips in ElevenLabs, name them exactly as listed, and upload them to this chat. I'll trim each one, apply the phone and door effects, fit it to its slot, mix it into `animatic.mp4` and retime the subtitles.

---

## 1. ElevenLabs settings (same for every clip)

| Setting | Use |
|---|---|
| **Model** | **Eleven v3**. Bengali is supported, and v3 understands the emotion tags in square brackets used below. Multilingual v2 and Flash/Turbo do not support Bengali. |
| **Voice** | **One young male Bengali voice (about 25, mid-low, soft)** for ALL lines. Rahul, the caller and the voice behind the door are the same person, so never switch voices. In the Voice Library, filter by *Language: Bengali*, *Gender: Male*, *Age: Young*, or clone a voice with Instant Voice Clone. |
| **Stability** | **Natural** (v3 slider). Use **Creative** only if a scared line sounds too flat. |
| **Speed** | Default (1.0). Speed the line up a little only if it runs past its **Max length**. |
| **Output format** | **WAV 48 kHz** if your plan offers it, otherwise **MP3 44.1 kHz 192 kbps**. |
| **Effects** | **None. Generate everything clean and dry.** I add the phone filter (V2), the muffled-door sound (V3) and the move from the phone into the room (line 18) in the mix. |

**Tips**
- Paste **only the text in the "Paste into ElevenLabs" column**, including the [tags]. Don't paste the line number or speaker.
- Numbers are already written as words (দুটো সতেরো) so the time is read correctly.
- Generate 2–3 takes per line and keep the best. Fear lines usually need a couple of tries.
- A little silence at the start or end of a clip is fine; I trim it.
- If a take is **longer than its Max length**, regenerate it or nudge Speed up (about 1.1). I can also speed a clip up by about 10% without it sounding odd.

---

## 2. Voice map

| Code | Who | Performance |
|---|---|---|
| **V1** | Rahul, in his room | Natural, close, sleepy at first, increasingly frightened. Whispers where marked. |
| **V2** | The caller ("Rahul from 10 minutes later") | Calm, urgent whisper; knows everything. Almost kind at the end. |
| **V3** | The voice behind the door | **Unnaturally calm and flat**, slow, with no emotion. It should sound *almost* right. |

---

## 3. Lines to generate

> **Max length** = the longest the clip can be, measured from first word to last word, so it fits before the next line or cut.

| File name | Time in reel | Max length | Speaker / direction | Paste into ElevenLabs |
|---|---|---|---|---|
| `line_01_V1.mp3` | 00:00.4 | **3.8 s** | V1: inner voice over the hook, a disbelieving whisper | `[whispers] রাত দুটো সতেরো... আর ফোনটা আসছে আমারই নম্বর থেকে!` |
| `line_02_V1.mp3` | 00:08.0 | **1.9 s** | V1: just woken, groggy, annoyed | `[sleepy] কে রে... এত রাতে?` |
| `line_03_V1.mp3` | 00:10.0 | **2.4 s** | V1: confused, slowing down as he reads the number | `[confused] এটা তো... আমারই নম্বর!` |
| `line_04_V1.mp3` | 00:12.5 | **1.0 s** | V1: cautious answer | `[hesitant] হ্যালো?` |
| `line_05_V2.mp3` | 00:13.6 | **4.5 s** | V2: calm whisper, reassuring, slightly eerie | `[whispers] রাহুল... ভয় পাস না। আমি রাহুল। দশ মিনিট পরের রাহুল।` |
| `line_06_V1.mp3` | 00:18.3 | **2.5 s** | V1: nervous half-laugh, trying to sound brave | `[nervous laugh] ধুর! ইয়ার্কি মারছিস? কে বলছিস বল তো?` |
| `line_07_V2.mp3` | 00:20.9 | **3.8 s** | V2: urgent, low | `[urgent whisper] সময় নেই রে। ঘড়িটা দেখ... দুটো সতেরো, তাই তো?` |
| `line_08_V2.mp3` | 00:24.8 | **6.4 s** | V2: serious warning, deliberate, pause before the last phrase | `[serious, low voice] শোন মন দিয়ে। জানলাটা একদম খুলবি না। বাইরে একজন দাঁড়িয়ে আছে... হুবহু তোর মতো দেখতে।` |
| `line_09_V1.mp3` | 00:32.6 | **2.0 s** | V1: whisper to himself, trying to calm down | `[whispers] কেউ নেই তো... কলাগাছের ছায়া।` |
| `line_10_V2.mp3` | 00:34.7 | **2.9 s** | V2: very soft, chilling | `[whispers softly] তাকাস না রে... ও... ও তোকে দেখছে।` |
| `line_11_V1.mp3` | 00:40.2 | **2.1 s** | V1: panicked, the call has dropped | `[panicked] হ্যালো? হ্যালো!` |
| `line_12_V3.mp3` | 00:47.6 | **7.0 s** | V3: flat, calm, slow, emotionless. *Too* calm. | `[calm, flat, emotionless] রাহুল... দরজাটা খোল। আমি রে, আমি। বাইরে খুব বৃষ্টি... ভেতরে আসতে দে।` |
| `line_13_V1.mp3` | 00:55.6 | **1.7 s** | V1: barely audible, stammering with fear | `[terrified whisper] তু... তুমি... কে?` |
| `line_14_V3.mp3` | 00:57.4 | **1.5 s** | V3: instant, flat | `[flat] আমি রাহুল।` |
| `line_15_V1.mp3` | 01:01.6 | **1.4 s** | V1: gasping, answering fast | `[gasping] হ্যালো!` |
| `line_16_V2.mp3` | 01:04.2 | **6.8 s** | V2: sharp on the first words, then low and fast | `[urgent] খুলিস না! [low voice] দরজার ওপারে যে আছে... ও রাহুল না। ও শুধু তোর গলাটা চুরি করেছে।` |
| `line_17_V1.mp3` | 01:12.6 | **3.6 s** | V1: shaking, voice cracking | `[scared, trembling] তাহলে তুমি কোথায়? কোথা থেকে ফোন করছো?` |
| `line_18_V2.mp3` | 01:16.4 | **5.6 s** | V2: soft, intimate, almost kind. The last words very close and quiet. | `[softly] আমি? আমি তো তোর ঘরেই আছি, রাহুল... অনেকক্ষণ ধরে। [whispers] তোর ঠিক পেছনে।` |
| `line_19_V1.mp3` | 01:26.0 | **1.0 s** | V1: choked gasp of terror, no words *(optional; I'll keep the synthesized gasp if you skip it)* | `[gasps in terror] হহ্‌...` |
| `line_20_V1.mp3` | 01:27.3 | **2.2 s** | V1 + V2 together: slow, haunting whisper *(generate once; I double it into the two-voice unison)* | `[whispers slowly] তাহলে... আসল রাহুল কে?` |

**Total: 20 clips** (19 lines + 1 gasp), about 60 seconds of speech.

---

## 4. Plain copy-paste list (same text, in order)

```
line_01_V1  [whispers] রাত দুটো সতেরো... আর ফোনটা আসছে আমারই নম্বর থেকে!
line_02_V1  [sleepy] কে রে... এত রাতে?
line_03_V1  [confused] এটা তো... আমারই নম্বর!
line_04_V1  [hesitant] হ্যালো?
line_05_V2  [whispers] রাহুল... ভয় পাস না। আমি রাহুল। দশ মিনিট পরের রাহুল।
line_06_V1  [nervous laugh] ধুর! ইয়ার্কি মারছিস? কে বলছিস বল তো?
line_07_V2  [urgent whisper] সময় নেই রে। ঘড়িটা দেখ... দুটো সতেরো, তাই তো?
line_08_V2  [serious, low voice] শোন মন দিয়ে। জানলাটা একদম খুলবি না। বাইরে একজন দাঁড়িয়ে আছে... হুবহু তোর মতো দেখতে।
line_09_V1  [whispers] কেউ নেই তো... কলাগাছের ছায়া।
line_10_V2  [whispers softly] তাকাস না রে... ও... ও তোকে দেখছে।
line_11_V1  [panicked] হ্যালো? হ্যালো!
line_12_V3  [calm, flat, emotionless] রাহুল... দরজাটা খোল। আমি রে, আমি। বাইরে খুব বৃষ্টি... ভেতরে আসতে দে।
line_13_V1  [terrified whisper] তু... তুমি... কে?
line_14_V3  [flat] আমি রাহুল।
line_15_V1  [gasping] হ্যালো!
line_16_V2  [urgent] খুলিস না! [low voice] দরজার ওপারে যে আছে... ও রাহুল না। ও শুধু তোর গলাটা চুরি করেছে।
line_17_V1  [scared, trembling] তাহলে তুমি কোথায়? কোথা থেকে ফোন করছো?
line_18_V2  [softly] আমি? আমি তো তোর ঘরেই আছি, রাহুল... অনেকক্ষণ ধরে। [whispers] তোর ঠিক পেছনে।
line_19_V1  [gasps in terror] হহ্‌...
line_20_V1  [whispers slowly] তাহলে... আসল রাহুল কে?
```

---

## 5. Sending the files back

1. Download each take and rename it **exactly** as in the File name column (`line_01_V1.mp3` … `line_20_V1.mp3`; `.wav` is fine too).
2. Upload them all to this chat, loose or in one `.zip`.
3. I will then:
   - trim the silence and level each clip
   - apply the treatments: V2 phone filter, V3 muffled door, line 18 moving from the phone to behind Rahul, line 20 doubled into the V1 + V2 unison
   - fit any clip that runs a little long to its slot
   - mix the clips over the sound bed, dipping the music under the dialogue
   - retime the burned-in subtitles to your takes and re-render `animatic.mp4` at 90.0 s, 9:16, Reels/Shorts loudness

If any line is missing, I'll keep the current scratch voice for that line, so the video always stays complete.
