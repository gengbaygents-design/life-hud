import {createFileRoute} from '@tanstack/react-router';
import LocalAuthForm from '@/components/local-auth-form';
export const Route=createFileRoute('/reset-password')({component:()=> <LocalAuthForm mode="reset" />});
