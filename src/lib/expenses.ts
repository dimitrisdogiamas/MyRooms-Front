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

export function getExpensesTotalByCategory(
  expenses: Expense[],
): { category: string; total: number }[] {
  const map = new Map<string, number>();

  for (const expense of expenses) {
    const key = expense.category?.trim() || "Άλλο";
    map.set(key, (map.get(key) ?? 0) + Number(expense.amount));
  }

  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}
