# BestKarma Short-Form Video Pipeline

Date: March 29, 2026
Purpose: define how BestKarma can generate, review, render, and publish short-form video clips for Instagram, Facebook, TikTok, and YouTube without weakening editorial trust.

## Why Add This

BestKarma already has a strong article pipeline:

- draft
- edit
- validate
- publish

What is missing is a repeatable distribution layer.

Short-form video should be added as a sidecar pipeline, similar to hero image generation, not as part of the article truth model itself.

## Recommended Principle

Article publishing is the primary system.
Video generation is the packaging layer.

That means:

- an article may publish without a short video
- a short video may not publish without an approved article

## Where The New Step Belongs

Recommended flow:

1. Draft article
2. Validate article
3. Create `video.json` package from the approved article
4. Review the social/video package for claim safety and hook quality
5. Render video assets
6. Schedule or publish to platforms

In other words:

`draft -> validated article -> video package -> video review -> render -> post`

## Do Not Make Video A Hard Publish Gate

Short-form clips should not block article publishing.

Reasons:

- social hooks need different review criteria than articles
- platform posting often depends on API credentials and scheduling tools
- some articles are worth publishing even if they do not warrant a short video
- a failed render should not stop the article from going live

## New Metadata

For each article, add:

- `validated/<slug>.bundle/video.json`
- optionally `published/<slug>.bundle/video.json`

Use [content-system/qa/video-template.json](/Users/pareshchauhan/ai/projects/bestkarma/content-system/qa/video-template.json) as the base template.

## New Asset Directory

Add a media location for generated assets:

```text
content-system/social/
  /shorts/
    /<slug>/
      video.json
      master-script.txt
      instagram-caption.txt
      facebook-caption.txt
      tiktok-caption.txt
      youtube-caption.txt
      subtitles.srt
      cover.jpg
      short.mp4
```

You can keep `video.json` inside the article bundle and place rendered media under `social/shorts/<slug>/`.

## New Pipeline Scripts

Recommended new scripts:

### 1. `pipelines/generate-social-video-brief.mjs`

Input:

- approved article markdown
- article frontmatter
- bundle metadata

Output:

- `video.json`
- master script
- platform-specific captions

Responsibilities:

- extract the most viral-safe hook
- produce one practical angle
- preserve the article’s key caveat
- generate platform-specific titles and captions

### 2. `pipelines/render-short-video.mjs`

Input:

- reviewed `video.json`
- cover text
- subtitles
- optional voiceover or host track

Output:

- `short.mp4`
- `subtitles.srt`
- `cover.jpg`

This should use a templated rendering system, not arbitrary generative video at first.

Current implementation direction:

- render a branded vertical video from the approved script
- use timed text cards and subtitles
- output `short.mp4`, `subtitles.srt`, `cover.jpg`, and `render-plan.json`
- allow `FFMPEG_BIN` override for environments where `ffmpeg` is not on the default `PATH`

## Local Runtime Notes

If Node is installed outside the default shell `PATH`, you can run the scripts with:

```bash
/usr/local/bin/node pipelines/generate-social-video-brief.mjs <slug>
/usr/local/bin/node pipelines/review-social-video.mjs <slug> approved <reviewer> "Looks good."
/usr/local/bin/node pipelines/render-short-video.mjs <slug>
```

If `ffmpeg` is installed in a non-standard location, set:

```bash
export FFMPEG_BIN="/path/to/ffmpeg"
```

### 3. `pipelines/publish-social-assets.mjs`

Input:

- reviewed and rendered asset package
- platform credentials

Output:

- scheduled or published posts
- populated `publishedUrl`
- posting timestamps in metadata

## Recommended Workflow File

Add:

`content-system/.github/workflows/agent-social-video.yml`

Also add:

`content-system/.github/workflows/render-social-video.yml`

Suggested trigger:

- on push to `validated/articles/**.md`
- or on workflow dispatch for one slug

Suggested jobs:

1. detect validated articles missing `video.json`
2. run `generate-social-video-brief.mjs`
3. commit generated social packages
4. optionally trigger render workflow

## Review Layer

You need a social QA step before rendering or posting.

Review questions:

- Is the hook still true?
- Did the video become more certain than the article?
- Is the practical advice appropriately scoped?
- Does the clip preserve at least one useful caveat?
- Does the script sound like BestKarma rather than generic wellness hype?

This should be added to the existing checklist in [content-system/qa/publish-checklist.md](/Users/pareshchauhan/ai/projects/bestkarma/content-system/qa/publish-checklist.md).

## Suggested Status Model

For `video.json`, use these statuses:

- `drafted`
- `needs-review`
- `approved`
- `rendered`
- `scheduled`
- `published`

These statuses are for the social asset only, not the article.

## Platform Strategy

Use one master script and then adapt per platform.

### Instagram

- best for save-worthy carousels and Reels
- stronger cover-title design matters

### Facebook

- broader phrasing
- practical and relatable framing performs best

### TikTok

- fastest, most conversational hook
- strongest for myth-busting and emotional relevance

### YouTube Shorts

- stronger title structure
- best for evergreen search-discovery topics

Do not publish one identical caption to all four platforms.

## Editorial Safety Rules

Never auto-post a generated short video without a human approval step for health content.

Specific risks:

- oversimplifying caveats
- overclaiming study results
- creating fear-driven hooks
- implying treatment advice
- making platform-specific claims that drift from the article

BestKarma’s edge is trust. Short-form should amplify that trust, not trade it away.

## Recommended Rollout

### Phase 1

Create social packages only.

Deliverables:

- `video.json`
- script
- captions
- titles

No rendering, no posting yet.

### Phase 2

Render templated vertical videos.

Deliverables:

- `mp4`
- subtitles
- cover image

Still require human review before posting.

This is now the recommended first render system because it is deterministic, cheap, and easier to QA than generative video.

### Phase 3

Add scheduling or publishing support for approved assets.

Possible integrations later:

- Meta publishing workflow
- TikTok scheduling tool or third-party scheduler
- YouTube API for Shorts metadata and publishing

## Best First Use Cases

Start with topics that already have strong short-form hooks:

- alcohol and sleep
- CBT-I
- adenosine and caffeine
- perimenopause basics
- bone density in women
- ApoB
- protein after 40
- vagus nerve
- loneliness and health
- willpower and behavior design

## Bottom Line

Yes, BestKarma should add short-form video to the publication pipeline.

But the correct implementation is:

- sidecar metadata
- separate social QA
- optional render step
- human-approved publishing

That gives you a scalable distribution engine without compromising the article workflow that is already working.
