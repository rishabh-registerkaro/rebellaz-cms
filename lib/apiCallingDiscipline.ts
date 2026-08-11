import axiosInstance from "./axiosInstance";

export interface Discipline {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  active: boolean;
  /** How many roles currently use this discipline. Present on list responses. */
  careerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplinePayload {
  name: string;
  slug?: string;
  description?: string;
  position?: number;
  active?: boolean;
}

function apiError(error: unknown, fallback: string): Error {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
  return new Error(message);
}

export const getDisciplines = async (
  activeOnly = false
): Promise<{ success: boolean; disciplines: Discipline[] }> => {
  try {
    const { data } = await axiosInstance.get("/api/disciplines", {
      params: activeOnly ? { active: "true" } : undefined,
    });
    return data;
  } catch (error) {
    throw apiError(error, "Failed to fetch disciplines");
  }
};

export const createDiscipline = async (payload: DisciplinePayload) => {
  try {
    const { data } = await axiosInstance.post("/api/disciplines", payload);
    return data;
  } catch (error) {
    throw apiError(error, "Failed to create discipline");
  }
};

export const updateDiscipline = async (id: string, payload: Partial<DisciplinePayload>) => {
  try {
    const { data } = await axiosInstance.put(`/api/disciplines/${id}`, payload);
    return data;
  } catch (error) {
    throw apiError(error, "Failed to update discipline");
  }
};

export const deleteDiscipline = async (id: string) => {
  try {
    const { data } = await axiosInstance.delete(`/api/disciplines/${id}`);
    return data;
  } catch (error) {
    throw apiError(error, "Failed to delete discipline");
  }
};
