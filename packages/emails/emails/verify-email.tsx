import React, { FC } from 'react';
import { Text } from '@react-email/components';
import Button from './_components/button';
import Layout from './_layout';

export interface VerifyEmailProps {
  name: string;
  href: string;
}

export const VerifyEmail: FC<VerifyEmailProps> = ({ name, href }) => (
  <Layout previewText="确认你的 LIFE HUD 邮箱">
    <Text>{name}，你好：</Text>
    <Text>请点击下方按钮确认你的邮箱。</Text>
    <Button href={href}>确认邮箱</Button>
  </Layout>
);

export default VerifyEmail;
