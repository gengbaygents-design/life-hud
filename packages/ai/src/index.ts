import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output, type LanguageModel, type FlexibleSchema } from 'ai';
export interface AiMessage { role: 'user' | 'assistant'; content: string }
export interface AiConfig { model?: LanguageModel; maxContextMessages?: number }
let config: AiConfig = {};
export const configureAi = (value: AiConfig) => { config = value; };
export const isAiConfigured = () => Boolean(config.model || (process.env.AI_PROVIDER === 'openai' ? process.env.OPENAI_API_KEY && process.env.AI_MODEL : (!process.env.AI_PROVIDER || process.env.AI_PROVIDER==='google') && process.env.GOOGLE_GENERATIVE_AI_API_KEY));
function configuredModel() {
  if(config.model)return config.model;
  if(!isAiConfigured())throw new Error('AI_PROVIDER_NOT_CONFIGURED');
  if(process.env.AI_PROVIDER==='openai')return createOpenAI({apiKey:process.env.OPENAI_API_KEY,baseURL:process.env.AI_BASE_URL}).chat(process.env.AI_MODEL!);
  return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })(process.env.AI_MODEL || 'gemini-2.5-flash');
}
export async function generateStructuredResponse<T>(system:string,messages:AiMessage[],schema:FlexibleSchema<T>):Promise<T> {
  const result=await generateText({model:configuredModel(),system,messages:messages.slice(-12),output:Output.object({schema}),abortSignal:AbortSignal.timeout(30_000),maxRetries:0,maxOutputTokens:4000});
  return result.output;
}
export async function generateResponse(messages: AiMessage[]): Promise<string> {
  if (!isAiConfigured()) throw new Error('AI_PROVIDER_NOT_CONFIGURED');
  const model = configuredModel();
  const result = await generateText({ model, messages: messages.slice(-(config.maxContextMessages ?? 50)), abortSignal: AbortSignal.timeout(30_000), maxRetries: 0 });
  return result.text;
}
