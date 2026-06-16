import { Router } from 'express';

import {
  listPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  listPublicPosts,
  getPublicPost,
  listAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '@julio/api/controllers/blog';

export function createBlogRouter() {
  const router = Router();

  router.get('/posts', listPosts);
  router.post('/posts', createPost);
  router.get('/posts/:id', getPost);
  router.put('/posts/:id', updatePost);
  router.delete('/posts/:id', deletePost);

  router.get('/public/posts', listPublicPosts);
  router.get('/public/posts/:slug', getPublicPost);

  router.get('/authors', listAuthors);
  router.post('/authors', createAuthor);
  router.put('/authors/:id', updateAuthor);
  router.delete('/authors/:id', deleteAuthor);

  router.get('/categories', listCategories);
  router.post('/categories', createCategory);
  router.put('/categories/:id', updateCategory);
  router.delete('/categories/:id', deleteCategory);

  return router;
}
