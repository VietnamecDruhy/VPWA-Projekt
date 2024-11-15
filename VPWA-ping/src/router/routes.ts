import { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/SignPage.vue') },
      { path: 'chat', component: () => import('pages/ChatPage.vue') },
      {
        path: 'test-connection',
        component: () => import('pages/TestConnection.vue')
      }
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
    path: '/channels',
    // channels requires auth
    meta: { requiresAuth: true },
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('src/pages/ChatPage.vue') }
    ]
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
