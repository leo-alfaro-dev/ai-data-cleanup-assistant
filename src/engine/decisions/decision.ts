// An issue with no decision is pending. Rejecting is also how an issue without a suggestion is dismissed.
export type Decision = { status: 'accepted' } | { status: 'rejected' };
