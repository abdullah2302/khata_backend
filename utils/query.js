const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only plain string query values are allowed (blocks NoSQL operator injection).
export const exactFilters = (query, keys) =>
  Object.fromEntries(keys.filter((k) => typeof query[k] === 'string' && query[k]).map((k) => [k, query[k]]));

export const searchFilter = (search, fields) =>
  typeof search === 'string' && search
    ? { $or: fields.map((f) => ({ [f]: new RegExp(escapeRegex(search), 'i') })) }
    : {};

export const dateRange = (field, from, to) => {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return { [field]: range };
};

export const paginate = async (Model, filter, query = {}, populate = []) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  const sort = typeof query.sort === 'string' && query.sort ? query.sort.split(',').join(' ') : '-createdAt';

  const [items, total] = await Promise.all([
    Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate(populate),
    Model.countDocuments(filter)
  ]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
};
