-- MANUAL ONLY. Take and verify a database backup and obtain explicit approval
-- before running this file. Not included in automatic migrations.
-- Only active supporting definitions are changed. Historical records are untouched.
BEGIN;
LOCK TABLE public.app_documents IN SHARE ROW EXCLUSIVE MODE;
WITH changed AS (
 SELECT document_id,
   jsonb_set(jsonb_set(data,'{options}',(
     SELECT jsonb_agg(CASE WHEN coalesce(o->>'active','1') <> '0'
       THEN jsonb_set(o,'{points}','0'::jsonb) ELSE o END ORDER BY ord)
     FROM jsonb_array_elements(data->'options') WITH ORDINALITY AS x(o,ord)
   )),'{version}',to_jsonb(gen_random_uuid()::text)) AS value
 FROM public.app_documents
 WHERE collection='criteria' AND coalesce(data->>'active','1') <> '0'
   AND data->>'code' NOT IN ('leaf_color','pests','roots')
   AND EXISTS (SELECT 1 FROM jsonb_array_elements(data->'options') o
     WHERE coalesce(o->>'active','1') <> '0' AND o->'points' IS DISTINCT FROM '0'::jsonb)
), updated AS (
 UPDATE public.app_documents d SET data=c.value,revision=nextval('public.app_revision')
 FROM changed c WHERE d.collection='criteria' AND d.document_id=c.document_id RETURNING d.document_id
)
UPDATE public.app_collections SET revision=nextval('public.app_revision')
WHERE name='criteria' AND EXISTS (SELECT 1 FROM updated);
COMMIT;
