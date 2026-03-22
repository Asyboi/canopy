export interface PaginationOptions {
  page: number;
  limit: number;
}

export function paginate<T>(items: T[], opts: PaginationOptions): T[] {
  const start = (opts.page - 1) * opts.limit;
  return items.slice(start, start + opts.limit);
}
