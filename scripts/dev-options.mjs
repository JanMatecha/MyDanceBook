export function getDevelopmentScripts(arguments_) {
  const lanMode = arguments_.includes('--lan');

  return {
    serverScript: 'dev:server',
    frontendScript: lanMode ? 'dev:frontend:lan' : 'dev:frontend',
  };
}
