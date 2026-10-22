import React, { FC } from 'react';
import { Text } from '@react-email/components';
import Button from './_components/button';
import Layout from './_layout';

export interface SignUpWelcomeProps {
  name: string;
  href: string;
}

export const SignUpWelcome: FC<SignUpWelcomeProps> = ({ name, href }) => (
  <Layout previewText="欢迎使用 LIFE HUD">
    <Text>{name}，你好：</Text>
    <Text>欢迎使用 LIFE HUD。</Text>
    <Button href={href}>打开 LIFE HUD</Button>
  </Layout>
);

export default SignUpWelcome;
