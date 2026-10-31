-- Evento de BH (já inserido em 31/10/2026). Atualize os campos pendentes quando chegarem:
-- update events set pix_key = '...', sales_whatsapp = '5531...', start_time = '19h',
--   venue_address = '...', menu_info = '...', registrations_open = true where slug = 'bh-2026';
insert into public.events (slug, name, code_prefix, event_date, venue_name, price_cents, capacity, pix_holder, image_consent_version, image_consent_text, registrations_open)
values ('bh-2026', 'Só Pra Elas BH', 'SPE-BH', '2026-11-25', 'Mitra', 19700, 150, 'Simone de Castro', 'v1',
'Autorizo o uso da minha imagem e voz, captadas em fotos e vídeos durante o evento Só Pra Elas BH, em 25/11/2026, para divulgação nas redes sociais, no site e em materiais do movimento Só Pra Elas, sem remuneração, pelo prazo de 5 anos. Posso revogar esta autorização a qualquer momento pelo email de contato do evento, e a revogação vale para novos usos.',
false);
