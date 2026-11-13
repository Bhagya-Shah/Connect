/** Prices on Connect include GST. Split the total into taxable value and CGST/SGST halves. */
export function gstSplit(total: number, rate: number) {
  if (!rate) return { taxable: total, cgst: 0, sgst: 0 };
  const taxable = Math.round((total * 100) / (100 + rate) * 100) / 100;
  const tax = Math.round((total - taxable) * 100) / 100;
  const half = Math.round((tax / 2) * 100) / 100;
  return { taxable, cgst: half, sgst: Math.round((tax - half) * 100) / 100 };
}
export const invoiceNo = (createdAt: string, no: number | null) => `CN-${createdAt.slice(0, 4)}-${String(no ?? 0).padStart(4, "0")}`;
export const money = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
