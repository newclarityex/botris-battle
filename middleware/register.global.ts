export default defineNuxtRouteMiddleware(async (to, from) => {
  return;
  const { session, status } = useAuth();

  if (!session.value?.user || status.value !== 'authenticated') return;

  const profile = await $fetch('/api/profile').catch(() => null);

  if (!profile && to.path !== '/register') return navigateTo('/register');

  if (profile && to.path === '/register') return navigateTo('/');

  return;
});
