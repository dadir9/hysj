use std::time::{Duration, Instant};

use dashmap::DashMap;

/// Simple in-memory rate limiter using a sliding window approach.
///
/// Each key maps to a list of request timestamps. When checking the limit,
/// expired entries outside the window are pruned first.
pub struct RateLimiter {
    entries: DashMap<String, Vec<Instant>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            entries: DashMap::new(),
        }
    }

    /// Check if a request is within the rate limit.
    ///
    /// Returns `true` if the request is allowed, `false` if rate-limited.
    /// Automatically records the request if allowed.
    pub fn check_rate_limit(
        &self,
        key: &str,
        max_requests: u32,
        window: Duration,
    ) -> bool {
        let now = Instant::now();
        let cutoff = now - window;

        let mut entry = self.entries.entry(key.to_string()).or_default();

        // Prune expired entries
        entry.retain(|&t| t > cutoff);

        if entry.len() >= max_requests as usize {
            return false;
        }

        entry.push(now);
        true
    }

    /// Remove all entries older than the given duration.
    /// Call this periodically to prevent memory leaks.
    pub fn cleanup(&self, max_age: Duration) {
        let cutoff = Instant::now() - max_age;

        self.entries.retain(|_, timestamps| {
            timestamps.retain(|&t| t > cutoff);
            !timestamps.is_empty()
        });
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}
