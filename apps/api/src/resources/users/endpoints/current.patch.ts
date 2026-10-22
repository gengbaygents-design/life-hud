import db from '@/db';
import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import usersSchema, { publicSchema } from '@/resources/users/users.schema';

export default endpoint
  .use(isAuthorized)
  .input(
    usersSchema
      .pick({ fullName: true })
      .partial(),
  )
  .output(publicSchema)
  .handler(async ({ input, context }) => {
    const { user } = context;
    const { fullName } = input;

    const dataToUpdate: Record<string, unknown> = {};

    if (fullName) {
      dataToUpdate.fullName = fullName;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return user;
    }

    const updatedUser = await db.users.updateOne({ id: user.id }, dataToUpdate);

    return updatedUser!;
  });
