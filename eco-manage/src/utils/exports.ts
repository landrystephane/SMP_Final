type CellValue = string | number | null | undefined;

function escapeCell(v: CellValue): string {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
}

export function downloadCSV(headers: string[], rows: CellValue[][], filename: string): void {
    const lines = [headers, ...rows].map(row => row.map(escapeCell).join(','));
    const csv = '﻿' + lines.join('\r\n'); // BOM UTF-8 for Windows Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
