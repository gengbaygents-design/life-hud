import { createHash } from 'node:crypto';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';
import { rawDb } from '@/db';
import { aiChats } from '../ai-chats/ai-chats.schema';
import { aiMessages } from '../ai-chats/ai-messages.schema';
import { actionExecutions, actionGroups } from './lim.schema';
import { conflict, notFound, recordChange } from '../core-methods';
import {
  turnInputSchema,
  turnIdSchema,
  conversationOutputSchema,
  turnOutputSchema,
} from './contract';
import { buildContext,resolveUiSource } from './context';
import { getHome } from '../home/methods';
import { isAttentionQuestion,attentionReply } from '../home/lim-recommendation';
import { proposalSchema, parseAction, actionRisk } from './actions';
import {
  executeAction,
  validateAuthority,
  safeFailure,
  newUndoToken,
} from './executor';
import { runtimeModel, type LimModel } from './provider';
import { normalizeInput, invalidClock, detectMode } from './intent';
import type { ActionResult, LimTrace } from './types';

async function ownedConversation(ownerId: string, id: string) {
  const [row] = await rawDb
    .select()
    .from(aiChats)
    .where(
      and(
        eq(aiChats.id, id),
        eq(aiChats.userId, ownerId),
        eq(aiChats.kind, 'LIM'),
        isNull(aiChats.deletedAt),
      ),
    );
  if (!row) throw notFound();
  return row;
}
export async function createConversation(ownerId: string) {
  const [row] = await rawDb
    .insert(aiChats)
    .values({ userId: ownerId, title: '与 Lim 的对话', kind: 'LIM' })
    .returning();
  return { id: row.id, title: row.title };
}
export async function listConversations(ownerId: string) {
  return rawDb
    .select({ id: aiChats.id, title: aiChats.title })
    .from(aiChats)
    .where(
      and(
        eq(aiChats.userId, ownerId),
        eq(aiChats.kind, 'LIM'),
        isNull(aiChats.deletedAt),
      ),
    )
    .orderBy(desc(aiChats.updatedAt))
    .limit(30);
}
export async function getTurn(ownerId: string, input: unknown) {
  const { id } = turnIdSchema.parse(input);
  await recoverStaleTurn(ownerId, id);
  const [group] = await rawDb
    .select()
    .from(actionGroups)
    .where(and(eq(actionGroups.id, id), eq(actionGroups.ownerId, ownerId)));
  if (!group) throw notFound();
  const actions = await rawDb
    .select({
      type: actionExecutions.actionType,
      status: actionExecutions.status,
    })
    .from(actionExecutions)
    .where(eq(actionExecutions.actionGroupId, id))
    .orderBy(actionExecutions.position);
  return turnOutputSchema.parse({
    ...group,
    createdAt: group.createdAt.toISOString(),
    actions,
  });
}
// A crashed turn is never replayed. Committed receipts remain authoritative;
// unstarted actions are skipped. The group lock excludes any in-flight action.
async function recoverStaleTurn(ownerId: string, id: string) {
  const [candidate] = await rawDb
    .select({ createdAt: actionGroups.createdAt, status: actionGroups.status })
    .from(actionGroups)
    .where(and(eq(actionGroups.id, id), eq(actionGroups.ownerId, ownerId)));
  if (
    !candidate ||
    candidate.status !== 'PROCESSING' ||
    Date.now() - candidate.createdAt.getTime() < 120000
  )
    return;
  await rawDb.transaction(async (tx) => {
    const [group] = await tx
      .select()
      .from(actionGroups)
      .where(and(eq(actionGroups.id, id), eq(actionGroups.ownerId, ownerId)))
      .for('update');
    if (!group || group.status !== 'PROCESSING') return;
    const actions = await tx
      .select()
      .from(actionExecutions)
      .where(eq(actionExecutions.actionGroupId, id));
    const successful = actions.filter((a) => a.status === 'SUCCESS'),
      unfinished = actions.filter((a) => a.status === 'PENDING');
    const status = successful.length
      ? successful.length === actions.length
        ? 'SUCCESS'
        : 'PARTIAL'
      : 'FAILED';
    const result: ActionResult = {
      status,
      createdEntities: [],
      updatedEntities: [],
      warnings: unfinished.length
        ? ['中断后未执行剩余操作；没有自动重放。']
        : [],
      undoToken: successful.some((a) => a.reversible) ? newUndoToken() : null,
    };
    for (const action of successful) {
      const e = action.executionResult;
      if (e)
        (e.created ? result.createdEntities : result.updatedEntities).push({
          type: e.type,
          id: e.id,
        });
    }
    await tx
      .update(actionExecutions)
      .set({
        status: 'SKIPPED',
        validationResult: 'INTERRUPTED',
        completedAt: new Date(),
      })
      .where(
        and(
          eq(actionExecutions.actionGroupId, id),
          eq(actionExecutions.status, 'PENDING'),
        ),
      );
    const reply = successful.length
      ? '连接曾中断。已保存的操作结果已恢复；未完成的操作没有自动重试。'
      : '上次连接中断，没有执行记录变更。可以重新发起请求。';
    await tx
      .update(actionGroups)
      .set({
        status,
        reply,
        result,
        undoToken: result.undoToken,
        completedAt: new Date(),
      })
      .where(eq(actionGroups.id, id));
    if (group.sourceConversationId)
      await tx.insert(aiMessages).values({
        chatId: group.sourceConversationId,
        role: 'assistant',
        content: reply,
      });
    await recordChange(
      tx,
      ownerId,
      'ACTION_GROUP',
      id,
      'LimTurnRecovered',
      { status, successful: successful.length, skipped: unfinished.length },
      {},
      false,
    );
  });
}
export async function getConversation(ownerId: string, input: unknown) {
  const { id } = turnIdSchema.parse(input),
    conversation = await ownedConversation(ownerId, id);
  const messages = (
    await rawDb
      .select({
        id: aiMessages.id,
        role: aiMessages.role,
        content: aiMessages.content,
      })
      .from(aiMessages)
      .where(and(eq(aiMessages.chatId, id), isNull(aiMessages.deletedAt)))
      .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
      .limit(100)
  ).reverse();
  const groups = await rawDb
    .select({ id: actionGroups.id })
    .from(actionGroups)
    .where(
      and(
        eq(actionGroups.sourceConversationId, id),
        eq(actionGroups.ownerId, ownerId),
      ),
    )
    .orderBy(desc(actionGroups.createdAt))
    .limit(50);
  return conversationOutputSchema.parse({
    conversation,
    messages,
    turns: await Promise.all(groups.reverse().map((g) => getTurn(ownerId, g))),
  });
}
const receipts: Record<string, string> = {
  CREATE_REMINDER:'已设置提醒。',
  CREATE_CAPTAIN_LOG:'已保存你的日志原文。',
  REMEMBER_MOMENT:'已记住这一刻。',
  CREATE_TASK: '已记录任务。',
  UPDATE_TASK: '任务已更新。',
  COMPLETE_TASK: '任务已完成；未更改作业提交状态。',
  DELAY_TASK: '计划时间已调整，截止时间未变。',
  CREATE_ASSIGNMENT: '作业已记录，并关联任务。',
  UPDATE_ASSIGNMENT_DUE_DATE: '作业截止时间已更新，计划时间未变。',
  MARK_ASSIGNMENT_DONE: '作业已标记做完，未更改提交状态。',
  MARK_ASSIGNMENT_SUBMITTED: '已标记提交。',
  RECORD_STATUS: '已记录状态。',
  CREATE_LEARNING_RECORD: '已记录想法。',
};
const actionLabels: Record<string, string> = {
  CREATE_REMINDER:'设置提醒',CREATE_CAPTAIN_LOG:'保存日志',REMEMBER_MOMENT:'记住这一刻',
  CREATE_TASK: '记录任务',
  UPDATE_TASK: '更新任务',
  COMPLETE_TASK: '完成任务',
  DELAY_TASK: '调整计划',
  CREATE_ASSIGNMENT: '记录作业',
  UPDATE_ASSIGNMENT_DUE_DATE: '更新截止',
  MARK_ASSIGNMENT_DONE: '标记做完',
  MARK_ASSIGNMENT_SUBMITTED: '标记提交',
  RECORD_STATUS: '记录状态',
  CREATE_LEARNING_RECORD: '记录想法',
  QUERY_CURRENT_CONTEXT: '查看上下文',
  QUERY_TIMETABLE: '查看课表',
};

export async function sendTurn(
  ownerId: string,
  unknownInput: unknown,
  model: LimModel = runtimeModel,
) {
  const input = turnInputSchema.parse(unknownInput),
    text = normalizeInput(input.content);
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
  const claim = await rawDb.transaction(async (tx) => {
    // Serialize only short state transitions, never hold a DB lock while awaiting a model.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${ownerId}, 51))`,
    );
    const [chat] = await tx
      .select()
      .from(aiChats)
      .where(
        and(
          eq(aiChats.id, input.conversationId),
          eq(aiChats.userId, ownerId),
          eq(aiChats.kind, 'LIM'),
          isNull(aiChats.deletedAt),
        ),
      )
      .for('update');
    if (!chat) throw notFound();
    const [existing] = await tx
      .select()
      .from(actionGroups)
      .where(
        and(
          eq(actionGroups.ownerId, ownerId),
          eq(actionGroups.requestId, input.requestId),
        ),
      );
    if (existing) {
      if (existing.fingerprint !== fingerprint) conflict();
      return { id: existing.id, owned: false };
    }
    const [pending] = await tx
      .select({ id: actionGroups.id })
      .from(actionGroups)
      .where(
        and(
          eq(actionGroups.sourceConversationId, chat.id),
          eq(actionGroups.status, 'PROCESSING'),
        ),
      )
      .limit(1);
    if (pending) conflict();
    const [message] = await tx
      .insert(aiMessages)
      .values({ chatId: chat.id, role: 'user', content: input.content })
      .returning();
    const [group] = await tx
      .insert(actionGroups)
      .values({
        ownerId,
        requestId: input.requestId,
        fingerprint,
        sourceConversationId: chat.id,
        sourceMessageId: message.id,
      })
      .returning();
    await tx
      .update(aiChats)
      .set({
        title:
          chat.title === '与 Lim 的对话'
            ? input.content.slice(0, 40)
            : chat.title,
        updatedAt: new Date(),
      })
      .where(eq(aiChats.id, chat.id));
    return { id: group.id, owned: true };
  });
  if (!claim.owned) return getTurn(ownerId, { id: claim.id });
  const trace: LimTrace = {
    mode: detectMode(text),
    intent: 'normalized-user-request',
    domains: [],
    refs: [],
    excluded: [
      'CYCLE',
      'HIGH_PRIVATE',
      'VAULT',
      'NEVER',
      'EXPLICIT_ONLY_WITHOUT_GRANT',
    ],
    proposedActions: [],
    validation: 'NOT_RUN',
    risk: 'R0',
    execution: 'NOT_RUN',
  };
  const finish = async (
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CLARIFICATION',
    reply: string,
    result: ActionResult | null = null,
  ) => {
    await rawDb.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: actionGroups.status })
        .from(actionGroups)
        .where(
          and(eq(actionGroups.id, claim.id), eq(actionGroups.ownerId, ownerId)),
        )
        .for('update');
      if (current?.status !== 'PROCESSING') return;
      await tx
        .update(actionGroups)
        .set({
          status,
          reply,
          result,
          undoToken: result?.undoToken ?? null,
          mode: trace.mode,
          riskLevel: trace.risk,
          trace: process.env.APP_ENV === 'development' ? trace : null,
          completedAt: new Date(),
        })
        .where(
          and(
            eq(actionGroups.id, claim.id),
            eq(actionGroups.ownerId, ownerId),
            eq(actionGroups.status, 'PROCESSING'),
          ),
        );
      await tx.insert(aiMessages).values({
        chatId: input.conversationId,
        role: 'assistant',
        content: reply,
      });
      await recordChange(
        tx,
        ownerId,
        'ACTION_GROUP',
        claim.id,
        'LimTurnFinished',
        { status, mode: trace.mode, actionCount: trace.proposedActions.length },
        {},
        false,
      );
    });
    return getTurn(ownerId, { id: claim.id });
  };
  try {
    if (invalidClock(text)) {
      trace.validation = 'INVALID_USER_TIME';
      return finish('CLARIFICATION', '这个时间无效。你想安排在几点？');
    }
    if(isAttentionQuestion(text)){
      const readAction=parseAction({type:'QUERY_CURRENT_CONTEXT',confidence:'HIGH',payload:{}});
      if(actionRisk(readAction.type)!=='R0')throw notFound();
      await resolveUiSource(ownerId,input);
      // Local read-only orchestration, never a model context upload. No status
      // contents are copied into Lim history; only the same public NEXT/fallback.
      const home=await getHome(ownerId,{timeZone:input.timeZone});
      trace.mode='ASSIST';trace.domains=['UI','VOYAGE','QUEST','STUDY'];trace.intent='LOCAL_ATTENTION_QUERY';trace.proposedActions=['QUERY_CURRENT_CONTEXT'];trace.validation='VALID';trace.execution='SUCCESS';
      trace.refs=[home.nextAction,home.fallbackAction].flatMap(item=>item&&item.sourceRef.type!=='CLASS_SESSION'?[{type:item.sourceRef.type,id:item.sourceRef.id}]:[]);
      await rawDb.insert(actionExecutions).values({actionGroupId:claim.id,position:0,actionType:'QUERY_CURRENT_CONTEXT',payload:{},status:'SUCCESS',validationResult:'VALID',completedAt:new Date()});
      return finish('SUCCESS',attentionReply(home),{status:'SUCCESS',createdEntities:[],updatedEntities:[],warnings:[],undoToken:null});
    }
    const history = (
      await rawDb
        .select({ content: aiMessages.content })
        .from(aiMessages)
        .where(
          and(
            eq(aiMessages.chatId, input.conversationId),
            eq(aiMessages.role, 'user'),
            isNull(aiMessages.deletedAt),
          ),
        )
        .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
        .limit(8)
    )
      .reverse()
      .map((m) => m.content);
    const pack = await buildContext(ownerId, input, history);
    trace.domains = pack.domains;
    trace.refs = pack.candidates
      .filter((c) =>
        [
          'TASK',
          'ASSIGNMENT',
          'COURSE',
          'LEARNING_RECORD',
          'STATUS_MOMENT',
        ].includes(c.type),
      )
      .map((c) => ({
        type: c.type as LimTrace['refs'][number]['type'],
        id: c.id,
      }));
    let raw: unknown;
    try {
      raw = await model.propose(text, pack);
    } catch {
      trace.execution = 'PROVIDER_UNAVAILABLE';
      return finish(
        'FAILED',
        'Lim 暂时无法连接。你的消息已保留，其他功能可以继续使用。',
      );
    }
    const parsed = proposalSchema.safeParse(raw);
    if (!parsed.success) {
      trace.validation = 'INVALID_PROPOSAL';
      return finish('FAILED', '这次回复没有通过行动验证，没有更改你的记录。');
    }
    const proposal = parsed.data,
      actions = proposal.actions.map(parseAction);
    trace.proposedActions = actions.map((a) => a.type);
    trace.mode = pack.mode;
    trace.risk = actions.some((a) => actionRisk(a.type) === 'R1') ? 'R1' : 'R0';
    if (
      actions.some((a) => a.confidence !== 'HIGH') ||
      proposal.clarification
    ) {
      trace.validation = 'NEEDS_CLARIFICATION';
      return finish(
        'CLARIFICATION',
        proposal.clarification || '你指的是哪一条记录，或哪个时间？',
      );
    }
    try {
      for (const action of actions) validateAuthority(action, pack, text);
    } catch {
      trace.validation = 'AUTHORITY_REJECTED';
      return finish('FAILED', '这句话没有授权这些更改，没有执行行动。');
    }
    if (!actions.length) {
      trace.validation = 'VALID_NO_ACTION';
      trace.execution = 'NO_WRITE';
      if (pack.mode === 'EXECUTE')
        return finish('CLARIFICATION', proposal.reply || '你想更改哪条记录？');
      const reply =
        /(已记录|已完成|已提交|已更新|已挪|搞定|recorded|updated|submitted|completed)/i.test(
          proposal.reply,
        )
          ? '我在这里。需要更改记录时，直接告诉我。'
          : proposal.reply || '我在听。';
      return finish('SUCCESS', reply);
    }
    await rawDb.insert(actionExecutions).values(
      actions.map((a, position) => ({
        actionGroupId: claim.id,
        position,
        actionType: a.type,
        payload: a.type==='CREATE_CAPTAIN_LOG'?{}:a.payload,
      })),
    );
    trace.validation = 'VALID';
    let previousTask: { id: string; version: number } | undefined;
    const succeeded: string[] = [],
      successfulReceipts: string[] = [],
      warnings: string[] = [],
      createdEntities: ActionResult['createdEntities'] = [],
      updatedEntities: ActionResult['updatedEntities'] = [];
    const executions = await rawDb
      .select()
      .from(actionExecutions)
      .where(eq(actionExecutions.actionGroupId, claim.id))
      .orderBy(actionExecutions.position);
    let reversible = false;
    for (const [i, execution] of executions.entries()) {
      try {
        const r = await executeAction(
          ownerId,
          claim.id,
          execution.id,
          actions[i],
          pack,
          text,
          previousTask,
          actions[i].type==='REMEMBER_MOMENT'?await resolveUiSource(ownerId,input):null,
        );
        succeeded.push(actions[i].type);
        const receipt =
          actions[i].type === 'CREATE_ASSIGNMENT' && !r.executionResult?.taskId
            ? '作业已记录。'
            : receipts[actions[i].type];
        if (receipt) successfulReceipts.push(receipt);
        if (r.executionResult) {
          const e = r.executionResult;
          (e.created ? createdEntities : updatedEntities).push({
            type: e.type,
            id: e.id,
          });
          if (
            actions[i].type === 'CREATE_ASSIGNMENT' &&
            e.taskId &&
            e.taskVersion
          )
            previousTask = { id: e.taskId, version: e.taskVersion };
          reversible ||= r.reversible;
        }
      } catch (error) {
        const warning = safeFailure(error);
        warnings.push(actionLabels[actions[i].type] + '：' + warning);
        await rawDb
          .update(actionExecutions)
          .set({
            status: 'FAILED',
            validationResult: warning,
            completedAt: new Date(),
          })
          .where(eq(actionExecutions.id, execution.id));
      }
    }
    const status = warnings.length
      ? succeeded.length
        ? 'PARTIAL'
        : 'FAILED'
      : 'SUCCESS';
    const result: ActionResult = {
      status,
      createdEntities,
      updatedEntities,
      warnings,
      undoToken: reversible ? newUndoToken() : null,
    };
    const reply =
      [...successfulReceipts, ...warnings.map((w) => '未完成：' + w)].join(
        '\n',
      ) ||
      proposal.reply ||
      '已查看当前上下文。';
    trace.execution = status;
    return finish(status, reply, result);
  } catch (error) {
    trace.validation = 'CONTEXT_OR_PIPELINE_FAILURE';
    trace.execution = 'FAILED';
    const completed = await rawDb
      .select()
      .from(actionExecutions)
      .where(
        and(
          eq(actionExecutions.actionGroupId, claim.id),
          eq(actionExecutions.status, 'SUCCESS'),
        ),
      );
    if (completed.length) {
      const result: ActionResult = {
        status: 'PARTIAL',
        createdEntities: [],
        updatedEntities: [],
        warnings: ['后续处理失败，请核对已保存的结果。'],
        undoToken: completed.some((a) => a.reversible) ? newUndoToken() : null,
      };
      for (const action of completed) {
        const e = action.executionResult;
        if (e)
          (e.created ? result.createdEntities : result.updatedEntities).push({
            type: e.type,
            id: e.id,
          });
      }
      return finish(
        'PARTIAL',
        '部分操作已保存，后续处理未完成。请核对结果。',
        result,
      );
    }
    return finish('FAILED', safeFailure(error));
  }
}
export async function getTrace(ownerId: string, input: unknown) {
  const { id } = turnIdSchema.parse(input);
  if (process.env.APP_ENV !== 'development') throw notFound();
  const [row] = await rawDb
    .select({ trace: actionGroups.trace })
    .from(actionGroups)
    .where(and(eq(actionGroups.id, id), eq(actionGroups.ownerId, ownerId)));
  if (!row) throw notFound();
  return row.trace;
}
