-- Local development seed.
-- DEMO DATA: product names/prices below (except the two "pending" items taken
-- from the restaurant brief) are placeholders. Replace them from the admin
-- dashboard with the real Mac Kiffan menu before going live.

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

create function pg_temp.cat(p_ar text, p_fr text, p_en text, p_sort int)
returns uuid language sql as $$
  insert into public.categories (name_ar, name_fr, name_en, sort_order)
  values (p_ar, p_fr, p_en, p_sort) returning id;
$$;

-- variants: jsonb array of [name_ar, name_fr, name_en, price, verified]
create function pg_temp.product(
  p_cat uuid, p_ar text, p_fr text, p_en text,
  p_desc_ar text, p_desc_fr text, p_desc_en text,
  p_image text, p_sort int, p_variants jsonb, p_extras jsonb default '[]'
) returns uuid language plpgsql as $$
declare
  v_id uuid;
  v jsonb;
  i int := 0;
begin
  insert into public.products (category_id, name_ar, name_fr, name_en, description_ar, description_fr, description_en, sort_order)
  values (p_cat, p_ar, p_fr, p_en, p_desc_ar, p_desc_fr, p_desc_en, p_sort) returning id into v_id;
  if p_image is not null then
    insert into public.product_images (product_id, url) values (v_id, p_image);
  end if;
  for v in select * from jsonb_array_elements(p_variants) loop
    i := i + 1;
    insert into public.product_variants (product_id, name_ar, name_fr, name_en, price, verification, sort_order)
    values (v_id, v->>0, v->>1, v->>2, (v->>3)::int,
            case when (v->>4)::boolean then 'verified' else 'pending' end::public.verification_status, i);
  end loop;
  i := 0;
  for v in select * from jsonb_array_elements(p_extras) loop
    i := i + 1;
    insert into public.product_extras (product_id, name_ar, name_fr, name_en, price, sort_order)
    values (v_id, v->>0, v->>1, v->>2, (v->>3)::int, i);
  end loop;
  return v_id;
end;
$$;

do $$
declare
  c_pizza uuid := pg_temp.cat('بيتزا', 'Pizzas', 'Pizzas', 1);
  c_burger uuid := pg_temp.cat('برغر', 'Burgers', 'Burgers', 2);
  c_sandwich uuid := pg_temp.cat('طاكوس وسندويشات', 'Tacos & Sandwichs', 'Tacos & Sandwiches', 3);
  c_salad uuid := pg_temp.cat('سلطات', 'Salades', 'Salads', 4);
  c_plat uuid := pg_temp.cat('أطباق وغراتان', 'Plats & Gratins', 'Plates & Gratins', 5);
  c_drink uuid := pg_temp.cat('مشروبات', 'Boissons', 'Drinks', 6);
  std constant jsonb := '["عادي","Normal","Regular"]';
begin
  perform pg_temp.product(c_pizza, 'بيتزا مارغريتا', 'Pizza Margherita', 'Margherita Pizza',
    'صلصة طماطم، جبن موزاريلا، زيتون', 'Sauce tomate, mozzarella, olives', 'Tomato sauce, mozzarella, olives',
    '/images/demo/pizza.jpg', 1,
    '[["متوسطة","Moyenne","Medium",600,true],["كبيرة","Grande","Large",900,true]]',
    '[["جبن إضافي","Supplément fromage","Extra cheese",100],["فطر","Champignons","Mushrooms",80]]');
  perform pg_temp.product(c_pizza, 'بيتزا التونة', 'Pizza Thon', 'Tuna Pizza',
    'تونة، بصل، موزاريلا', 'Thon, oignons, mozzarella', 'Tuna, onions, mozzarella',
    '/images/demo/pizza.jpg', 2,
    '[["متوسطة","Moyenne","Medium",700,true],["كبيرة","Grande","Large",1000,true]]',
    '[["جبن إضافي","Supplément fromage","Extra cheese",100]]');

  perform pg_temp.product(c_burger, 'برغر كلاسيك', 'Burger Classique', 'Classic Burger',
    'لحم مفروم، خس، طماطم، صلصة البيت', 'Steak haché, salade, tomate, sauce maison', 'Beef patty, lettuce, tomato, house sauce',
    '/images/demo/burger.jpg', 1, jsonb_build_array(std || '[400,true]'::jsonb),
    '[["جبن","Fromage","Cheese",50],["بيض","Œuf","Egg",50]]');
  perform pg_temp.product(c_burger, 'تشيز برغر', 'Cheese Burger', 'Cheeseburger',
    'لحم مفروم، جبن شيدر مزدوج', 'Steak haché, double cheddar', 'Beef patty, double cheddar',
    '/images/demo/cheeseburger.jpg', 2, jsonb_build_array(std || '[450,true]'::jsonb));
  perform pg_temp.product(c_burger, 'منيو برغر', 'Menu Burger', 'Burger Meal',
    'برغر + بطاطا مقلية + مشروب', 'Burger + frites + boisson', 'Burger + fries + drink',
    '/images/demo/burger-menu.jpg', 3, jsonb_build_array(std || '[650,true]'::jsonb));

  perform pg_temp.product(c_sandwich, 'طاكوس', 'Tacos', 'Tacos',
    'دجاج أو لحم مفروم، بطاطا، صلصة الجبن', 'Poulet ou viande hachée, frites, sauce fromagère', 'Chicken or minced beef, fries, cheese sauce',
    '/images/demo/tacos.jpg', 1,
    '[["عادي","Simple","Single",450,true],["دوبل","Double","Double",700,true]]',
    '[["صلصة جبن إضافية","Sauce fromagère en plus","Extra cheese sauce",50]]');
  perform pg_temp.product(c_sandwich, 'شاورما', 'Chawarma', 'Shawarma',
    'دجاج متبل، خضار، صلصة الثوم', 'Poulet mariné, crudités, sauce blanche', 'Marinated chicken, vegetables, garlic sauce',
    '/images/demo/shawarma.jpg', 2, jsonb_build_array(std || '[350,true]'::jsonb));
  perform pg_temp.product(c_sandwich, 'بانيني', 'Panini', 'Panini',
    'خبز محمص، جبن، ديك رومي', 'Pain grillé, fromage, dinde', 'Toasted bread, cheese, turkey',
    '/images/demo/panini.jpg', 3, jsonb_build_array(std || '[300,true]'::jsonb));

  -- From the restaurant brief: two prices whose meaning is not yet confirmed.
  perform pg_temp.product(c_salad, 'سلطة التونة', 'Salade de thon', 'Tuna Salad',
    'تونة، خضار طازجة، بيض', 'Thon, crudités, œuf', 'Tuna, fresh vegetables, egg',
    '/images/demo/salade-thon.jpg', 1,
    '[["","","",350,false],["","","",400,false]]');
  perform pg_temp.product(c_salad, 'سلطة مشكلة', 'Salade composée', 'Mixed Salad',
    'خضار موسمية، حمص، أفوكادو', 'Légumes de saison, pois chiches, avocat', 'Seasonal vegetables, chickpeas, avocado',
    '/images/demo/salade-composee.jpg', 2, jsonb_build_array(std || '[300,true]'::jsonb));

  perform pg_temp.product(c_plat, 'غراتان الجمبري', 'Gratin de crevettes', 'Shrimp Gratin',
    'جمبري، صلصة بيضاء، جبن مذاب', 'Crevettes, béchamel, fromage gratiné', 'Shrimp, béchamel, melted cheese',
    '/images/demo/gratin-crevettes.jpg', 1,
    '[["","","",500,false],["","","",600,false]]');
  perform pg_temp.product(c_plat, 'معكرونة بولونيز', 'Pâtes bolognaise', 'Pasta Bolognese',
    'معكرونة، صلصة لحم مفروم', 'Pâtes, sauce viande hachée', 'Pasta, minced beef sauce',
    '/images/demo/pates.jpg', 2, jsonb_build_array(std || '[550,true]'::jsonb));
  perform pg_temp.product(c_plat, 'ستيك مع بطاطا', 'Steak frites', 'Steak & Fries',
    'شريحة لحم مشوية مع بطاطا مقلية', 'Entrecôte grillée et frites', 'Grilled steak with fries',
    '/images/demo/steak-frites.jpg', 3, jsonb_build_array(std || '[1200,true]'::jsonb));
  perform pg_temp.product(c_plat, 'مشويات', 'Brochettes', 'Skewers',
    'أسياخ دجاج مشوية', 'Brochettes de poulet grillées', 'Grilled chicken skewers',
    '/images/demo/brochettes.jpg', 4, jsonb_build_array(std || '[900,true]'::jsonb));

  perform pg_temp.product(c_drink, 'مشروب غازي', 'Canette', 'Soft drink',
    '', '', '', '/images/demo/boissons.jpg', 1, jsonb_build_array(std || '[100,true]'::jsonb));
  perform pg_temp.product(c_drink, 'عصير طبيعي', 'Jus naturel', 'Fresh juice',
    '', '', '', '/images/demo/jus.jpg', 2, jsonb_build_array(std || '[250,true]'::jsonb));
end;
$$;

insert into public.customer_reviews (customer_name, rating, comment, is_approved) values
  ('Yacine', 5, 'Très bon accueil et pizza délicieuse.', true),
  ('سارة', 5, 'أفضل طاكوس في المنطقة، خدمة سريعة.', true);
