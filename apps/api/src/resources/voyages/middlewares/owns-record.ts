import db from '@/db';
import canEdit from '@/middlewares/can-edit';
export default canEdit('record', db.voyages, {
  idKey: 'id',
  owner: 'ownerId',
  message: 'Record not found',
});
