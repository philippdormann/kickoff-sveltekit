import { z } from 'zod';

// Create Account Form Validation
export const createAccountSchema = z.object({
  userId: z.string({ required_error: 'User is required' }),
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(6, { message: 'Account name must be at least 6 characters' })
    .max(64, { message: 'Account name must be less than 64 characters' })
});

// Delete Account Form Validation
export const deleteAccountSchema = z.object({
  accountId: z.number({ required_error: 'Account is required' }).nonnegative()
});

// Account Invite Form Validation
export const createAccountInviteSchema = z.object({
  accountId: z.number({ required_error: 'Account is required' }).nonnegative(),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .max(64, { message: 'Email must be less than 64 characters' })
    .email({ message: 'Email is invalid' })
});

// Remove User From Account Form Validation
export const leaveAccountSchema = z.object({
  accountId: z.number({ required_error: 'Account is required' }).nonnegative(),
  userId: z.string({ required_error: 'User is required' })
});
