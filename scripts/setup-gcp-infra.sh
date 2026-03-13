#!/bin/bash
# UILSON GCP Infrastructure Setup Script
# Run this on Cloud Shell with owner account
# Usage: bash scripts/setup-gcp-infra.sh

set -e
PROJECT_ID="uilson-489209"
REGION="asia-northeast1"
SA_EMAIL="uilson-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=== [1/7] Enabling APIs ==="
gcloud config set account masataka.kinoshita@ulsconsulting.co.jp
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  pubsub.googleapis.com \
  eventarc.googleapis.com \
  aiplatform.googleapis.com \
  --quiet

echo "=== [2/7] Creating Artifact Registry ==="
gcloud artifacts repositories describe uilson --location=$REGION 2>/dev/null || \
gcloud artifacts repositories create uilson \
  --repository-format=docker \
  --location=$REGION \
  --description="UILSON container images"

echo "=== [3/7] Creating CloudSQL PostgreSQL instance ==="
# Check if instance exists
if gcloud sql instances describe uilson-db --quiet 2>/dev/null; then
  echo "CloudSQL instance uilson-db already exists, skipping..."
else
  gcloud sql instances create uilson-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --storage-size=10GB \
    --storage-auto-increase \
    --availability-type=zonal \
    --quiet
  echo "Waiting for instance to be ready..."
  sleep 30
fi

echo "=== [4/7] Setting up PostgreSQL database & user ==="
# Set postgres password
gcloud sql users set-password postgres \
  --instance=uilson-db \
  --password="uilson-staging-2026" \
  --quiet 2>/dev/null || true

# Create database
gcloud sql databases describe uilson --instance=uilson-db 2>/dev/null || \
gcloud sql databases create uilson --instance=uilson-db --quiet

# Create app user
gcloud sql users describe uilson --instance=uilson-db 2>/dev/null || \
gcloud sql users create uilson \
  --instance=uilson-db \
  --password="uilson-app-2026" \
  --quiet

# Enable pgvector extension via Cloud SQL
echo "Enabling pgvector..."
gcloud sql connect uilson-db --user=postgres --quiet <<EOF
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF

echo "=== [5/7] Creating Pub/Sub topics ==="
gcloud pubsub topics describe uilson-data-change 2>/dev/null || \
gcloud pubsub topics create uilson-data-change

gcloud pubsub topics describe uilson-suggestion-compute 2>/dev/null || \
gcloud pubsub topics create uilson-suggestion-compute

gcloud pubsub topics describe uilson-memory-consolidate 2>/dev/null || \
gcloud pubsub topics create uilson-memory-consolidate

echo "=== [6/7] Granting SA permissions for Cloud Run ==="
# Cloud Run invoker
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin" --quiet 2>&1 | tail -1

# Artifact Registry writer
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.writer" --quiet 2>&1 | tail -1

# Cloud SQL client
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client" --quiet 2>&1 | tail -1

# Pub/Sub publisher/subscriber
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/pubsub.editor" --quiet 2>&1 | tail -1

# Vertex AI user
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/aiplatform.user" --quiet 2>&1 | tail -1

# Cloud Build
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudbuild.builds.editor" --quiet 2>&1 | tail -1

# Service account user (for Cloud Run to use SA)
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser" --quiet 2>&1 | tail -1

echo "=== [7/7] Building and deploying Cloud Run ==="
cd ~/uilson
git pull

# Build Docker image
cd server
gcloud builds submit \
  --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/uilson/api:latest \
  --quiet

# Deploy to Cloud Run
gcloud run deploy uilson-api \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/uilson/api:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300 \
  --set-env-vars="GCLOUD_PROJECT=${PROJECT_ID}" \
  --set-env-vars="PGUSER=uilson" \
  --set-env-vars="PGPASSWORD=uilson-app-2026" \
  --set-env-vars="PGDATABASE=uilson" \
  --add-cloudsql-instances=${PROJECT_ID}:${REGION}:uilson-db \
  --set-env-vars="INSTANCE_UNIX_SOCKET=/cloudsql/${PROJECT_ID}:${REGION}:uilson-db" \
  --service-account=$SA_EMAIL \
  --quiet

echo ""
echo "=============================="
echo "  UILSON GCP Setup Complete!"
echo "=============================="
echo ""
CLOUD_RUN_URL=$(gcloud run services describe uilson-api --region=$REGION --format='value(status.url)' 2>/dev/null)
echo "Cloud Run API: $CLOUD_RUN_URL"
echo "CloudSQL:      uilson-db ($REGION)"
echo "Staging:       https://uilson-staging.web.app"
echo ""
echo "Switch back to SA: gcloud config set account $SA_EMAIL"
