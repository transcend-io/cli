import colors from 'colors';
import { bootstrap } from 'global-agent';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import yargs from 'yargs-parser';

export const logger = console;

// When the proxy env var of flag is specified, initiate the proxy
const { httpProxy = process.env.http_proxy } = yargs(process.argv.slice(2));
logger.info(colors.magenta(`Got httpProxy parameter of '${httpProxy}'`));
if (httpProxy) {
  logger.info(colors.green(`Initializing proxy: ${httpProxy}`));

  // Use global-agent, which overrides `request` based requests
  process.env.GLOBAL_AGENT_HTTP_PROXY = httpProxy;
  bootstrap();

  // Use undici, which overrides `fetch` based requests
  setGlobalDispatcher(new ProxyAgent(httpProxy));
}
