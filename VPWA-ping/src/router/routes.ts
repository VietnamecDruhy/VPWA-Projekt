// src/router/routes.ts
import { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/SignPage.vue') },
      { path: 'chat', component: () => import('pages/ChatPage.vue') },
      {path: 'test', component: () => import('pages/Test.vue')},
      {path: 'main', component: () => import('components/MainContent.vue')},
    ],

  },
  {
    path: '/auth',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: 'register', name: 'register', meta: { guestOnly: true }, component: () => import('pages/SignPage.vue') },
      { path: 'login', name: 'login', meta: { guestOnly: true }, component: () => import('pages/SignPage.vue') }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
