import {createFileRoute} from '@tanstack/react-router';
import LocalAuthForm from '@/components/local-auth-form';
export const Route=createFileRoute('/forgot-password')({component:()=> <LocalAuthForm mode="forgot" />});
