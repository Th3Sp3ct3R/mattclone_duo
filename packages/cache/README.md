# @julio/cache

Common caching utilities.

## Usage
```js
import { createTtlCache } from '@julio/cache';

const cache = createTtlCache({ defaultTtlMs: 5000 });
cache.set('key', { ok: true });
```

