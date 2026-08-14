import { supabase } from "@/lib/supabase";

export const EXPENSE_CATEGORIES = [
  "Ρεύμα",
  "Νερό",
  "Θέρμανση",
  "Καθαρισμός",
  "Συντήρηση",
  "Ασφάλεια",
  "Τέλη / φόροι",
  "Άλλο",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: string;
  property_id: string;
  amount: number;
  date: string;
  category?: string | null;
  note?: string | null;
};

export type NewExpense = {
  property_id: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  note?: string | null;
};

export async function getPropertyExpenses(
  propertyId: string,
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("property_id", propertyId)
    .order("date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

export async function addPropertyExpense(input: NewExpense): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .insert([
      {
        property_id: input.property_id,
        amount: input.amount,
        date: input.date,
        category: input.category,
        note: input.note ?? null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    amount: Number(data.amount),
  };
}

export function getExpensesTotal(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + Number(expense.amount), 0);
}

export type ExpenseCategoryGroup = {
  category: string;
  total: number;
  items: Expense[];
};

export function getExpensesTotalByCategory(
  expenses: Expense[],
): ExpenseCategoryGroup[] {
  const map = new Map<string, ExpenseCategoryGroup>();

  for (const expense of expenses) {
    const key = expense.category?.trim() || "Άλλο";
    const existing = map.get(key);
    if (existing) {
      existing.total += Number(expense.amount);
      existing.items.push(expense);
    } else {
      map.set(key, {
        category: key,
        total: Number(expense.amount),
        items: [expense],
      });
    }
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}
