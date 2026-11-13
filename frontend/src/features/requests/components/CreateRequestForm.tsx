'use client';

import React, { useState } from 'react';
import {
  CreateRequestInput,
  RequestCategory,
  RequestPriority,
  ServiceRequest,
} from '@/types/request';
import { requestsApi, ApiError } from '@/services/requestsApi';

interface CreateRequestFormProps {
  onRequestCreated: (newRequest: ServiceRequest) => void;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
}

const CATEGORIES: RequestCategory[] = ['IT', 'Facilities', 'Other'];
const PRIORITIES: RequestPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export const CreateRequestForm: React.FC<CreateRequestFormProps> = ({
  onRequestCreated,
}) => {
  const [formData, setFormData] = useState<CreateRequestInput>({
    title: '',
    description: '',
    category: 'IT',
    priority: 'MEDIUM',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedTitle) {
      newErrors.title = 'Title is required.';
    } else if (trimmedTitle.length < 5) {
      newErrors.title = 'Title must be at least 5 characters long.';
    } else if (trimmedTitle.length > 120) {
      newErrors.title = 'Title cannot exceed 120 characters.';
    }

    if (!trimmedDescription) {
      newErrors.description = 'Description is required.';
    } else if (trimmedDescription.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long.';
    } else if (trimmedDescription.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters.';
    }

    if (!CATEGORIES.includes(formData.category)) {
      newErrors.category = 'Please select a valid category.';
    }

    if (!PRIORITIES.includes(formData.priority)) {
      newErrors.priority = 'Please select a valid priority level.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error as user types
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (apiError) setApiError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setApiError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await requestsApi.createRequest({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
      });

      setSuccessMessage(
        `Service request #${created.id.slice(0, 8)} created successfully!`
      );
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'IT',
        priority: 'MEDIUM',
      });
      setErrors({});
      onRequestCreated(created);

      // Dismiss success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      if (err instanceof ApiError && err.payload?.details?.length) {
        // Map backend validation errors if returned
        const backendErrors: FormErrors = {};
        err.payload.details.forEach((d) => {
          if (d.field && d.issue) {
            backendErrors[d.field as keyof FormErrors] = d.issue;
          }
        });
        setErrors(backendErrors);
        setApiError(err.payload.message || 'Validation failed on server.');
      } else {
        setApiError(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while creating the request.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          Create New Service Request
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Submit technical or workplace issues to internal support.
        </p>
      </div>

      {successMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 flex items-center justify-between p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800"
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-emerald-600 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {apiError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start justify-between p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800"
        >
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm">
              <span className="font-semibold">Submission failed:</span> {apiError}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Title Field */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            disabled={isSubmitting}
            placeholder="e.g., Laptop display flickering frequently"
            value={formData.title}
            onChange={handleChange}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : 'title-hint'}
            className={`w-full rounded-lg px-3.5 py-2.5 text-sm border transition-colors focus:outline-none focus:ring-2 ${
              errors.title
                ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            } disabled:bg-slate-100 disabled:cursor-not-allowed`}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.title ? (
              <p id="title-error" className="text-xs text-rose-600 font-medium">
                {errors.title}
              </p>
            ) : (
              <p id="title-hint" className="text-xs text-slate-400">
                Between 5 and 120 characters
              </p>
            )}
            <span className="text-xs text-slate-400">
              {formData.title.length}/120
            </span>
          </div>
        </div>

        {/* Category & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              disabled={isSubmitting}
              value={formData.category}
              onChange={handleChange}
              aria-invalid={!!errors.category}
              className={`w-full rounded-lg px-3.5 py-2.5 text-sm border transition-colors focus:outline-none focus:ring-2 ${
                errors.category
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
              } disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="IT">IT (Hardware & Software)</option>
              <option value="Facilities">Facilities (Office & Maintenance)</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {errors.category}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              Priority <span className="text-rose-500">*</span>
            </label>
            <select
              id="priority"
              name="priority"
              disabled={isSubmitting}
              value={formData.priority}
              onChange={handleChange}
              aria-invalid={!!errors.priority}
              className={`w-full rounded-lg px-3.5 py-2.5 text-sm border transition-colors focus:outline-none focus:ring-2 ${
                errors.priority
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
              } disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="LOW">Low (Routine request)</option>
              <option value="MEDIUM">Medium (Normal priority)</option>
              <option value="HIGH">High (Urgent blocker)</option>
            </select>
            {errors.priority && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {errors.priority}
              </p>
            )}
          </div>
        </div>

        {/* Description Field */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            disabled={isSubmitting}
            placeholder="Please detail the exact issue, symptoms, steps to reproduce, or requirements..."
            value={formData.description}
            onChange={handleChange}
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? 'description-error' : 'description-hint'
            }
            className={`w-full rounded-lg px-3.5 py-2.5 text-sm border transition-colors focus:outline-none focus:ring-2 ${
              errors.description
                ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            } disabled:bg-slate-100 disabled:cursor-not-allowed`}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.description ? (
              <p
                id="description-error"
                className="text-xs text-rose-600 font-medium"
              >
                {errors.description}
              </p>
            ) : (
              <p id="description-hint" className="text-xs text-slate-400">
                Between 10 and 2000 characters
              </p>
            )}
            <span className="text-xs text-slate-400">
              {formData.description.length}/2000
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
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
                Submitting Request...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
