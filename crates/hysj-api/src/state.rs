use dashmap::DashMap;
use sqlx::PgPool;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::config::AppConfig;
use crate::middleware::rate_limit::RateLimiter;

pub type WsSender = mpsc::UnboundedSender<axum::extract::ws::Message>;

pub struct AppState {
    pub db: PgPool,
    pub redis: redis::aio::MultiplexedConnection,
    pub config: AppConfig,
    /// Maps device_id -> WebSocket sender for all currently connected devices.
    pub connections: DashMap<Uuid, WsSender>,
    /// In-memory rate limiter.
    pub rate_limiter: RateLimiter,
}

impl AppState {
    pub fn new(
        db: PgPool,
        redis: redis::aio::MultiplexedConnection,
        config: AppConfig,
    ) -> Self {
        Self {
            db,
            redis,
            config,
            connections: DashMap::new(),
            rate_limiter: RateLimiter::new(),
        }
    }
}
