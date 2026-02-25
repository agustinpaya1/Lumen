# Supabase RLS Policy Configuration for Admin Dashboard

This document provides the SQL commands needed to configure Row Level Security (RLS) policies in Supabase for the admin dashboard functionality.

## Overview

The admin dashboard requires DELETE permissions on both the `photos` table and the `photos` Storage bucket. By default, these operations may be restricted by RLS policies.

## Setup Instructions

### Step 1: Open Supabase Dashboard

1. Navigate to your Supabase project: [https://app.supabase.com](https://app.supabase.com)
2. Select your project (the one using URL: `https://gjbggygtztlrcxudbabu.supabase.co`)

---

## Photos Table Policies

### Step 2: Configure DELETE Policy for Photos Table

1. In Supabase Dashboard, go to **Authentication** → **Policies**
2. Find the `photos` table
3. Click **"New Policy"**
4. Choose **"Create a policy from scratch"**
5. Use the following configuration:

**Policy Name:** `Allow public delete on photos`

**Allowed operation:** `DELETE`

**Target roles:** `public` (or `anon` depending on your setup)

**USING expression:**
```sql
true
```

**SQL Command (Alternative):**
```sql
CREATE POLICY "Allow public delete on photos"
ON photos
FOR DELETE
USING (true);
```

> [!WARNING]
> This policy allows anyone to delete photos. For production, consider adding authentication checks like:
> ```sql
> USING (auth.role() = 'authenticated')
> ```

---

## Storage Bucket Policies

### Step 3: Configure DELETE Policy for Photos Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click on the `photos` bucket
3. Go to **Policies** tab
4. Click **"New Policy"**

**Configuration for DELETE:**

**Policy Name:** `Allow public delete on photos bucket`

**Allowed operation:** `DELETE`

**Target roles:** `public`

**USING expression:**
```sql
bucket_id = 'photos'
```

**SQL Command (Alternative):**
```sql
CREATE POLICY "Allow public delete on photos bucket"
ON storage.objects
FOR DELETE
USING (bucket_id = 'photos');
```

### Step 4: Configure SELECT Policy for Photos Storage Bucket (Downloads)

If not already configured, add a SELECT policy for downloads:

**Policy Name:** `Allow public select on photos bucket`

**Allowed operation:** `SELECT`

**Target roles:** `public`

**USING expression:**
```sql
bucket_id = 'photos'
```

**SQL Command (Alternative):**
```sql
CREATE POLICY "Allow public select on photos bucket"
ON storage.objects
FOR SELECT
USING (bucket_id = 'photos');
```

---

## Verification

After applying these policies, verify they work:

1. Navigate to `/admin` in your app
2. Enter PIN: `2102`
3. Try deleting a photo
4. Try downloading a photo
5. Check Supabase dashboard to confirm the photo was removed from:
   - The `photos` table
   - The `photos` Storage bucket

---

## Production Considerations

For production deployment, consider:

1. **Authentication-based policies**: Restrict delete operations to authenticated admin users
2. **Service Role Key**: Use Supabase service role key for admin operations (server-side)
3. **Audit logging**: Track who deletes what and when
4. **Soft deletes**: Mark photos as deleted instead of hard deletion

Example production policy:
```sql
CREATE POLICY "Allow authenticated admins to delete photos"
ON photos
FOR DELETE
USING (
  auth.role() = 'authenticated' 
  AND auth.jwt() ->> 'role' = 'admin'
);
```

---

## Troubleshooting

### Delete fails with "permission denied"
- Verify RLS policies are enabled and configured correctly
- Check that both table and storage policies are in place
- Ensure you're using the correct Supabase anon key (not service role key)

### Download fails with 404 or permission error
- Verify SELECT policy is enabled on storage bucket
- Check that the photo path is correct
- Ensure signed URL generation is working (60 second expiry)

### Realtime subscription not working
- Enable Realtime in Supabase Dashboard → Database → Replication
- Add `photos` table to replication
- Restart the Supabase project if needed
