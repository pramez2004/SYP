from django.urls import reverse
from django.core import mail
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthenticationTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache
        from rest_framework.settings import api_settings
        from rest_framework.throttling import SimpleRateThrottle
        cache.clear()
        api_settings.reload()
        SimpleRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES
        self.register_url = reverse('authentication:register')
        self.login_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')
        self.logout_url = reverse('authentication:logout')
        self.change_password_url = reverse('authentication:change-password')
        self.password_reset_url = reverse('authentication:password-reset')
        self.password_reset_confirm_url = reverse('authentication:password-reset-confirm')

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

    def test_password_reset_request_and_confirm_flow(self):
        """
        Requesting reset sends email with uid and token.
        Non-existent email also returns 200 (prevents user enumeration).
        Confirming reset with valid token resets password.
        """
        user = User.objects.create_user(
            username='reset_user',
            email='resetme@test.com',
            password='OldPassword123!',
        )

        # 1. Non-existent email returns 200 without sending email
        nonexistent_res = self.client.post(self.password_reset_url, {'email': 'nobody@test.com'})
        self.assertEqual(nonexistent_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

        # 2. Existing email returns 200 and sends email
        exist_res = self.client.post(self.password_reset_url, {'email': 'resetme@test.com'})
        self.assertEqual(exist_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertIn('Password Reset', sent_email.subject)
        self.assertIn('resetme@test.com', sent_email.to)

        # Extract UID and Token using standard generation
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # 3. Confirm with mismatched passwords -> 400
        mismatch_res = self.client.post(self.password_reset_confirm_url, {
            'uid': uid,
            'token': token,
            'new_password': 'BrandNewPassword123!',
            'new_password2': 'WrongMatch123!',
        })
        self.assertEqual(mismatch_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Confirm with invalid token -> 400
        bad_token_res = self.client.post(self.password_reset_confirm_url, {
            'uid': uid,
            'token': 'invalid-token-123',
            'new_password': 'BrandNewPassword123!',
            'new_password2': 'BrandNewPassword123!',
        })
        self.assertEqual(bad_token_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Confirm with valid UID and Token -> 200
        confirm_res = self.client.post(self.password_reset_confirm_url, {
            'uid': uid,
            'token': token,
            'new_password': 'BrandNewPassword123!',
            'new_password2': 'BrandNewPassword123!',
        })
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # 6. Verify user can log in with new password
        login_res = self.client.post(self.login_url, {
            'username': 'reset_user',
            'password': 'BrandNewPassword123!',
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

        # 7. Old password no longer works
        old_login = self.client.post(self.login_url, {
            'username': 'reset_user',
            'password': 'OldPassword123!',
        })
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_throttling_triggers_429(self):
        """Verify that exceeding the login throttle rate returns 429 Too Many Requests."""
        from rest_framework.throttling import SimpleRateThrottle
        from rest_framework.settings import api_settings
        from django.core.cache import cache
        from django.conf import settings

        new_rates = {**settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'], 'login': '2/minute'}
        try:
            with self.settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, 'DEFAULT_THROTTLE_RATES': new_rates}):
                api_settings.reload()
                SimpleRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES
                cache.clear()

                # 1st attempt: 401 (invalid credentials, request counted)
                res1 = self.client.post(self.login_url, {'username': 'test_throttle', 'password': 'wrong'})
                self.assertEqual(res1.status_code, status.HTTP_401_UNAUTHORIZED)

                # 2nd attempt: 401
                res2 = self.client.post(self.login_url, {'username': 'test_throttle', 'password': 'wrong'})
                self.assertEqual(res2.status_code, status.HTTP_401_UNAUTHORIZED)

                # 3rd attempt exceeds 2/minute -> 429 Too Many Requests
                res3 = self.client.post(self.login_url, {'username': 'test_throttle', 'password': 'wrong'})
                self.assertEqual(res3.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        finally:
            cache.clear()
            api_settings.reload()
            SimpleRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES


class RoleBasedAccessTests(APITestCase):
    """Role-based access control: customer, seller and admin."""

    def setUp(self):
        self.customer = User.objects.create_user(
            username='cust', email='cust@example.com', password='Fest!val2083x', role='customer')
        self.seller = User.objects.create_user(
            username='sell', email='sell@example.com', password='Fest!val2083x', role='seller')
        self.admin = User.objects.create_user(
            username='boss', email='boss@example.com', password='Fest!val2083x', role='admin')

    def _as(self, user):
        self.client.force_authenticate(user=user)

    def test_anonymous_is_rejected(self):
        for name in ('authentication:user-list', 'authentication:my-permissions',
                     'authentication:demo-customer'):
            self.assertEqual(self.client.get(reverse(name)).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_demo_areas_allow_only_matching_role(self):
        matrix = {
            'authentication:demo-customer': {self.customer: 200, self.seller: 403, self.admin: 403},
            'authentication:demo-seller': {self.customer: 403, self.seller: 200, self.admin: 403},
            'authentication:demo-admin': {self.customer: 403, self.seller: 403, self.admin: 200},
        }
        for url_name, expectations in matrix.items():
            for user, expected in expectations.items():
                self._as(user)
                response = self.client.get(reverse(url_name))
                self.assertEqual(response.status_code, expected, f'{url_name} as {user.role}')

    def test_my_permissions_reports_role_and_permissions(self):
        self._as(self.customer)
        data = self.client.get(reverse('authentication:my-permissions')).json()
        self.assertEqual(data['role'], 'customer')
        self.assertNotIn('users.list', data['permissions'])
        self._as(self.admin)
        data = self.client.get(reverse('authentication:my-permissions')).json()
        self.assertIn('users.change_role', data['permissions'])

    def test_only_admin_can_list_and_view_users(self):
        self._as(self.customer)
        self.assertEqual(self.client.get(reverse('authentication:user-list')).status_code, 403)
        self._as(self.seller)
        self.assertEqual(
            self.client.get(reverse('authentication:user-detail', args=[self.customer.pk])).status_code, 403)
        self._as(self.admin)
        response = self.client.get(reverse('authentication:user-list'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 3)

    def test_admin_can_change_role_and_deactivate_user(self):
        self._as(self.admin)
        url = reverse('authentication:user-detail', args=[self.customer.pk])
        response = self.client.patch(url, {'role': 'seller'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.role, 'seller')

        response = self.client.patch(url, {'is_active': False}, format='json')
        self.assertEqual(response.status_code, 200)
        # a deactivated user can no longer log in
        self.client.force_authenticate(user=None)
        login = self.client.post(reverse('token_obtain_pair'),
                                 {'username': 'cust', 'password': 'Fest!val2083x'}, format='json')
        self.assertEqual(login.status_code, 401)

    def test_admin_cannot_change_own_role_or_status(self):
        self._as(self.admin)
        url = reverse('authentication:user-detail', args=[self.admin.pk])
        self.assertEqual(self.client.patch(url, {'role': 'customer'}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(url, {'is_active': False}, format='json').status_code, 400)

    def test_admin_cannot_edit_other_user_fields(self):
        self._as(self.admin)
        url = reverse('authentication:user-detail', args=[self.customer.pk])
        self.client.patch(url, {'email': 'hacked@example.com', 'username': 'hacked'}, format='json')
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.email, 'cust@example.com')
        self.assertEqual(self.customer.username, 'cust')

    def test_superuser_gets_admin_role(self):
        su = User.objects.create_superuser(username='root', email='root@example.com', password='Fest!val2083x')
        self.assertEqual(su.role, 'admin')
