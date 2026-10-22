import { generateStructuredResponse, isAiConfigured } from '@ship/ai';
import { LIM_IDENTITY } from './identity';
import type { ContextPack } from './types';
import { mockProposal } from './mock-provider';
import { proposalSchema } from './actions';
export interface LimModel {
  propose(content: string, context: ContextPack): Promise<unknown>;
}
export function providerStatus() {
  const mock =
    process.env.APP_ENV === 'development' &&
    ['mock', 'mock-failure'].includes(process.env.LIM_PROVIDER ?? '');
  return {
    available: mock || isAiConfigured(),
    kind: mock
      ? process.env.LIM_PROVIDER === 'mock-failure'
        ? 'development-mock-failure'
        : 'development-mock'
      : isAiConfigured()
        ? 'configured'
        : 'unavailable',
  };
}
export const runtimeModel: LimModel = {
  async propose(content, context) {
    if (
      process.env.APP_ENV === 'development' &&
      process.env.LIM_PROVIDER === 'mock-failure'
    )
      throw new Error('DEVELOPMENT_PROVIDER_FAILURE');
    if (
      process.env.APP_ENV === 'development' &&
      process.env.LIM_PROVIDER === 'mock'
    )
      return mockProposal(content, context);
    // No functions/tools are passed to the model. Only a bounded, gated context pack.
    return generateStructuredResponse(
      LIM_IDENTITY,
      [
        {
          role: 'user',
          content: JSON.stringify({ context, message: content }),
        },
      ],
      proposalSchema,
    );
  },
};
