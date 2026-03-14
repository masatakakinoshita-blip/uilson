#!/bin/bash
set -e

# ===========================================
# Private Service Connect (PSC) 設定スクリプト
# Vertex AI API をプライベートネットワーク経由で接続
# Cloud Shell で実行: bash scripts/setup-psc.sh
# ===========================================

PROJECT_ID="uilson-489209"
REGION="asia-northeast1"
NETWORK="default"
SUBNET_NAME="uilson-psc-subnet"
PSC_ENDPOINT_NAME="uilson-vertex-psc"
CLOUD_RUN_SERVICE="uilson-api"

echo "=== Private Service Connect セットアップ開始 ==="

# 1. API を有効化
echo "[1/5] 必要な API を有効化..."
gcloud services enable servicenetworking.googleapis.com \
  --project=$PROJECT_ID --quiet 2>/dev/null
gcloud services enable compute.googleapis.com \
  --project=$PROJECT_ID --quiet 2>/dev/null
echo "  -> API 有効化完了"

# 2. PSC 用サブネットを作成（まだ存在しない場合）
echo "[2/5] PSC サブネットを確認/作成..."
if gcloud compute networks subnets describe $SUBNET_NAME \
  --region=$REGION --project=$PROJECT_ID &>/dev/null; then
  echo "  -> サブネット '$SUBNET_NAME' は既に存在"
else
  gcloud compute networks subnets create $SUBNET_NAME \
    --network=$NETWORK \
    --region=$REGION \
    --range=10.100.0.0/24 \
    --purpose=PRIVATE_SERVICE_CONNECT \
    --project=$PROJECT_ID \
    --quiet
  echo "  -> サブネット作成完了"
fi

# 3. Private Service Connect エンドポイントを作成
echo "[3/5] PSC エンドポイントを確認/作成..."
if gcloud compute forwarding-rules describe $PSC_ENDPOINT_NAME \
  --region=$REGION --project=$PROJECT_ID &>/dev/null; then
  echo "  -> PSC エンドポイント '$PSC_ENDPOINT_NAME' は既に存在"
else
  gcloud compute addresses create ${PSC_ENDPOINT_NAME}-ip \
    --region=$REGION \
    --subnet=$SUBNET_NAME \
    --purpose=GCE_ENDPOINT \
    --project=$PROJECT_ID \
    --quiet

  PSC_IP=$(gcloud compute addresses describe ${PSC_ENDPOINT_NAME}-ip \
    --region=$REGION --project=$PROJECT_ID --format='value(address)')

  gcloud compute forwarding-rules create $PSC_ENDPOINT_NAME \
    --region=$REGION \
    --network=$NETWORK \
    --address=${PSC_ENDPOINT_NAME}-ip \
    --target-google-apis-bundle=all-apis \
    --project=$PROJECT_ID \
    --quiet

  echo "  -> PSC エンドポイント作成完了 (IP: $PSC_IP)"
fi

# 4. Cloud Run に VPC コネクタを設定（Serverless VPC Access）
echo "[4/5] VPC コネクタを確認/作成..."
CONNECTOR_NAME="uilson-vpc-connector"

if gcloud compute networks vpc-access connectors describe $CONNECTOR_NAME \
  --region=$REGION --project=$PROJECT_ID &>/dev/null; then
  echo "  -> VPC コネクタ '$CONNECTOR_NAME' は既に存在"
else
  gcloud compute networks vpc-access connectors create $CONNECTOR_NAME \
    --region=$REGION \
    --network=$NETWORK \
    --range=10.101.0.0/28 \
    --project=$PROJECT_ID \
    --quiet
  echo "  -> VPC コネクタ作成完了"
fi

# 5. Cloud Run サービスに VPC コネクタを適用
echo "[5/5] Cloud Run に VPC コネクタを適用..."
gcloud run services update $CLOUD_RUN_SERVICE \
  --region=$REGION \
  --vpc-connector=$CONNECTOR_NAME \
  --vpc-egress=private-ranges-only \
  --project=$PROJECT_ID \
  --quiet

echo "  -> Cloud Run VPC 設定完了"

echo ""
echo "=== Private Service Connect セットアップ完了 ==="
echo ""
echo "設定内容:"
echo "  - PSC サブネット: $SUBNET_NAME (10.100.0.0/24)"
echo "  - PSC エンドポイント: $PSC_ENDPOINT_NAME"
echo "  - VPC コネクタ: $CONNECTOR_NAME (10.101.0.0/28)"
echo "  - Cloud Run: $CLOUD_RUN_SERVICE (VPC 経由でVertex AI API にアクセス)"
echo ""
echo "Vertex AI API 呼び出しはプライベートネットワーク経由で行われます。"
echo "パブリックインターネットを経由しないため、レイテンシ低減とセキュリティ向上が期待できます。"
