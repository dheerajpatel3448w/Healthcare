import axios from "axios";
import Cookies from "js-cookie";
import {
  IHabitGoal,
  IDailyLog,
  StreakDay,
  TrendDay,
  WeeklyTipResult,
  HabitKey,
} from "../../type";


export const habitURL =
  `${process.env.NEXT_PUBLIC_HABIT_TRACKER_URL}/api/v1/habits`;

const api = axios.create({
  baseURL: habitURL,
  withCredentials: true,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const HabitAPI = {
  getGoals: async () => {
    const response = await api.get<{ success: boolean; data: { goals: IHabitGoal } }>("/goals");
    return response.data.data.goals;
  },

  updateGoals: async (goals: Partial<IHabitGoal>) => {
    const response = await api.post<{ success: boolean; data: { goals: IHabitGoal } }>("/goals", goals);
    return response.data.data.goals;
  },

  logHabit: async (habit: HabitKey, value: number | boolean, action: "set" | "increment") => {
    const response = await api.post<{ success: boolean; data: { log: IDailyLog; wellnessScore: number } }>("/log", {
      habit,
      value,
      action,
    });
    return response.data.data;
  },

  getTodayLog: async () => {
    const response = await api.get<{ success: boolean; data: { log: IDailyLog | null; goals: IHabitGoal; wellnessScore: number } }>("/today");
    return response.data.data;
  },

  getStreak: async () => {
    const response = await api.get<{ success: boolean; data: { streak: StreakDay[] } }>("/streak");
    return response.data.data.streak;
  },

  getTrends: async () => {
    const response = await api.get<{ success: boolean; data: { trends: TrendDay[] } }>("/trends");
    return response.data.data.trends;
  },

  getWeeklyTip: async () => {
    const response = await api.get<{ success: boolean; data: WeeklyTipResult }>("/tip");
    return response.data.data;
  },
};
