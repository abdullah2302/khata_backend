import Counter from '../models/Counter.js';
import Invoice from '../models/Invoice.js';
import httpError from './httpError.js';

const PREFIX = 'INV-'; // change the prefix here
const format = (n) => `${PREFIX}${String(n).padStart(4, '0')}`;

// Returns the next unused invoice number for this user: INV-0001, INV-0002, ...
// $inc is atomic, so two invoices created at the same time never get the same number.
export default async (owner) => {
  for (let attempt = 0; attempt < 50; attempt++) {
    let counter;
    try {
      counter = await Counter.findOneAndUpdate(
        { owner },
        { $inc: { invoiceSeq: 1 } },
        { upsert: true, new: true }
      );
    } catch (e) {
      if (e.code === 11000) continue; // two first-ever requests raced to create the counter
      throw e;
    }
    const number = format(counter.invoiceSeq);
    // Skip numbers already used by older invoices that were typed by hand
    if (!(await Invoice.exists({ owner, invoiceNumber: number }))) return number;
  }
  throw httpError(500, 'Could not generate an invoice number');
};
