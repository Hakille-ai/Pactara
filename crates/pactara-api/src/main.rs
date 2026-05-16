use std::{env, net::SocketAddr};

use anyhow::Context;
use pactara_api::{build_router, AppState};
use pactara_db::Db;
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = env::var("DATABASE_URL").context("DATABASE_URL is required")?;
    let host = env::var("PACTARA_API_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PACTARA_API_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .context("PACTARA_API_PORT must be a number")?;

    let db = Db::connect(&database_url).await?;
    db.migrate().await?;

    let state = AppState::new(
        db,
        env_flag("PACTARA_AUTH_REQUIRED", false),
        env_flag("PACTARA_DEV_CUSTODY_ENABLED", false),
        env_flag("PACTARA_DEV_SESSIONS_ENABLED", false),
    );
    let app = build_router(state);
    let addr: SocketAddr = format!("{}:{}", host, port).parse()?;
    let listener = TcpListener::bind(addr).await?;

    tracing::info!("PACTARA API listening on http://{}", addr);
    axum::serve(listener, app).await?;

    Ok(())
}

fn env_flag(key: &str, default: bool) -> bool {
    env::var(key)
        .map(|value| matches!(value.as_str(), "true" | "1" | "yes" | "on"))
        .unwrap_or(default)
}
