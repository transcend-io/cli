import { inventoryPullDocs } from '@/commands/inventory/pull/docs';

export const additionalDocumentation = {
  'transcend inventory pull': inventoryPullDocs,
  'transcend inventory push':
    '_Note: The scopes for `transcend inventory push` are the same as the scopes for `transcend inventory pull`._',
};
