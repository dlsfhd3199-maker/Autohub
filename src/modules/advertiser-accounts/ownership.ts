export function isProvisioningUserOwnedByRequest(
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined,
  email: string,
  requestId: string,
) {
  return user?.email?.toLowerCase() === email.toLowerCase()
    && user.user_metadata?.provisioning_request_id === requestId;
}
