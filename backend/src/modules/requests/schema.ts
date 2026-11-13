import { z } from 'zod';

export const createRequestSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters long')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters long')
    .max(2000, 'Description cannot exceed 2000 characters'),
  category: z.enum(['IT', 'Facilities', 'Other'], {
    errorMap: () => ({ message: 'Category must be one of: IT, Facilities, Other' }),
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
    errorMap: () => ({ message: 'Priority must be one of: LOW, MEDIUM, HIGH' }),
  }),
});

export const listRequestsQuerySchema = z.object({
  status: z
    .enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
      errorMap: () => ({
        message:
          'Status query parameter must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED',
      }),
    })
    .optional(),
});

export const requestIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identifier must be a valid UUID format' }),
});

export const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
    errorMap: () => ({
      message: 'Status must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED',
    }),
  }),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ListRequestsQueryInput = z.infer<typeof listRequestsQuerySchema>;
export type RequestIdParamInput = z.infer<typeof requestIdParamSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
