import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { EmptyState } from './EmptyState';

export const DataTable = ({
  columns = [],
  data = [],
  searchPlaceholder = 'Search records...',
  searchField = 'name',
  filters = [], // [{ label: 'Status', key: 'status', options: ['Active', 'Completed'] }]
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
  actionButton,
  mobileCardRenderer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        let matches = false;

        if (typeof searchField === 'function') {
          matches = searchField(item, query);
        } else if (Array.isArray(searchField)) {
          matches = searchField.some((field) => {
            const val = item[field];
            return val && String(val).toLowerCase().includes(query);
          });
        } else {
          const val = item[searchField];
          if (val && String(val).toLowerCase().includes(query)) matches = true;
          // also fallback check common fields
          if (item.title && String(item.title).toLowerCase().includes(query)) matches = true;
          if (item.name && String(item.name).toLowerCase().includes(query)) matches = true;
          if (item.code && String(item.code).toLowerCase().includes(query)) matches = true;
        }
        if (!matches) return false;
      }

      // Filter matching
      for (const [key, filterVal] of Object.entries(selectedFilters)) {
        if (filterVal && filterVal !== 'all') {
          const itemVal = item[key];
          if (String(itemVal).toLowerCase() !== String(filterVal).toLowerCase()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, searchQuery, searchField, selectedFilters]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleFilterChange = (key, value) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9.5 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
            />
          </div>

          {/* Filter Dropdowns */}
          {filters.map((filter) => (
            <div key={filter.key} className="relative">
              <select
                value={selectedFilters[filter.key] || 'all'}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
              >
                <option value="all">All {filter.label}</option>
                {filter.options.map((opt) => {
                  const val = typeof opt === 'object' ? opt.value : opt;
                  const lbl = typeof opt === 'object' ? opt.label : opt;
                  return (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  );
                })}
              </select>
              <Filter className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            </div>
          ))}

          {/* Active Filter Clear */}
          {(searchQuery || Object.values(selectedFilters).some((v) => v && v !== 'all')) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFilters({});
                setCurrentPage(1);
              }}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 underline px-1"
            >
              Reset
            </button>
          )}
        </div>

        {actionButton && <div className="shrink-0">{actionButton}</div>}
      </div>

      {/* Empty State */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedFilters({});
          }}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    {columns.map((col, idx) => (
                      <th
                        key={idx}
                        className={`px-5 py-3.5 ${col.className || ''} ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((row, rIdx) => (
                    <tr
                      key={row.id || rIdx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {columns.map((col, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-5 py-3.5 ${col.className || ''} ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {col.accessor
                            ? typeof col.accessor === 'function'
                              ? col.accessor(row)
                              : row[col.accessor]
                            : null}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (Optimized for Construction Foremen on phone) */}
          <div className="block md:hidden space-y-3">
            {paginatedData.map((item, idx) => (
              <div
                key={item.id || idx}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5"
              >
                {mobileCardRenderer ? (
                  mobileCardRenderer(item)
                ) : (
                  <div className="space-y-2">
                    {columns.slice(0, 4).map((col, cIdx) => (
                      <div key={cIdx} className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500">{col.header}:</span>
                        <div className="text-right">
                          {col.accessor
                            ? typeof col.accessor === 'function'
                              ? col.accessor(item)
                              : item[col.accessor]
                            : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-semibold text-slate-800">{Math.min(filteredData.length, currentPage * pageSize)}</span> of{' '}
              <span className="font-semibold text-slate-800">{filteredData.length}</span> results
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
