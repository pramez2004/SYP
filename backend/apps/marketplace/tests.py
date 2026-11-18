from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.marketplace.models import Shop, Product, Category

User = get_user_model()


class MarketplaceAPITests(APITestCase):
    def setUp(self):
        # 1. Create users
        self.seller1 = User.objects.create_user(
            username='seller1',
            email='seller1@test.com',
            password='Password123!',
            role='seller',
            city='Damak',
        )
        self.seller2 = User.objects.create_user(
            username='seller2',
            email='seller2@test.com',
            password='Password123!',
            role='seller',
            city='Birtamod',
        )
        self.customer = User.objects.create_user(
            username='customer1',
            email='customer1@test.com',
            password='Password123!',
            role='customer',
            city='Damak',
        )

        self.category = Category.objects.create(
            name_en='Puja Essentials',
            name_ne='पूजा सामग्री',
            slug='puja-essentials',
        )

        self.shops_url = reverse('marketplace:shop-list')
        self.products_url = reverse('marketplace:product-list')

    def test_seller_creates_unverified_shop_and_cannot_create_product_until_verified(self):
        """
        Seller creates shop (defaults to is_verified=False).
        Cannot create a product while shop is unverified.
        Once verified, seller can create products.
        """
        self.client.force_authenticate(user=self.seller1)

        # 1. Create shop
        shop_data = {
            'name': 'Damak Puja Bhandar',
            'city': 'Damak',
            'phone': '9800000000',
            'description': 'Authentic puja items in Damak',
        }
        res = self.client.post(self.shops_url, shop_data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], 'Damak Puja Bhandar')
        self.assertFalse(res.data['is_verified'])

        shop = Shop.objects.get(id=res.data['id'])
        self.assertFalse(shop.is_verified)
        self.assertEqual(shop.owner, self.seller1)

        # 2. Try to create product with unverified shop -> rejected
        product_data = {
            'name_en': 'Brass Diyo',
            'name_ne': 'पित्तलको दियो',
            'price': '150.00',
            'stock': 20,
            'category': self.category.id,
        }
        product_res = self.client.post(self.products_url, product_data)
        self.assertEqual(product_res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Admin verifies the shop
        shop.is_verified = True
        shop.save()

        # 4. Verified seller can now create product
        product_res2 = self.client.post(self.products_url, product_data)
        self.assertEqual(product_res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(product_res2.data['name_en'], 'Brass Diyo')
        self.assertEqual(Product.objects.count(), 1)

    def test_verified_seller_creates_product_and_another_seller_cannot_edit_or_delete(self):
        """Verified seller creates product; another seller cannot edit or delete it."""
        # Setup verified shop for seller1 and product
        shop1 = Shop.objects.create(
            owner=self.seller1,
            name='Seller 1 Shop',
            city='Damak',
            is_verified=True,
            is_active=True,
        )
        product = Product.objects.create(
            shop=shop1,
            category=self.category,
            name_en='Sandalwood Paste',
            price='250.00',
            stock=15,
        )

        # Setup verified shop for seller2
        Shop.objects.create(
            owner=self.seller2,
            name='Seller 2 Shop',
            city='Birtamod',
            is_verified=True,
            is_active=True,
        )

        detail_url = reverse('marketplace:product-detail', kwargs={'pk': product.pk})

        # Seller 2 tries to edit Seller 1's product -> rejected (403 or 404)
        self.client.force_authenticate(user=self.seller2)
        edit_res = self.client.patch(detail_url, {'price': '999.00'})
        self.assertIn(edit_res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # Seller 2 tries to delete Seller 1's product -> rejected (403 or 404)
        del_res = self.client.delete(detail_url)
        self.assertIn(del_res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        self.assertTrue(Product.objects.filter(id=product.id).exists())

        # Seller 1 (the owner) can edit and delete
        self.client.force_authenticate(user=self.seller1)
        owner_edit_res = self.client.patch(detail_url, {'price': '220.00'})
        self.assertEqual(owner_edit_res.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(str(product.price), '220.00')

    def test_customer_cannot_create_product_and_anonymous_sees_only_verified_shop_products(self):
        """
        Customer cannot create a product (403).
        Anonymous user can list products of verified active shops only.
        """
        # Verified shop with product
        verified_shop = Shop.objects.create(
            owner=self.seller1,
            name='Verified Shop',
            city='Damak',
            is_verified=True,
            is_active=True,
        )
        prod_verified = Product.objects.create(
            shop=verified_shop,
            name_en='Verified Puja Item',
            price='100.00',
            stock=10,
        )

        # Unverified shop with product
        unverified_shop = Shop.objects.create(
            owner=self.seller2,
            name='Unverified Shop',
            city='Birtamod',
            is_verified=False,
            is_active=True,
        )
        prod_unverified = Product.objects.create(
            shop=unverified_shop,
            name_en='Unverified Item',
            price='100.00',
            stock=10,
        )

        # 1. Customer cannot create a product
        self.client.force_authenticate(user=self.customer)
        cust_res = self.client.post(self.products_url, {
            'name_en': 'Customer Item',
            'price': '50.00',
            'stock': 5,
        })
        self.assertEqual(cust_res.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Anonymous user listing products sees only verified shop's product
        self.client.logout()
        anon_res = self.client.get(self.products_url)
        self.assertEqual(anon_res.status_code, status.HTTP_200_OK)
        results = anon_res.data.get('results', anon_res.data)
        product_names = [p['name_en'] for p in results]
        self.assertIn('Verified Puja Item', product_names)
        self.assertNotIn('Unverified Item', product_names)
