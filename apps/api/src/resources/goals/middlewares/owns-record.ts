import db from '@/db';
import canEdit from '@/middlewares/can-edit';
export default canEdit('record', db.goals, {
  idKey: 'id',
  owner: 'ownerId',
  message: 'Record not found',
});
