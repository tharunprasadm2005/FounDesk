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
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        borderRadius: "10px",
        border: "1px solid var(--edge)",
        backgroundColor: "var(--dark-gray)",
        maxHeight: "400px",
        overflowY: "auto",
      }}
      data-lenis-prevent /* Prevent Lenis hijacking inside table body */
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
          fontFamily: "'Satoshi', sans-serif",
          textAlign: "left",
        }}
      >
        <thead
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "var(--dark-gray)",
            zIndex: 10,
            borderBottom: "1.5px solid var(--edge-strong)",
          }}
        >
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "14px 16px",
                  fontWeight: 700,
                  color: "var(--japandi-muted)",
                  textTransform: "uppercase",
                  fontSize: "11px",
                  letterSpacing: "0.05em",
                  textAlign: col.isNumeric ? "right" : "left",
                }}
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
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "var(--japandi-muted)",
                }}
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick && onRowClick(row)}
                style={{
                  borderBottom: "1px solid var(--edge)",
                  cursor: onRowClick ? "pointer" : "default",
                  transition: "background-color 0.15s ease",
                }}
                className="custom-table-row"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "14px 16px",
                      color: "var(--japandi-text)",
                      textAlign: col.isNumeric ? "right" : "left",
                      fontFamily: col.isNumeric ? "'JetBrains Mono', monospace" : "'Satoshi', sans-serif",
                      fontVariantNumeric: col.isNumeric ? "tabular-nums" : "normal",
                    }}
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
export { Table };
