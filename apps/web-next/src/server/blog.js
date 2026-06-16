import { api } from '@julio/api-client';

async function fetchJson(getter) {
  try {
    return await getter();
  } catch {
    return null;
  }
}

export async function getPublicPosts() {
  const payload = await fetchJson(() => api.blog.public.getPosts());
  return payload?.posts ?? payload ?? [];
}

export async function getPublicPostBySlug(slug) {
  const payload = await fetchJson(() => api.blog.public.getPostBySlug(slug));
  return payload?.post ?? payload ?? null;
}

export async function getPublicTranslations(translationKey) {
  if (!translationKey) return [];
  const posts = await getPublicPosts();
  return posts.filter((post) => post.translationKey === translationKey);
}
