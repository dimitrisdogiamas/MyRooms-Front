import { supabase } from "@/lib/supabase";





export type Expense = {
  id: string;
  property_id: string;
  amount: number;
  date: string;
  category?: string | null;
  note?: string | null;
}


export async function getPropertyExpenses(propertyId: string): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').eq('property_id', propertyId).order('date', { ascending: false });
  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

export function getExpensesTotal(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + Number(expense.amount), 0);
}
