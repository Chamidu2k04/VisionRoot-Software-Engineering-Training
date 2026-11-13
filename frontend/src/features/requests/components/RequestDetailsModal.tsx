'use client';

import React, { useEffect, useState } from 'react';
import { RequestStatus, ServiceRequest } from '@/types/request';
import { requestsApi, ApiError } from '@/services/requestsApi';

interface RequestDetailsModalProps {
  request: ServiceRequest | null;
  onClose: () => void;
  onStatusUpdated: (updatedRequest: ServiceRequest) => void;
}

const NEXT_STATUS_MAP: Record<
  RequestStatus,
  { nextStatus: RequestStatus; actionLabel: string; btnClass: string } | null
> = {
  OPEN: {
    nextStatus: 'IN_PROGRESS',
    actionLabel: 'Mark In Progress',
    btnClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
  },
  IN_PROGRESS: {
    nextStatus: 'RESOLVED',
    actionLabel: 'Mark as Resolved',
    btnClass:
      'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white',
  },
  RESOLVED: {
    nextStatus: 'CLOSED',
    actionLabel: 'Close Request',
    btnClass: 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-500 text-white',
  },
  CLOSED: null,
};

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  request,
  onClose,
  onStatusUpdated,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (request) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [request, onClose]);

  if (!request) return null;

  const nextAction = NEXT_STATUS_MAP[request.status];

  const handleStatusTransition = async () => {
    if (!nextAction) return;

    setIsUpdating(true);
    setTransitionError(null);

    try {
      const updated = await requestsApi.updateRequestStatus(
        request.id,
        nextAction.nextStatus
      );
      onStatusUpdated(updated);
    } catch (err) {
      if (err instanceof ApiError && err.payload?.message) {
        setTransitionError(err.payload.message);
      } else {
        setTransitionError(
          err instanceof Error
            ? err.message
            : 'Failed to update request status.'
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider bg-slate-200/70 px-2 py-0.5 rounded">
                Ticket Details
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                  request.status
                )}`}
              >
                {request.status.replace('_', ' ')}
              </span>
            </div>
            <h2
              id="modal-title"
              className="text-xl font-bold text-slate-900 mt-2"
            >
              {request.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {transitionError && (
            <div
              role="alert"
              className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between"
            >
              <span>{transitionError}</span>
              <button
                type="button"
                onClick={() => setTransitionError(null)}
                className="text-rose-700 hover:text-rose-900 text-xs font-semibold px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Description
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
              {request.description}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="block text-xs font-medium text-slate-400">
                Category
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {request.category}
              </span>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-400">
                Priority
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {request.priority}
              </span>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-400">
                Created
              </span>
              <span className="text-xs text-slate-600 block mt-0.5">
                {formatDate(request.created_at)}
              </span>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-400">
                Last Updated
              </span>
              <span className="text-xs text-slate-600 block mt-0.5">
                {formatDate(request.updated_at)}
              </span>
            </div>
          </div>

          {/* Identifier */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-400">
              Identifier (UUID):
            </span>
            <code className="block text-xs font-mono bg-slate-100 p-2 rounded text-slate-700 mt-1 select-all break-all">
              {request.id}
            </code>
          </div>

          {/* Lifecycle State Machine Visualizer */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Lifecycle Progress
            </span>
            <div className="flex items-center space-x-2 text-xs">
              {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as RequestStatus[]).map(
                (step, idx, arr) => {
                  const stepOrder = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
                  const currentIndex = stepOrder.indexOf(request.status);
                  const isCurrent = request.status === step;
                  const isCompleted = currentIndex > idx;

                  return (
                    <React.Fragment key={step}>
                      <span
                        className={`px-2.5 py-1 rounded-md font-medium text-xs border ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        {step.replace('_', ' ')}
                      </span>
                      {idx < arr.length - 1 && (
                        <span className="text-slate-300 font-bold">→</span>
                      )}
                    </React.Fragment>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            Close
          </button>

          {nextAction ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleStatusTransition}
              className={`w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${nextAction.btnClass}`}
            >
              {isUpdating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Updating...
                </>
              ) : (
                <>
                  Advance Status to{' '}
                  <span className="font-bold ml-1">
                    {nextAction.nextStatus.replace('_', ' ')}
                  </span>
                </>
              )}
            </button>
          ) : (
            <span className="text-xs text-slate-500 font-medium italic">
              Ticket is closed (Terminal State).
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
