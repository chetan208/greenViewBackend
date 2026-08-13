import mongoose , { Document, Schema } from 'mongoose';

export interface ICalendar extends Document {
    title: string;
    description: string;
    date: Date;
    endDate: Date;
    type: 'singleDay' | 'multiDay';
    createdAt: Date;
    updatedAt: Date;
}

const calendarSchema : Schema<ICalendar> = new Schema({
    title:{
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    date: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
    },
    type: {
        type: String,
        enum: ['singleDay', 'multiDay'],
    }

}, { timestamps: true });

const Calendar = mongoose.model<ICalendar>('Calendar', calendarSchema);

export default Calendar;