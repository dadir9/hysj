use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{delete, get, post, put};
use axum::Json;
use axum::Router;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

mod background;
mod config;
mod error;
mod middleware;
mod routes;
mod state;
mod ws;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    // 2. Load config
    dotenvy::dotenv().ok();
    let config = config::AppConfig::from_env()?;

    // 3. Create database pool + run migrations
    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await?;
    sqlx::migrate!("../../migrations").run(&db_pool).await?;

    // 4. Create Redis connection
    let redis_client = redis::Client::open(config.redis_url.as_str())?;
    let redis_conn = redis_client.get_multiplexed_async_connection().await?;

    // 5. Build app state
    let state = Arc::new(state::AppState::new(db_pool, redis_conn, config.clone()));

    // 6. Spawn background tasks
    background::spawn_all(state.clone());

    // 7. Build router
    let app = build_router(state);

    // 8. Start server with graceful shutdown
    let addr = config.server_address.clone();
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Hysj API listening on {}", addr);
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("Server shut down gracefully");

    Ok(())
}

/// Wait for CTRL+C or SIGTERM (Unix) to initiate graceful shutdown.
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => { tracing::info!("Received Ctrl+C, shutting down..."); },
        _ = terminate => { tracing::info!("Received SIGTERM, shutting down..."); },
    }
}

/// GET /health — check DB + Redis connectivity (no auth required)
async fn health_check(
    State(state): State<Arc<state::AppState>>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Check DB
    let db_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.db)
        .await
        .is_ok();

    // Check Redis
    let redis_ok = {
        let mut redis = state.redis.clone();
        redis::cmd("PING")
            .query_async::<String>(&mut redis)
            .await
            .is_ok()
    };

    if db_ok && redis_ok {
        Ok(Json(serde_json::json!({
            "status": "healthy",
            "db": "ok",
            "redis": "ok"
        })))
    } else {
        Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "status": "unhealthy",
                "db": if db_ok { "ok" } else { "error" },
                "redis": if redis_ok { "ok" } else { "error" }
            })),
        ))
    }
}

fn build_router(state: Arc<state::AppState>) -> Router {
    let mut app = Router::new()
        // Health check (no auth)
        .route("/health", get(health_check))
        // Auth routes
        .route("/api/auth/register", post(routes::auth::register))
        .route("/api/auth/login", post(routes::auth::login))
        .route("/api/auth/refresh", post(routes::auth::refresh))
        .route("/api/auth/2fa/setup", post(routes::auth::setup_2fa))
        .route("/api/auth/2fa/verify", post(routes::auth::verify_2fa))
        .route(
            "/api/auth/sender-certificate",
            post(routes::auth::sender_certificate),
        )
        .route(
            "/api/auth/set-username",
            post(routes::auth::set_username),
        )
        .route(
            "/api/auth/username-available/:username",
            get(routes::auth::username_available),
        )
        .route(
            "/api/auth/set-display-name",
            post(routes::auth::set_display_name),
        )
        .route(
            "/api/auth/account",
            delete(routes::auth::delete_account),
        )
        .route(
            "/api/auth/set-avatar",
            post(routes::auth::set_avatar),
        )
        // User status (set)
        .route(
            "/api/users/status",
            put(routes::auth::set_user_status),
        )
        // Key routes
        .route(
            "/api/keys/:user_id",
            get(routes::keys::get_pre_key_bundle),
        )
        .route(
            "/api/keys/replenish",
            post(routes::keys::replenish_pre_keys),
        )
        // Device routes
        .route("/api/devices", get(routes::devices::list_devices))
        .route(
            "/api/devices/:device_id",
            delete(routes::devices::delete_device),
        )
        // Group routes
        .route(
            "/api/groups",
            post(routes::groups::create_group).get(routes::groups::list_groups),
        )
        .route(
            "/api/groups/:group_id",
            get(routes::groups::get_group)
                .put(routes::groups::update_group)
                .delete(routes::groups::delete_group),
        )
        .route(
            "/api/groups/:group_id/members",
            post(routes::groups::add_member),
        )
        .route(
            "/api/groups/:group_id/members/:user_id",
            delete(routes::groups::remove_member),
        )
        .route(
            "/api/groups/:group_id/leave",
            post(routes::groups::leave_group),
        )
        // Contact routes
        .route(
            "/api/contacts",
            get(routes::contacts::list_contacts),
        )
        .route(
            "/api/contacts/:user_id",
            post(routes::contacts::add_contact).delete(routes::contacts::remove_contact),
        )
        .route(
            "/api/contacts/:user_id/nickname",
            put(routes::contacts::set_nickname),
        )
        .route(
            "/api/contacts/:user_id/block",
            post(routes::contacts::block_contact),
        )
        .route(
            "/api/contacts/:user_id/unblock",
            post(routes::contacts::unblock_contact),
        )
        // Wipe routes
        .route("/api/wipe", post(routes::wipe::issue_wipe))
        .route("/api/wipe/:wipe_id", get(routes::wipe::wipe_status))
        // Contact request routes
        .route(
            "/api/contact-requests/:user_id",
            post(routes::contact_requests::send_request),
        )
        .route(
            "/api/contact-requests/incoming",
            get(routes::contact_requests::list_incoming),
        )
        .route(
            "/api/contact-requests/:request_id/accept",
            post(routes::contact_requests::accept_request),
        )
        .route(
            "/api/contact-requests/:request_id/reject",
            post(routes::contact_requests::reject_request),
        )
        // Settings routes
        .route(
            "/api/settings",
            get(routes::settings::get_settings).put(routes::settings::update_settings),
        )
        .route("/api/settings/mute", post(routes::settings::mute_chat))
        .route("/api/settings/muted", get(routes::settings::list_muted))
        // Online status (get)
        .route(
            "/api/users/:user_id/status",
            get(routes::status::get_status),
        )
        // WebSocket
        .route("/ws", get(ws::handler::ws_upgrade));

    // Optional feature routes
    #[cfg(feature = "vpn")]
    {
        app = app
            .route("/api/vpn/connect", post(routes::vpn::connect))
            .route("/api/vpn/disconnect", post(routes::vpn::disconnect))
            .route("/api/vpn/status", get(routes::vpn::status))
            .route("/api/vpn/servers", get(routes::vpn::list_servers));
    }

    #[cfg(feature = "emojis")]
    {
        app = app
            .route(
                "/api/emojis/packs",
                post(routes::emojis::create_pack).get(routes::emojis::list_packs),
            )
            .route(
                "/api/emojis/packs/:pack_id",
                get(routes::emojis::get_pack),
            )
            .route(
                "/api/emojis/packs/:pack_id/purchase",
                post(routes::emojis::purchase_pack),
            )
            .route("/api/emojis/mine", get(routes::emojis::my_packs))
            .route(
                "/api/emojis/packs/:pack_id/emojis",
                post(routes::emojis::add_emoji),
            );
    }

    #[cfg(feature = "relay")]
    {
        app = app.route("/api/relay/nodes", get(routes::relay::list_nodes));
    }

    #[cfg(feature = "files")]
    {
        app = app
            .route("/api/files/upload-init", post(routes::files::upload_init))
            .route(
                "/api/files/:file_id/upload",
                put(routes::files::upload_blob),
            )
            .route(
                "/api/files/:file_id",
                get(routes::files::download_blob).delete(routes::files::delete_file),
            )
            .route("/api/files/:file_id/meta", get(routes::files::file_meta));
    }

    // OTP verification routes
    app = app
        .route("/api/auth/otp/send", post(routes::otp::send_otp))
        .route("/api/auth/otp/verify", post(routes::otp::verify_otp));

    // Push notification routes
    app = app
        .route(
            "/api/push/register",
            post(routes::push::register_push_token),
        )
        .route(
            "/api/push/unregister",
            post(routes::push::unregister_push_token),
        );

    // Audio message routes (voice messages with AI voice transformation)
    app = app
        .route(
            "/api/audio/upload-init",
            post(routes::audio::upload_init),
        )
        .route(
            "/api/audio/:audio_id/upload",
            put(routes::audio::upload_blob),
        )
        .route(
            "/api/audio/:audio_id",
            get(routes::audio::download_blob).delete(routes::audio::delete_audio),
        )
        .route(
            "/api/audio/:audio_id/meta",
            get(routes::audio::audio_meta),
        );

    // Middleware
    // TODO: Restrict CORS origins for production
    app.layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state)
}
