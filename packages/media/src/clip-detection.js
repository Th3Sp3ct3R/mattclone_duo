function parseJsonContent(response) {
  const content = response?.choices?.[0]?.message?.content || '';
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : content);
}

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export async function detectClipCandidates({ transcript, sourceMedia = {}, llm } = {}) {
  if (!llm) throw new Error('LLM client is required for clip detection');
  const segments = transcript?.segments || [];
  if (!segments.length) return [];

  const segmentText = segments
    .map(
      (segment) =>
        `[${formatTimestamp(segment.startSeconds)} - ${formatTimestamp(segment.endSeconds)}] ${segment.text}`
    )
    .join('\n');

  const response = await llm.complete({
    temperature: 0.3,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Find 3-7 short-form video clip candidates. Return JSON: {"clips":[{"title":"","startSeconds":0,"endSeconds":0,"viralScore":0,"rationale":""}]}'
      },
      {
        role: 'user',
        content: JSON.stringify({
          source: {
            originalUrl: sourceMedia.originalUrl,
            durationSeconds: sourceMedia.durationSeconds,
            metadata: sourceMedia.metadata
          },
          transcript: segmentText
        })
      }
    ]
  });

  const parsed = parseJsonContent(response);
  return (parsed.clips || parsed.candidates || [])
    .map((clip) => ({
      title: String(clip.title || clip.hook || '').trim(),
      startSeconds: Number(clip.startSeconds ?? clip.start_sec ?? clip.start ?? 0),
      endSeconds: Number(clip.endSeconds ?? clip.end_sec ?? clip.end ?? 0),
      viralScore: Number(clip.viralScore ?? clip.virality_score ?? clip.score ?? 0),
      rationale: String(clip.rationale || clip.reasoning || '')
    }))
    .filter((clip) => clip.endSeconds > clip.startSeconds);
}
