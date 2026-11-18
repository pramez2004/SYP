from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('authentication:register')
        self.login_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')
        self.logout_url = reverse('authentication:logout')
        self.change_password_url = reverse('authentication:change-password')

    def test_register_customer_and_seller_success(self):
        """Customer and seller self-registration works."""
        customer_data = {
            'username': 'ram_customer',
            'email': 'ram@test.com',
            'password': 'StrongPassword123!',
            'password2': 'StrongPassword123!',
            'role': 'customer',
            'first_name': 'Ram',
            'last_name': 'Bahadur',
            'city': 'Damak',
        }
        res = self.client.post(self.register_url, customer_data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['user']['role'], 'customer')

        seller_data = {
            'username': 'sita_seller',
            'email': 'sita@test.com',
            'password': 'StrongPassword123!',
            'password2': 'StrongPassword123!',
            'role': 'seller',
            'first_name': 'Sita',
            'last_name': 'Devi',
            'city': 'Birtamod',
        }
        res2 = self.client.post(self.register_url, seller_data)
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.data['user']['role'], 'seller')

    def test_register_admin_role_rejected(self):
        """Self-registration with role='admin' must be rejected (privilege escalation prevention)."""
        admin_data = {
            'username': 'hacker_admin',
            'email': 'admin@test.com',
            'password': 'StrongPassword123!',
            'password2': 'StrongPassword123!',
            'role': 'admin',
        }
        res = self.client.post(self.register_url, admin_data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='hacker_admin').exists())

    def test_duplicate_email_rejected(self):
        """Duplicate email registration is rejected."""
        User.objects.create_user(
            username='existing_user',
            email='duplicate@test.com',
            password='StrongPassword123!',
        )
        data = {
            'username': 'new_user',
            'email': 'duplicate@test.com',
            'password': 'StrongPassword123!',
            'password2': 'StrongPassword123!',
            'role': 'customer',
        }
        res = self.client.post(self.register_url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', res.data)

    def test_password_mismatch_rejected(self):
        """Mismatched password and password2 are rejected."""
        data = {
            'username': 'mismatch_user',
            'email': 'mismatch@test.com',
            'password': 'StrongPassword123!',
            'password2': 'DifferentPassword123!',
            'role': 'customer',
        }
        res = self.client.post(self.register_url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password2', res.data)

    def test_login_logout_blacklist_and_change_password(self):
        """
        Login returns tokens, logout blacklists the refresh token (refresh afterwards fails),
        and change-password works and rejects a wrong old password.
        """
        user = User.objects.create_user(
            username='test_user',
            email='testuser@test.com',
            password='InitialPassword123!',
            role='customer',
        )

        # 1. Login
        login_res = self.client.post(self.login_url, {
            'username': 'test_user',
            'password': 'InitialPassword123!',
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        access_token = login_res.data['access']
        refresh_token = login_res.data['refresh']
        self.assertTrue(access_token)
        self.assertTrue(refresh_token)

        # 2. Token refresh works before logout
        refresh_res = self.client.post(self.refresh_url, {'refresh': refresh_token})
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        new_refresh_token = refresh_res.data.get('refresh', refresh_token)

        # 3. Change password with wrong old password fails
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        bad_change = self.client.post(self.change_password_url, {
            'old_password': 'WrongPassword123!',
            'new_password': 'NewStrongPassword456!',
            'new_password2': 'NewStrongPassword456!',
        })
        self.assertEqual(bad_change.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Change password with correct old password succeeds
        good_change = self.client.post(self.change_password_url, {
            'old_password': 'InitialPassword123!',
            'new_password': 'NewStrongPassword456!',
            'new_password2': 'NewStrongPassword456!',
        })
        self.assertEqual(good_change.status_code, status.HTTP_200_OK)

        # 5. Login with new password succeeds
        new_login = self.client.post(self.login_url, {
            'username': 'test_user',
            'password': 'NewStrongPassword456!',
        })
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)
        active_access = new_login.data['access']
        active_refresh = new_login.data['refresh']

        # 6. Logout blacklists the refresh token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {active_access}')
        logout_res = self.client.post(self.logout_url, {'refresh': active_refresh})
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # 7. Refresh with blacklisted token fails
        blacklisted_refresh_res = self.client.post(self.refresh_url, {'refresh': active_refresh})
        self.assertIn(blacklisted_refresh_res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])
