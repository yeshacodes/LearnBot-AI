from __future__ import annotations

import boto3


class S3Store:
    def __init__(
        self,
        *,
        region: str,
        bucket: str,
        access_key_id: str,
        secret_access_key: str,
    ) -> None:
        if not region or not bucket or not access_key_id or not secret_access_key:
            raise ValueError("AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY must be set")

        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
        )

    def upload_bytes(self, key: str, content: bytes, content_type: str) -> None:
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=content_type or "application/octet-stream",
        )

    def download_bytes(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def delete_object(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)
