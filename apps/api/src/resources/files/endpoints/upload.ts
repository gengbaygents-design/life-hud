import { cloudStorageService } from '@ship/cloud-storage';
import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { filePrefix } from '../middlewares/owned-key';
import { registerUploadedFile } from '../methods';

import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';

const outputSchema = z.object({
  key: z.string(),
  url: z.string(),
  fileId: z.string().uuid(),
});

export default endpoint
  .use(isAuthorized)
  .input(
    z
      .object({
        file: z
          .custom<
            Pick<File, 'name' | 'type' | 'size' | 'arrayBuffer'>
          >((value) => value instanceof File, 'Expected a file')
          .refine(
            (file) => file.size <= 20 * 1024 * 1024,
            'Maximum file size is 20 MiB',
          ),
      })
      .strict(),
  )
  .output(outputSchema)
  .handler(async ({ input, context }) => {
    const { file } = input;
    const key = `${filePrefix(context.user.id)}${randomUUID()}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await cloudStorageService.uploadBuffer(key, buffer, file.type);
    try {
      const url = await cloudStorageService.getSignedDownloadUrl(key);
      const record = await registerUploadedFile(context.user.id, {
        key,
        name: file.name.trim().slice(0, 255) || '未命名资料',
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      });
      return { key, url, fileId: record.id };
    } catch (error) {
      await cloudStorageService.deleteObject(key).catch(() => undefined);
      throw error;
    }
  });
