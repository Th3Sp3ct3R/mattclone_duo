let pipelinePromise = null;

async function getExtractor(model) {
  if (!pipelinePromise) {
    pipelinePromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', model || 'Xenova/all-MiniLM-L6-v2')
    );
  }
  return pipelinePromise;
}

export async function embedText(text, { model = 'Xenova/all-MiniLM-L6-v2' } = {}) {
  const extractor = await getExtractor(model);
  const output = await extractor(String(text || ''), { pooling: 'mean', normalize: true });
  return Array.from(output.data || []);
}

export function chunkTranscriptSegments(segments = [], { chunkSize = 5, minChars = 20 } = {}) {
  const chunks = [];
  for (let index = 0; index < segments.length; index += chunkSize) {
    const slice = segments.slice(index, index + chunkSize);
    const text = slice.map((segment) => segment.text).filter(Boolean).join(' ').trim();
    if (text.length < minChars) continue;
    chunks.push({
      text,
      startSeconds: slice[0]?.startSeconds ?? null,
      endSeconds: slice[slice.length - 1]?.endSeconds ?? null
    });
  }
  return chunks;
}
