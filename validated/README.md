# Validated Content

Place content here after research, drafting, and fact validation are complete but before promotion to the live published set.

Expected structure:

```text
validated/
  articles/
    example-article.md
  example-article.bundle/
    sources.json
    review.json
    image.json
```

Use `npm run content:validate -- validated` before promotion.
Use `npm run content:promote -- <slug>` to copy a validated bundle into `published/`.
