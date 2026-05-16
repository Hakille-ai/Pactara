# PACTARA Infrastructure

This guide covers the local Docker stack, Kubernetes manifests, and CI image pipeline.

## Local Docker Compose

Start the full stack:

```bash
docker compose up --build
```

Services:

- API: `http://localhost:8080`
- Web dashboard: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

The default Compose setup is development-friendly:

- `PACTARA_AUTH_REQUIRED=false`
- `PACTARA_DEV_SESSIONS_ENABLED=true`
- `PACTARA_CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:3001`

Smoke checks:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
curl http://localhost:3001
```

Useful operations:

```bash
docker compose logs -f api
docker compose logs -f web
docker compose ps
docker compose down
docker compose down -v
```

Use `docker compose down -v` only when you want to delete the local PostgreSQL volume.

## Environment

Runtime variables used by the API:

- `DATABASE_URL`: PostgreSQL connection string.
- `PACTARA_API_HOST`: API bind host, usually `0.0.0.0` in containers.
- `PACTARA_API_PORT`: API bind port, usually `8080`.
- `PACTARA_AUTH_REQUIRED`: requires `x-pactara-session` for protected mutations when true.
- `PACTARA_DEV_CUSTODY_ENABLED`: enables server-side development custody flows when true.
- `PACTARA_DEV_SESSIONS_ENABLED`: allows `/v1/auth/sessions/dev` when true.
- `PACTARA_CORS_ALLOW_ORIGINS`: comma-separated allowed browser origins.
- `RUST_LOG`: tracing filter for API logs.

Runtime/build variable used by the web app:

- `NEXT_PUBLIC_PACTARA_API_URL`: public API base URL. For Next.js browser bundles, pass this as a Docker build arg as well as a runtime env var.

## Kubernetes

Manifests live under `infra/k8s` and use Kustomize:

- `infra/k8s/base`: shared API, web, Postgres, ConfigMap, Services, PVC, and Ingress.
- `infra/k8s/overlays/local`: local cluster defaults with auth relaxed.
- `infra/k8s/overlays/prod`: production defaults with auth required and dev sessions disabled.

Render manifests:

```bash
kubectl kustomize infra/k8s/overlays/local
kubectl kustomize infra/k8s/overlays/prod
```

Create namespaces:

```bash
kubectl create namespace pactara-local
kubectl create namespace pactara
```

Create secrets before applying an overlay. Local example:

```bash
kubectl -n pactara-local create secret generic pactara-postgres \
  --from-literal=password=pactara \
  --from-literal=database-url=postgres://pactara:pactara@pactara-postgres:5432/pactara
```

Production example shape:

```bash
kubectl -n pactara create secret generic pactara-postgres \
  --from-literal=password='<postgres-password>' \
  --from-literal=database-url='postgres://pactara:<postgres-password>@pactara-postgres:5432/pactara'
```

Apply:

```bash
kubectl apply -k infra/k8s/overlays/local
kubectl apply -k infra/k8s/overlays/prod
```

The base Ingress uses placeholder hosts:

- `api.pactara.local`
- `app.pactara.local`

Patch those hosts in an environment-specific overlay before real production use.

## CI/CD

GitHub Actions workflows:

- `.github/workflows/ci.yml`: runs Rust tests, Next.js build, Docker image builds, and Kustomize rendering.
- `.github/workflows/publish-images.yml`: builds and pushes API/web images to GHCR on `main`.

Published image tags:

- `ghcr.io/<owner>/<repo>/pactara-api:<sha>`
- `ghcr.io/<owner>/<repo>/pactara-api:latest`
- `ghcr.io/<owner>/<repo>/pactara-web:<sha>`
- `ghcr.io/<owner>/<repo>/pactara-web:latest`

The production overlay uses placeholder image names. Replace them with the published GHCR namespace before deploying:

```bash
cd infra/k8s/overlays/prod
kubectl kustomize . > /tmp/pactara-prod.yml
```

For a direct one-off deploy, set images while applying from the repository root:

```bash
kubectl set image deployment/pactara-api api=ghcr.io/<owner>/<repo>/pactara-api:<sha> -n pactara
kubectl set image deployment/pactara-web web=ghcr.io/<owner>/<repo>/pactara-web:<sha> -n pactara
```

The pipeline does not deploy to a cluster yet. It produces images and validates manifests so cluster-specific credentials can be added later.
