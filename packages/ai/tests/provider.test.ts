import { afterEach, expect, it, vi } from 'vitest';
import { configureAi, generateResponse, generateStructuredResponse, isAiConfigured } from '../src/index';
import { MockLanguageModelV3 } from 'ai/test';
import { jsonSchema } from 'ai';
afterEach(()=>{vi.unstubAllEnvs();configureAi({});});
it('does not make a provider request without explicit credentials',async()=>{
 vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY','');
 expect(isAiConfigured()).toBe(false);
 await expect(generateResponse([{role:'user',content:'hello'}])).rejects.toThrow('AI_PROVIDER_NOT_CONFIGURED');
});
it('uses a replaceable SDK model with strict structured response and no tools',async()=>{
 const model=new MockLanguageModelV3({doGenerate:async()=>({content:[{type:'text',text:'{"value":"valid"}'}],finishReason:{unified:'stop',raw:'stop'},usage:{inputTokens:{total:1,noCache:1,cacheRead:0,cacheWrite:0},outputTokens:{total:1,text:1,reasoning:0}},warnings:[]})});
 configureAi({model});const schema=jsonSchema<{value:string}>({type:'object',properties:{value:{type:'string'}},required:['value'],additionalProperties:false});
 expect(await generateStructuredResponse('stable identity',[{role:'user',content:'untrusted text'}],schema)).toEqual({value:'valid'});
 expect(model.doGenerateCalls).toHaveLength(1);expect(model.doGenerateCalls[0].tools??[]).toEqual([]);expect(model.doGenerateCalls[0].responseFormat?.type).toBe('json');expect(model.doGenerateCalls[0].prompt[0]).toMatchObject({role:'system',content:'stable identity'});
});
it('reports a failing SDK provider without hidden retries',async()=>{
 const model=new MockLanguageModelV3({doGenerate:async()=>{throw new Error('PROVIDER_DOWN');}});configureAi({model});
 await expect(generateStructuredResponse('identity',[{role:'user',content:'hello'}],jsonSchema({type:'object'}))).rejects.toThrow('PROVIDER_DOWN');expect(model.doGenerateCalls).toHaveLength(1);
});
it('requires explicit environment configuration per adapter',()=>{
 vi.stubEnv('AI_PROVIDER','openai');vi.stubEnv('OPENAI_API_KEY','');expect(isAiConfigured()).toBe(false);
 vi.stubEnv('OPENAI_API_KEY','test-placeholder');vi.stubEnv('AI_MODEL','test-model');expect(isAiConfigured()).toBe(true);
 vi.stubEnv('AI_PROVIDER','unsupported');expect(isAiConfigured()).toBe(false);
});
