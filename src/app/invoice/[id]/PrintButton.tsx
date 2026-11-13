"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="btn btn-sm print:hidden">Print or save as PDF</button>;
}
