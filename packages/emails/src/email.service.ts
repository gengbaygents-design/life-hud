import type { Template, TemplateProps } from './template';
import { renderEmailHtml } from './utils';
export default {
  async sendTemplate<T extends Template>({ to, subject, template, params }: { to: string | string[]; subject: string; template: T; params: TemplateProps[T] }) {
    const response = await fetch('http://127.0.0.1:8025/api/v1/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ From: { Email: 'no-reply@life-hud.local', Name: 'LIFE HUD' }, To: (Array.isArray(to) ? to : [to]).map(Email => ({ Email })), Subject: subject, HTML: await renderEmailHtml({ template, params }) }),
    });
    if (!response.ok) throw new Error('LOCAL_MAIL_UNAVAILABLE');
  },
};
