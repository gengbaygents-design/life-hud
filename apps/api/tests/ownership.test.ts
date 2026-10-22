import { beforeEach, describe, expect, it, vi } from 'vitest';
import { call } from '@orpc/server';
const mocks=vi.hoisted(()=>({insert:vi.fn(),find:vi.fn(),sign:vi.fn(),remove:vi.fn(),generate:vi.fn(),configured:vi.fn()}));
vi.mock('@/db',()=>({default:{aiChats:{insertOne:mocks.insert,findFirst:mocks.find},aiMessages:{insertOne:vi.fn()}}}));
vi.mock('@ship/cloud-storage',()=>({cloudStorageService:{getSignedDownloadUrl:mocks.sign,deleteObject:mocks.remove}}));
vi.mock('@ship/ai',()=>({generateResponse:mocks.generate,isAiConfigured:mocks.configured}));
import createChat from '../src/resources/ai-chats/endpoints/create';
import getMessages from '../src/resources/ai-chats/endpoints/get-messages';
import sendMessage from '../src/resources/ai-chats/endpoints/send-message';
import getUrl from '../src/resources/files/endpoints/get-url';
import removeFile from '../src/resources/files/endpoints/remove';
import { assertOwnedKey } from '../src/resources/files/middlewares/owned-key';
const context={user:{id:'owner-a'},headers:{},secure:false} as never;
const uuid='71243b24-de5d-4d02-bc01-0c7b87995a43';
beforeEach(()=>{vi.clearAllMocks();mocks.find.mockResolvedValue(null);});
describe('server-side ownership gates',()=>{
 it('rejects unauthenticated callers before a database write',async()=>{
  await expect(call(createChat,{title:'private'},{context:{headers:{},secure:false} as never})).rejects.toMatchObject({code:'UNAUTHORIZED'});expect(mocks.insert).not.toHaveBeenCalled();
 });
 it('derives chat owner from authenticated context even if a client forges userId',async()=>{
  mocks.insert.mockResolvedValue({id:uuid,title:'private',createdAt:new Date()});
  await call(createChat,{title:'private',userId:'victim'} as never,{context});
  expect(mocks.insert).toHaveBeenCalledWith({userId:'owner-a',title:'private'});
 });
 it('uses the same NOT_FOUND for foreign and missing conversations',async()=>{
  for(const id of [uuid,'00000000-0000-4000-8000-000000000000'])await expect(call(getMessages,{chatId:id},{context})).rejects.toMatchObject({code:'NOT_FOUND'});
  expect(mocks.find).toHaveBeenCalledWith({where:{id:uuid,userId:'owner-a',deletedAt:null}});
 });
 it('does not sign foreign, traversal or malformed storage keys',async()=>{
  for(const key of ['users/owner-b/'+uuid,'users/owner-a/../owner-b/'+uuid,'users/owner-a/'+uuid+'/extra']){
   await expect(call(getUrl,{key},{context})).rejects.toMatchObject({code:'NOT_FOUND'});
  }expect(mocks.sign).not.toHaveBeenCalled();
 });
 it('accepts only an exact key in the authenticated namespace',()=>{
  expect(assertOwnedKey('owner-a','users/owner-a/'+uuid)).toBe('users/owner-a/'+uuid);
 });
 it('requires explicit confirmation before destructive storage access',async()=>{
  for(const input of [{key:'users/owner-a/'+uuid},{key:'users/owner-a/'+uuid,confirm:false}])await expect(call(removeFile,input as never,{context})).rejects.toMatchObject({code:'BAD_REQUEST'});
  expect(mocks.remove).not.toHaveBeenCalled();
 });
 it('fails cleanly before AI persistence when provider credentials are absent',async()=>{
  mocks.find.mockResolvedValue({id:uuid,userId:'owner-a'});mocks.configured.mockReturnValue(false);
  await expect(call(sendMessage,{chatId:uuid,content:'hello'},{context})).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});expect(mocks.generate).not.toHaveBeenCalled();
 });
});
