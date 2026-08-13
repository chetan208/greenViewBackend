import { Request, Response } from "express";
import mongoose from "mongoose";
import Calendar from "@/model/adminModels/calander";

// Helper for Express 5 params
const getSingleParam = (param: any): string => {
    if (typeof param === 'string') return param;
    if (Array.isArray(param) && typeof param[0] === 'string') return param[0];
    return String(param || '');
};

/**
 * Get all calendar events, with optional month/year or date range filters
 */
export const getCalendarEvents = async (req: Request, res: Response) => {
    try {
        const filter: Record<string, any> = {};

        const monthStr = req.query.month as string;
        const yearStr = req.query.year as string;
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;

        if (startDateStr && endDateStr) {
            filter.date = {
                $gte: new Date(startDateStr),
                $lte: new Date(endDateStr)
            };
        } else if (monthStr && yearStr) {
            const month = parseInt(monthStr, 10) - 1; // 0-indexed in JS Date
            const year = parseInt(yearStr, 10);
            if (!isNaN(month) && !isNaN(year)) {
                const startOfMonth = new Date(year, month, 1);
                const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
                filter.date = { $gte: startOfMonth, $lte: endOfMonth };
            }
        }

        const events = await Calendar.find(filter)
            .sort({ date: 1 })
            .lean();

        res.status(200).json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ success: false, message: 'Error fetching calendar events' });
    }
};

/**
 * Get a single calendar event by ID
 */
export const getCalendarEventById = async (req: Request, res: Response) => {
    try {
        const id = getSingleParam(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid event ID format' });
        }

        const event = await Calendar.findById(id).lean();
        if (!event) {
            return res.status(404).json({ success: false, message: 'Calendar event not found' });
        }

        res.status(200).json({ success: true, event });
    } catch (error) {
        console.error('Error fetching calendar event by ID:', error);
        res.status(500).json({ success: false, message: 'Error fetching calendar event' });
    }
};

/**
 * Create a new calendar event
 */
export const createCalendarEvent = async (req: Request, res: Response) => {
    try {
        const { title, description, date, endDate, type } = req.body;

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Event title is required' });
        }

        if (!date) {
            return res.status(400).json({ success: false, message: 'Event date is required' });
        }

        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid start date format' });
        }

        let parsedEndDate: Date | undefined = undefined;
        if (endDate) {
            parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid end date format' });
            }
        }

        let eventType: 'singleDay' | 'multiDay' = type || 'singleDay';
        if (parsedEndDate && parsedEndDate.toDateString() !== parsedDate.toDateString()) {
            eventType = 'multiDay';
        }

        const calendarEvent = new Calendar({
            title: title.trim(),
            description: description ? description.trim() : '',
            date: parsedDate,
            endDate: parsedEndDate,
            type: eventType
        });

        await calendarEvent.save();

        res.status(201).json({
            success: true,
            event: calendarEvent
        });
    } catch (error) {
        console.error('Error creating calendar event:', error);
        res.status(500).json({ success: false, message: 'Error creating calendar event' });
    }
};

/**
 * Update an existing calendar event
 */
export const updateCalendarEvent = async (req: Request, res: Response) => {
    try {
        const id = getSingleParam(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid event ID format' });
        }

        const { title, description, date, endDate, type } = req.body;

        const event = await Calendar.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Calendar event not found' });
        }

        if (title && typeof title === 'string' && title.trim()) {
            event.title = title.trim();
        }

        if (description !== undefined) {
            event.description = typeof description === 'string' ? description.trim() : '';
        }

        if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                event.date = parsedDate;
            }
        }

        if (endDate !== undefined) {
            if (endDate === null || endDate === '') {
                event.endDate = undefined as any;
            } else {
                const parsedEndDate = new Date(endDate);
                if (!isNaN(parsedEndDate.getTime())) {
                    event.endDate = parsedEndDate;
                }
            }
        }

        if (type && ['singleDay', 'multiDay'].includes(type)) {
            event.type = type;
        } else if (event.endDate && event.endDate.toDateString() !== event.date.toDateString()) {
            event.type = 'multiDay';
        } else {
            event.type = 'singleDay';
        }

        await event.save();

        res.status(200).json({ success: true, event });
    } catch (error) {
        console.error('Error updating calendar event:', error);
        res.status(500).json({ success: false, message: 'Error updating calendar event' });
    }
};

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (req: Request, res: Response) => {
    try {
        const id = getSingleParam(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid event ID format' });
        }

        const event = await Calendar.findByIdAndDelete(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Calendar event not found' });
        }

        res.status(200).json({ success: true, message: 'Calendar event deleted successfully' });
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        res.status(500).json({ success: false, message: 'Error deleting calendar event' });
    }
};
