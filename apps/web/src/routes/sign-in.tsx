import {createFileRoute} from '@tanstack/react-router';
import LocalAuthForm from '@/components/local-auth-form';
export const Route=createFileRoute('/sign-in')({component:()=> <LocalAuthForm mode="sign-in" />});
