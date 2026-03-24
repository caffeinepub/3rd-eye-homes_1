// Simplified expense loader — uses getAllExpenses() backend function directly.
// The previous ID-scan approach was unreliable and is replaced here.

export interface ExpenseItem {
  id: bigint;
  category: string;
  description: string;
  amount: bigint;
  date: string;
}

/**
 * Load all expenses by calling the getAllExpenses backend function.
 * Pass () => backend.getAllExpenses() as the argument.
 */
export async function loadAllExpenses(
  getAllExpenses: () => Promise<ExpenseItem[]>,
): Promise<ExpenseItem[]> {
  return getAllExpenses();
}

// No-op kept so existing imports don't break during migration.
export function updateMaxExpenseId(_id: bigint) {}
