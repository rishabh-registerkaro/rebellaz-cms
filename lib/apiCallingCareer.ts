import axiosInstance from "./axiosInstance";

export interface Career {
  _id: string;
  title: string;
  slug: string;
  category: string;
  location: string;
  type: string;
  duration: string;
  salary: string;
  unit: string;
  featured: boolean;
  description: string | null;
  summary: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  author?: { _id: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CareerPayload {
  title: string;
  slug?: string;
  category: string;
  location: string;
  type: string;
  duration: string;
  salary: string;
  unit: string;
  featured: boolean;
  description?: string;
  summary?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: "draft" | "published";
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface GetCareersParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  type?: string;
  status?: string;
  featured?: string;
  sort?: "newest" | "oldest";
}

export interface GetCareersResponse {
  success: boolean;
  message: string;
  careers: Career[];
  pagination: Pagination;
}

/** Axios rejects non-2xx, so surface the API's message rather than "Request failed". */
function apiError(error: unknown, fallback: string): Error {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
  return new Error(message);
}

export const getCareers = async (params: GetCareersParams = {}): Promise<GetCareersResponse> => {
  try {
    // Drop empty values so the API doesn't filter on "".
    const query = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
    );
    const { data } = await axiosInstance.get("/api/careers", { params: query });
    return data;
  } catch (error) {
    throw apiError(error, "Failed to fetch careers");
  }
};

export const getCareerById = async (id: string): Promise<{ success: boolean; data: Career }> => {
  try {
    const { data } = await axiosInstance.get(`/api/careers/${id}`);
    return data;
  } catch (error) {
    throw apiError(error, "Failed to fetch career");
  }
};

export const createCareer = async (payload: CareerPayload) => {
  try {
    const { data } = await axiosInstance.post("/api/careers", payload);
    return data;
  } catch (error) {
    throw apiError(error, "Failed to create career");
  }
};

export const updateCareer = async (id: string, payload: Partial<CareerPayload>) => {
  try {
    const { data } = await axiosInstance.put(`/api/careers/${id}`, payload);
    return data;
  } catch (error) {
    throw apiError(error, "Failed to update career");
  }
};

export const deleteCareer = async (id: string) => {
  try {
    const { data } = await axiosInstance.delete(`/api/careers/${id}`);
    return data;
  } catch (error) {
    throw apiError(error, "Failed to delete career");
  }
};
