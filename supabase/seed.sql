-- Local development seed (not for production).
-- The real menu is created by migration 20261111000003_mac_kiffan_menu.sql;
-- this file only adds placeholder restaurant contact details and sample reviews.

update public.restaurant_settings set
  name = 'Mac Kiffan',
  phone = '0555 00 00 00',
  address_ar = 'المحمدية، الجزائر العاصمة',
  address_fr = 'Mohammadia, Alger',
  address_en = 'Mohammadia, Algiers',
  opening_hours_ar = 'كل يوم: 11:00 – 23:00',
  opening_hours_fr = 'Tous les jours : 11h00 – 23h00',
  opening_hours_en = 'Every day: 11:00 – 23:00'
where id = 1;

insert into public.customer_reviews (customer_name, rating, comment, is_approved) values
  ('Yacine', 5, 'Très bon accueil et pizza délicieuse.', true),
  ('سارة', 5, 'أفضل طاكوس في المنطقة، خدمة سريعة.', true);
