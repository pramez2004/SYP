from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.marketplace.models import Shop, Product, Category
from apps.orders.models import Order, OrderItem, CartItem

User = get_user_model()


class OrdersAPITests(APITestCase):
    def setUp(self):
        # 1. Users
        self.customer1 = User.objects.create_user(
            username='cust1',
            email='cust1@test.com',
            password='Password123!',
            role='customer',
            city='Damak',
            first_name='Customer',
            last_name='One',
        )
        self.customer2 = User.objects.create_user(
            username='cust2',
            email='cust2@test.com',
            password='Password123!',
            role='customer',
            city='Damak',
            first_name='Customer',
            last_name='Two',
        )
        self.seller1 = User.objects.create_user(
            username='seller1',
            email='seller1@test.com',
            password='Password123!',
            role='seller',
            city='Damak',
            first_name='Seller',
            last_name='One',
        )
        self.seller2 = User.objects.create_user(
            username='seller2',
            email='seller2@test.com',
            password='Password123!',
            role='seller',
            city='Birtamod',
            first_name='Seller',
            last_name='Two',
        )

        # 2. Shops
        self.shop1 = Shop.objects.create(
            owner=self.seller1,
            name='Damak Puja House',
            city='Damak',
            is_verified=True,
            is_active=True,
        )
        self.shop2 = Shop.objects.create(
            owner=self.seller2,
            name='Birtamod Puja Store',
            city='Birtamod',
            is_verified=True,
            is_active=True,
        )

        # 3. Products
        self.category = Category.objects.create(name_en='Puja', name_ne='पूजा', slug='puja')

        self.prod1 = Product.objects.create(
            shop=self.shop1,
            category=self.category,
            name_en='Damak Agarbatti',
            price='100.00',
            stock=10,
            is_available=True,
        )
        self.prod2 = Product.objects.create(
            shop=self.shop2,
            category=self.category,
            name_en='Birtamod Kalash',
            price='500.00',
            stock=5,
            is_available=True,
        )

        self.cart_url = reverse('orders:cart-list')
        self.checkout_url = reverse('orders:cart-checkout')
        self.orders_url = reverse('orders:order-list')

    def test_add_to_cart_and_checkout_creates_orders_and_reduces_stock(self):
        """Add to cart and checkout creates one order per shop and reduces stock."""
        self.client.force_authenticate(user=self.customer1)

        # Add prod1 (shop1, qty=2) and prod2 (shop2, qty=1) to cart
        # Wait, for checkout with prod2 (shop2 is in Birtamod), shop city must match delivery city.
        # Let's add another product in shop1 to test multi-item single shop or create shop1b in Damak!
        shop1b = Shop.objects.create(
            owner=self.seller1,
            name='Damak Flowers Shop',
            city='Damak',
            is_verified=True,
            is_active=True,
        )
        prod1b = Product.objects.create(
            shop=shop1b,
            category=self.category,
            name_en='Damak Marigold',
            price='50.00',
            stock=20,
            is_available=True,
        )

        # Add both Damak products to cart
        self.client.post(self.cart_url, {'product': self.prod1.id, 'quantity': 2})
        self.client.post(self.cart_url, {'product': prod1b.id, 'quantity': 3})

        self.assertEqual(CartItem.objects.filter(user=self.customer1).count(), 2)

        # Checkout with delivery_city='Damak'
        checkout_data = {
            'delivery_city': 'Damak',
            'delivery_address': 'Main Chowk, Ward 5',
            'delivery_phone': '9801234567',
            'customer_note': 'Deliver by 10 AM',
        }
        res = self.client.post(self.checkout_url, checkout_data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # 2 orders created (one for shop1, one for shop1b)
        self.assertEqual(Order.objects.filter(customer=self.customer1).count(), 2)

        # Stock reduced
        self.prod1.refresh_from_db()
        prod1b.refresh_from_db()
        self.assertEqual(self.prod1.stock, 8)  # 10 - 2
        self.assertEqual(prod1b.stock, 17)   # 20 - 3

        # Cart is cleared
        self.assertEqual(CartItem.objects.filter(user=self.customer1).count(), 0)

    def test_checkout_rejections(self):
        """Checkout rejected when quantity > stock, city mismatch, or empty cart."""
        self.client.force_authenticate(user=self.customer1)

        # 1. Empty cart checkout
        res_empty = self.client.post(self.checkout_url, {
            'delivery_city': 'Damak',
            'delivery_address': 'Damak-5',
            'delivery_phone': '9801234567',
        })
        self.assertEqual(res_empty.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cart is empty', res_empty.data['detail'].lower())

        # 2. Add prod1 to cart (stock=10)
        self.client.post(self.cart_url, {'product': self.prod1.id, 'quantity': 15})

        # Checkout exceeds stock -> 400
        res_stock = self.client.post(self.checkout_url, {
            'delivery_city': 'Damak',
            'delivery_address': 'Damak-5',
            'delivery_phone': '9801234567',
        })
        self.assertEqual(res_stock.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient stock', res_stock.data['detail'])

        # 3. Update to valid quantity, but city mismatch
        self.client.post(self.cart_url, {'product': self.prod1.id, 'quantity': 2})
        # prod1 shop is in Damak, but delivery_city is Kathmandu
        res_city = self.client.post(self.checkout_url, {
            'delivery_city': 'Kathmandu',
            'delivery_address': 'New Road',
            'delivery_phone': '9801234567',
        })
        self.assertEqual(res_city.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('does not match shop city', res_city.data['detail'])

    def test_customer_and_seller_order_visibility(self):
        """Customer sees only their own orders; seller sees only their shop's orders."""
        order1 = Order.objects.create(
            customer=self.customer1,
            shop=self.shop1,
            delivery_city='Damak',
            delivery_address='Damak',
            delivery_phone='9800000000',
            subtotal='100.00',
            total='100.00',
        )
        order2 = Order.objects.create(
            customer=self.customer2,
            shop=self.shop2,
            delivery_city='Birtamod',
            delivery_address='Birtamod',
            delivery_phone='9800000000',
            subtotal='500.00',
            total='500.00',
        )

        # Customer 1 sees order1, but not order2
        self.client.force_authenticate(user=self.customer1)
        res_c1 = self.client.get(self.orders_url)
        c1_ids = [o['id'] for o in res_c1.data.get('results', res_c1.data)]
        self.assertIn(order1.id, c1_ids)
        self.assertNotIn(order2.id, c1_ids)

        # Seller 1 sees only order1 (shop1), not order2 (shop2)
        self.client.force_authenticate(user=self.seller1)
        res_s1 = self.client.get(self.orders_url)
        s1_ids = [o['id'] for o in res_s1.data.get('results', res_s1.data)]
        self.assertIn(order1.id, s1_ids)
        self.assertNotIn(order2.id, s1_ids)

        # Seller 2 sees only order2 (shop2), not order1 (shop1)
        self.client.force_authenticate(user=self.seller2)
        res_s2 = self.client.get(self.orders_url)
        s2_ids = [o['id'] for o in res_s2.data.get('results', res_s2.data)]
        self.assertIn(order2.id, s2_ids)
        self.assertNotIn(order1.id, s2_ids)

    def test_status_progression_skipping_backwards_and_cancellation(self):
        """
        Valid status transitions pass; skipping/backwards fails; cancel restores stock.
        Another seller cannot update someone else's order.
        """
        # Create an order with prod1 (stock=10 initially, order quantity=3)
        self.prod1.stock = 7
        self.prod1.save()

        order = Order.objects.create(
            customer=self.customer1,
            shop=self.shop1,
            status=Order.Status.PLACED,
            delivery_city='Damak',
            delivery_address='Damak',
            delivery_phone='9800000000',
            subtotal='300.00',
            total='300.00',
        )
        OrderItem.objects.create(
            order=order,
            product=self.prod1,
            product_name=self.prod1.name_en,
            unit_price=self.prod1.price,
            quantity=3,
            line_total='300.00',
        )

        update_status_url = reverse('orders:order-update-status', kwargs={'pk': order.pk})
        cancel_url = reverse('orders:order-cancel', kwargs={'pk': order.pk})

        # 1. Another seller (seller2) cannot update seller1's order -> 403
        self.client.force_authenticate(user=self.seller2)
        unauth_res = self.client.post(update_status_url, {'status': 'confirmed'})
        self.assertEqual(unauth_res.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Seller1 cannot skip: placed -> packed (must be confirmed)
        self.client.force_authenticate(user=self.seller1)
        skip_res = self.client.post(update_status_url, {'status': 'packed'})
        self.assertEqual(skip_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('allowed_transitions', skip_res.data)

        # 3. Seller1 valid forward: placed -> confirmed
        conf_res = self.client.post(update_status_url, {'status': 'confirmed'})
        self.assertEqual(conf_res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CONFIRMED)
        self.assertIsNotNone(order.confirmed_at)

        # 4. Seller1 cannot go backwards: confirmed -> placed
        back_res = self.client.post(update_status_url, {'status': 'placed'})
        self.assertEqual(back_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Customer cannot cancel once confirmed
        self.client.force_authenticate(user=self.customer1)
        cust_cancel_fail = self.client.post(cancel_url)
        self.assertEqual(cust_cancel_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # 6. Forward through packed -> out_for_delivery -> delivered
        self.client.force_authenticate(user=self.seller1)
        res_packed = self.client.post(update_status_url, {'status': 'packed'})
        self.assertEqual(res_packed.status_code, status.HTTP_200_OK)

        res_out = self.client.post(update_status_url, {'status': 'out_for_delivery'})
        self.assertEqual(res_out.status_code, status.HTTP_200_OK)

        res_deliv = self.client.post(update_status_url, {'status': 'delivered'})
        self.assertEqual(res_deliv.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.DELIVERED)
        self.assertTrue(order.is_paid)
        self.assertIsNotNone(order.delivered_at)

        # 7. Test cancellation restores stock on a placed order
        order_to_cancel = Order.objects.create(
            customer=self.customer1,
            shop=self.shop1,
            status=Order.Status.PLACED,
            delivery_city='Damak',
            delivery_address='Damak',
            delivery_phone='9800000000',
            subtotal='200.00',
            total='200.00',
        )
        OrderItem.objects.create(
            order=order_to_cancel,
            product=self.prod1,
            product_name=self.prod1.name_en,
            unit_price=self.prod1.price,
            quantity=2,
            line_total='200.00',
        )
        # Current stock is 7. After cancelling, it must be restored to 9.
        self.client.force_authenticate(user=self.customer1)
        cancel_placed_url = reverse('orders:order-cancel', kwargs={'pk': order_to_cancel.pk})
        cancel_res = self.client.post(cancel_placed_url)
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        self.prod1.refresh_from_db()
        self.assertEqual(self.prod1.stock, 9)  # 7 + 2 restored
