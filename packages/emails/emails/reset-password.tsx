import React, { FC } from 'react';
import { Text } from '@react-email/components';
import Button from './_components/button';
import Layout from './_layout';

export interface ResetPasswordProps {
  name: string;
  href: string;
}

export const ResetPassword: FC<ResetPasswordProps> = ({ name, href }) => (
  <Layout previewText="重置你的 LIFE HUD 密码">
    <Text>{name}，你好：</Text>
    <Text>请点击下方按钮重置你的密码。</Text>
    <Button href={href}>重置密码</Button>
    <Text>若非本人操作，可以忽略这封邮件；点击链接并设置新密码前，原密码保持不变。</Text>
  </Layout>
);

export default ResetPassword;
