export const generateOtp = (): string => {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOtpSms = async (phone: string, otp: string): Promise<boolean> => {
    // TODO: Implement actual SMS sending logic (e.g., MSG91, Twilio, AWS SNS)
    // For now, this is a placeholder. The OTP is returned in the API response in dev mode.
    console.log(`[SMS PLACEHOLDER] Sending OTP ${otp} to phone ${phone}`);
    return true;
};
