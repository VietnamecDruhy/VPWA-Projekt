// src/router/routes.ts
import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    // redirect to home route
    redirect: () => ({ name: 'home' })
  },
  {
    path: '/auth',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'register',
        name: 'register',
        meta: { guestOnly: true },
        component: () => import('pages/SignPage.vue')
      },
      {
        path: 'login',
        name: 'login',
        meta: { guestOnly: true },
        component: () => import('pages/SignPage.vue')
      }
    ]
  },
  {
    path: '/channels',
    meta: { requiresAuth: true },
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('pages/ChatPage.vue')
      }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  }
];

export default routes;