import type { ContextPack } from './types';

type Action = {
  type: string;
  confidence: 'HIGH';
  payload: Record<string, unknown>;
};
const a = (type: string, payload: Record<string, unknown>): Action => ({
  type,
  confidence: 'HIGH',
  payload,
});
const res = (
  mode: string,
  reply = '',
  clarification: string | null = null,
  actions: Action[] = [],
) => ({ mode, reply, clarification, actions });

export async function mockProposal(text: string, pack: ContextPack) {
  const p = pack;
  const assignments = p.candidates.filter((e) => e.type === 'ASSIGNMENT');
  const tasks = p.candidates.filter((e) => e.type === 'TASK');
  const courses = p.candidates.filter((e) => e.type === 'COURSE');
  const focus = p.focus ?? p.current;
  const focusedTask = tasks.find(
    (e) => focus?.type === 'TASK' && e.id === focus.id,
  );
  const assignment =
    assignments.find(
      (e) =>
        (focus?.type === 'ASSIGNMENT' && e.id === focus.id) ||
        focusedTask?.sourceId === e.id,
    ) ??
    (text.includes('第三章')
      ? assignments.find((e) => String(e.title).includes('第三章'))
      : assignments.length === 1
        ? assignments[0]
        : undefined);
  const task =
    focusedTask ??
    tasks.find((e) => e.id === assignment?.taskId) ??
    (tasks.length === 1 ? tasks[0] : undefined);
  const course =
    courses.find(
      (e) => p.current?.type === 'COURSE' && e.id === p.current.id,
    ) ?? (courses.length === 1 ? courses[0] : undefined);
  const missing = () => res('EXECUTE', '', '你指哪份作业？');
  const idOfAssignment = (e: ContextPack['candidates'][number]) => e.id;
  const idOfTask = idOfAssignment;
  const idOfCourse = idOfAssignment;
  const versionOf = (e: ContextPack['candidates'][number]) => e.version;
  const SH = 8 * 60 * 60 * 1000;
  const base = new Date(new Date(p.asOf).getTime() + SH);
  const iso = (y: number, m: number, d: number, h: number) =>
    new Date(Date.UTC(y, m, d, h - 8)).toISOString();
  const day = (offset: number, hour: number) =>
    iso(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() + offset,
      hour,
    );
  const weekday = (target: number, hour: number) => {
    let delta = (target - base.getUTCDay() + 7) % 7;
    const now = base.getUTCHours() * 60 + base.getUTCMinutes();
    if (delta === 0 && now > hour * 60) delta = 7;
    return iso(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() + delta,
      hour,
    );
  };

  if (text.includes('过拟合') && text.includes('记下来')) {
    let sourceRef = '';
    const history = Array.isArray(p.userHistory) ? p.userHistory : [];
    for (let i = history.length - 1; i >= 0; i--) {
      const value = history[i];
      if (value.includes('过拟合') && !value.includes('记下来')) {
        sourceRef = value;
        break;
      }
    }
    if (!sourceRef) return res('EXECUTE', '', '你想记录的原话是什么？');
    return res('EXECUTE', '', null, [
      a('CREATE_LEARNING_RECORD', {
        title: '过拟合的想法',
        sourceKind: 'TEXT',
        sourceRef,
      }),
    ]);
  }
  if (text.includes('记') && (text.includes('精力') || text.includes('累'))) {
    const energy = /精力[^0-9]{0,8}([1-5])/.exec(text);
    return res('EXECUTE', '', null, [
      a('RECORD_STATUS', {
        ...(text.includes('累') ? { mood: 'TIRED' } : {}),
        ...(energy ? { energy: Number(energy[1]) } : {}),
      }),
    ]);
  }
  if (text.includes('有点累') && !text.includes('记'))
    return res('TALK', '可以先缓一下。');
  if (text.includes('不想')) return res('TALK', '先停一会儿也可以。');

  if (text.includes('下一次作业')) {
    if (!course) return missing();
    const planned = weekday(4, 20);
    let due = weekday(5, 18);
    if (Date.parse(due) < Date.parse(planned))
      due = new Date(Date.parse(due) + 7 * 86400000).toISOString();
    return res('EXECUTE', '', null, [
      a('CREATE_ASSIGNMENT', {
        courseId: idOfCourse(course),
        title: '下一次作业',
        dueAt: due,
      }),
      a('DELAY_TASK', {
        taskId: '$previousTask',
        newPlannedStart: planned,
      }),
    ]);
  }
  if (text.includes('老师说') && text.includes('周一')) {
    if (!assignment) return missing();
    return res('EXECUTE', '', null, [
      a('UPDATE_ASSIGNMENT_DUE_DATE', {
        assignmentId: idOfAssignment(assignment),
        newDueAt: weekday(1, 18),
        expectedVersion: versionOf(assignment),
      }),
    ]);
  }
  if (text.includes('我交了')) {
    if (!assignment) return missing();
    return res('EXECUTE', '', null, [
      a('MARK_ASSIGNMENT_SUBMITTED', {
        assignmentId: idOfAssignment(assignment),
        expectedVersion: versionOf(assignment),
      }),
    ]);
  }
  if (text.includes('做完')) {
    if (!task) return missing();
    return res('EXECUTE', '', null, [
      a('COMPLETE_TASK', {
        taskId: idOfTask(task),
        expectedVersion: versionOf(task),
      }),
    ]);
  }
  if (text.includes('挪到明天下午')) {
    if (!task) return missing();
    return res('EXECUTE', '', null, [
      a('DELAY_TASK', { taskId: idOfTask(task), newPlannedStart: day(1, 15) }),
    ]);
  }
  if (text.includes('今晚九点') || text.includes('今晚9点')) {
    if (!task) return missing();
    return res('EXECUTE', '', null, [
      a('DELAY_TASK', { taskId: idOfTask(task), newPlannedStart: day(0, 21) }),
    ]);
  }
  if (text.includes('提醒我拿快递')) {
    return res('EXECUTE', '', null, [
      a('CREATE_REMINDER', { title: '拿快递', scheduledAt: day(0, 16),...(task?.title==='拿快递'?{sourceType:'TASK',sourceId:task.id}:{}) }),
    ]);
  }
  if(/记住这一刻|把这一刻记下来/.test(text))return res('EXECUTE','',null,[a('REMEMBER_MOMENT',{})]);
  if(/存.*(?:Captain|日志)|记.*(?:Captain|日志)/i.test(text)){
    const original=p.userHistory.slice(0,-1).at(-1);
    return original?res('EXECUTE','',null,[a('CREATE_CAPTAIN_LOG',{body:original})]):res('EXECUTE','','你想保存的原文是什么？');
  }
  if (String(p.mode).toUpperCase() === 'ASSIST') {
    return res('ASSIST', '先看看眼前这一步。', null, [
      a('QUERY_CURRENT_CONTEXT', {}),
    ]);
  }
  return res(p.mode, '我在听。');
}
