import { createFileRoute } from '@tanstack/react-router';
import { StudyView } from '@/components/shell/study-view';
export const Route = createFileRoute('/_authenticated/app/study/')({
  component: StudyView,
});
