# BestKarma Short-Video Testing Script

Date: March 29, 2026
Purpose: manually test the short-video pipeline on 5 articles before adding direct platform API automation.

## Goal

Confirm that the pipeline can reliably:

1. generate a usable short-video package
2. preserve factual accuracy and tone
3. render a publishable short video
4. produce usable platform payloads
5. support a manual posting workflow without major rewrites

## Test Articles

Run this script on these 5 slugs:

- `alcohol-rem-sleep-suppression`
- `cbt-i-insomnia-treatment`
- `perimenopause-explained-hormonal-changes`
- `apob-cardiovascular-risk-longevity`
- `vagus-nerve-polyvagal`

## Before You Start

Open a terminal and go to the content repo:

```bash
cd /Users/pareshchauhan/ai/projects/bestkarma/content-system
```

Set the required environment variables:

```bash
export OPENAI_API_KEY=your_key_here
export FFMPEG_BIN="/usr/local/opt/ffmpeg-full/bin/ffmpeg"
```

If you are still using the fallback ffmpeg build, you can use:

```bash
export FFMPEG_BIN="/usr/local/bin/ffmpeg"
```

## Test Loop

Repeat the following steps for each slug.

Use the article slug in place of `<slug>`.

---

## Step 1: Generate The Video Package

Run:

```bash
/usr/local/bin/node pipelines/generate-social-video-brief.mjs <slug>
```

Expected outputs:

- `validated/<slug>.bundle/video.json` or `published/<slug>.bundle/video.json`
- `social/shorts/<slug>/master-script.txt`
- `social/shorts/<slug>/instagram-caption.txt`
- `social/shorts/<slug>/facebook-caption.txt`
- `social/shorts/<slug>/tiktok-caption.txt`
- `social/shorts/<slug>/youtube-caption.txt`

Check:

- Was the file created?
- Does the hook feel strong?
- Does the topic angle match the article?

If generation fails:

- stop and note the error
- do not continue to the next step for that slug

---

## Step 2: Review The Package Manually

Open:

- `video.json`
- `master-script.txt`
- the source article

Review these items:

1. Hook
   - Is it attention-grabbing?
   - Is it still true?
   - Is it too dramatic?

2. Script
   - Does it preserve the article’s central idea?
   - Does it oversimplify a caveat?
   - Would you feel comfortable posting it as BestKarma?

3. Captions
   - Do they sound platform-appropriate?
   - Do they sound like BestKarma?

4. Compliance
   - No diagnosis language
   - No miracle framing
   - No stronger claim than the article

Decision:

- if acceptable, approve it
- if not acceptable, note what needs revision

Approve command:

```bash
/usr/local/bin/node pipelines/review-social-video.mjs <slug> approved paresh "Accurate and ready for test render."
```

Needs revision command:

```bash
/usr/local/bin/node pipelines/review-social-video.mjs <slug> needs-revision paresh "Hook is too strong; preserve the caveat about mixed evidence."
```

Only continue if the package is approved.

---

## Step 3: Render The Video

Run:

```bash
FFMPEG_BIN="$FFMPEG_BIN" /usr/local/bin/node pipelines/render-short-video.mjs <slug>
```

Expected outputs:

- `social/shorts/<slug>/short.mp4`
- `social/shorts/<slug>/cover.jpg`
- `social/shorts/<slug>/subtitles.srt`
- `social/shorts/<slug>/render-plan.json`

Check:

- Does the video render successfully?
- Does `video.json` update to `status: rendered`?
- Are `renderAssets` paths filled in?

If the render fails:

- note the error
- do not continue to Step 4

---

## Step 4: Watch The Video End To End

Open the rendered file and watch it fully.

Check:

1. First 2 seconds
   - Does it feel like a real hook?
   - Would this stop a scroll?

2. Message clarity
   - Is the main point obvious?
   - Is the pacing too fast or too slow?

3. Visual quality
   - Does it feel publishable?
   - Does it look like BestKarma?
   - Does it feel too generic?

4. Audio readiness
   - If no voiceover is present, is the text/structure still enough?

5. Subtitle readiness
   - Does the subtitle file align with the intended beats?

Pass if:

- you would be comfortable posting it after minor polish only

Fail if:

- it needs major rewriting or redesign

---

## Step 5: Export Publish Payloads

Run:

```bash
/usr/local/bin/node pipelines/publish-social-assets.mjs <slug>
```

Expected outputs:

- `social/shorts/<slug>/publish/instagram-payload.json`
- `social/shorts/<slug>/publish/facebook-payload.json`
- `social/shorts/<slug>/publish/tiktok-payload.json`
- `social/shorts/<slug>/publish/youtube-payload.json`

Check:

- Does each payload include title, caption, hashtags, and asset paths?
- Would these be usable by a human or scheduler without more work?

---

## Step 6: Simulate Scheduling

Pick one platform, ideally Instagram.

Run:

```bash
/usr/local/bin/node pipelines/publish-social-assets.mjs <slug> --platform instagram --action schedule --at 2026-03-31T14:00:00Z
```

Check in `video.json`:

- `posting.instagram.status` becomes `scheduled`
- `posting.instagram.scheduledFor` is populated

This confirms metadata is flowing correctly.

---

## Step 7: Manual Post Test

For 1 or 2 of the 5 videos, do a real manual post or private upload test on one platform.

Recommended first platform:

- Instagram Reels

What to use:

- `short.mp4`
- `cover.jpg`
- platform caption from `publish/`

Check:

- Does the cover work in-feed?
- Does the caption need major rewriting?
- Does the post feel too dense or too light?
- Does it feel on-brand once it is actually in the platform UI?

---

## Step 8: Score The Result

For each slug, give a score from 1 to 5 on:

- Hook strength
- Accuracy
- Clarity
- Brand fit
- Visual quality
- Caption quality
- Manual post readiness

Use this template:

```text
Slug:
Hook strength:
Accuracy:
Clarity:
Brand fit:
Visual quality:
Caption quality:
Manual post readiness:
Notes:
```

---

## Step 9: Decide Pass Or Fail

Mark each slug:

- `Pass`
- `Pass with edits`
- `Fail`

Guidance:

- `Pass`: would post with little or no rewriting
- `Pass with edits`: concept works, but needs prompt or render tuning
- `Fail`: too much manual intervention required

---

## Step 10: Final Sprint Decision

After all 5 slugs are tested:

Count:

- how many passed
- how many passed with edits
- how many failed

Decision rule:

- 4 or 5 passes: move toward more automation
- 2 or 3 passes: refine prompts/rendering and rerun
- 0 or 1 pass: stop and redesign before adding platform APIs

## Quick Command Reference

Generate:

```bash
/usr/local/bin/node pipelines/generate-social-video-brief.mjs <slug>
```

Approve:

```bash
/usr/local/bin/node pipelines/review-social-video.mjs <slug> approved paresh "Ready for render."
```

Needs revision:

```bash
/usr/local/bin/node pipelines/review-social-video.mjs <slug> needs-revision paresh "Needs a less aggressive hook."
```

Render:

```bash
FFMPEG_BIN="$FFMPEG_BIN" /usr/local/bin/node pipelines/render-short-video.mjs <slug>
```

Export payloads:

```bash
/usr/local/bin/node pipelines/publish-social-assets.mjs <slug>
```

Schedule metadata:

```bash
/usr/local/bin/node pipelines/publish-social-assets.mjs <slug> --platform instagram --action schedule --at 2026-03-31T14:00:00Z
```

## Success Definition

This sprint is successful if you finish with:

- 5 tested video packages
- at least 4 usable rendered outputs
- a clear sense of what prompt or render changes are needed
- enough confidence to decide whether direct API posting is worth building next
