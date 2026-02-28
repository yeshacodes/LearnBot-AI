create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid null references public.sources(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  question text not null,
  answer text not null,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists decks_user_id_idx on public.decks (user_id);
create index if not exists decks_created_at_idx on public.decks (created_at desc);
create index if not exists flashcards_deck_id_idx on public.flashcards (deck_id);

alter table public.decks enable row level security;
alter table public.flashcards enable row level security;

drop policy if exists "decks_select_own" on public.decks;
create policy "decks_select_own"
on public.decks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "decks_insert_own" on public.decks;
create policy "decks_insert_own"
on public.decks
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "decks_update_own" on public.decks;
create policy "decks_update_own"
on public.decks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "decks_delete_own" on public.decks;
create policy "decks_delete_own"
on public.decks
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "flashcards_select_own" on public.flashcards;
create policy "flashcards_select_own"
on public.flashcards
for select
to authenticated
using (
  exists (
    select 1
    from public.decks d
    where d.id = flashcards.deck_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "flashcards_insert_own" on public.flashcards;
create policy "flashcards_insert_own"
on public.flashcards
for insert
to authenticated
with check (
  exists (
    select 1
    from public.decks d
    where d.id = flashcards.deck_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "flashcards_update_own" on public.flashcards;
create policy "flashcards_update_own"
on public.flashcards
for update
to authenticated
using (
  exists (
    select 1
    from public.decks d
    where d.id = flashcards.deck_id
      and d.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.decks d
    where d.id = flashcards.deck_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "flashcards_delete_own" on public.flashcards;
create policy "flashcards_delete_own"
on public.flashcards
for delete
to authenticated
using (
  exists (
    select 1
    from public.decks d
    where d.id = flashcards.deck_id
      and d.user_id = auth.uid()
  )
);
