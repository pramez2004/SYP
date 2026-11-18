"""
Management command to seed the database with real Nepali festival data,
sample categories, shops, and products for development.
"""

from datetime import date
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.festivals.models import Festival, RitualStep, PujaItem
from apps.marketplace.models import Category, Shop, Product

User = get_user_model()


# =============================================================================
# FESTIVAL SEED DATES
# =============================================================================
# TODO: verify against the official Nepali patro
# The festival dates below are currently unverified (for example, Dashain 2026
# and Tihar 2026 look wrong). Do NOT guess new dates; each date range must
# be verified against the official Nepali Patro published by the Nepal
# Panchanga Nirnayak Samiti for 2083 BS (2026/2027 Gregorian).
FESTIVAL_SEED_DATES = {
    'dashain': {
        'date_start': date(2026, 10, 12),
        'date_end': date(2026, 10, 26),
        'nepali_date': 'असोज/कार्तिक',
    },
    'tihar': {
        'date_start': date(2026, 11, 1),
        'date_end': date(2026, 11, 5),
        'nepali_date': 'कार्तिक',
    },
    'chhath': {
        'date_start': date(2026, 11, 7),
        'date_end': date(2026, 11, 8),
        'nepali_date': 'कार्तिक',
    },
    'janai-purnima': {
        'date_start': date(2026, 8, 19),
        'date_end': None,
        'nepali_date': 'श्रावण',
    },
    'teej': {
        'date_start': date(2026, 9, 2),
        'date_end': None,
        'nepali_date': 'भाद्र',
    },
    'maghe-sankranti': {
        'date_start': date(2027, 1, 14),
        'date_end': None,
        'nepali_date': 'माघ १',
    },
    'maha-shivaratri': {
        'date_start': date(2027, 2, 20),
        'date_end': None,
        'nepali_date': 'फाल्गुन ८',
    },
    'holi': {
        'date_start': date(2027, 3, 14),
        'date_end': None,
        'nepali_date': 'फाल्गुन ३०',
    },
    'bisket-jatra': {
        'date_start': date(2027, 4, 14),
        'date_end': date(2027, 4, 15),
        'nepali_date': 'बैशाख १',
    },
    'buddha-jayanti': {
        'date_start': date(2027, 5, 11),
        'date_end': None,
        'nepali_date': 'जेठ',
    },
}


class Command(BaseCommand):
    help = 'Seed database with Nepali festivals, categories, shops, and products'

    def handle(self, *args, **options):
        self.stdout.write('🎪 Seeding Chaad Baad database...\n')

        self._seed_festivals()
        self._seed_categories()
        self._seed_users()
        self._seed_shops()
        self._seed_products()

        self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!'))

    def _seed_festivals(self):
        festivals_content = [
            {
                'name_en': 'Dashain',
                'name_ne': 'दशैँ',
                'slug': 'dashain',
                'description_en': (
                    'Dashain is the longest and the most auspicious festival in the '
                    'Nepali annual calendar. It celebrates the victory of the goddess '
                    'Durga over the demon Mahishasura.'
                ),
                'description_ne': (
                    'दशैँ नेपालीहरूको सबैभन्दा ठूलो र महत्त्वपूर्ण चाड हो। यो चाडले '
                    'दुर्गा देवीले महिषासुर राक्षसलाई मारेको विजयको उत्सव मनाउँछ।'
                ),
                'significance_en': (
                    'Symbolizes the triumph of good over evil. Families reunite, '
                    'fly kites, and receive tika and jamara from elders.'
                ),
                'significance_ne': (
                    'असत्यमाथि सत्यको विजयको प्रतीक। परिवार भेला हुन्छ, चंगा उडाउँछ, '
                    'र ठूलाबडाबाट टीका र जमरा लिन्छ।'
                ),
                'is_national_holiday': True,
                'is_featured': True,
            },
            {
                'name_en': 'Tihar (Deepawali)',
                'name_ne': 'तिहार (दीपावली)',
                'slug': 'tihar',
                'description_en': (
                    'Tihar, the festival of lights, is a five-day celebration honouring '
                    'crows, dogs, cows, oxen, and the bond between brothers and sisters.'
                ),
                'description_ne': (
                    'तिहार बत्तीको पर्व हो, पाँच दिनसम्म काग, कुकुर, गाई, गोरु र '
                    'दाजुभाइ-दिदीबहिनी बीचको सम्बन्धको उत्सव।'
                ),
                'significance_en': (
                    'Houses are lit with oil lamps and candles. Lakshmi Puja on '
                    'the third day invokes prosperity.'
                ),
                'significance_ne': (
                    'घरहरूमा दियो र मैनबत्ती बाल्छ। तेस्रो दिन लक्ष्मी पूजाले '
                    'समृद्धिको आह्वान गर्छ।'
                ),
                'is_national_holiday': True,
                'is_featured': True,
            },
            {
                'name_en': 'Chhath Puja',
                'name_ne': 'छठ पूजा',
                'slug': 'chhath',
                'description_en': (
                    'Chhath Puja is dedicated to the Sun God (Surya) and Chhathi Maiya. '
                    'Devotees fast and offer prayers at rivers and ponds during sunrise and sunset.'
                ),
                'description_ne': (
                    'छठ पूजा सूर्य भगवान र छठी मैयालाई समर्पित छ। भक्तजनहरू व्रत बस्छन् '
                    'र नदी तथा पोखरीमा सूर्योदय र सूर्यास्तमा पूजा गर्छन्।'
                ),
                'significance_en': (
                    'Praying for the well-being and prosperity of family members. '
                    'The festival is widely celebrated in the Terai region.'
                ),
                'significance_ne': (
                    'परिवारको स्वास्थ्य र समृद्धिको कामना गरिन्छ। यो चाड तराई क्षेत्रमा '
                    'व्यापक रूपमा मनाइन्छ।'
                ),
                'is_national_holiday': True,
                'is_featured': False,
            },
            {
                'name_en': 'Maghe Sankranti',
                'name_ne': 'माघे संक्रान्ति',
                'slug': 'maghe-sankranti',
                'description_en': (
                    'Maghe Sankranti marks the beginning of the Nepali month Magh '
                    'and the end of winter solstice. People take holy dips in rivers '
                    'and eat sesame, yam, and ghee.'
                ),
                'description_ne': (
                    'माघे संक्रान्तिले माघ महिनाको सुरुवात र जाडोको अन्त्यलाई चिन्ह लगाउँछ। '
                    'मानिसहरू नदीमा स्नान गर्छन् र तिल, तरुल र घिउ खान्छन्।'
                ),
                'significance_en': (
                    'Marks the transition to warmer days. Sacred bathing at confluences '
                    'is believed to cleanse sins.'
                ),
                'significance_ne': (
                    'न्यानो दिनहरूमा प्रवेशको संकेत। पवित्र स्नानले पापहरू धुन्छ '
                    'भन्ने विश्वास छ।'
                ),
                'is_national_holiday': True,
                'is_featured': False,
            },
            {
                'name_en': 'Maha Shivaratri',
                'name_ne': 'महाशिवरात्रि',
                'slug': 'maha-shivaratri',
                'description_en': (
                    'Maha Shivaratri is the great night of Lord Shiva. Devotees fast, '
                    'stay awake through the night, and visit Pashupatinath Temple.'
                ),
                'description_ne': (
                    'महाशिवरात्रि भगवान शिवको महान रात हो। भक्तजनहरू व्रत बस्छन्, '
                    'रातभर जागा रहन्छन्, र पशुपतिनाथ मन्दिर जान्छन्।'
                ),
                'significance_en': (
                    'Celebrates Lord Shiva. Devotees throng Pashupatinath from across '
                    'Nepal and India.'
                ),
                'significance_ne': (
                    'भगवान शिवको पूजा। पशुपतिनाथमा नेपाल र भारतबाट भक्तजनहरू आउँछन्।'
                ),
                'is_national_holiday': True,
                'is_featured': True,
            },
            {
                'name_en': 'Holi',
                'name_ne': 'होली (फागु पूर्णिमा)',
                'slug': 'holi',
                'description_en': (
                    'Holi, the festival of colours, celebrates spring and the victory '
                    'of good over evil. People throw coloured powder and water at each other.'
                ),
                'description_ne': (
                    'होली रंगहरूको पर्व हो, वसन्तको स्वागत र असत्यमाथि सत्यको जित मनाउँछ। '
                    'मानिसहरू एकअर्कामा रंग र पानी हान्छन्।'
                ),
                'significance_en': (
                    'Celebrates the arrival of spring and the legend of Holika and Prahlad.'
                ),
                'significance_ne': (
                    'वसन्तको आगमन र होलिका-प्रह्लादको कथा मनाउँछ।'
                ),
                'is_national_holiday': True,
                'is_featured': True,
            },
            {
                'name_en': 'Bisket Jatra',
                'name_ne': 'बिस्केट जात्रा',
                'slug': 'bisket-jatra',
                'description_en': (
                    'Bisket Jatra is celebrated in Bhaktapur during the Nepali New Year. '
                    'A chariot procession, tug-of-war, and the raising of a lingam pole '
                    'are the highlights.'
                ),
                'description_ne': (
                    'बिस्केट जात्रा नयाँ वर्षमा भक्तपुरमा मनाइन्छ। रथ यात्रा, रस्साकस्सी '
                    'र लिंगो ठड्याउने प्रमुख आकर्षण हो।'
                ),
                'significance_en': (
                    'Marks the Nepali New Year in Bhaktapur with ancient traditions.'
                ),
                'significance_ne': (
                    'भक्तपुरमा प्राचीन परम्परासहित नयाँ वर्ष मनाइन्छ।'
                ),
                'is_national_holiday': True,
                'is_featured': False,
            },
            {
                'name_en': 'Buddha Jayanti',
                'name_ne': 'बुद्ध जयन्ती',
                'slug': 'buddha-jayanti',
                'description_en': (
                    'Buddha Jayanti celebrates the birth, enlightenment, and death of '
                    'Gautama Buddha. Lumbini, his birthplace, sees huge gatherings.'
                ),
                'description_ne': (
                    'बुद्ध जयन्ती गौतम बुद्धको जन्म, ज्ञानप्राप्ति र निधनको स्मृतिमा '
                    'मनाइन्छ। उहाँको जन्मस्थान लुम्बिनीमा ठूलो भेला हुन्छ।'
                ),
                'significance_en': (
                    'Celebrates the life of Siddhartha Gautama, the founder of Buddhism, '
                    'born in Lumbini, Nepal.'
                ),
                'significance_ne': (
                    'लुम्बिनी, नेपालमा जन्मिएका बौद्ध धर्मका संस्थापक सिद्धार्थ गौतमको '
                    'जीवन मनाइन्छ।'
                ),
                'is_national_holiday': True,
                'is_featured': False,
            },
            {
                'name_en': 'Teej',
                'name_ne': 'तीज',
                'slug': 'teej',
                'description_en': (
                    'Teej is a festival for women who fast and pray for the long life '
                    'and happiness of their husbands. Women dress in red saris and sing Teej songs.'
                ),
                'description_ne': (
                    'तीज महिलाहरूको चाड हो जहाँ तिनीहरू पतिको लामो आयु र सुखको लागि '
                    'व्रत बस्छन्। महिलाहरू रातो साडी लगाएर तीजका गीत गाउँछन्।'
                ),
                'significance_en': (
                    'Celebrates marital happiness. Women gather at temples, dance, '
                    'and sing traditional songs.'
                ),
                'significance_ne': (
                    'वैवाहिक सुखको उत्सव। महिलाहरू मन्दिरमा भेला भएर नाच्छन् र गीत गाउँछन्।'
                ),
                'is_national_holiday': True,
                'is_featured': True,
            },
            {
                'name_en': 'Janai Purnima (Raksha Bandhan)',
                'name_ne': 'जनै पूर्णिमा (रक्षा बन्धन)',
                'slug': 'janai-purnima',
                'description_en': (
                    'Janai Purnima is a sacred thread festival. Hindu men change their '
                    'sacred threads (janai), and everyone ties a protective thread (doro) '
                    'on their wrists.'
                ),
                'description_ne': (
                    'जनै पूर्णिमामा हिन्दू पुरुषहरू जनै फेर्छन्, र सबैले हातमा रक्षा '
                    'सूत्र (डोरो) बाँध्छन्।'
                ),
                'significance_en': (
                    'Renewal of sacred threads and protection rituals. Gosaikunda '
                    'attracts thousands of pilgrims.'
                ),
                'significance_ne': (
                    'जनै फेर्ने र रक्षा विधि। गोसाइँकुण्डमा हजारौं तीर्थयात्री जम्मा हुन्छन्।'
                ),
                'is_national_holiday': True,
                'is_featured': False,
            },
        ]

        for item in festivals_content:
            slug = item['slug']
            date_info = FESTIVAL_SEED_DATES.get(slug, {})
            festival_data = {**item, **date_info}

            festival, created = Festival.objects.update_or_create(
                slug=slug,
                defaults=festival_data,
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'  {action} festival: {festival.name_en}')

        # Add ritual steps for Dashain (idempotent)
        dashain = Festival.objects.get(slug='dashain')
        ritual_steps = [
            ('Ghatasthapana', 'घटस्थापना', 'Plant jamara seeds in a holy vessel. This marks the beginning of Dashain.', 'जमरा रोप्ने। दशैँको सुरुवात।'),
            ('Fulpati', 'फूलपाती', 'The seventh day. Holy flowers and plants from Gorkha arrive at Hanuman Dhoka.', 'सातौं दिन। गोरखाबाट पवित्र फूलपाती ल्याइन्छ।'),
            ('Maha Astami', 'महा अष्टमी', 'The great eighth day. Animal sacrifices and goddess worship.', 'महान आठौं दिन। बलि र देवी पूजा।'),
            ('Maha Navami', 'महा नवमी', 'The ninth day. Worship of tools, vehicles, and instruments of livelihood.', 'नवौं दिन। औजार, सवारी र जीविकाका साधनको पूजा।'),
            ('Vijaya Dashami', 'विजया दशमी', 'The tenth day. Elders apply tika and jamara on the foreheads of younger family members.', 'दशौं दिन। ठूलाबडाले सानाहरूको निधारमा टीका र जमरा लगाइदिन्छन्।'),
        ]
        for i, (en, ne, desc_en, desc_ne) in enumerate(ritual_steps, 1):
            RitualStep.objects.update_or_create(
                festival=dashain,
                order=i,
                defaults={
                    'title_en': en,
                    'title_ne': ne,
                    'description_en': desc_en,
                    'description_ne': desc_ne,
                },
            )

        # Add puja items for Dashain (idempotent)
        puja_items = [
            ('Tika (Vermilion)', 'टीका (सिन्दुर)', '1 packet', True),
            ('Jamara Seeds', 'जमरा बिउ', '1 bundle', True),
            ('Yogurt (Dahi)', 'दही', '500ml', True),
            ('Rice Grains (Akshata)', 'अक्षता (चामल)', '1 plate', True),
            ('Marigold Flowers', 'सयपत्री फूल', '1 bundle', True),
            ('Incense Sticks', 'अगरबत्ती', '1 packet', False),
            ('Holy Thread (Kalava)', 'कलावा (रातो धागो)', '1 roll', False),
        ]
        for name_en, name_ne, qty, essential in puja_items:
            PujaItem.objects.update_or_create(
                festival=dashain,
                name_en=name_en,
                defaults={
                    'name_ne': name_ne,
                    'quantity': qty,
                    'is_essential': essential,
                },
            )

        self.stdout.write('  Added ritual steps & puja items for Dashain')

    def _seed_categories(self):
        categories = [
            ('Flowers', 'फूलहरू', 'flowers', '🌸', 1),
            ('Incense & Dhoop', 'अगरबत्ती र धूप', 'incense-dhoop', '🪔', 2),
            ('Tika & Sindoor', 'टीका र सिन्दुर', 'tika-sindoor', '🔴', 3),
            ('Puja Vessels', 'पूजाका भाँडा', 'puja-vessels', '🏺', 4),
            ('Holy Thread & Janai', 'पवित्र धागो र जनै', 'holy-thread', '🧵', 5),
            ('Fruits & Offerings', 'फलफूल र प्रसाद', 'fruits-offerings', '🍎', 6),
            ('Oil Lamps & Diyo', 'दियो र बत्ती', 'oil-lamps', '🕯️', 7),
            ('Puja Kits (Bundles)', 'पूजा किट (सेट)', 'puja-kits', '📦', 8),
        ]
        for en, ne, slug, icon, order in categories:
            cat, created = Category.objects.update_or_create(
                slug=slug,
                defaults={'name_en': en, 'name_ne': ne, 'icon': icon, 'order': order},
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'  {action} category: {en}')

    def _seed_users(self):
        # Create sample seller accounts
        sellers = [
            ('seller_damak', 'Puja Store Damak', 'seller_damak@test.com', 'Damak'),
            ('seller_birtamod', 'Mandala Puja House', 'seller_birtamod@test.com', 'Birtamod'),
            ('seller_itahari', 'Om Puja Saman', 'seller_itahari@test.com', 'Itahari'),
        ]
        for username, name, email, city in sellers:
            user, created = User.objects.update_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': name.split()[0],
                    'last_name': ' '.join(name.split()[1:]),
                    'role': 'seller',
                    'city': city,
                    'phone_number': '9800000000',
                },
            )
            user.set_password('testpass123')
            user.save()
            self.stdout.write(f'  {"Created" if created else "Updated"} seller: {username}')

        # Create a sample customer
        customer, created = User.objects.update_or_create(
            username='customer1',
            defaults={
                'email': 'customer1@test.com',
                'first_name': 'Ram',
                'last_name': 'Thapa',
                'role': 'customer',
                'city': 'Damak',
                'phone_number': '9810000000',
            },
        )
        customer.set_password('testpass123')
        customer.save()
        self.stdout.write(f'  {"Created" if created else "Updated"} customer: customer1')

    def _seed_shops(self):
        shop_data = [
            ('seller_damak', 'Puja Store Damak', 'Damak', 'Your one-stop shop for all puja essentials in Damak. Quality items at affordable prices.'),
            ('seller_birtamod', 'Mandala Puja House', 'Birtamod', 'Specialising in traditional puja items. Handcrafted and authentic products for every festival.'),
            ('seller_itahari', 'Om Puja Saman', 'Itahari', 'Complete puja materials for all Nepali festivals. Fast delivery across Itahari city.'),
        ]
        for username, name, city, desc in shop_data:
            owner = User.objects.get(username=username)
            shop, created = Shop.objects.update_or_create(
                owner=owner,
                name=name,
                defaults={
                    'city': city,
                    'description': desc,
                    'phone': '9800000000',
                    'is_verified': True,
                    'is_active': True,
                },
            )
            self.stdout.write(f'  {"Created" if created else "Updated"} shop: {name}')

    def _seed_products(self):
        products_data = [
            # Flowers
            ('Marigold Garland', 'सयपत्री माला', 'flowers', 50, None, 'per garland'),
            ('Rose Petals', 'गुलाबका पत्ती', 'flowers', 80, 60, 'per bundle'),
            ('Lotus Flower (Kamal)', 'कमल फूल', 'flowers', 120, None, 'per piece'),
            # Incense
            ('Agarbatti Premium Pack', 'अगरबत्ती प्रिमियम प्याक', 'incense-dhoop', 100, 80, 'per pack'),
            ('Dhoop Sticks', 'धूप बत्ती', 'incense-dhoop', 60, None, 'per pack'),
            ('Camphor (Kapoor)', 'कपूर', 'incense-dhoop', 40, None, '50g'),
            # Tika
            ('Vermilion (Sindoor)', 'सिन्दुर', 'tika-sindoor', 30, None, 'per packet'),
            ('Abir Powder (Red)', 'अबिर', 'tika-sindoor', 25, None, 'per packet'),
            ('Roli Tika Set', 'रोली टीका सेट', 'tika-sindoor', 150, 120, 'per set'),
            # Vessels
            ('Brass Puja Thali', 'पित्तलको पूजा थाली', 'puja-vessels', 450, 380, 'per piece'),
            ('Copper Kalash', 'तामाको कलश', 'puja-vessels', 600, None, 'per piece'),
            ('Small Diyo (Oil Lamp)', 'सानो दियो', 'oil-lamps', 35, None, 'per piece'),
            ('Brass Diyo Set', 'पित्तलको दियो सेट', 'oil-lamps', 250, 200, 'set of 5'),
            # Thread
            ('Janai (Sacred Thread)', 'जनै', 'holy-thread', 20, None, 'per piece'),
            ('Kalava Thread Roll', 'कलावा धागो रोल', 'holy-thread', 30, None, 'per roll'),
            # Puja Kits
            ('Dashain Puja Kit', 'दशैँ पूजा किट', 'puja-kits', 500, 420, 'complete set'),
            ('Tihar Puja Kit', 'तिहार पूजा किट', 'puja-kits', 450, 380, 'complete set'),
            ('Daily Puja Kit', 'दैनिक पूजा किट', 'puja-kits', 200, None, 'basic set'),
        ]

        shops = list(Shop.objects.all())
        if not shops:
            return

        for i, (en, ne, cat_slug, price, disc, unit) in enumerate(products_data):
            shop = shops[i % len(shops)]
            category = Category.objects.filter(slug=cat_slug).first()
            Product.objects.update_or_create(
                name_en=en,
                shop=shop,
                defaults={
                    'name_ne': ne,
                    'category': category,
                    'price': price,
                    'discount_price': disc,
                    'unit': unit,
                    'stock': 50,
                    'is_available': True,
                },
            )
        self.stdout.write(f'  Created/updated {len(products_data)} products across {len(shops)} shops')
