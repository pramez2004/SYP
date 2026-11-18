from datetime import date, timedelta
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.festivals.models import Festival, RitualStep, PujaItem


class FestivalAPITests(APITestCase):
    def setUp(self):
        self.today = date.today()
        self.tomorrow = self.today + timedelta(days=1)
        self.yesterday = self.today - timedelta(days=1)

        # 1. Past festival
        self.past_festival = Festival.objects.create(
            name_en='Past Festival',
            name_ne='विगत चाड',
            slug='past-festival',
            date_start=self.yesterday - timedelta(days=5),
            date_end=self.yesterday,
        )

        # 2. Today festival
        self.today_festival = Festival.objects.create(
            name_en='Today Festival',
            name_ne='आजको चाड',
            slug='today-festival',
            date_start=self.today,
            date_end=self.tomorrow,
            is_featured=True,
        )

        # 3. Upcoming festival
        self.upcoming_festival = Festival.objects.create(
            name_en='Upcoming Festival',
            name_ne='आगामी चाड',
            slug='upcoming-festival',
            date_start=self.today + timedelta(days=10),
            date_end=self.today + timedelta(days=12),
        )

        # Ritual steps and Puja items for today_festival
        self.step1 = RitualStep.objects.create(
            festival=self.today_festival,
            order=1,
            title_en='Morning Snan',
            title_ne='बिहानी स्नान',
            description_en='Take holy bath before sunrise.',
            description_ne='सूर्योदय अघि पवित्र स्नान गर्ने।',
        )
        self.step2 = RitualStep.objects.create(
            festival=self.today_festival,
            order=2,
            title_en='Diyo Baalne',
            title_ne='दियो बाल्ने',
            description_en='Light the brass oil lamp.',
            description_ne='पित्तलको दियो बाल्ने।',
        )

        self.item1 = PujaItem.objects.create(
            festival=self.today_festival,
            name_en='Red Sindoor',
            name_ne='रातो सिन्दुर',
            quantity='1 packet',
            is_essential=True,
        )
        self.item2 = PujaItem.objects.create(
            festival=self.today_festival,
            name_en='Agarbatti',
            name_ne='अगरबत्ती',
            quantity='1 box',
            is_essential=False,
        )

    def test_list_festivals(self):
        """GET /api/festivals/ lists all festivals."""
        url = reverse('festivals:festival-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should return all 3 festivals (paginated or unpaginated)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 3)

    def test_detail_festival_includes_rituals_and_puja_items(self):
        """GET /api/festivals/{slug}/ includes ritual steps and puja items."""
        url = reverse('festivals:festival-detail', kwargs={'slug': self.today_festival.slug})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['slug'], 'today-festival')

        # Check ritual steps
        ritual_steps = res.data.get('ritual_steps', [])
        self.assertEqual(len(ritual_steps), 2)
        self.assertEqual(ritual_steps[0]['title_en'], 'Morning Snan')
        self.assertEqual(ritual_steps[1]['title_en'], 'Diyo Baalne')

        # Check puja items
        puja_items = res.data.get('puja_items', [])
        self.assertEqual(len(puja_items), 2)
        self.assertEqual(puja_items[0]['name_en'], 'Red Sindoor')
        self.assertTrue(puja_items[0]['is_essential'])

    def test_upcoming_festivals(self):
        """GET /api/festivals/upcoming/ returns festivals on or after today."""
        url = reverse('festivals:festival-upcoming')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [f['slug'] for f in res.data]
        self.assertIn('today-festival', slugs)
        self.assertIn('upcoming-festival', slugs)
        self.assertNotIn('past-festival', slugs)

    def test_today_festivals(self):
        """GET /api/festivals/today/ returns festival(s) occurring today."""
        url = reverse('festivals:festival-today')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [f['slug'] for f in res.data]
        self.assertIn('today-festival', slugs)
        self.assertNotIn('past-festival', slugs)
        self.assertNotIn('upcoming-festival', slugs)

    def test_calendar_with_year(self):
        """GET /api/festivals/calendar/?year=YYYY filters by year."""
        current_year = self.today.year
        url = f"{reverse('festivals:festival-calendar')}?year={current_year}"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

        # Different year returns empty list
        other_year_url = f"{reverse('festivals:festival-calendar')}?year=2099"
        res2 = self.client.get(other_year_url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res2.data), 0)
