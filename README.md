# Content System

This directory is the editorial system of record for BestKarma.

## Purpose

The website in `src/` is the presentation layer. Research, drafting, validation, publishing metadata, and media workflow assets belong here instead of inside the Astro app tree.

## Directory layout

- `research/`: research packets, source notes, interview notes, and topic briefs.
- `drafts/`: in-progress article drafts that are not ready for publishing.
- `validated/`: content that passed editorial and factual validation checks.
- `published/articles/`: publishable article markdown consumed by Astro.
- `images/`: image assets and metadata for heroes, social cards, and inline visuals.
- `social/`: rendered short videos, caption files, subtitles, and platform-ready social assets.
- `authors/`: author and reviewer profiles.
- `schemas/`: canonical content and workflow schemas.
- `prompts/`: reusable prompts for AI-assisted research and drafting.
- `pipelines/`: scripts and orchestration docs for editorial automation.
- `qa/`: checklists, review templates, and validation reports.

## Workflow states

1. `briefed`
2. `researched`
3. `drafted`
4. `validated`
5. `approved`
6. `published`

Only content in `published/articles/` should be loaded by the website.

## Distribution assets

Social and video assets should be treated as sidecar distribution packages, not as the source of editorial truth.

Recommended pattern per article:

- `review.json`: article review metadata
- `sources.json`: article source metadata
- `image.json`: hero image metadata
- `video.json`: short-form video metadata and platform packaging

The article can publish without social assets, but social assets should never publish without an approved article behind them.
