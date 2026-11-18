# Chaad Baad (चाडबाड) - Authentication & Authorization

Second Year Project (SYP), initial phase. This branch contains **only** the
authentication and authorization module of the Chaad Baad platform:

- User registration
- Login / logout
- Password management (change, reset)
- User roles (customer, seller, admin)
- Role-based access / permissions

The rest of the system (festivals, marketplace, orders, mobile app) is built in
later sprints and is kept on the `full-system` branch.

## Tech stack
Django 5, Django REST Framework, SimpleJWT (JSON Web Tokens), PostgreSQL,
drf-spectacular (Swagger docs), Docker Compose (database).

## Structure
```
backend/
  config/                  settings, urls, test settings
  apps/authentication/     User model, serializers, views, permissions, tests
docker-compose.yml         PostgreSQL for development
```

## Setup
```bash
docker compose up -d                      # PostgreSQL
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                      # edit values if needed
python manage.py migrate
python manage.py createsuperuser          # creates an ADMIN (role is set automatically)
python manage.py runserver
```
API docs (Swagger): http://localhost:8000/api/docs/

Run the tests (uses in-memory SQLite, no PostgreSQL needed):
```bash
python manage.py test --settings=config.settings_test
```

## How it works
- **Registration:** anyone can register as `customer` or `seller`. The `admin`
  role can never be chosen at registration; admins come from `createsuperuser`
  or from another admin.
- **Login:** `POST /api/token/` returns a short-lived access token (60 min) and a
  refresh token (7 days). Send `Authorization: Bearer <access>` on requests.
  Login is rate limited.
- **Logout:** the refresh token is blacklisted on the server and cannot be reused.
- **Passwords:** hashed by Django (PBKDF2) and checked by Django's validators.
  Change password needs the old password. Reset uses a one-time token
  (Django `default_token_generator`); in development the email is printed to the
  console.
- **Roles and permissions:** every user has one role. Endpoints are protected with
  permission classes (`IsCustomer`, `IsSeller`, `IsAdminUser`). Deny by default:
  all endpoints need a login unless marked public.

## API endpoints
| Method | Endpoint | Purpose | Who |
|---|---|---|---|
| POST | `/api/auth/register/` | Register customer or seller | Public |
| POST | `/api/token/` | Login (get access + refresh) | Public (throttled) |
| POST | `/api/token/refresh/` | New access token | Public (needs refresh token) |
| POST | `/api/auth/logout/` | Blacklist refresh token | Logged in |
| GET/PATCH | `/api/auth/profile/` | View / update own profile | Logged in |
| POST | `/api/auth/change-password/` | Change own password | Logged in |
| POST | `/api/auth/password-reset/` | Request reset email (always returns 200) | Public |
| POST | `/api/auth/password-reset/confirm/` | Set new password with uid + token | Public |
| GET | `/api/auth/permissions/` | My role and permissions | Logged in |
| GET | `/api/auth/users/` | List users | Admin |
| GET/PATCH | `/api/auth/users/{id}/` | View user; change role or activate/deactivate | Admin |
| GET | `/api/auth/demo/customer-area/` | Demo: proves role check | Customer |
| GET | `/api/auth/demo/seller-area/` | Demo: proves role check | Seller |
| GET | `/api/auth/demo/admin-area/` | Demo: proves role check | Admin |

The three `demo` endpoints only exist to show role-based access working
(wrong role gets `403 Forbidden`). They are removed once real features use the roles.

## Role permissions
| Capability | Anonymous | Customer | Seller | Admin |
|---|---|---|---|---|
| Register | yes | - | - | - |
| Login / refresh | yes | yes | yes | yes |
| Logout, view/update own profile, change password | - | yes | yes | yes |
| Request / confirm password reset | yes | yes | yes | yes |
| List and view all users | - | - | - | yes |
| Change a user's role, activate / deactivate | - | - | - | yes |
| Customer-only / seller-only / admin-only demo area | - | own | own | own |

Rules: an admin cannot change their own role or active status (prevents
lock-out). Admins can change only `role` and `is_active` of other users.
