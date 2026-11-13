'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RequestStatus, ServiceRequest } from '@/types/request';
import { requestsApi } from '@/services/requestsApi';
import { CreateRequestForm } from '@/features/requests/components/CreateRequestForm';
import { RequestList } from '@/features/requests/components/RequestList';
import { RequestDetailsModal } from '@/features/requests/components/RequestDetailsModal';

export default function DashboardPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | 'ALL'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await requestsApi.getRequests(
        selectedStatus === 'ALL' ? undefined : selectedStatus
      );
      setRequests(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to service requests API.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRequestCreated = (newRequest: ServiceRequest) => {
    // If the new request matches current filter, prepend it immediately
    if (selectedStatus === 'ALL' || selectedStatus === newRequest.status) {
      setRequests((prev) => [newRequest, ...prev.filter((r) => r.id !== newRequest.id)]);
    }
  };

  const handleStatusUpdated = (updated: ServiceRequest) => {
    // Update item in list
    setRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
    // Keep modal open with updated data
    setSelectedRequest(updated);
    // If filter doesn't match updated status, refetch or filter out
    if (selectedStatus !== 'ALL' && selectedStatus !== updated.status) {
      setRequests((prev) => prev.filter((r) => r.id !== updated.id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              VR
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Service Request Management System
              </h1>
              <p className="text-xs text-slate-500">
                VisionRoot Trainee Software Engineer Platform
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Day 07 Live API Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Grid: Form and Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <CreateRequestForm onRequestCreated={handleRequestCreated} />
          </div>

          <div className="lg:col-span-7">
            <RequestList
              requests={requests}
              isLoading={isLoading}
              error={error}
              selectedStatus={selectedStatus}
              onStatusFilterChange={setSelectedStatus}
              onSelectRequest={setSelectedRequest}
              onRetry={fetchRequests}
            />
          </div>
        </div>
      </main>

      {/* Details Modal */}
      <RequestDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
