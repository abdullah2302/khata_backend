import Invoice from '../models/Invoice.js';

// Pending invoices whose due date has passed become "overdue" automatically.
export default (owner) =>
  Invoice.updateMany({ owner, status: 'pending', dueDate: { $lt: new Date() } }, { $set: { status: 'overdue' } });
