/* Einsteinminds protected-route guard.
 * Runs after index.html declares Auth, Nav and Gate, before DOMContentLoaded.
 */
(() => {
  if (Auth.__routeGuardInstalled) return;
  Auth.__routeGuardInstalled = true;
  Auth.ready = false;

  const privateRoutes = new Set([
    'agent', 'mylearning', 'portfolio', 'assessments', 'wellbeing',
    'screentime', 'educator', 'parent', 'institutions', 'settings'
  ]);

  const originalInit = Auth.init.bind(Auth);
  Auth.init = async function () {
    this.ready = false;
    try {
      await originalInit();
    } catch (error) {
      Toast.show('Account session could not be restored. Please reload and try again.', 'bad');
      console.error('Einsteinminds Auth initialization failed:', error);
    } finally {
      this.ready = true;
      Nav.render();
    }
  };

  const originalGo = Nav.go.bind(Nav);
  Nav.go = function (route) {
    if (privateRoutes.has(route)) {
      if (!Auth.ready) {
        Toast.show('Checking your secure account session. Please try again in a moment.', 'warn');
        return;
      }
      if (!Auth.backendReady || !Auth.signedIn) {
        Auth.open('in');
        Toast.show('Please sign in to access this area.', 'warn');
        return;
      }
    }
    return originalGo(route);
  };

  const originalRequire = Gate.require.bind(Gate);
  Gate.require = function (action) {
    if (!Auth.ready) {
      Toast.show('Checking your secure account session. Please try again in a moment.', 'warn');
      return false;
    }
    return originalRequire(action);
  };
})();
