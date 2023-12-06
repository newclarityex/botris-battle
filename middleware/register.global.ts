export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server) return;

  const { status } = useAuth();
  if (status.value !== 'authenticated') return;

  const profile = await $fetch('/api/profile').catch(() => null);
  if (!profile && to.path !== '/register') return navigateTo('/register');
  if (profile && to.path === '/register') return navigateTo('/');

  return;
});
