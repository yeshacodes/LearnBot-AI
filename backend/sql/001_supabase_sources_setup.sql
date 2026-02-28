-- Required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
      created_at timestamptz not null default now()
      );

      -- Sources metadata
      create table if not exists public.sources (
        id uuid primary key default gen_random_uuid(),
          user_id uuid not null references auth.users(id) on delete cascade,
            name text not null,
              source_type text not null check (source_type in ('pdf', 'docx', 'web')),
                storage_bucket text not null default 'sources',
                  storage_path text,
                    created_at timestamptz not null default now(),
                      deleted_at timestamptz null,
                        status text not null default 'READY'
                        );

                        create index if not exists sources_user_id_idx on public.sources (user_id);
                        create index if not exists sources_created_at_idx on public.sources (created_at desc);

                        -- RLS
                        alter table public.profiles enable row level security;
                        alter table public.sources enable row level security;

                        -- profiles policies
                        drop policy if exists "profiles_select_own" on public.profiles;
                        create policy "profiles_select_own"
                        on public.profiles
                        for select
                        to authenticated
                        using (id = auth.uid());

                        drop policy if exists "profiles_update_own" on public.profiles;
                        create policy "profiles_update_own"
                        on public.profiles
                        for update
                        to authenticated
                        using (id = auth.uid())
                        with check (id = auth.uid());

                        -- sources policies
                        drop policy if exists "sources_select_own" on public.sources;
                        create policy "sources_select_own"
                        on public.sources
                        for select
                        to authenticated
                        using (user_id = auth.uid());

                        drop policy if exists "sources_insert_own" on public.sources;
                        create policy "sources_insert_own"
                        on public.sources
                        for insert
                        to authenticated
                        with check (user_id = auth.uid());

                        drop policy if exists "sources_update_own" on public.sources;
                        create policy "sources_update_own"
                        on public.sources
                        for update
                        to authenticated
                        using (user_id = auth.uid())
                        with check (user_id = auth.uid());

                        drop policy if exists "sources_delete_own" on public.sources;
                        create policy "sources_delete_own"
                        on public.sources
                        for delete
                        to authenticated
                        using (user_id = auth.uid());

                        -- Storage bucket
                        insert into storage.buckets (id, name, public)
                        values ('sources', 'sources', false)
                        on conflict (id) do nothing;

                        -- Storage policies (per-user folder isolation)
                        drop policy if exists "sources_storage_select_own" on storage.objects;
                        create policy "sources_storage_select_own"
                        on storage.objects
                        for select
                        to authenticated
                        using (
                          bucket_id = 'sources'
                            and (storage.foldername(name))[1] = auth.uid()::text
                            );

                            drop policy if exists "sources_storage_insert_own" on storage.objects;
                            create policy "sources_storage_insert_own"
                            on storage.objects
                            for insert
                            to authenticated
                            with check (
                              bucket_id = 'sources'
                                and (storage.foldername(name))[1] = auth.uid()::text
                                );

                                drop policy if exists "sources_storage_update_own" on storage.objects;
                                create policy "sources_storage_update_own"
                                on storage.objects
                                for update
                                to authenticated
                                using (
                                  bucket_id = 'sources'
                                    and (storage.foldername(name))[1] = auth.uid()::text
                                    )
                                    with check (
                                      bucket_id = 'sources'
                                        and (storage.foldername(name))[1] = auth.uid()::text
                                        );

                                        drop policy if exists "sources_storage_delete_own" on storage.objects;
                                        create policy "sources_storage_delete_own"
                                        on storage.objects
                                        for delete
                                        to authenticated
                                        using (
                                          bucket_id = 'sources'
                                            and (storage.foldername(name))[1] = auth.uid()::text
                                            );
