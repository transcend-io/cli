import colors from 'colors';

export const logger = console;

// When PROXY_URL env var is specified, initiate the proxy
logger.info(
  colors.magenta(
    `Got env var process.env.http_proxy=${process.env.http_proxy}`,
  ),
);
if (process.env.http_proxy) {
  logger.info(colors.green(`Initializing proxy: ${process.env.http_proxy}`));

  // eslint-disable-next-line global-require
  require('global-tunnel-ng').initialize();
}
