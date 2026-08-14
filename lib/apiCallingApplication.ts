import axiosInstance from "./axiosInstance";
import type { Pagination } from "./apiCallingCareer";

/** A candidate's submission — a role application or a talent-pipeline signup. */
export interface CareerApplication {
  _id: string;
  careerId: string | null;
  /** Snapshotted at submission, so a deleted role still reads correctly. */
  roleTitle: string | null;
  roleSlug: string | null;
  discipline: string | null;
  name: string;
  email: string;
  phoneNo: string;
  note: string | null;
  resumeUrl: string | null;
  resumeKey: string | null;
  resumeName: string | null;
  resumeBytes: number | null;
  status: "new" | "reviewing" | "shortlisted" | "rejected" | "hired";
  source: string;
  pagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetApplicationsParams {
  page?: number;
  limit?: number;
  status?: string;
  careerId?: string;
  source?: string;
  search?: string;
}

export interface GetApplicationsResponse {
  success: boolean;
  applications: CareerApplication[];
  pagination: Pagination;
}

/** One role in the careers overview, with how many people applied to it. */
export interface CareerStatRole {
  _id: string;
  title: string;
  slug: string;
  category: string;
  type: string;
  location: string;
  status: "draft" | "published";
  hidden: boolean;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  applications: number;
  lastApplicationAt: string | null;
  /** Published and not hidden — i.e. still collecting applications. */
  live: boolean;
}

export interface CareerStatsResponse {
  success: boolean;
  roles: CareerStatRole[];
  totals: {
    roles: number;
    live: number;
    hidden: number;
    draft: number;
    applications: number;
    unassignedApplications: number;
    byStatus: Record<string, number>;
  };
}

/** An uploaded CV in the resume-assets folder. */
export interface ResumeAsset {
  _id: string;
  id: string;
  key: string;
  filename: string;
  format: string;
  bytes: number;
  url: string;
  createdAt: string;
}

export interface GetResumesResponse {
  success: boolean;
  assets: ResumeAsset[];
  pagination: Pagination;
}

/** Axios rejects non-2xx, so surface the API's message rather than "Request failed". */
function apiError(error: unknown, fallback: string): Error {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
  return new Error(message);
}

export const getApplications = async (
  params: GetApplicationsParams = {}
): Promise<GetApplicationsResponse> => {
  try {
    // Drop empty values so the API doesn't filter on "".
    const query = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
    );
    const { data } = await axiosInstance.get("/api/career-application", { params: query });
    return data;
  } catch (error) {
    throw apiError(error, "Failed to fetch applications");
  }
};

export const updateApplicationStatus = async (id: string, status: string) => {
  try {
    const { data } = await axiosInstance.patch(`/api/career-application/${id}`, { status });
    return data;
  } catch (error) {
    throw apiError(error, "Failed to update application");
  }
};

export const deleteApplication = async (id: string) => {
  try {
    const { data } = await axiosInstance.delete(`/api/career-application/${id}`);
    return data;
  } catch (error) {
    throw apiError(error, "Failed to delete application");
  }
};

export const getCareerStats = async (): Promise<CareerStatsResponse> => {
  try {
    const { data } = await axiosInstance.get("/api/careers/stats");
    return data;
  } catch (error) {
    throw apiError(error, "Failed to load careers overview");
  }
};

export const getResumes = async (
  params: { page?: number; limit?: number; search?: string } = {}
): Promise<GetResumesResponse> => {
  try {
    const query = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
    );
    const { data } = await axiosInstance.get("/api/career-resume", { params: query });
    return data;
  } catch (error) {
    throw apiError(error, "Failed to fetch resumes");
  }
};

export const deleteResume = async (key: string) => {
  try {
    const { data } = await axiosInstance.delete("/api/career-resume", { data: { key } });
    return data;
  } catch (error) {
    throw apiError(error, "Failed to delete resume");
  }
};
