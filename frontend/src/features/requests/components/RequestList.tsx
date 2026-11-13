'use client';

import React from 'react';
import { RequestStatus, ServiceRequest } from '@/types/request';

interface RequestListProps {
  requests: ServiceRequest[];
  isLoading: boolean;
  error: string | null;
  selectedStatus: RequestStatus | 'ALL';
  onStatusFilterChange: (status: RequestStatus | 'ALL') => void;
  onSelectRequest: (request: ServiceRequest) => void;
  onRetry: () => void;
}

const STATUS_FILTERS: Array<{ label: string; value: RequestStatus | 'ALL' }> = [
  { label: 'All Requests', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

export const RequestList: React.FC<RequestListProps> = ({
  requests,
  isLoading,
  error,
  selectedStatus,
  onStatusFilterChange,
  onSelectRequest,
  onRetry,
}) => {
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'IT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Facilities':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      case 'MEDIUM':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status: RequestStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header & Filter Bar */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Service Requests
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Browse, filter, and track all submitted tickets across departments.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Filter:
            </span>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
              {STATUS_FILTERS.map((filter) => {
                const isActive = selectedStatus === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => onStatusFilterChange(filter.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {/* 1. Loading State */}
        {isLoading && (
          <div
            data-testid="loading-state"
            className="space-y-4 animate-pulse py-4"
          >
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                </div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                <div className="flex items-center space-x-3 pt-2">
                  <div className="h-5 bg-slate-200 rounded w-16"></div>
                  <div className="h-5 bg-slate-200 rounded w-16"></div>
                  <div className="h-4 bg-slate-200 rounded w-32 ml-auto"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. Error State */}
        {!isLoading && error && (
          <div
            role="alert"
            data-testid="error-state"
            className="p-6 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-3"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-1">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-rose-900">
              Failed to load service requests
            </h3>
            <p className="text-sm text-rose-700 max-w-md mx-auto">{error}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* 3. Empty State */}
        {!isLoading && !error && requests.length === 0 && (
          <div
            data-testid="empty-state"
            className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              No requests found
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {selectedStatus === 'ALL'
                ? 'No service requests have been submitted yet. Use the form above to submit your first request.'
                : `No requests match the "${selectedStatus.replace('_', ' ')}" status filter.`}
            </p>
          </div>
        )}

        {/* 4. Requests List / Cards */}
        {!isLoading && !error && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRequest(request)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRequest(request);
                  }
                }}
                className="group p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-slate-400">
                        #{request.id.slice(0, 8)}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {request.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {request.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                        request.status
                      )}`}
                    >
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-medium ${getCategoryBadgeClass(
                      request.category
                    )}`}
                  >
                    Category: {request.category}
                  </span>

                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-medium ${getPriorityBadgeClass(
                      request.priority
                    )}`}
                  >
                    Priority: {request.priority}
                  </span>

                  <span className="text-slate-400 ml-auto flex items-center">
                    <svg
                      className="w-3.5 h-3.5 mr-1 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {formatDate(request.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
