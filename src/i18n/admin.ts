// Strings for admin menu management, restaurant settings, reviews and
// applications pages. Keys are prefixed with "am." (admin management).
// Each row is [key, ar, fr, en] so a missing translation is impossible.
type Row = [key: string, ar: string, fr: string, en: string];

const rows: Row[] = [
  // Generic
  ['am.delete', 'حذف', 'Supprimer', 'Delete'],
  ['am.edit', 'تعديل', 'Modifier', 'Edit'],
  ['am.sortOrder', 'ترتيب العرض', "Ordre d'affichage", 'Sort order'],
  ['am.lang.ar', 'العربية', 'Arabe', 'Arabic'],
  ['am.lang.fr', 'الفرنسية', 'Français', 'French'],
  ['am.lang.en', 'الإنجليزية', 'Anglais', 'English'],

  // Errors
  ['am.err.verifiedNeedsNames', 'لا يمكن اعتماد السعر قبل إدخال اسمه بالعربية والفرنسية والإنجليزية.', "Impossible de valider ce prix sans un nom en arabe, français et anglais.", 'A price cannot be verified until it has a name in Arabic, French and English.'],
  ['am.err.inUse', 'لا يمكن الحذف لأن هذا العنصر مرتبط ببيانات أخرى.', "Suppression impossible : cet élément est encore utilisé ailleurs.", 'Cannot delete: this item is still in use elsewhere.'],
  ['am.err.denied', 'ليست لديك صلاحية لهذه العملية. أعد تسجيل الدخول.', "Vous n'avez pas le droit d'effectuer cette action. Reconnectez-vous.", 'You are not allowed to do this. Please sign in again.'],
  ['am.err.invalidValue', 'قيمة غير صالحة. تحقق من الحقول.', 'Valeur invalide. Vérifiez les champs.', 'Invalid value. Check the fields.'],
  ['am.err.price', 'أدخل سعراً صحيحاً بالدينار (رقم صحيح، 0 أو أكثر).', 'Saisissez un prix entier en DA (0 ou plus).', 'Enter a whole price in DA (0 or more).'],
  ['am.err.namesRequired', 'الاسم مطلوب بالعربية والفرنسية والإنجليزية.', 'Le nom est requis en arabe, français et anglais.', 'The name is required in Arabic, French and English.'],
  ['am.err.category', 'اختر فئة.', 'Choisissez une catégorie.', 'Choose a category.'],

  // Menu page
  ['am.menu.title', 'إدارة قائمة الطعام', 'Gestion du menu', 'Menu management'],
  ['am.menu.empty', 'لا توجد أطباق مطابقة.', 'Aucun plat ne correspond.', 'No matching products.'],
  ['am.filter.pendingOnly', 'الأسعار غير المؤكدة فقط', 'Prix à vérifier uniquement', 'Pending prices only'],
  ['am.pend.title', 'أسعار بانتظار التأكيد', 'Prix en attente de vérification', 'Prices pending verification'],
  [
    'am.pend.body',
    'هذه الأطباق لها عدة أسعار في القائمة الورقية (مثل «350/400»). أعطِ كل سعر اسماً بالعربية والفرنسية والإنجليزية (مثلاً صغير / كبير) ثم اعتمده. الأسعار غير المؤكدة لا تظهر للزبائن ولا تُباع أبداً.',
    "Ces plats ont plusieurs prix sur le menu papier (par ex. « 350/400 »). Donnez à chaque prix un nom en arabe, français et anglais (par ex. Petit / Grand), puis validez-le. Les prix non vérifiés ne sont jamais affichés ni vendus aux clients.",
    'These products list several prices on the paper menu (e.g. "350/400"). Give each price a name in Arabic, French and English (e.g. Small / Large), then mark it verified. Pending prices are never shown or sold to customers.',
  ],

  // Badges
  ['am.badge.pending', 'بانتظار التأكيد', 'À vérifier', 'Pending verification'],
  ['am.badge.unpublished', 'غير منشور', 'Non publié', 'Unpublished'],
  ['am.badge.unavailable', 'غير متوفر', 'Indisponible', 'Unavailable'],
  ['am.badge.notOrderable', 'غير قابل للطلب', 'Non commandable', 'Not orderable'],

  // Categories
  ['am.cat.title', 'الفئات', 'Catégories', 'Categories'],
  ['am.cat.manage', 'إدارة الفئات', 'Gérer les catégories', 'Manage categories'],
  ['am.cat.hide', 'إخفاء', 'Masquer', 'Hide'],
  ['am.cat.add', 'فئة جديدة', 'Nouvelle catégorie', 'New category'],
  ['am.cat.name', 'اسم الفئة', 'Nom de la catégorie', 'Category name'],
  ['am.cat.active', 'فئة نشطة (ظاهرة للزبائن)', 'Catégorie active (visible des clients)', 'Active (visible to customers)'],
  ['am.cat.inactive', 'غير نشطة', 'Inactive', 'Inactive'],
  ['am.cat.products', '{n} طبق', '{n} produit(s)', '{n} product(s)'],
  ['am.cat.confirmDelete', 'حذف الفئة «{name}»؟', 'Supprimer la catégorie « {name} » ?', 'Delete the category "{name}"?'],
  ['am.cat.hasProducts', 'لا يمكن حذف فئة تحتوي على أطباق. انقل الأطباق أو احذفها أولاً.', 'Impossible de supprimer une catégorie qui contient des produits. Déplacez ou supprimez-les d’abord.', 'Cannot delete a category that still has products. Move or delete them first.'],

  // Products
  ['am.prod.new', 'طبق جديد', 'Nouveau produit', 'New product'],
  ['am.prod.edit', 'تعديل الطبق', 'Modifier le produit', 'Edit product'],
  ['am.prod.create', 'إنشاء الطبق', 'Créer le produit', 'Create product'],
  ['am.prod.category', 'الفئة', 'Catégorie', 'Category'],
  ['am.prod.name', 'اسم الطبق', 'Nom du produit', 'Product name'],
  ['am.prod.description', 'الوصف', 'Description', 'Description'],
  ['am.prod.available', 'متوفر حالياً', 'Disponible actuellement', 'Currently available'],
  ['am.prod.published', 'منشور في القائمة', 'Publié sur le menu', 'Published on the menu'],
  ['am.prod.firstPrice', 'السعر (دج)', 'Prix (DA)', 'Price (DA)'],
  ['am.prod.createHint', 'بعد الإنشاء يمكنك إضافة الأحجام والإضافات والصور. إذا أدخلت سعراً هنا يُنشأ نوع واحد باسم «عادي».', 'Après la création, vous pourrez ajouter variantes, suppléments et photos. Un prix saisi ici crée une variante unique « Normal ».', 'After creating, you can add variants, extras and photos. A price entered here creates a single "Regular" variant.'],
  ['am.prod.notOrderableHint', 'هذا الطبق منشور لكن لا يمكن طلبه: يلزم نوع واحد على الأقل معتمد ومتوفر.', 'Ce produit est publié mais ne peut pas être commandé : il faut au moins une variante vérifiée et disponible.', 'This product is published but cannot be ordered: it needs at least one verified, available variant.'],
  ['am.prod.confirmDelete', 'حذف الطبق «{name}» نهائياً؟ الطلبات السابقة تحتفظ ببياناتها.', 'Supprimer définitivement « {name} » ? Les commandes passées conservent leurs données.', 'Permanently delete "{name}"? Past orders keep their data.'],

  // Variants
  ['am.var.title', 'الأحجام / الأنواع والأسعار', 'Variantes et prix', 'Variants and prices'],
  ['am.var.help', 'الطبق ذو السعر الواحد يجب أن يملك نوعاً واحداً فقط (مثل عادي / Normal / Regular). عندما يوجد نوعان أو أكثر يختار الزبون بينها قبل الإضافة إلى السلة.', 'Un produit à prix unique doit avoir exactement une variante (par ex. عادي / Normal / Regular). À partir de 2 variantes, le client choisit avant d’ajouter au panier.', 'A single-price product should have exactly one variant (e.g. عادي / Normal / Regular). With 2 or more variants, customers choose one before adding to the cart.'],
  ['am.var.none', 'لا يوجد أي نوع: لا يمكن طلب هذا الطبق. أضف نوعاً واحداً على الأقل.', 'Aucune variante : ce produit ne peut pas être commandé. Ajoutez-en au moins une.', 'No variants: this product cannot be ordered. Add at least one.'],
  ['am.var.add', 'إضافة نوع', 'Ajouter une variante', 'Add variant'],
  ['am.var.name', 'اسم النوع', 'Nom de la variante', 'Variant name'],
  ['am.var.description', 'وصف النوع', 'Description de la variante', 'Variant description'],
  ['am.var.price', 'السعر (دج)', 'Prix (DA)', 'Price (DA)'],
  ['am.var.available', 'متوفر', 'Disponible', 'Available'],
  ['am.var.verification', 'حالة التأكيد', 'Statut de vérification', 'Verification status'],
  ['am.var.pending', 'بانتظار التأكيد', 'À vérifier', 'Pending'],
  ['am.var.verified', 'مؤكد', 'Vérifié', 'Verified'],
  ['am.var.markVerified', 'اعتماد وحفظ', 'Valider et enregistrer', 'Mark verified and save'],
  ['am.var.pendingHint', 'سعر من القائمة الورقية لم يُؤكد بعد. أدخل الاسم بثلاث لغات ثم اعتمده؛ إلى ذلك الحين لا يراه الزبائن.', 'Prix issu du menu papier, non confirmé. Saisissez le nom dans les 3 langues puis validez-le ; en attendant, les clients ne le voient pas.', 'Price from the paper menu, not yet confirmed. Enter the name in all 3 languages, then verify it; until then customers do not see it.'],
  ['am.var.unnamed', '(بدون اسم)', '(sans nom)', '(unnamed)'],
  ['am.var.quickNames', 'أسماء جاهزة:', 'Noms rapides :', 'Quick names:'],
  ['am.var.preset.normal', 'عادي', 'Normal', 'Regular'],
  ['am.var.preset.small', 'صغير', 'Petit', 'Small'],
  ['am.var.preset.large', 'كبير', 'Grand', 'Large'],
  ['am.var.confirmDelete', 'حذف هذا النوع؟', 'Supprimer cette variante ?', 'Delete this variant?'],

  // Extras
  ['am.extra.title', 'الإضافات', 'Suppléments', 'Extras'],
  ['am.extra.help', 'خيارات اختيارية بسعر إضافي (مثل جبن إضافي).', 'Options facultatives avec supplément de prix (par ex. fromage en plus).', 'Optional add-ons with an extra price (e.g. extra cheese).'],
  ['am.extra.add', 'إضافة', 'Ajouter un supplément', 'Add extra'],
  ['am.extra.name', 'اسم الإضافة', 'Nom du supplément', 'Extra name'],
  ['am.extra.price', 'السعر (دج)', 'Prix (DA)', 'Price (DA)'],
  ['am.extra.available', 'متوفرة', 'Disponible', 'Available'],
  ['am.extra.confirmDelete', 'حذف هذه الإضافة؟', 'Supprimer ce supplément ?', 'Delete this extra?'],

  // Images
  ['am.img.title', 'الصور', 'Photos', 'Photos'],
  ['am.img.none', 'لا توجد صور بعد.', 'Aucune photo pour le moment.', 'No photos yet.'],
  ['am.img.noneShort', 'بدون صورة', 'Aucune', 'No photo'],
  ['am.img.main', 'الصورة الرئيسية', 'Photo principale', 'Main photo'],
  ['am.img.makeMain', 'جعلها رئيسية', 'Définir comme principale', 'Make main'],
  ['am.img.upload', 'رفع صورة', 'Téléverser une photo', 'Upload photo'],
  ['am.img.uploadHint', 'JPG أو PNG أو WebP، حتى 5 ميغابايت.', 'JPG, PNG ou WebP, 5 Mo maximum.', 'JPG, PNG or WebP, up to 5 MB.'],
  ['am.img.url', 'رابط الصورة', "Adresse de l'image", 'Image URL'],
  ['am.img.addUrl', 'إضافة بالرابط', 'Ajouter par lien', 'Add by URL'],
  ['am.img.badUrl', 'أدخل رابطاً صحيحاً يبدأ بـ https:// أو /', 'Saisissez un lien valide commençant par https:// ou /', 'Enter a valid link starting with https:// or /'],
  ['am.img.notImage', 'الملف ليس صورة.', "Ce fichier n'est pas une image.", 'That file is not an image.'],
  ['am.img.tooBig', 'الصورة كبيرة جداً (الحد 5 ميغابايت).', 'Image trop lourde (5 Mo maximum).', 'Image is too large (5 MB max).'],
  ['am.img.confirmDelete', 'حذف هذه الصورة؟', 'Supprimer cette photo ?', 'Delete this photo?'],

  // Restaurant settings
  ['am.set.title', 'معلومات المطعم', 'Informations du restaurant', 'Restaurant information'],
  ['am.set.name', 'اسم المطعم', 'Nom du restaurant', 'Restaurant name'],
  ['am.set.phone', 'الهاتف', 'Téléphone', 'Phone'],
  ['am.set.phone_secondary', 'هاتف ثانٍ', 'Téléphone secondaire', 'Secondary phone'],
  ['am.set.email', 'البريد الإلكتروني', 'E-mail', 'Email'],
  ['am.set.address', 'العنوان', 'Adresse', 'Address'],
  ['am.set.hours', 'أوقات العمل', "Horaires d'ouverture", 'Opening hours'],
  ['am.set.hoursText', 'نص أوقات العمل (يظهر أسفل الموقع)', 'Texte des horaires (pied de page)', 'Opening hours text (footer)'],
  ['am.set.schedule', 'حالة المطعم في البنر', 'Statut dans la bannière', 'Banner open status'],
  ['am.set.scheduleHint', 'يُحسب «مفتوح الآن / مغلق» تلقائياً بتوقيت الجزائر. إذا كان الإغلاق بعد منتصف الليل فاختر وقتاً أصغر من وقت الفتح؛ 00:00 تعني منتصف الليل. اترك الحقلين فارغين لإخفاء الحالة.', 'Open/closed is computed automatically (Algiers time). A closing time earlier than the opening time means after midnight; 00:00 = midnight. Leave both empty to hide the status.', 'Open/closed is computed automatically (Algiers time). A closing time earlier than the opening time means after midnight; 00:00 = midnight. Leave both empty to hide the status.'],
  ['am.set.opensAt', 'يفتح الساعة', 'Ouverture', 'Opens at'],
  ['am.set.closesAt', 'يغلق الساعة', 'Fermeture', 'Closes at'],
  ['am.set.bothTimes', 'أدخل وقت الفتح ووقت الإغلاق معاً، أو اتركهما فارغين.', 'Renseignez l’ouverture et la fermeture, ou laissez les deux vides.', 'Enter both opening and closing times, or leave both empty.'],
  ['am.set.social', 'مواقع التواصل الاجتماعي', 'Réseaux sociaux', 'Social media'],
  ['am.set.socialHint', 'الصق رابط صفحتك. تظهر الأيقونة أسفل الموقع فقط عند إدخال رابط.', 'Collez le lien de votre page. L’icône n’apparaît dans le pied de page que si un lien est renseigné.', 'Paste your page link. The icon shows in the footer only when a link is set.'],
  ['am.set.badSocial', 'رابط غير صالح لـ {name}. مثال: https://www.facebook.com/mackiffan', 'Lien invalide pour {name}. Exemple : https://www.facebook.com/mackiffan', 'Invalid link for {name}. Example: https://www.facebook.com/mackiffan'],
  ['am.set.ordering', 'الطلب عبر الموقع', 'Commandes en ligne', 'Online ordering'],
  ['am.set.orderingHint', 'عند الإيقاف تتوقف الطلبات الجديدة من الموقع مؤقتاً.', 'Désactivé, les nouvelles commandes depuis le site sont suspendues.', 'When off, new orders from the website are paused.'],
  ['am.set.orderingOffWarn', 'الطلب عبر الموقع متوقف: لن يتمكن الزبائن من إرسال طلبات جديدة بعد الحفظ.', 'Commandes en ligne désactivées : les clients ne pourront plus passer commande après l’enregistrement.', 'Online ordering is off: customers will not be able to place orders once you save.'],
  ['am.set.delivery', 'التوصيل إلى المنزل', 'Livraison à domicile', 'Home delivery'],
  ['am.set.deliveryHint', 'عند الإيقاف يختفي خيار التوصيل من صفحة الطلب. رسوم التوصيل يحددها المطعم لكل طلب.', 'Désactivée, l’option livraison disparaît du panier. Les frais sont fixés par le restaurant pour chaque commande.', 'When off, the delivery option is hidden at checkout. The restaurant sets the fee per order.'],

  // Reviews
  ['am.rev.title', 'آراء الزبائن', 'Avis des clients', 'Customer reviews'],
  ['am.rev.pendingCount', '{n} بانتظار المراجعة', '{n} en attente', '{n} awaiting review'],
  ['am.rev.filter.all', 'الكل', 'Tous', 'All'],
  ['am.rev.filter.pending', 'بانتظار المراجعة', 'En attente', 'Pending'],
  ['am.rev.filter.approved', 'مقبولة', 'Approuvés', 'Approved'],
  ['am.rev.approved', 'مقبول', 'Approuvé', 'Approved'],
  ['am.rev.pending', 'بانتظار المراجعة', 'En attente', 'Pending'],
  ['am.rev.approve', 'قبول ونشر', 'Approuver', 'Approve'],
  ['am.rev.unapprove', 'إلغاء القبول', 'Retirer', 'Unapprove'],
  ['am.rev.noComment', 'بدون تعليق.', 'Sans commentaire.', 'No comment.'],
  ['am.rev.empty', 'لا توجد آراء.', 'Aucun avis.', 'No reviews.'],
  ['am.rev.confirmDelete', 'حذف هذا الرأي نهائياً؟', 'Supprimer définitivement cet avis ?', 'Permanently delete this review?'],

  // Applications
  ['am.app.title', 'طلبات التوظيف', "Candidatures", 'Job applications'],
  ['am.app.newCount', '{n} جديد', '{n} nouvelle(s)', '{n} new'],
  ['am.app.status.new', 'جديد', 'Nouvelle', 'New'],
  ['am.app.status.reviewed', 'تمت مراجعته', 'Examinée', 'Reviewed'],
  ['am.app.status.archived', 'مؤرشف', 'Archivée', 'Archived'],
  ['am.app.setStatus', 'الحالة:', 'Statut :', 'Status:'],
  ['am.app.more', 'عرض الرسالة كاملة', 'Voir tout le message', 'Show full message'],
  ['am.app.less', 'إخفاء', 'Réduire', 'Show less'],
  ['am.app.noMessage', 'بدون رسالة.', 'Sans message.', 'No message.'],
  ['am.app.empty', 'لا توجد طلبات.', 'Aucune candidature.', 'No applications.'],
  ['am.app.confirmDelete', 'حذف طلب «{name}» نهائياً؟', 'Supprimer définitivement la candidature de « {name} » ?', 'Permanently delete the application from "{name}"?'],
];

export const ar: Record<string, string> = Object.fromEntries(rows.map((r) => [r[0], r[1]]));
export const fr: Record<string, string> = Object.fromEntries(rows.map((r) => [r[0], r[2]]));
export const en: Record<string, string> = Object.fromEntries(rows.map((r) => [r[0], r[3]]));
