import {createFileRoute} from '@tanstack/react-router';
import { QuestView } from '@/components/shell/quest-view';
export const Route=createFileRoute('/_authenticated/app/quest')({component:QuestView});
