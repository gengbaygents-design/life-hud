import { createFileRoute } from '@tanstack/react-router';
import { StudyWorkspace } from '@/components/study/study-workspace';
export const Route=createFileRoute('/_authenticated/app/study/$courseId')({component:CourseDetail});
function CourseDetail(){const {courseId}=Route.useParams();return <StudyWorkspace courseId={courseId}/>;}
