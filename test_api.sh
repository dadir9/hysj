#!/bin/bash
# Hysj API End-to-End Test
BASE="http://localhost:8080"
PASS=0
FAIL=0

test_it() {
  local name="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "[PASS] $name"
    PASS=$((PASS+1))
  else
    echo "[FAIL] $name"
    echo "  Want: $expected"
    echo "  Got:  $actual"
    FAIL=$((FAIL+1))
  fi
}

jv() { echo "$1" | sed 's/.*"'"$2"'":"\([^"]*\)".*/\1/'; }

# Generate URL-safe base64 key (no newlines, no control chars)
b64key() {
  dd if=/dev/urandom bs=1 count=$1 2>/dev/null | openssl base64 -A
}

echo "======================================="
echo "  HYSJ API - Full E2E Test"
echo "======================================="

# Generate keys
IK_A=$(b64key 32); SPK_A=$(b64key 32); SIG_A=$(b64key 64)
KYB_A=$(b64key 32); OTK_A1=$(b64key 32); OTK_A2=$(b64key 32)
IK_B=$(b64key 32); SPK_B=$(b64key 32); SIG_B=$(b64key 64)
KYB_B=$(b64key 32); OTK_B1=$(b64key 32)

# ═══ HEALTH ═══
echo ""; echo "-- Health --"
R=$(curl -s $BASE/health)
test_it "Health check" '"status":"healthy"' "$R"

# ═══ OTP ═══
echo ""; echo "-- OTP --"
R=$(curl -s -X POST $BASE/api/auth/otp/send -H "Content-Type: application/json" \
  -d '{"phone_number":"+4799999999"}')
test_it "Send OTP" '"message"' "$R"
sleep 1

# Extract OTP (strip ANSI codes from docker logs)
OTP=$(docker logs hysj-rust-hysj-api-1 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep "+4799999999" | tail -1 | sed 's/.*code=\([0-9]\{6\}\).*/\1/')
echo "  OTP=$OTP"

R=$(curl -s -X POST $BASE/api/auth/otp/verify -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"+4799999999\",\"code\":\"$OTP\"}")
test_it "Verify OTP (correct)" '"verified":true' "$R"

R=$(curl -s -X POST $BASE/api/auth/otp/verify -H "Content-Type: application/json" \
  -d '{"phone_number":"+4712345678","code":"000000"}')
test_it "Verify OTP (wrong)" '"verified":false' "$R"

# ═══ REGISTER USER A ═══
echo ""; echo "-- Auth --"
R=$(curl -s -X POST $BASE/api/auth/register -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser_a\",\"phone_number\":\"+4799999999\",\"password\":\"TestPass123!\",\"identity_public_key\":\"$IK_A\",\"signed_pre_key\":\"$SPK_A\",\"signed_pre_key_signature\":\"$SIG_A\",\"kyber_public_key\":\"$KYB_A\",\"one_time_pre_keys\":[\"$OTK_A1\",\"$OTK_A2\"],\"device_name\":\"Phone A\"}")
test_it "Register User A" 'access_token' "$R"
TOKEN_A=$(jv "$R" "access_token")
USER_A=$(jv "$R" "user_id")
DEVICE_A=$(jv "$R" "device_id")
echo "  UserA=$USER_A DevA=$DEVICE_A"

# LOGIN
R=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"phone_number":"+4799999999","password":"TestPass123!"}')
test_it "Login" 'access_token' "$R"
TOKEN_A=$(jv "$R" "access_token")
REFRESH=$(jv "$R" "refresh_token")

# WRONG PASSWORD
R=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"phone_number":"+4799999999","password":"wrong"}')
test_it "Login wrong pw" 'nvalid' "$R"

# REFRESH
R=$(curl -s -X POST $BASE/api/auth/refresh -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH\"}")
test_it "Refresh token" 'access_token' "$R"
TOKEN_A=$(jv "$R" "access_token")

# REGISTER USER B
R=$(curl -s -X POST $BASE/api/auth/register -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser_b\",\"phone_number\":\"+4788888888\",\"password\":\"TestPass456!\",\"identity_public_key\":\"$IK_B\",\"signed_pre_key\":\"$SPK_B\",\"signed_pre_key_signature\":\"$SIG_B\",\"kyber_public_key\":\"$KYB_B\",\"one_time_pre_keys\":[\"$OTK_B1\"],\"device_name\":\"Phone B\"}")
test_it "Register User B" 'access_token' "$R"
TOKEN_B=$(jv "$R" "access_token")
USER_B=$(jv "$R" "user_id")
DEVICE_B=$(jv "$R" "device_id")
echo "  UserB=$USER_B DevB=$DEVICE_B"

# ═══ PROFILE ═══
echo ""; echo "-- Profile --"
R=$(curl -s -X POST $BASE/api/auth/set-username -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" -d '{"username":"alice_e2e"}')
test_it "Set username" '' "$R"

R=$(curl -s "$BASE/api/auth/username-available/free_xyz")
test_it "Username free" '"available":true' "$R"

R=$(curl -s "$BASE/api/auth/username-available/alice_e2e")
test_it "Username taken" '"available":false' "$R"

R=$(curl -s -X POST $BASE/api/auth/sender-certificate -H "Authorization: Bearer $TOKEN_A")
test_it "Sender cert" 'certificate' "$R"

# ═══ KEYS ═══
echo ""; echo "-- Keys --"
R=$(curl -s "$BASE/api/keys/$USER_B" -H "Authorization: Bearer $TOKEN_A")
test_it "Pre-key bundle" 'identity_public_key' "$R"

# ═══ CONTACTS ═══
echo ""; echo "-- Contacts --"
R=$(curl -s -X POST "$BASE/api/contacts/$USER_B" \
  -H "Authorization: Bearer $TOKEN_A")
test_it "Add contact" '' "$R"

R=$(curl -s $BASE/api/contacts -H "Authorization: Bearer $TOKEN_A")
test_it "List contacts" "$USER_B" "$R"

# ═══ AUDIO ═══
echo ""; echo "-- Audio --"
R=$(curl -s -X POST $BASE/api/audio/upload-init -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"recipient_device_id\":\"$DEVICE_B\",\"duration_seconds\":15,\"blob_size\":4096}")
test_it "Audio init" 'audio_id' "$R"
AID=$(jv "$R" "audio_id")
echo "  AudioID=$AID"

dd if=/dev/urandom bs=1 count=4096 2>/dev/null > /tmp/hysj_a.bin
R=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/audio/$AID/upload" \
  -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/octet-stream" \
  --data-binary @/tmp/hysj_a.bin)
test_it "Audio upload" '204' "$R"

R=$(curl -s "$BASE/api/audio/$AID/meta" -H "Authorization: Bearer $TOKEN_A")
test_it "Audio meta" 'duration_seconds' "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/audio/$AID" -H "Authorization: Bearer $TOKEN_B")
test_it "Audio download" '200' "$R"

# ═══ FILES ═══
echo ""; echo "-- Files --"
R=$(curl -s -X POST $BASE/api/files/upload-init -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"file_name\":\"test.jpg\",\"file_size\":2048,\"chunk_count\":1,\"recipient_device_id\":\"$DEVICE_B\"}")
test_it "File init" 'file_id' "$R"
FID=$(jv "$R" "file_id")

dd if=/dev/urandom bs=1 count=2048 2>/dev/null > /tmp/hysj_f.bin
R=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/files/$FID/upload" \
  -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/octet-stream" \
  --data-binary @/tmp/hysj_f.bin)
test_it "File upload" '204' "$R"

R=$(curl -s "$BASE/api/files/$FID/meta" -H "Authorization: Bearer $TOKEN_A")
test_it "File meta" 'file_size' "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/files/$FID" -H "Authorization: Bearer $TOKEN_B")
test_it "File download" '200' "$R"

# ═══ PUSH ═══
echo ""; echo "-- Push --"
R=$(curl -s -X POST $BASE/api/push/register -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" -d '{"push_token":"fcm-tok-123","platform":"fcm"}')
test_it "Push register" '"message"' "$R"

R=$(curl -s -X POST $BASE/api/push/unregister -H "Authorization: Bearer $TOKEN_A")
test_it "Push unregister" '"message"' "$R"

# ═══ VALIDATION ═══
echo ""; echo "-- Validation --"
R=$(curl -s -X POST $BASE/api/auth/otp/send -H "Content-Type: application/json" \
  -d '{"phone_number":"123"}')
test_it "Bad phone rejected" 'Invalid phone' "$R"

R=$(curl -s -X POST $BASE/api/audio/upload-init -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"recipient_device_id\":\"$DEVICE_B\",\"duration_seconds\":999,\"blob_size\":4096}")
test_it "Audio too long" 'duration' "$R"

# ═══ SECURITY ═══
echo ""; echo "-- Security --"
R=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/contacts)
test_it "No token = 401" '401' "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/contacts -H "Authorization: Bearer fake")
test_it "Bad token = 401" '401' "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/audio/nope" -H "Authorization: Bearer $TOKEN_A")
test_it "Audio 404" '404' "$R"

# ═══ CLEANUP ═══
echo ""; echo "-- Cleanup --"
R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE/api/auth/account -H "Authorization: Bearer $TOKEN_B")
test_it "Delete B" '20' "$R"
R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE/api/auth/account -H "Authorization: Bearer $TOKEN_A")
test_it "Delete A" '20' "$R"

rm -f /tmp/hysj_a.bin /tmp/hysj_f.bin

echo ""
echo "======================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "======================================="
