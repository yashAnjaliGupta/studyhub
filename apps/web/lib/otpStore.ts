const globalForOtp = globalThis as unknown as {
    otpStore: Map<string, string> | undefined;
};

export const otpStore = globalForOtp.otpStore ?? new Map<string, string>();

if (process.env.NODE_ENV !== "production") {
    globalForOtp.otpStore = otpStore;
}
