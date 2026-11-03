import Invoice from '../models/Invoice.js';
import { startOfToday } from './dates.js';

// Keeps the overdue flag honest in both directions:
// pending -> overdue once the due date has fully passed,
// overdue -> pending again if the due date was moved to today or later.
export default async (owner) => {
  const today = startOfToday();
  await Invoice.updateMany({ owner, status: 'pending', dueDate: { $lt: today } }, { $set: { status: 'overdue' } });
  await Invoice.updateMany({ owner, status: 'overdue', dueDate: { $gte: today } }, { $set: { status: 'pending' } });
};
