'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

import { Button } from '../../primitives/Button/Button.jsx';
import { cx } from '../../primitives/_utils/cx.js';

function buildInitialPagination(pageSize) {
  return { pageIndex: 0, pageSize };
}

export function DataTable({
  columns,
  data,
  className = '',
  emptyMessage = 'No results.',
  enableSorting = true,
  enablePagination = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50]
}) {
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState(buildInitialPagination(pageSize));

  const resolvedColumns = useMemo(() => columns || [], [columns]);
  const resolvedData = useMemo(() => data || [], [data]);

  const table = useReactTable({
    data: resolvedData,
    columns: resolvedColumns,
    state: {
      sorting,
      pagination: enablePagination ? pagination : undefined
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    manualSorting: false
  });

  const rows = enablePagination ? table.getRowModel().rows : table.getRowModel().rows;
  const totalRows = rows.length;

  return (
    <div className={cx('c-DataTable', className)}>
      <div className="c-DataTable__tableWrap">
        <table className="c-DataTable__table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortable =
                    enableSorting && header.column.getCanSort && header.column.getCanSort();
                  return (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cx(
                            'c-DataTable__headerButton',
                            sortable && 'is-sortable'
                          )}
                          onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                          disabled={!sortable}
                        >
                          <span>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {sortable ? (
                            <span className="c-DataTable__sort">
                              {header.column.getIsSorted() === 'asc' ? '↑' : null}
                              {header.column.getIsSorted() === 'desc' ? '↓' : null}
                            </span>
                          ) : null}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {totalRows === 0 ? (
              <tr>
                <td colSpan={resolvedColumns.length || 1} className="c-DataTable__empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {enablePagination ? (
        <div className="c-DataTable__footer">
          <div className="c-DataTable__summary">
            Page {pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="c-DataTable__controls">
            <Button
              variant="secondary"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
            <select
              className="c-DataTable__pageSize"
              value={pagination.pageSize}
              onChange={(event) =>
                setPagination((prev) => ({
                  ...prev,
                  pageIndex: 0,
                  pageSize: Number(event.target.value)
                }))
              }
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}

