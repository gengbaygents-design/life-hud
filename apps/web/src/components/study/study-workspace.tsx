import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLimSource } from '@/components/shell/lim-state';
import { useQueryClient } from '@tanstack/react-query';
import {
  LoadingState,
  ActionButton,
  GlassCard,
  HUDCard,
  SectionHeader,
  EmptyState,
  Modal,
} from '@/components/shell/primitives';
import { apiClient } from '@/services/api-client.service';
import { useCoreData } from '@/components/quest/use-core-data';
import { useStudy, type AssignmentRecord } from './use-study';
import FieldForm, { ClassList, AssignmentCard, type Field } from './widgets';
import './study.css';
type Mode =
  | 'semester'
  | 'course'
  | 'session'
  | 'assignment'
  | 'exam'
  | 'grade'
  | 'material'
  | 'place'
  | 'enrollment';
const labels: Record<Mode, string> = {
  semester: '添加学期',
  course: '添加课程',
  session: '安排课次',
  assignment: '添加作业',
  exam: '添加考试',
  grade: '记录成绩',
  material: '关联资料',
  place: '添加地点',
  enrollment: '课程参与',
};
const field = (
  name: string,
  label: string,
  type = 'text',
  required = false,
  value?: string,
): Field => ({ name, label, type, required, value });
const iso = (v: string) => (v ? new Date(v).toISOString() : null);
const local = (v: string | null | undefined) => {
  if (!v) return '';
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function StudyWorkspace({ courseId }: { courseId?: string }) {
  useLimSource(courseId ? { type: 'COURSE', id: courseId } : null);
  const query = useStudy(),
    cache = useQueryClient(),
    core = useCoreData();
  const [mode, setMode] = useState<Mode | null>(null),
    [editing, setEditing] = useState<AssignmentRecord | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const data = query.data,
    course = data?.courses.find((c) => c.id === courseId);
  const open = (m: Mode, a: AssignmentRecord | null = null) => {
    setError('');
    setEditing(a);
    setMode(m);
  };
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['study'] }),
      cache.invalidateQueries({ queryKey: ['home'] }),
      cache.invalidateQueries({ queryKey: ['tasks'] }),
    ]);
  };
  const run = async (action: () => Promise<unknown>, close = false) => {
    setBusy(true);
    setError('');
    try {
      await action();
      if (close) {
        setMode(null);
        setEditing(null);
      }
      await refresh();
    } catch (e) {
      setError(
        (e as { status?: number }).status === 409
          ? '记录已被更新。你的输入已保留，请关闭后重新读取。'
          : '保存失败，请检查输入或本地服务后重试。',
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const courseField: Field = {
    name: 'courseId',
    label: '课程',
    required: true,
    value: editing?.courseId ?? courseId,
    options: data?.courses.map((c) => ({ value: c.id, label: c.name })) ?? [],
  };
  const fields = (): Field[] => {
    switch (mode) {
      case 'semester':
        return [
          field('name', '学期名称', 'text', true),
          field('startAt', '学期开始', 'datetime-local', true),
          field('endAt', '学期结束', 'datetime-local', true),
        ];
      case 'course':
        return [
          {
            name: 'semesterId',
            label: '学期',
            required: true,
            options:
              data?.semesters.map((s) => ({ value: s.id, label: s.name })) ??
              [],
          },
          field('name', '课程名称', 'text', true),
          field('code', '课程代码'),
          field('teacher', '教师'),
          {
            ...field('credits', '学分', 'number'),
            step: '0.5',
            min: 0,
            max: 100,
          },
        ];
      case 'session':
        return [
          courseField,
          field('specificDate', '上课日期', 'date', true),
          field('startTime', '上课时间', 'time', true),
          field('endTime', '下课时间', 'time', true),
          {
            name: 'placeId',
            label: '地点',
            options: [
              { value: '', label: '未指定' },
              ...(data?.places.map((p) => ({ value: p.id, label: p.name })) ??
                []),
            ],
          },
        ];
      case 'assignment':
        return [
          courseField,
          field('title', '作业标题', 'text', true, editing?.title),
          field(
            'description',
            '说明',
            'text',
            false,
            editing?.description ?? '',
          ),
          field(
            'dueAt',
            '课程截止时间',
            'datetime-local',
            false,
            local(editing?.dueAt),
          ),
          ...(!editing
            ? [
                {
                  ...field('estimatedMinutes', '预估分钟数', 'number'),
                  min: 1,
                  max: 10080,
                },
                {
                  name: 'createTask',
                  label: 'QUEST 执行任务',
                  options: [
                    { value: 'yes', label: '创建关联任务（默认）' },
                    { value: 'no', label: '仅记录课程要求' },
                  ],
                },
              ]
            : []),
        ];
      case 'exam':
        return [
          courseField,
          field('title', '考试名称', 'text', true),
          field('examType', '考试类型'),
          field('startAt', '考试开始', 'datetime-local', true),
          field('endAt', '考试结束', 'datetime-local'),
          {
            name: 'placeId',
            label: '地点',
            options: [
              { value: '', label: '未指定' },
              ...(data?.places.map((p) => ({ value: p.id, label: p.name })) ??
                []),
            ],
          },
        ];
      case 'grade':
        return [
          courseField,
          field('assessmentType', '考核名称'),
          { ...field('score', '分数', 'number'), step: 'any', min: 0 },
          { ...field('maxScore', '满分', 'number'), step: 'any', min: 0 },
          {
            ...field('weight', '权重（0–1）', 'number'),
            step: 'any',
            min: 0,
            max: 1,
          },
          field(
            'recordedAt',
            '记录时间',
            'datetime-local',
            true,
            local(data?.asOf),
          ),
        ];
      case 'material':
        return [
          courseField,
          {
            name: 'fileId',
            label: '选择文件',
            required: true,
            options:
              data?.files.map((f) => ({ value: f.id, label: f.name })) ?? [],
          },
          field('label', '显示名称'),
          field('materialType', '资料类型'),
        ];
      case 'place':
        return [field('name', '地点名称', 'text', true), field('note', '备注')];
      case 'enrollment':
        return [
          courseField,
          {
            name: 'status',
            label: '参与状态',
            options: [
              { value: 'ENROLLED', label: '正在修读' },
              { value: 'COMPLETED', label: '已修读' },
              { value: 'WITHDRAWN', label: '已退出' },
            ],
          },
        ];
      default:
        return [];
    }
  };
  const save = (v: Record<string, string>) =>
    run(async () => {
      switch (mode) {
        case 'semester': {
          const voyage = core.voyages.data?.find(
            (v) => v.status === 'ACTIVE' && v.voyageType === 'UNIVERSITY',
          );
          if (!voyage) throw new Error('NO_VOYAGE');
          return apiClient.semesters.create({
            name: v.name,
            voyageId: voyage.id,
            startAt: iso(v.startAt)!,
            endAt: iso(v.endAt)!,
          });
        }
        case 'course':
          return apiClient.courses.create({
            semesterId: v.semesterId,
            name: v.name,
            code: v.code || null,
            teacher: v.teacher || null,
            credits: v.credits ? Number(v.credits) : null,
          });
        case 'session':
          return apiClient['class-sessions'].create({
            courseId: v.courseId,
            specificDate: v.specificDate,
            startTime: v.startTime,
            endTime: v.endTime,
            placeId: v.placeId || null,
          });
        case 'assignment': {
          const input = {
            title: v.title,
            description: v.description || null,
            dueAt: iso(v.dueAt),
          };
          return editing
            ? apiClient.assignments.update({
                ...input,
                id: editing.id,
                version: editing.version,
              })
            : apiClient.assignments.create({
                ...input,
                courseId: v.courseId,
                createTask: v.createTask !== 'no',
                estimatedMinutes: v.estimatedMinutes
                  ? Number(v.estimatedMinutes)
                  : null,
              });
        }
        case 'exam':
          return apiClient.exams.create({
            courseId: v.courseId,
            title: v.title,
            examType: v.examType || null,
            startAt: iso(v.startAt)!,
            endAt: iso(v.endAt),
            placeId: v.placeId || null,
          });
        case 'grade':
          return apiClient.grades.create({
            courseId: v.courseId,
            assessmentType: v.assessmentType || null,
            score: v.score ? Number(v.score) : null,
            maxScore: v.maxScore ? Number(v.maxScore) : null,
            weight: v.weight ? Number(v.weight) : null,
            recordedAt: iso(v.recordedAt)!,
          });
        case 'material':
          return apiClient['course-material-links'].create({
            courseId: v.courseId,
            fileId: v.fileId,
            label: v.label || null,
            materialType: v.materialType || null,
          });
        case 'place':
          return apiClient.places.create({
            name: v.name,
            note: v.note || null,
          });
        case 'enrollment': {
          const previous = data?.enrollments.find(
            (e) => e.courseId === v.courseId,
          );
          const status = v.status as 'ENROLLED' | 'COMPLETED' | 'WITHDRAWN';
          return previous
            ? apiClient.enrollments.update({
                id: previous.id,
                version: previous.version,
                status,
              })
            : apiClient.enrollments.create({ courseId: v.courseId, status });
        }
      }
    }, true);
  const assignments =
      data?.assignments.filter((a) => !courseId || a.courseId === courseId) ??
      [],
    materials =
      data?.materials.filter((m) => !courseId || m.courseId === courseId) ?? [],
    exams =
      data?.exams.filter((e) => !courseId || e.courseId === courseId) ?? [],
    grades =
      data?.grades.filter((g) => !courseId || g.courseId === courseId) ?? [];
  return (
    <section className="hud-page study-workspace">
      <div className="page-intro">
        <SectionHeader
          eyebrow="LIFE HUD · UNIVERSITY"
          title={courseId ? (course?.name ?? '课程') : 'STUDY'}
          description={
            courseId
              ? [
                  course?.code,
                  course?.teacher,
                  course?.credits != null ? `${course.credits} 学分` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : '课程、作业与资料，各归其位。'
          }
        />
        {courseId ? (
          <Link to="/app/study" className="text-link">
            返回 STUDY
          </Link>
        ) : null}
        <p className="muted">
          {data?.semesters.map((s) => s.name).join(' · ')}
        </p>
      </div>
      {query.isPending ? <LoadingState label="正在读取课程…" /> : null}
      {query.isError ? (
        <p role="alert">
          课程暂时无法读取。
          <ActionButton onClick={() => query.refetch()}>重试</ActionButton>
        </p>
      ) : null}
      {error && !mode ? <p role="alert">{error}</p> : null}
      {courseId && data && !course ? (
        <EmptyState title="课程不存在或不可访问" />
      ) : null}
      <nav className="study-tabs" aria-label="学习分区">
        <a href="#study-today">今日课程</a>
        <a href="#study-assignments">作业</a>
        <a href="#study-courses">课程</a>
        <a href="#study-materials">资料</a>
      </nav>
      <div className="study-toolbar">
        {!courseId ? (
          <>
            <ActionButton variant="ghost" onClick={() => open('semester')}>
              添加学期
            </ActionButton>
            <ActionButton
              variant="ghost"
              onClick={() => open('course')}
              disabled={!data?.semesters.length}
            >
              添加课程
            </ActionButton>
          </>
        ) : null}
        <ActionButton
          onClick={() => open('assignment')}
          disabled={!data?.courses.length}
        >
          添加作业
        </ActionButton>
      </div>
      <div className="study-grid">
        <HUDCard id="study-today" aria-label="今日课程">
          <h2 className="card-heading">今日课程</h2>
          <ClassList
            rows={(data?.today ?? []).filter(
              (s) => !courseId || s.courseId === courseId,
            )}
            currentId={data?.current?.id}
            nextId={data?.next?.id}
          />
          {data?.next ? (
            <p className="muted">
              下一节 · {data.next.specificDate} {data.next.startTime}{' '}
              {data.next.courseName}
            </p>
          ) : null}
          <ActionButton
            variant="ghost"
            onClick={() => open('session')}
            disabled={!data?.courses.length}
          >
            安排课次
          </ActionButton>
          <ActionButton variant="ghost" onClick={() => open('place')}>
            添加地点
          </ActionButton>
        </HUDCard>
        <GlassCard id="study-assignments" aria-label="作业">
          <h2 className="card-heading">作业</h2>
          {assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              courseName={
                data?.courses.find((c) => c.id === a.courseId)?.name ?? '课程'
              }
              busy={busy}
              onEdit={() => open('assignment', a)}
              onDone={() =>
                run(() =>
                  apiClient.assignments.update({
                    id: a.id,
                    version: a.version,
                    workState: 'DONE',
                  }),
                )
              }
              onSubmit={() =>
                run(() =>
                  apiClient.assignments.submit({
                    id: a.id,
                    version: a.version,
                  }),
                )
              }
              onUnsubmit={() =>
                run(() =>
                  apiClient.assignments.unsubmit({
                    id: a.id,
                    version: a.version,
                  }),
                )
              }
            />
          ))}
          {!assignments.length ? (
            <EmptyState title="暂无作业" description="完成和提交会分别记录。" />
          ) : null}
        </GlassCard>
        <GlassCard id="study-courses" aria-label="课程">
          <h2 className="card-heading">{courseId ? '课程日程' : '课程'}</h2>
          {courseId ? (
            <ClassList
              rows={data?.sessions.filter((s) => s.courseId === courseId) ?? []}
            />
          ) : (
            <div className="course-list">
              {data?.courses.map((c, i) => (
                <Link
                  key={c.id}
                  className="course-item"
                  to="/app/study/$courseId"
                  params={{ courseId: c.id }}
                >
                  <span className="module-number mono">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    {c.name}
                    <small className="muted">
                      {data.enrollments.find((e) => e.courseId === c.id)
                        ?.status === 'ENROLLED'
                        ? ' · 正在修读'
                        : ''}
                    </small>
                  </span>
                </Link>
              ))}
              {!data?.courses.length && !query.isPending ? (
                <EmptyState
                  title="还没有课程"
                  description="从一个学期和一门课开始。"
                />
              ) : null}
            </div>
          )}
          <ActionButton
            variant="ghost"
            onClick={() => open('enrollment')}
            disabled={!data?.courses.length}
          >
            课程参与
          </ActionButton>
        </GlassCard>
        <GlassCard id="study-materials" aria-label="资料">
          <h2 className="card-heading">资料</h2>
          {materials.map((m) => {
            const file = data?.files.find((f) => f.id === m.fileId);
            return (
              <div key={m.id} className="study-material">
                <span>{m.label || file?.name || '资料'}</span>
                <ActionButton
                  variant="ghost"
                  onClick={() =>
                    run(async () => {
                      const { url } = await apiClient.files.download({
                        id: m.fileId,
                      });
                      window.open(url, '_blank', 'noopener,noreferrer');
                    })
                  }
                >
                  打开资料
                </ActionButton>
              </div>
            );
          })}
          {!materials.length ? (
            <EmptyState
              title="暂无资料"
              description="添加课件、讲义或参考资料。"
            />
          ) : null}
          <ActionButton
            variant="ghost"
            onClick={() => open('material')}
            disabled={!data?.courses.length}
          >
            关联资料
          </ActionButton>
        </GlassCard>
      </div>
      <details className="study-secondary">
        <summary>考试与成绩</summary>
        <div className="study-grid">
          <GlassCard>
            <h2 className="card-heading">考试</h2>
            {exams.map((e) => (
              <p key={e.id}>
                {e.title} · {new Date(e.startAt).toLocaleString('zh-CN')}
              </p>
            ))}
            {!exams.length ? (
              <p className="muted">尚未记录考试。备考安排留在 QUEST。</p>
            ) : null}
            <ActionButton
              onClick={() => open('exam')}
              disabled={!data?.courses.length}
            >
              添加考试
            </ActionButton>
          </GlassCard>
          <GlassCard>
            <h2 className="card-heading">成绩</h2>
            {grades.map((g) => (
              <p key={g.id}>
                {data?.courses.find((c) => c.id === g.courseId)?.name} ·{' '}
                {g.assessmentType || '考核'} {g.score ?? '未录入'}
                {g.maxScore != null ? ` / ${g.maxScore}` : ''}
              </p>
            ))}
            <ActionButton
              onClick={() => open('grade')}
              disabled={!data?.courses.length}
            >
              记录成绩
            </ActionButton>
          </GlassCard>
        </div>
      </details>
      <Modal
        open={Boolean(mode)}
        onOpenChange={(v) => {
          if (!v && !busy) {
            setMode(null);
            setEditing(null);
          }
        }}
        title={editing ? '编辑作业' : mode ? labels[mode] : '学习记录'}
      >
        {mode === 'material' ? (
          <label className="form-field">
            上传文件
            <input
              aria-label="上传资料文件"
              type="file"
              disabled={busy}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) void run(() => apiClient.files.upload({ file }));
              }}
            />
          </label>
        ) : null}
        {mode ? (
          <FieldForm
            key={mode + (editing?.id ?? '')}
            title={editing ? '编辑作业' : labels[mode]}
            fields={fields()}
            busy={busy}
            error={error}
            onSave={save}
            onCancel={() => {
              setMode(null);
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>
    </section>
  );
}
