# @julio/storage

Unified key/value storage API with web/native adapters.

## Usage
```js
import { createStorage } from '@julio/storage';
import { createWebStorage } from '@julio/storage/web';

const storage = createStorage(createWebStorage());
await storage.set('token', 'abc');
```

