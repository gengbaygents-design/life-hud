import db from '@/db';
import canEdit from '@/middlewares/can-edit';
export default canEdit('record', db.projects, {
  idKey: 'id',
  owner: 'ownerId',
  message: 'Record not found',
});
