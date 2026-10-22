import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ActionButton, EmptyState, GlassCard, Modal, SectionHeader } from '@/components/shell/primitives';
import { StatusView } from '@/components/personal/status-view';
import { GrowthView } from '@/components/personal/growth-view';
import { RemindersView } from '@/components/reminders/reminders-view';
import { ArchiveView } from '@/components/archive/archive-view';

const sections: Record<string, { title: string; subtitle: string; description: string }> = {
  status: { title: 'STATUS', subtitle: '听见自己的状态', description: '这里将容纳你的状态记录。现在没有记录，也不推断你的感受。' },
  wallet: { title: 'WALLET', subtitle: '生活中的收与支', description: '钱包入口已预留，当前未接入账户或交易。' },
  social: { title: 'SOCIAL', subtitle: '与你相连的人', description: '社交入口已预留，当前不读取联系人或发送消息。' },
  growth: { title: 'GROWTH', subtitle: '慢慢看见自己的变化', description: '成长空间尚未开放，不生成能力评分或掌握度。' },
  archive: { title: 'ARCHIVE', subtitle: '回望走过的片段', description: '这里将成为引用与时间的视图，当前没有档案。' },
  voyage: { title: 'VOYAGE', subtitle: '每段航程，都有自己的方向', description: '大学是第一段 Voyage。当前仅展示航程入口。' },
  search: { title: 'SEARCH', subtitle: '找到与你有关的线索', description: '搜索功能将在后续阶段接入，当前不执行检索。' },
  settings: { title: 'SETTINGS', subtitle: '让空间更适合你', description: '设置入口已预留，当前没有可保存的偏好设置。' },
  privacy: { title: 'PRIVACY', subtitle: '你的记录，由你决定', description: '这里将集中呈现数据与 AI 上下文的隐私选项；当前没有可修改的隐私设置。' },
};
export const Route = createFileRoute('/_authenticated/app/more/$section')({ component: Placeholder });
function Placeholder() {
  const { section } = Route.useParams();
  const entry = sections[section];
  const [open, setOpen] = useState(false);
  if(section==='status')return <StatusView/>;
  if(section==='growth')return <GrowthView/>;
  if(section==='reminders')return <RemindersView/>;
  if(section==='archive')return <ArchiveView/>;
  if(section==='search')return <ArchiveView searchMode/>;
  return <div className="hud-page">
    <Link to="/app/more" className="text-link inline-flex items-center gap-2"><ArrowLeft size={16} aria-hidden="true" />返回 MORE</Link>
    <SectionHeader eyebrow="LIFE HUD / MORE" title={entry?.title ?? '未找到入口'} description={entry?.subtitle ?? '回到导航，继续探索。'} />
    <GlassCard><EmptyState title={entry ? '留给未来的空间' : '这个入口尚不存在'} description={entry?.description ?? '请选择 MORE 中已有的入口。'} /></GlassCard>
    {section === 'privacy' && <><ActionButton variant="outline" onClick={() => setOpen(true)}>查看隐私原则</ActionButton>
      <Modal open={open} onOpenChange={setOpen} title="隐私原则" description="这些是产品原则，此处不提供设置开关。">
        <p>技术上可访问，不代表已获授权加入 AI 上下文。敏感信息应由你明确选择，相关功能将在后续阶段实现。</p>
      </Modal></>}
  </div>;
}
