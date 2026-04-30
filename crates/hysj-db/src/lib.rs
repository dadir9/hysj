pub mod models;
pub mod users;
pub mod devices;
pub mod keys;
pub mod groups;
pub mod login_attempts;
pub mod contacts;
pub mod contact_requests;
pub mod settings;
pub mod pinned_messages;
pub mod vpn;
pub mod emojis;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("query failed: {0}")]
    QueryFailed(String),

    #[error("record not found")]
    NotFound,

    #[error("conflict: {0}")]
    Conflict(String),
}

impl From<sqlx::Error> for DbError {
    fn from(e: sqlx::Error) -> Self {
        match e {
            sqlx::Error::RowNotFound => DbError::NotFound,
            sqlx::Error::Database(ref db_err) => {
                // PostgreSQL unique violation = 23505
                if db_err.code().as_deref() == Some("23505") {
                    DbError::Conflict(db_err.message().to_string())
                } else {
                    DbError::QueryFailed(e.to_string())
                }
            }
            _ => DbError::QueryFailed(e.to_string()),
        }
    }
}
