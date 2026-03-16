-- analyses
create table public.analyses (
    id uuid not null default gen_random_uuid (),
    user_id uuid not null,
    resume_id uuid not null,
    job_title text not null,
    job_description text not null,
    status text not null default 'queued'::text,
    result jsonb null,
    error_message text null,
    created_at timestamp with time zone not null default now(),
    started_at timestamp with time zone null,
    completed_at timestamp with time zone null,
    failed_at timestamp with time zone null,
    experience_level text null,
    retry_count integer not null default 0,
    max_retries integer not null default 3,
    input_tokens integer null,
    output_tokens integer null,
    model text null,
    prompt_version text not null default 'v1'::text,
    duration_ms integer not null default 0,
    constraint analyses_pkey primary key (id),
    constraint analyses_resume_id_fkey foreign KEY (resume_id) references resumes (id) on delete CASCADE,
    constraint analyses_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
    constraint duration_ms_positive check ((duration_ms >= 0)),
    constraint resume_analysis_status_check check (
        (
            status = any (
                array[
                    'queued'::text,
                    'processing'::text,
                    'completed'::text,
                    'failed'::text
                ]
            )
        )
    )
) TABLESPACE pg_default;

create index IF not exists resume_analysis_status_created_idx on public.analyses using btree (status, created_at) TABLESPACE pg_default;

create index IF not exists idx_analyses_queue on public.analyses using btree (created_at) TABLESPACE pg_default
where (status = 'queued'::text);

-- resumes
create table public.resumes (
    id uuid not null default gen_random_uuid (),
    user_id uuid not null,
    filename text not null,
    storage_path text not null,
    created_at timestamp with time zone not null default now(),
    resume_text text null,
    resume_text_hash text not null,
    text_extracted_at timestamp with time zone null,
    constraint resumes_pkey primary key (id),
    constraint resumes_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists unique_resume_hash_per_user on public.resumes using btree (user_id, resume_text_hash) TABLESPACE pg_default;

create index IF not exists idx_resume_hash on public.resumes using btree (resume_text_hash) TABLESPACE pg_default;

-- claim next job
create or replace function claim_next_analysis_job()
returns table (
  id uuid,
  user_id uuid,
  resume_id uuid,
  job_title text,
  job_description text,
  status text,
  result jsonb,
  error_message text,
  created_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  experience_level text,
  retry_count integer,
  max_retries integer,
  input_tokens integer,
  output_tokens integer,
  model text,
  prompt_version text,
  duration_ms integer,
  storage_path text
)
language plpgsql
as $$
begin
return query
    with next_job as (
    update analyses a
    set status = 'processing',
        started_at = now()
    where a.id = (
      select a2.id
      from analyses a2
      where
        a2.status = 'queued'
        or (
          a2.status = 'processing'
          and a2.started_at < now() - interval '5 minutes'
        )
      order by a2.created_at asc
      for update skip locked
      limit 1
    )
    returning a.*
  )
select
    n.*,
    r.storage_path
from next_job n
join resumes r on r.id = n.resume_id;
end;
$$;