#!/bin/bash
# Script to update Route53 with your home IP

# Configuration
HOSTED_ZONE_ID="YOUR_HOSTED_ZONE_ID"  # Found in Route53 console
DOMAIN="mabt.eu"                      # Your domain
RECORD_NAME="nas.mabt.eu"             # Subdomain for NAS
TTL=300

# Get current public IP
CURRENT_IP=$(curl -s ifconfig.me)
echo "Current public IP: $CURRENT_IP"

# Create JSON for Route53 update
cat > /tmp/route53-change.json << EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$RECORD_NAME",
        "Type": "A",
        "TTL": $TTL,
        "ResourceRecords": [
          {
            "Value": "$CURRENT_IP"
          }
        ]
      }
    }
  ]
}
EOF

# Update Route53
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file:///tmp/route53-change.json

echo "Route53 updated with IP: $CURRENT_IP"

# Clean up
rm /tmp/route53-change.json