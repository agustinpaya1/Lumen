CREATE TABLE "photos" (
  "id" bigint PRIMARY KEY,
  "created_at" timestamp NOT NULL,
  "url" text,
  "event_id" text,
  "device_id" text
);

CREATE TABLE "storage_buckets" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "public" boolean,
  "file_size_limit" bigint,
  "allowed_mime_types" text,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "storage_objects" (
  "id" varchar PRIMARY KEY,
  "bucket_id" text,
  "name" text,
  "created_at" timestamp,
  "updated_at" timestamp,
  "last_accessed_at" timestamp,
  "metadata" text,
  "version" text,
  "owner_id" text
);

ALTER TABLE "storage_objects" ADD FOREIGN KEY ("bucket_id") REFERENCES "storage_buckets" ("id");
