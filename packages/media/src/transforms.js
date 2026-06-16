export function buildVerticalVideoRecipe({
  mode = 'crop',
  width = 1080,
  height = 1920,
  addBlurredBackground = false,
  watermarkText = ''
} = {}) {
  return {
    type: 'vertical-video',
    mode,
    width,
    height,
    addBlurredBackground,
    watermarkText
  };
}

export function buildCaptionRecipe({ caption = '', hashtags = [], maxCharacters = 2200 } = {}) {
  const tagText = hashtags.map((tag) => (String(tag).startsWith('#') ? tag : `#${tag}`)).join(' ');
  const text = [caption, tagText].filter(Boolean).join('\n\n');
  return {
    type: 'caption',
    text: text.slice(0, maxCharacters),
    maxCharacters
  };
}
