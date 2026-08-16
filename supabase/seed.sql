-- supabase/seed.sql
-- DEMO DATA. Real Bizerte streets/localities, but the pharmacies, phone
-- numbers and coordinates are approximate/fictional placeholders for
-- development. Every row is verified = false. Replace with sourced,
-- human-confirmed data before any public launch.
-- Idempotent: safe to re-run.

insert into public.pharmacies
  (id, name, address, city, governorate, lat, lng, phone, verified)
values
  ('00000000-0000-4000-8000-000000000001', 'Pharmacie du Vieux Port',        '12 Quai Tarak Ibn Ziad, Vieux Port',            'Bizerte',              'Bizerte', 37.278900, 9.871300, '+21672431210', false),
  ('00000000-0000-4000-8000-000000000002', 'Pharmacie Habib Bourguiba',      '34 Avenue Habib Bourguiba',                     'Bizerte',              'Bizerte', 37.274600, 9.873700, '+21672431455', false),
  ('00000000-0000-4000-8000-000000000003', 'Pharmacie de la Corniche',       'Route de la Corniche, face au Jardin Public',   'Bizerte',              'Bizerte', 37.283500, 9.864100, '+21672432880', false),
  ('00000000-0000-4000-8000-000000000004', 'Pharmacie El Andalous',          '8 Rue d''Espagne',                              'Bizerte',              'Bizerte', 37.276100, 9.872200, '+21672433117', false),
  ('00000000-0000-4000-8000-000000000005', 'Pharmacie Ben Ammar',            '21 Avenue d''Algérie',                          'Bizerte',              'Bizerte', 37.273800, 9.870900, '+21672434502', false),
  ('00000000-0000-4000-8000-000000000006', 'Pharmacie Bab Mateur',           'Avenue Taieb Mhiri, Bab Mateur',                'Bizerte',              'Bizerte', 37.272200, 9.861700, '+21672435940', false),
  ('00000000-0000-4000-8000-000000000007', 'Pharmacie Ennour',               'Cité Bougatfa 2, Rue de l''Environnement',      'Bizerte',              'Bizerte', 37.266500, 9.860400, '+21672436773', false),
  ('00000000-0000-4000-8000-000000000008', 'Pharmacie Ibn Khaldoun',         '5 Rue Ibn Khaldoun, Centre-ville',              'Bizerte',              'Bizerte', 37.275400, 9.868800, '+21672437264', false),
  ('00000000-0000-4000-8000-000000000009', 'Pharmacie Zarzouna Centre',      'Avenue de la République, Zarzouna',             'Zarzouna',             'Bizerte', 37.254700, 9.876800, '+21672590214', false),
  ('00000000-0000-4000-8000-000000000010', 'Pharmacie Sidi Salem',           'Route de Sidi Salem, Zarzouna',                 'Zarzouna',             'Bizerte', 37.258800, 9.898100, '+21672591386', false),
  ('00000000-0000-4000-8000-000000000011', 'Pharmacie Sidi Ahmed',           'Avenue de l''Indépendance, Sidi Ahmed',         'Bizerte',              'Bizerte', 37.250400, 9.833400, '+21672592470', false),
  ('00000000-0000-4000-8000-000000000012', 'Pharmacie Menzel Jemil',         'Avenue Habib Bourguiba, Menzel Jemil',          'Menzel Jemil',         'Bizerte', 37.237100, 9.914500, '+21672491638', false)
on conflict (id) do update set
  name        = excluded.name,
  address     = excluded.address,
  city        = excluded.city,
  governorate = excluded.governorate,
  lat         = excluded.lat,
  lng         = excluded.lng,
  phone       = excluded.phone,
  verified    = excluded.verified;

-- ---------------------------------------------------------------------
-- Step 3 — tracked medications.
-- DEMO/REFERENCE DATA. These are real products commonly dispensed in
-- Tunisia, but presentations, box sizes and current local availability
-- are illustrative and NOT verified. Have a pharmacist review this list
-- before any public launch. Aliases include deliberate misspellings so
-- the pg_trgm search has realistic input.
-- search_text is filled by the medications_set_search_text trigger —
-- never set it here.
-- Idempotent: safe to re-run.
-- ---------------------------------------------------------------------

insert into public.medications
  (id, slug, name, generic_name, form, category, aliases)
values
  ('10000000-0000-4000-8000-000000000001', 'levothyrox-50',       'Levothyrox 50 µg',              'Lévothyroxine sodique',            'Comprimé sécable, boîte de 30',                          'thyroid',     array['levotyrox','levothirox','levo thyrox','l-thyroxine','euthyrox 50','levothyroxine']),
  ('10000000-0000-4000-8000-000000000002', 'levothyrox-100',      'Levothyrox 100 µg',             'Lévothyroxine sodique',            'Comprimé sécable, boîte de 30',                          'thyroid',     array['levotyrox 100','levothirox 100','l-thyroxine 100','levothyroxine 100']),
  ('10000000-0000-4000-8000-000000000003', 'euthyral',            'Euthyral',                      'Lévothyroxine + liothyronine',     'Comprimé sécable, boîte de 30',                          'thyroid',     array['euthyrale','eutiral','euthyral t3 t4']),
  ('10000000-0000-4000-8000-000000000004', 'neo-mercazole-5',     'Néo-Mercazole 5 mg',            'Carbimazole',                      'Comprimé, boîte de 100',                                 'thyroid',     array['neomercazole','neo mercazol','mercazole','carbimazol']),
  ('10000000-0000-4000-8000-000000000005', 'lantus-solostar',     'Lantus SoloStar 100 UI/mL',     'Insuline glargine',                'Stylo prérempli 3 mL, boîte de 5',                       'insulin',     array['lantous','lantus solo star','glargine','lantis']),
  ('10000000-0000-4000-8000-000000000006', 'novorapid-flexpen',   'NovoRapid FlexPen 100 UI/mL',   'Insuline asparte',                 'Stylo prérempli 3 mL, boîte de 5',                       'insulin',     array['novo rapid','novorapide','nova rapid','asparte']),
  ('10000000-0000-4000-8000-000000000007', 'humalog-kwikpen',     'Humalog KwikPen 100 UI/mL',     'Insuline lispro',                  'Stylo prérempli 3 mL, boîte de 5',                       'insulin',     array['humalogue','humalog kwik pen','lispro']),
  ('10000000-0000-4000-8000-000000000008', 'insulatard-penfill',  'Insulatard Penfill 100 UI/mL',  'Insuline humaine isophane (NPH)',  'Cartouche 3 mL, boîte de 5',                             'insulin',     array['insulatarde','insulatard nph','insulatar']),
  ('10000000-0000-4000-8000-000000000009', 'actrapid-penfill',    'Actrapid Penfill 100 UI/mL',    'Insuline humaine rapide',          'Cartouche 3 mL, boîte de 5',                             'insulin',     array['actrapide','actrapid hm','actrapid']),
  ('10000000-0000-4000-8000-000000000010', 'mixtard-30-penfill',  'Mixtard 30 Penfill 100 UI/mL',  'Insuline humaine biphasique 30/70','Cartouche 3 mL, boîte de 5',                             'insulin',     array['mixtard 30 70','mixtar','mixtard hm']),
  ('10000000-0000-4000-8000-000000000011', 'levemir-flexpen',     'Levemir FlexPen 100 UI/mL',     'Insuline détémir',                 'Stylo prérempli 3 mL, boîte de 5',                       'insulin',     array['levemire','detemir','levimir']),
  ('10000000-0000-4000-8000-000000000012', 'zoloft-50',           'Zoloft 50 mg',                  'Sertraline',                       'Comprimé pelliculé, boîte de 28',                        'psychiatric', array['zolof','sertralin','sertraline 50','zoloft 50mg']),
  ('10000000-0000-4000-8000-000000000013', 'seroplex-10',         'Seroplex 10 mg',                'Escitalopram',                     'Comprimé pelliculé, boîte de 28',                        'psychiatric', array['seroplexe','ceroplex','escitalopram 10','cipralex']),
  ('10000000-0000-4000-8000-000000000014', 'prozac-20',           'Prozac 20 mg',                  'Fluoxétine',                       'Gélule, boîte de 28',                                    'psychiatric', array['prosac','fluoxetine','fluoxetine 20','prozac 20mg']),
  ('10000000-0000-4000-8000-000000000015', 'risperdal-2',         'Risperdal 2 mg',                'Rispéridone',                      'Comprimé pelliculé, boîte de 20',                        'psychiatric', array['risperidone','rispéridal','risperdale','risperdal 2mg']),
  ('10000000-0000-4000-8000-000000000016', 'zyprexa-10',          'Zyprexa 10 mg',                 'Olanzapine',                       'Comprimé pelliculé, boîte de 28',                        'psychiatric', array['ziprexa','olanzapine 10','zyprexa 10mg']),
  ('10000000-0000-4000-8000-000000000017', 'haldol-5',            'Haldol 5 mg',                   'Halopéridol',                      'Comprimé, boîte de 30',                                  'psychiatric', array['aldol','haloperidol','haldole','haloperidol 5']),
  ('10000000-0000-4000-8000-000000000018', 'depakine-chrono-500', 'Dépakine Chrono 500 mg',        'Valproate de sodium',              'Comprimé à libération prolongée, boîte de 30',           'psychiatric', array['depakine','depakine chrono','valproate','depakin']),
  ('10000000-0000-4000-8000-000000000019', 'teralithe-400',       'Téralithe 400 mg LP',           'Carbonate de lithium',             'Comprimé à libération prolongée, boîte de 30',           'psychiatric', array['teralite','lithium','teralithe lp','carbonate de lithium']),
  ('10000000-0000-4000-8000-000000000020', 'rivotril-2',          'Rivotril 2 mg',                 'Clonazépam',                       'Comprimé sécable, boîte de 30',                          'psychiatric', array['rivotrile','clonazepam','rivotril 2mg']),
  ('10000000-0000-4000-8000-000000000021', 'skenan-lp-30',        'Skenan LP 30 mg',               'Sulfate de morphine',              'Gélule à libération prolongée, boîte de 14',             'cancer_pain', array['skenane','morphine lp','sulfate de morphine','skenan 30']),
  ('10000000-0000-4000-8000-000000000022', 'actiskenan-10',       'Actiskenan 10 mg',              'Sulfate de morphine',              'Gélule à libération immédiate, boîte de 14',             'cancer_pain', array['actiskenane','morphine rapide','acti skenan']),
  ('10000000-0000-4000-8000-000000000023', 'durogesic-25',        'Durogésic 25 µg/h',             'Fentanyl transdermique',           'Dispositif transdermique, boîte de 5',                   'cancer_pain', array['durogesic','fentanyl','patch fentanyl','durogesique']),
  ('10000000-0000-4000-8000-000000000024', 'oxycontin-lp-10',     'OxyContin LP 10 mg',            'Oxycodone',                        'Comprimé à libération prolongée, boîte de 28',           'cancer_pain', array['oxycontine','oxycodone','oxy contin']),
  ('10000000-0000-4000-8000-000000000025', 'topalgic-lp-100',     'Topalgic LP 100 mg',            'Tramadol',                         'Comprimé à libération prolongée, boîte de 30',           'cancer_pain', array['topalgique','tramadol','contramal','topalgic 100']),
  ('10000000-0000-4000-8000-000000000026', 'dafalgan-codeine',    'Dafalgan Codéiné',              'Paracétamol + codéine',            'Comprimé effervescent, boîte de 16',                     'cancer_pain', array['dafalgan codeine','codeine','co-dafalgan','dafalgan codéine'])
on conflict (id) do update set
  slug         = excluded.slug,
  name         = excluded.name,
  generic_name = excluded.generic_name,
  form         = excluded.form,
  category     = excluded.category,
  aliases      = excluded.aliases,
  is_active    = true;

-- ---------------------------------------------------------------------
-- Step 3 — community stock reports (DEMO DATA).
-- Every row is reported_by = 'patient': no pharmacist accounts exist
-- until step 5, so a 'pharmacist' report here would be fiction.
-- reported_at is relative to now() so the "il y a X" display is always
-- meaningful; re-running the seed refreshes the timestamps.
-- Idempotent: safe to re-run.
-- ---------------------------------------------------------------------

insert into public.stock_reports
  (id, pharmacy_id, medication_id, status, reported_by, reported_at)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'out_of_stock', 'patient', now() - interval '3 days'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'in_stock',     'patient', now() - interval '2 hours'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'out_of_stock', 'patient', now() - interval '5 hours'),
  ('20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'in_stock',     'patient', now() - interval '26 hours'),
  ('20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'unsure',       'patient', now() - interval '45 minutes'),
  ('20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'out_of_stock', 'patient', now() - interval '8 days'),
  ('20000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'in_stock',     'patient', now() - interval '20 minutes'),
  ('20000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'out_of_stock', 'patient', now() - interval '2 days'),
  ('20000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 'in_stock',     'patient', now() - interval '90 minutes'),
  ('20000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', 'out_of_stock', 'patient', now() - interval '6 hours'),
  ('20000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005', 'out_of_stock', 'patient', now() - interval '30 hours'),
  ('20000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000005', 'unsure',       'patient', now() - interval '4 hours'),
  ('20000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000005', 'in_stock',     'patient', now() - interval '3 days'),
  ('20000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000006', 'in_stock',     'patient', now() - interval '35 minutes'),
  ('20000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000006', 'out_of_stock', 'patient', now() - interval '18 hours'),
  ('20000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000012', 'out_of_stock', 'patient', now() - interval '12 hours'),
  ('20000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000012', 'out_of_stock', 'patient', now() - interval '1 day'),
  ('20000000-0000-4000-8000-000000000018', '00000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000012', 'in_stock',     'patient', now() - interval '55 minutes'),
  ('20000000-0000-4000-8000-000000000019', '00000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000012', 'unsure',       'patient', now() - interval '7 hours'),
  ('20000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000018', 'in_stock',     'patient', now() - interval '4 days'),
  ('20000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000018', 'in_stock',     'patient', now() - interval '3 hours'),
  ('20000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000018', 'out_of_stock', 'patient', now() - interval '9 hours'),
  ('20000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000021', 'out_of_stock', 'patient', now() - interval '2 days'),
  ('20000000-0000-4000-8000-000000000024', '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000021', 'out_of_stock', 'patient', now() - interval '5 days'),
  ('20000000-0000-4000-8000-000000000025', '00000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000021', 'unsure',       'patient', now() - interval '11 hours'),
  ('20000000-0000-4000-8000-000000000026', '00000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000026', 'in_stock',     'patient', now() - interval '6 hours'),
  ('20000000-0000-4000-8000-000000000027', '00000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000026', 'in_stock',     'patient', now() - interval '25 hours')
on conflict (id) do update set
  pharmacy_id   = excluded.pharmacy_id,
  medication_id = excluded.medication_id,
  status        = excluded.status,
  reported_by   = excluded.reported_by,
  reported_at   = excluded.reported_at;
