// API request/response types

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}
