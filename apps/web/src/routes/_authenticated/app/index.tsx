import { createFileRoute } from '@tanstack/react-router';
import { HomeView } from '@/components/shell/home-view';
export const Route=createFileRoute('/_authenticated/app/')({component:HomeView});
