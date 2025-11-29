# Why I Reach for the mime Library

Whenever I catch myself about to manually enumerate MIME types or file extensions, I stop and reach for the `mime` library instead.

I've done the manual thing before. You start with a handful of types, then edge cases creep in. Someone sends an m4a file. Someone else uses webm. Before you know it you're maintaining a list that's always slightly wrong.

The `mime` package already has 800+ types mapped. It's lightweight, zero runtime dependencies, and it's been battle-tested across millions of projects. I just don't want to manage my own MIME types when someone else has already done it better.

```bash
bun add mime
```

That's it. That's the article.
