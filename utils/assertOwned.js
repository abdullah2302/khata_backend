import httpError from './httpError.js';

// Makes sure a referenced document (client, project) belongs to the current user.
export default async (Model, id, owner, label) => {
  if (!id) return;
  if (!(await Model.exists({ _id: id, owner }))) throw httpError(400, `Invalid ${label}`);
};
