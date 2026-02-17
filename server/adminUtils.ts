import { db } from "./db";
import { globalSettings, dailyAnalytics, interviewSlots, interviews } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

/**
 * Admin Settings Helper Functions
 */
export async function getGlobalSetting(key: string): Promise<string | null> {
    const result = await db.select().from(globalSettings).where(eq(globalSettings.key, key)).limit(1);
    return result[0]?.value || null;
}

export async function setGlobalSetting(key: string, value: string, description?: string): Promise<void> {
    const existing = await db.select().from(globalSettings).where(eq(globalSettings.key, key)).limit(1);

    if (existing.length > 0) {
        await db.update(globalSettings)
            .set({ value, updatedAt: new Date() })
            .where(eq(globalSettings.key, key));
    } else {
        await db.insert(globalSettings).values({ key, value, description });
    }
}

export async function isInterviewsEnabled(): Promise<boolean> {
    const value = await getGlobalSetting("interviews_enabled");
    return value !== "false"; // Default to true if not set
}

/**
 * Analytics Helper Functions
 */
export async function logInterviewCompletion(interviewId: string, duration: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hour = new Date().getHours();

    const existing = await db.select().from(dailyAnalytics)
        .where(eq(dailyAnalytics.date, today))
        .limit(1);

    if (existing.length > 0) {
        const current = existing[0];
        const newTotal = current.totalInterviews + 1;
        const newAvg = ((current.avgDurationMinutes || 0) * current.totalInterviews + duration) / newTotal;

        await db.update(dailyAnalytics)
            .set({
                totalInterviews: newTotal,
                avgDurationMinutes: newAvg,
                peakHour: current.peakHour || hour
            })
            .where(eq(dailyAnalytics.date, today));
    } else {
        await db.insert(dailyAnalytics).values({
            date: today,
            totalInterviews: 1,
            avgDurationMinutes: duration,
            peakHour: hour,
            totalUsers: 0
        });
    }
}

export async function getDailyAnalytics(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return await db.select().from(dailyAnalytics)
        .where(gte(dailyAnalytics.date, startDate))
        .orderBy(dailyAnalytics.date);
}

export async function getTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayInterviews = await db.select()
        .from(interviews)
        .where(and(
            gte(interviews.createdAt, today),
            lte(interviews.createdAt, tomorrow)
        ));

    const completed = todayInterviews.filter(i => i.status === 'completed').length;
    const inProgress = todayInterviews.filter(i => i.status === 'in_progress').length;

    return {
        total: todayInterviews.length,
        completed,
        inProgress,
        avgDuration: todayInterviews
            .filter(i => i.duration)
            .reduce((sum, i) => sum + (i.duration || 0), 0) / (completed || 1)
    };
}
