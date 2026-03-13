#!/bin/bash
set -e

# ===========================================
# UILSON CI/CD 自動セットアップスクリプト
# Cloud Shell で実行: bash scripts/setup-cicd.sh
# ===========================================

PROJECT_ID="uilson-489209"
SA_EMAIL="uilson-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
REPO_OWNER="masatakakinoshita-blip"
REPO_NAME="uilson"
KEY_FILE="/tmp/firebase-sa-key.json"

echo "=== UILSON CI/CD セットアップ開始 ==="

# 1. サービスアカウントに必要な権限を付与
echo "[1/5] サービスアカウントに Firebase Hosting 権限を付与..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/firebasehosting.admin" \
  --quiet 2>/dev/null || true

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.viewer" \
  --quiet 2>/dev/null || true

echo "  -> 権限付与完了"

# 2. サービスアカウントキーを作成
echo "[2/5] サービスアカウントキーを作成..."
if [ -f "$KEY_FILE" ]; then
  rm "$KEY_FILE"
fi
gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$SA_EMAIL" \
  --quiet
echo "  -> キー作成完了"

# 3. GitHub トークンを取得（git remote から）
echo "[3/5] GitHub トークンを取得..."
cd ~/uilson 2>/dev/null || cd /home/*/uilson 2>/dev/null || { echo "Error: uilson リポジトリが見つかりません"; exit 1; }

REMOTE_URL=$(git remote get-url origin)
GITHUB_TOKEN=$(echo "$REMOTE_URL" | grep -oP '(?<=https://)[^@]+(?=@github)')

if [ -z "$GITHUB_TOKEN" ]; then
  echo "  -> GitHub トークンがリモートURLに含まれていません"
  echo "  -> 手動で入力してください:"
  read -p "GitHub Personal Access Token: " GITHUB_TOKEN
fi
echo "  -> トークン取得完了"

# 4. GitHub Secrets に登録
echo "[4/5] GitHub Secrets に FIREBASE_SERVICE_ACCOUNT を登録..."

# GitHub API でリポジトリの公開鍵を取得
PUB_KEY_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/secrets/public-key")

KEY_ID=$(echo "$PUB_KEY_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['key_id'])" 2>/dev/null)
PUB_KEY=$(echo "$PUB_KEY_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['key'])" 2>/dev/null)

if [ -z "$KEY_ID" ] || [ -z "$PUB_KEY" ]; then
  echo "  -> GitHub API で公開鍵の取得に失敗"
  echo "  -> 手動でシークレットを設定します"
  echo ""
  echo "=== 手動設定の手順 ==="
  echo "1. https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions/new を開く"
  echo "2. Name: FIREBASE_SERVICE_ACCOUNT"
  echo "3. Value: 以下の内容をコピーペースト"
  cat "$KEY_FILE"
  echo ""
  echo "=== 上記をコピーしてGitHubに登録してください ==="
  rm -f "$KEY_FILE"
  exit 0
fi

# nacl で暗号化して登録
SA_KEY_CONTENT=$(cat "$KEY_FILE")

python3 -c "
import base64, json, sys
from nacl import encoding, public

def encrypt(public_key: str, secret_value: str) -> str:
    pk = public.PublicKey(public_key.encode('utf-8'), encoding.Base64Encoder())
    sealed_box = public.SealedBox(pk)
    encrypted = sealed_box.encrypt(secret_value.encode('utf-8'))
    return base64.b64encode(encrypted).decode('utf-8')

pub_key = '$PUB_KEY'
secret = '''$SA_KEY_CONTENT'''
print(encrypt(pub_key, secret))
" > /tmp/encrypted_secret.txt 2>/dev/null

if [ $? -eq 0 ]; then
  ENCRYPTED=$(cat /tmp/encrypted_secret.txt)
  curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/secrets/FIREBASE_SERVICE_ACCOUNT" \
    -d "{\"encrypted_value\":\"$ENCRYPTED\",\"key_id\":\"$KEY_ID\"}"
  echo "  -> GitHub Secrets 登録完了"
else
  echo "  -> PyNaCl がインストールされていません。インストール中..."
  pip install pynacl --quiet 2>/dev/null || pip3 install pynacl --quiet 2>/dev/null

  ENCRYPTED=$(python3 -c "
import base64, json
from nacl import encoding, public

def encrypt(public_key: str, secret_value: str) -> str:
    pk = public.PublicKey(public_key.encode('utf-8'), encoding.Base64Encoder())
    sealed_box = public.SealedBox(pk)
    encrypted = sealed_box.encrypt(secret_value.encode('utf-8'))
    return base64.b64encode(encrypted).decode('utf-8')

with open('$KEY_FILE') as f:
    secret = f.read()
print(encrypt('$PUB_KEY', secret))
")

  curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/secrets/FIREBASE_SERVICE_ACCOUNT" \
    -d "{\"encrypted_value\":\"$ENCRYPTED\",\"key_id\":\"$KEY_ID\"}"
  echo "  -> GitHub Secrets 登録完了"
fi

# 5. クリーンアップ
echo "[5/5] クリーンアップ..."
rm -f "$KEY_FILE" /tmp/encrypted_secret.txt
echo "  -> 一時ファイル削除完了"

echo ""
echo "=== セットアップ完了 ==="
echo "以降は git push origin main するだけで自動デプロイされます"
echo ""

# 最新コードを pull して deploy（今回分）
echo "=== 最新コードをデプロイ中 ==="
git pull origin main
npm install
npm run build
firebase deploy --only hosting:staging
echo ""
echo "=== 全完了 ==="
