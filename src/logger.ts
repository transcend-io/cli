import colors from 'colors';
import { bootstrap } from 'global-agent';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

export const logger = console;

// When PROXY_URL env var is specified, initiate the proxy
logger.info(
  colors.magenta(
    `Got env var process.env.http_proxy=${process.env.http_proxy}`,
  ),
);
if (process.env.http_proxy) {
  logger.info(colors.green(`Initializing proxy: ${process.env.http_proxy}`));

  // Use global-agent, which overrides `request` based requests
  process.env.GLOBAL_AGENT_HTTP_PROXY = process.env.http_proxy;
  bootstrap();

  // Use undici, which overrides `fetch` based requests
  setGlobalDispatcher(new ProxyAgent(process.env.http_proxy));
}
