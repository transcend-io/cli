import type { LocalContext } from '../../../context';

interface PushCommandFlags {
  auth: string;
  file: string;
  transcendUrl: string;
  pageSize: number;
  variables?: string;
  classifyService: boolean;
  deleteExtraAttributeValues: boolean;
}

export function push(this: LocalContext, flags: PushCommandFlags): void {
  console.log('Push command started...');
  console.log('Flags:', flags);
  throw new Error('Command not yet implemented');
}
