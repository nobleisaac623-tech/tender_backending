import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportToExcel(data: object[], filename: string, sheetName = 'Sheet1') {
  if (data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const keys = Object.keys(data[0] || {});
  const colWidths = keys.map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  worksheet['!cols'] = colWidths;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportMultiSheet(
  sheets: { name: string; data: object[] }[],
  filename: string
) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data.length > 0 ? sheet.data : [{}]);
    if (sheet.data.length > 0) {
      const keys = Object.keys(sheet.data[0] || {});
      worksheet['!cols'] = keys.map((k) => ({ wch: Math.max(k.length, 15) }));
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
