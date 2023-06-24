import colors from 'colors';

export const logger = console;

// When PROXY_URL env var is specified, initiate the proxy
if (process.env.PROXY_URL) {
  const proxyUrl = new URL(process.env.PROXY_URL);
  const port = proxyUrl.port || 80;
  const { host } = proxyUrl;
  logger.info(
    colors.magenta(`Setting up a proxy to host: ${host} and port: ${port}`),
  );
  // eslint-disable-next-line global-require
  require('global-tunnel').initialize({
    host,
    port,
  });
}
