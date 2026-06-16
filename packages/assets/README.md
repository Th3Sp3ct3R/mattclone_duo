# @julio/assets

Shared asset utilities for S3 uploads and URL building.

## What it provides
- Presigned uploads (client PUT to S3)
- Public URL construction
- Key generation for asset categories

## Usage
```js
import { createPresignedUpload } from '@julio/assets';

const { uploadUrl, publicUrl } = await createPresignedUpload({
  category: 'images',
  filename: 'cover.jpg',
  contentType: 'image/jpeg'
});
```
