import { EnginePost } from './engine-post.model.js';

test('accepts YouTube Shorts posts', () => {
  const post = new EnginePost({
    platform: 'youtube',
    accountId: '507f1f77bcf86cd799439011',
    media: { sourceUrl: 'https://example.com/video.mp4' },
    postType: 'short'
  });

  expect(post.validateSync()).toBeUndefined();
});
