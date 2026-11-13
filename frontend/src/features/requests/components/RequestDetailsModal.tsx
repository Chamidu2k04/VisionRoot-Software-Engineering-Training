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
    actionLabel: 'Advance to In Progress',
    btnClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
  },
  IN_PROGRESS: {
    nextStatus: 'RESOLVED',
    actionLabel: 'Advance to Resolved',
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
  const [currentRequest, setCurrentRequest] = useState<ServiceRequest | null>(
    request
  );
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Fetch live request details from GET /api/requests/:id when opened
  useEffect(() => {
    if (!request?.id) {
      setCurrentRequest(null);
      return;
    }

    setCurrentRequest(request);
    setIsLoadingDetails(true);
    setTransitionError(null);

    let isMounted = true;
    requestsApi
      .getRequestById(request.id)
      .then((liveRequest) => {
        if (isMounted) {
          setCurrentRequest(liveRequest);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn(
            '[RequestDetailsModal] Could not refresh live details, using cached:',
            err
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingDetails(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [request?.id]);

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

  if (!request || !currentRequest) return null;

  const nextAction = NEXT_STATUS_MAP[currentRequest.status];

  const handleStatusTransition = async () => {
    if (!nextAction || !currentRequest) return;

    setIsUpdating(true);
    setTransitionError(null);

    try {
      const updated = await requestsApi.updateRequestStatus(
        currentRequest.id,
        nextAction.nextStatus
      );
      setCurrentRequest(updated);
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
                  currentRequest.status
                )}`}
              >
                {currentRequest.status.replace('_', ' ')}
              </span>
              {isLoadingDetails && (
                <span className="inline-flex items-center text-xs text-indigo-600 font-medium">
                  <svg
                    className="animate-spin mr-1 h-3 w-3 text-indigo-600"
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
                  Syncing...
                </span>
              )}
            </div>
            <h2
              id="modal-title"
              className="text-xl font-bold text-slate-900 mt-2"
            >
              {currentRequest.title}
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
              aria-live="assertive"
              className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between"
            >
              <div className="flex items-start space-x-2">
                <svg
                  className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className="font-semibold">Backend Error:</span>{' '}
                  {transitionError}
                </div>
              </div>
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
              {currentRequest.description}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="block text-xs font-medium text-slate-400">
                Category
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {currentRequest.category}
              </span>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-400">
                Priority
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {currentRequest.priority}
              </span>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-400">
                Created
              </span>
              <span className="text-xs text-slate-600 block mt-0.5">
                {formatDate(currentRequest.created_at)}
              </span>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-400">
                Last Updated
              </span>
              <span className="text-xs text-slate-600 block mt-0.5">
                {formatDate(currentRequest.updated_at)}
              </span>
            </div>
          </div>

          {/* Identifier */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-400">
              Identifier (UUID):
            </span>
            <code className="block text-xs font-mono bg-slate-100 p-2 rounded text-slate-700 mt-1 select-all break-all">
              {currentRequest.id}
            </code>
          </div>

          {/* Lifecycle State Machine Visualizer */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Lifecycle Progress
            </span>
            <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1">
              {(
                ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as RequestStatus[]
              ).map((step, idx, arr) => {
                const stepOrder = [
                  'OPEN',
                  'IN_PROGRESS',
                  'RESOLVED',
                  'CLOSED',
                ];
                const currentIndex = stepOrder.indexOf(currentRequest.status);
                const isCurrent = currentRequest.status === step;
                const isCompleted = currentIndex > idx;

                return (
                  <React.Fragment key={step}>
                    <span
                      className={`px-2.5 py-1 rounded-md font-medium text-xs border whitespace-nowrap ${
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
              })}
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
              onClick={() => handleStatusTransition()}
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
