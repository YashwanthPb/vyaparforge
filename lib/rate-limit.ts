
export class RateLimiter {
    private timestamps: Map<string, number[]> = new Map();
    public maxRequests: number;
    public windowMs: number;

    constructor(maxRequests: number, windowMs: number) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    check(key: string): boolean {
        const now = Date.now();
        const timestamps = this.timestamps.get(key) || [];

        // Filter out timestamps older than the window
        const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);

        if (validTimestamps.length >= this.maxRequests) {
            return false;
        }

        validTimestamps.push(now);
        this.timestamps.set(key, validTimestamps);

        // Cleanup periodically (simple implementation)
        if (this.timestamps.size > 1000) {
            this.cleanup();
        }

        return true;
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, timestamps] of this.timestamps.entries()) {
            const valid = timestamps.filter(ts => now - ts < this.windowMs);
            if (valid.length === 0) {
                this.timestamps.delete(key);
            } else {
                this.timestamps.set(key, valid);
            }
        }
    }
}

// Singleton instance for login rate limiting: 5 attempts per 15 mins
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);
