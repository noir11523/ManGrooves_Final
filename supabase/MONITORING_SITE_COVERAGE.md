# Monitoring-site coverage (backend only)

This setting controls new report locations and where monitoring sites can be created, moved, or selected.
It does **not** change login/registration/profile addresses or existing monitoring records.
There is no new application settings screen and no new database table.

The API reads the existing `meta` collection document
`monitoring_site_coverage`. If this document is missing, **Cebu City only**
is the default. After deploying the API code **once**, changing this document
from Supabase SQL Editor takes effect on subsequent requests without redeployment.

Run **one** of these commands in the Supabase SQL Editor (as an authorized
database administrator). They update the existing JSONB document using the
application's `app_commit` function, which also advances collection revisions.

## Cebu City only (default)

```sql
select public.app_commit(
  '[]'::jsonb,
  jsonb_build_array(jsonb_build_object(
    'collection','meta',
    'id','monitoring_site_coverage',
    'mode','set',
    'data',jsonb_build_object('mode','cities','cities',jsonb_build_array('Cebu City'))
  ))
);
```

## Selected cities/municipalities (example)

```sql
select public.app_commit(
  '[]'::jsonb,
  jsonb_build_array(jsonb_build_object(
    'collection','meta',
    'id','monitoring_site_coverage',
    'mode','set',
    'data',jsonb_build_object(
      'mode','cities',
      'cities',jsonb_build_array('Cebu City','Mandaue City','Lapu-Lapu City')
    )
  ))
);
```

Use the **exact city/municipality names** from the existing Cebu barangay
directory. You can select one or multiple cities.

## Whole Cebu Province

```sql
select public.app_commit(
  '[]'::jsonb,
  jsonb_build_array(jsonb_build_object(
    'collection','meta',
    'id','monitoring_site_coverage',
    'mode','set',
    'data',jsonb_build_object('mode','province')
  ))
);
```

## Check the current setting (read-only)

```sql
select data
from public.app_documents
where collection='meta' and document_id='monitoring_site_coverage';
```

If it returns no rows, the backend defaults to Cebu City only.

**Notes:** The backend still checks the actual barangay coordinates against
its geographic data. Historical sites and reports remain stored when the
coverage changes. If a city cannot be resolved by the geographic lookup,
the site will not be accepted even if that city is enabled.

## Report steps

Details and Location check the actual pin coordinates against this backend setting.
Continue is disabled while checking, when outside coverage, or when the check fails.
Details without a selected pin can open Location to choose one; an outside-area pin
has a Change location action. Search text and profile addresses do not establish eligibility.
The server checks coverage again at submission and inside the save transaction.
Changing coverage does not delete historical sites or reports.

The examples above are PostgreSQL/Supabase SQL, not MySQL. No SQL change is needed
to use the default Cebu City coverage. Do not run all examples: choose just one mode.
