import React from "react";

interface TableColumn {
  key: string;
  header: string;
  isNumeric?: boolean;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  onRowClick?: (row: any) => void;
}

export function Table({ columns, data, onRowClick }: TableProps) {
  return (
    <div className="fd-panel w-full overflow-x-auto p-0">
      <table className="fd-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.isNumeric ? "text-right" : "text-left"}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="p-5 text-center text-[var(--text-subtle)]"
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-200 ${onRowClick ? "cursor-pointer hover:bg-[var(--linen-100)]" : ""}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={col.isNumeric ? "text-right font-mono tabular-nums" : "text-left"}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
