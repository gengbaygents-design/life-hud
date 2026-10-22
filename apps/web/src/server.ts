import {
  createServerEntry,
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';
import { presentDocumentError } from './lib/document-error-response';

const entry = createServerEntry({
  fetch: createStartHandler(defaultStreamHandler),
});
export default {
  fetch: async (...args: Parameters<typeof entry.fetch>) =>
    presentDocumentError(args[0], await entry.fetch(...args)),
};
